"""Scan progress streaming — SSE + WebSocket endpoints.

SSE: GET /api/v1/scans/{scan_id}/events?token=<firebase_jwt>
WS:  /ws/scans/{scan_id}?token=<firebase_jwt>

Both endpoints stream ScanEvent JSON objects. SSE uses sse-starlette;
WebSocket uses Starlette's native WebSocket support. Auth is via
query-param token (browsers can't set headers on EventSource or WS upgrade).
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid  # noqa: TC003 — FastAPI evaluates path param annotations at runtime

import structlog
from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse

from app.auth.firebase import FirebaseUser, _get_firebase_app
from app.config import settings as _settings
from app.db import async_session
from app.models.scan import Scan
from app.models.user import User
from app.services.scan_events import dispatcher

logger = structlog.get_logger()

router = APIRouter(tags=["scan-stream"])
ws_router = APIRouter(tags=["scan-stream-ws"])

HEARTBEAT_INTERVAL_S = _settings.scan_event_heartbeat_interval_s


async def _verify_token(token: str) -> FirebaseUser:
    """Verify Firebase JWT from query param. Raises HTTPException on failure."""
    import firebase_admin.auth as firebase_auth

    _get_firebase_app()
    try:
        decoded = await asyncio.to_thread(firebase_auth.verify_id_token, token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc
    return FirebaseUser(uid=decoded["uid"], email=decoded.get("email"), name=decoded.get("name"))


async def _resolve_ownership(firebase_uid: str) -> uuid.UUID | None:
    """Look up ownership_scope_id for a Firebase user."""
    async with async_session() as db:
        stmt = select(User.ownership_scope_id).where(User.firebase_uid == firebase_uid)
        row = await db.execute(stmt)
        return row.scalar_one_or_none()


async def _check_scan_ownership(scan_id: uuid.UUID, scope_id: uuid.UUID) -> bool:
    """Check that a scan belongs to the given ownership scope."""
    async with async_session() as db:
        row = await db.execute(
            select(Scan.id).where(Scan.id == scan_id, Scan.ownership_scope_id == scope_id)
        )
        return row.scalar_one_or_none() is not None


async def _authorize_scan(token: str, scan_id: uuid.UUID) -> None:
    """Verify token and check scan ownership. Raises HTTPException on failure."""
    user = await _verify_token(token)
    scope_id = await _resolve_ownership(user.uid)
    if scope_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not await _check_scan_ownership(scan_id, scope_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")


@router.get("/scans/{scan_id}/events")
async def scan_events_sse(
    request: Request,
    scan_id: uuid.UUID,
    token: str = Query(..., description="Firebase JWT for authentication"),
) -> EventSourceResponse:
    await _authorize_scan(token, scan_id)

    sub = dispatcher.subscribe(scan_id)

    async def event_generator():
        try:
            heartbeat_task = asyncio.create_task(_heartbeat_loop(sub, scan_id))
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
            dispatcher.unsubscribe(sub)

    return EventSourceResponse(event_generator())


async def _heartbeat_loop(sub, scan_id: uuid.UUID) -> None:
    from app.schemas.scan import ScanEvent

    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL_S)
        heartbeat = ScanEvent(
            event_type="heartbeat",
            scan_id=scan_id,
            step="keepalive",
            progress_pct=0,
        )
        sub.put_nowait(heartbeat)


@ws_router.websocket("/ws/scans/{scan_id}")
async def scan_events_ws(
    websocket: WebSocket,
    scan_id: uuid.UUID,
    token: str = Query(..., description="Firebase JWT for authentication"),
) -> None:
    try:
        user = await _verify_token(token)
    except HTTPException:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    scope_id = await _resolve_ownership(user.uid)
    if scope_id is None:
        await websocket.close(code=4001, reason="User not found")
        return

    if not await _check_scan_ownership(scan_id, scope_id):
        await websocket.close(code=4004, reason="Scan not found")
        return

    await websocket.accept()
    sub = dispatcher.subscribe(scan_id)

    try:
        heartbeat_task = asyncio.create_task(_ws_heartbeat_loop(websocket, scan_id))
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
        dispatcher.unsubscribe(sub)
        with contextlib.suppress(Exception):
            await websocket.close()


async def _ws_heartbeat_loop(websocket: WebSocket, scan_id: uuid.UUID) -> None:
    from app.schemas.scan import ScanEvent

    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL_S)
        heartbeat = ScanEvent(
            event_type="heartbeat",
            scan_id=scan_id,
            step="keepalive",
            progress_pct=0,
        )
        try:
            await websocket.send_text(heartbeat.model_dump_json())
        except Exception:
            break
