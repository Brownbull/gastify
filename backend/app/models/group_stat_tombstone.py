"""Group-stat tombstone: voids (never recomputes) a group-period aggregate whose
underlying shared data was erased (D82).

When a member account-deletes (total erasure) or leaves a group and chooses to
delete the copies they shared, the affected (group scope, month) statistics can no
longer be shown as facts — their underlying data is gone or hidden. One row per
(scope, month) marks that group-period VOID; the insights layer checks for it
BEFORE display and returns a void notice instead of the numbers (D82: void, never
recompute — "a voided figure is stronger for privacy than a recomputed one: gone,
not adjusted"). The row carries no personal content — only the group scope, the
affected month, and why.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

# Why a group-period stat was voided. Drives the member-facing notice (D82); the
# frontend localizes by code. ``account_deleted`` = a member signed off the app
# (total erasure); ``member_removed_data`` = a member left the group and deleted
# the copies they had shared into it.
GROUP_STAT_VOID_REASONS = ("account_deleted", "member_removed_data")


class GroupStatTombstone(Base):
    __tablename__ = "group_stat_tombstones"
    __table_args__ = (
        CheckConstraint(
            "reason IN ('account_deleted', 'member_removed_data')",
            name="ck_group_stat_tombstones_reason",
        ),
        # One tombstone per (group scope, month): voiding is idempotent — a second
        # deletion touching the same group-period is a no-op (the first reason wins).
        UniqueConstraint(
            "ownership_scope_id",
            "period",
            name="uq_group_stat_tombstones_scope_period",
        ),
        Index(
            "idx_group_stat_tombstones_scope_period",
            "ownership_scope_id",
            "period",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    # The GROUP scope whose stats are voided — never a personal scope.
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    # The voided month as canonical "YYYY-MM" (zero-padded, so a lexicographic range
    # over the column is identical to a chronological one).
    period: Mapped[str] = mapped_column(String(7), nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
