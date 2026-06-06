"""Notification schemas — user-global notification feed (Phase 7, D78).

The feed lists per-user notifications (one row per `notifications` row). It is
user-global: bound to the caller's personal scope, never threaded by group. The
list response is ``PaginatedResponse[NotificationRow]`` (opaque cursor).
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class NotificationRow(BaseModel):
    """One notification (GET /api/v1/notifications)."""

    model_config = {"from_attributes": True}

    id: UUID
    kind: str  # scan_complete | scan_needs_review | statement_reconciled
    title: str
    body: str | None = None
    # Deep-link payload (JSONB column), e.g. {"transaction_id": "..."}.
    data: dict[str, Any] | None = None
    # NULL = unread. Clients derive `read` from `read_at != null`.
    read_at: datetime | None = None
    created_at: datetime


class MarkAllReadResponse(BaseModel):
    count: int


class UnreadCountResponse(BaseModel):
    count: int
