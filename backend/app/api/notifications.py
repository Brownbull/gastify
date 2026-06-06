"""Notifications API — user-global in-app notification feed (Phase 7, D78).

A per-user feed (list + unread-count + mark-read + mark-all-read + delete). It is
USER-GLOBAL: this router intentionally does NOT call ``resolve_analytics_scope`` and
does NOT accept a ``group_id``. ``get_auth_context`` already pins the RLS GUC to the
caller's personal scope, so filtering on ``user_id == auth.user_id`` returns exactly
the caller's notifications regardless of any active group (mirrors push_tokens.py).
A foreign notification id is 404 (anti-enumeration), never 403.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Annotated, Any, cast
from uuid import UUID  # noqa: TC003 - FastAPI resolves path annotations at runtime.

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth  # noqa: TC001 - runtime Annotated FastAPI dep.
from app.db import get_db
from app.models.notification import Notification
from app.schemas.common import PaginatedResponse
from app.schemas.notifications import (
    MarkAllReadResponse,
    NotificationRow,
    UnreadCountResponse,
)

if TYPE_CHECKING:
    from sqlalchemy.engine import CursorResult

router = APIRouter(prefix="/notifications", tags=["notifications"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=PaginatedResponse[NotificationRow])
async def list_notifications(
    auth: Auth,
    db: DB,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    unread: bool | None = Query(default=None),
) -> PaginatedResponse[NotificationRow]:
    # Newest first; id is the UNIQUE tie-break so equal-timestamp rows page cleanly.
    query = (
        select(Notification)
        .where(Notification.user_id == auth.user_id)
        .order_by(Notification.created_at.desc(), Notification.id)
    )
    if unread:
        query = query.where(Notification.read_at.is_(None))
    if cursor:
        # 2-part cursor "<created_at_iso>|<id>": next page is older rows, then a
        # deterministic id tie-break within the same timestamp. The cursor is an
        # opaque server-issued token; a malformed/stale one degrades to "first page"
        # rather than 500ing (datetime.fromisoformat / UUID would otherwise raise).
        parts = cursor.split("|", 1)
        if len(parts) == 2:
            c_created: datetime | None
            c_id: UUID | None
            try:
                c_created = datetime.fromisoformat(parts[0])
                c_id = UUID(parts[1])
            except (ValueError, TypeError):
                c_created = c_id = None
            if c_created is not None and c_id is not None:
                query = query.where(
                    (Notification.created_at < c_created)
                    | ((Notification.created_at == c_created) & (Notification.id > c_id))
                )

    query = query.limit(limit + 1)
    rows = list((await db.execute(query)).scalars().all())

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    data = [NotificationRow.model_validate(n) for n in rows]
    next_cursor = f"{rows[-1].created_at.isoformat()}|{rows[-1].id}" if has_more and rows else None
    return PaginatedResponse(data=data, cursor=next_cursor, has_more=has_more)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(auth: Auth, db: DB) -> UnreadCountResponse:
    count = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == auth.user_id, Notification.read_at.is_(None))
    )
    return UnreadCountResponse(count=count or 0)


@router.patch("/{notification_id}/read", response_model=NotificationRow)
async def mark_notification_read(
    notification_id: UUID,
    auth: Auth,
    db: DB,
) -> NotificationRow:
    notification = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == auth.user_id,
        )
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(notification)
    return NotificationRow.model_validate(notification)


@router.post("/mark-all-read", response_model=MarkAllReadResponse)
async def mark_all_notifications_read(auth: Auth, db: DB) -> MarkAllReadResponse:
    now = datetime.now(UTC)
    result = cast(
        "CursorResult[Any]",
        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == auth.user_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=now, updated_at=now)
        ),
    )
    await db.commit()
    return MarkAllReadResponse(count=result.rowcount or 0)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    auth: Auth,
    db: DB,
) -> None:
    notification = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == auth.user_id,
        )
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    await db.delete(notification)
    await db.commit()
