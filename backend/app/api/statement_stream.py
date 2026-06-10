"""Statement extraction progress streaming endpoints."""

from __future__ import annotations

import asyncio
import contextlib
import uuid  # noqa: TC003 - FastAPI evaluates path param annotations at runtime.
from typing import TYPE_CHECKING, Any

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse

from app.api.scan_stream import _resolve_ownership, _verify_token
from app.config import settings
from app.db import async_session, set_session_ownership_scope
from app.models.statement import Statement
from app.schemas.statement import StatementEvent
from app.services.statement_events import statement_dispatcher

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

router = APIRouter(tags=["statement-stream"])
ws_router = APIRouter(tags=["statement-stream-ws"])


async def _check_statement_ownership(statement_id: uuid.UUID, scope_id: uuid.UUID) -> bool:
    async with async_session() as db:
        # statements is FORCE-RLS and this session is OUTSIDE the request flow (token
        # auth, no auth dep) — without the scope GUC the fail-safe policy hides every
        # row and ownership ALWAYS reads false → the stream 404s on real Postgres
        # (invisible on SQLite). The scope is already resolved from the verified token.
        await set_session_ownership_scope(db, scope_id)
        row = await db.execute(
            select(Statement.id).where(
                Statement.id == statement_id,
                Statement.ownership_scope_id == scope_id,
            )
        )
        return row.scalar_one_or_none() is not None


async def _authorize_statement(token: str, statement_id: uuid.UUID) -> None:
    user = await _verify_token(token)
    scope_id = await _resolve_ownership(user.uid)
    if scope_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not await _check_statement_ownership(statement_id, scope_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")


@router.get("/statements/{statement_id}/events")
async def statement_events_sse(
    request: Request,
    statement_id: uuid.UUID,
    token: str = Query(..., description="Firebase JWT for authentication"),
) -> EventSourceResponse:
    await _authorize_statement(token, statement_id)

    sub = statement_dispatcher.subscribe(statement_id)

    async def event_generator() -> AsyncIterator[dict[str, str]]:
        try:
            heartbeat_task = asyncio.create_task(_heartbeat_loop(sub, statement_id))
            try:
                async for event in sub:
                    if await request.is_disconnected():
                        break
                    yield {
                        "event": event.event_type,
                        "data": event.model_dump_json(),
                    }
            finally:
                heartbeat_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await heartbeat_task
        finally:
            statement_dispatcher.unsubscribe(sub)

    return EventSourceResponse(event_generator())


async def _heartbeat_loop(sub: Any, statement_id: uuid.UUID) -> None:
    while True:
        await asyncio.sleep(settings.scan_event_heartbeat_interval_s)
        heartbeat = StatementEvent(
            event_type="heartbeat",
            statement_id=statement_id,
            step="keepalive",
            progress_pct=0,
        )
        sub.put_nowait(heartbeat)


@ws_router.websocket("/ws/statements/{statement_id}")
async def statement_events_ws(
    websocket: WebSocket,
    statement_id: uuid.UUID,
    token: str = Query(..., description="Firebase JWT for authentication"),
) -> None:
    try:
        await _authorize_statement(token, statement_id)
    except HTTPException as exc:
        code = 4004 if exc.status_code == status.HTTP_404_NOT_FOUND else 4001
        reason = str(exc.detail)
        await websocket.close(code=code, reason=reason)
        return

    await websocket.accept()
    sub = statement_dispatcher.subscribe(statement_id)

    try:
        heartbeat_task = asyncio.create_task(_ws_heartbeat_loop(websocket, statement_id, sub))
        try:
            async for event in sub:
                await websocket.send_text(event.model_dump_json())
        finally:
            heartbeat_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await heartbeat_task
    except WebSocketDisconnect:
        pass
    finally:
        statement_dispatcher.unsubscribe(sub)
        with contextlib.suppress(Exception):
            await websocket.close()


async def _ws_heartbeat_loop(
    websocket: WebSocket,
    statement_id: uuid.UUID,
    sub: Any,
) -> None:
    while True:
        await asyncio.sleep(settings.scan_event_heartbeat_interval_s)
        heartbeat = StatementEvent(
            event_type="heartbeat",
            statement_id=statement_id,
            step="keepalive",
            progress_pct=0,
        )
        try:
            await websocket.send_text(heartbeat.model_dump_json())
        except Exception:
            sub.close()
            break
