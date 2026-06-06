"""Notification creation service (Phase 7, D78).

Writes per-user, personal-scope-bound notifications, called by the scan + statement
workers at their terminal states. The target user is the personal-scope OWNER —
resolved from ``users.ownership_scope_id`` (the 1:1 personal scope; ``users`` has no
RLS), so no ``user_id`` has to be threaded through the scan/statement pipelines.

Every worker entrypoint is FAILURE-ISOLATED: a notification error is logged, never
raised, so it can never break the scan/statement that triggered it. Notification
copy is stored at creation time in the product's primary locale (es-CL); per-locale
rendering is a deferred refinement (D78).
"""

import uuid
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session, set_session_ownership_scope
from app.models.notification import Notification
from app.models.user import User

logger = structlog.get_logger(__name__)

_SCAN_COMPLETE_TITLE = "Boleta escaneada"
_SCAN_COMPLETE_BODY = "Tu boleta se escaneó y guardó."
_SCAN_REVIEW_TITLE = "Boleta por revisar"
_SCAN_REVIEW_BODY = "No pudimos verificar el total de tu boleta. Tócala para revisar."
_STATEMENT_TITLE = "Cartola conciliada"


async def create_notification(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID,
    kind: str,
    title: str,
    body: str | None = None,
    data: dict[str, Any] | None = None,
) -> Notification:
    """Insert one notification under the already-scoped session. Caller commits."""
    notification = Notification(
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        kind=kind,
        title=title,
        body=body,
        data=data,
    )
    db.add(notification)
    await db.flush()
    return notification


async def _resolve_scope_owner_user_id(
    db: AsyncSession, ownership_scope_id: uuid.UUID
) -> uuid.UUID | None:
    """The user whose PERSONAL scope this is (``users.ownership_scope_id`` is 1:1)."""
    return await db.scalar(
        select(User.id).where(User.ownership_scope_id == ownership_scope_id)
    )


async def _notify_personal_scope(
    *,
    ownership_scope_id: uuid.UUID | None,
    kind: str,
    title: str,
    body: str | None,
    data: dict[str, Any] | None,
) -> None:
    """Open an isolated session, resolve the scope owner, write one notification.

    Failure-isolated: any error is logged and swallowed.
    """
    if ownership_scope_id is None:
        return
    try:
        async with async_session() as db:
            await set_session_ownership_scope(db, ownership_scope_id)
            user_id = await _resolve_scope_owner_user_id(db, ownership_scope_id)
            if user_id is None:
                # A scope with no personal owner (e.g. a group context). MVP notifies
                # only the personal-scope owner; group fan-out is deferred (D78).
                logger.info(
                    "notification_skipped_no_owner",
                    scope_id=str(ownership_scope_id),
                    kind=kind,
                )
                return
            await create_notification(
                db,
                ownership_scope_id=ownership_scope_id,
                user_id=user_id,
                kind=kind,
                title=title,
                body=body,
                data=data,
            )
            await db.commit()
    except Exception as exc:  # noqa: BLE001 — failure-isolated by design (D78)
        logger.warning("notification_create_failed", kind=kind, error=str(exc))


async def notify_scan_terminal(
    *,
    ownership_scope_id: uuid.UUID | None,
    scan_id: uuid.UUID,
    transaction_id: uuid.UUID,
    needs_review: bool,
) -> None:
    """Fire a scan_complete / scan_needs_review notification (both scan terminals)."""
    if needs_review:
        kind, title, body = "scan_needs_review", _SCAN_REVIEW_TITLE, _SCAN_REVIEW_BODY
    else:
        kind, title, body = "scan_complete", _SCAN_COMPLETE_TITLE, _SCAN_COMPLETE_BODY
    await _notify_personal_scope(
        ownership_scope_id=ownership_scope_id,
        kind=kind,
        title=title,
        body=body,
        data={"transaction_id": str(transaction_id), "scan_id": str(scan_id)},
    )


async def notify_statement_reconciled(
    *,
    ownership_scope_id: uuid.UUID | None,
    statement_id: uuid.UUID,
    matched_count: int,
    total_count: int,
) -> None:
    """Fire a statement_reconciled notification at statement worker completion."""
    body = f"Tu cartola se concilió: {matched_count} de {total_count} coinciden."
    await _notify_personal_scope(
        ownership_scope_id=ownership_scope_id,
        kind="statement_reconciled",
        title=_STATEMENT_TITLE,
        body=body,
        data={"statement_id": str(statement_id)},
    )
