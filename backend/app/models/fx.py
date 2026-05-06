"""FX rate table — write-once cache per (date, from, to) triple."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class FxRate(Base):
    __tablename__ = "fx_rates"

    rate_date: Mapped[date] = mapped_column(Date, primary_key=True)
    from_currency: Mapped[str] = mapped_column(
        String(3), ForeignKey("currencies.code"), primary_key=True
    )
    to_currency: Mapped[str] = mapped_column(
        String(3), ForeignKey("currencies.code"), primary_key=True
    )
    rate: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
