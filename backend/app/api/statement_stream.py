"""Statement extraction progress streaming endpoints."""

from __future__ import annotations

import asyncio
import contextlib
import uuid  # noqa: TC003 - FastAPI evaluates path param annotations at runtime.
from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse

from app.api.scan_stream import _resolve_ownership, _verify_token
from app.config import settings
from app.db import async_session
from app.models.statement import Statement
from app.schemas.statement import StatementEvent
from app.services.statement_events import statement_dispatcher

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

router = APIRouter(tags=["statement-stream"])


async def _check_statement_ownership(statement_id: uuid.UUID, scope_id: uuid.UUID) -> bool:
    async with async_session() as db:
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
