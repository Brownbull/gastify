"""Credit balance table — per-scope scan credit tracking."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class CreditBalance(Base):
    __tablename__ = "credit_balances"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, unique=True
    )
    scan_credits: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="50")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
