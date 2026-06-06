"""Notification table: per-user, personal-scope-bound in-app notification feed.

User-global by construction (D78): every row carries the caller's PERSONAL
``ownership_scope_id`` + ``user_id`` and is read/written ONLY under the personal
RLS scope, so the feed is independent of any active group scope. Mirrors the
``mobile_push_tokens`` precedent (user_id-filtered, personal-scope-bound).
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('scan_complete', 'scan_needs_review', 'statement_reconciled')",
            name="ck_notifications_kind",
        ),
        # Unread-list hot path: per-user, recency-ordered. read_at IS NULL = unread.
        Index(
            "idx_notifications_user_read_created",
            "user_id",
            "read_at",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    # The caller's PERSONAL scope (RLS pin) — never a group scope (D78).
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Deep-link payload, e.g. {"transaction_id": "...", "scan_id": "...",
    # "statement_id": "..."}. JSON (not JSONB) for SQLite test parity; the
    # migration declares the Postgres column as JSONB.
    data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # NULL = unread. Single source of truth; clients derive read = read_at != null.
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
