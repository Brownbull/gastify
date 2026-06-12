"""Monthly feature-usage counters (D96) — quota consumption per (scope, feature, month).

The month key (period "YYYY-MM") rotates naturally, so the monthly recharge and the
no-rollover rule hold BY CONSTRUCTION: a new month simply starts a fresh row at 0;
old rows become inert history. No reset job exists to forget.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class UsageCounter(Base):
    __tablename__ = "usage_counters"
    __table_args__ = (
        UniqueConstraint(
            "ownership_scope_id", "feature", "period", name="uq_usage_counters_scope_feature_period"
        ),
        CheckConstraint(
            "feature IN ('scan', 'statement', 'batch')", name="ck_usage_counters_feature"
        ),
        CheckConstraint("used >= 0", name="ck_usage_counters_used_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    # Quota-bearing features are personal-only (D70), so this is always a PERSONAL scope.
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    feature: Mapped[str] = mapped_column(String, nullable=False)
    # Canonical zero-padded "YYYY-MM" (lexicographic == chronological).
    period: Mapped[str] = mapped_column(String(7), nullable=False)
    used: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
