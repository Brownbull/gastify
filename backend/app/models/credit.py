"""Credit balance table — per-scope scan credit tracking."""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class CreditBalance(Base):
    __tablename__ = "credit_balances"
    __table_args__ = (
        CheckConstraint(
            "plan_tier IN ('free', 'basic', 'pro')",
            name="ck_credit_balances_plan_tier",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, unique=True
    )
    scan_credits: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="50")
    # Subscription plan tier (free | basic | pro). Schema-level monetization
    # plumbing; the pricing mechanism is a deferred ADR (SCOPE §9.2).
    plan_tier: Mapped[str] = mapped_column(String, nullable=False, server_default="free")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
