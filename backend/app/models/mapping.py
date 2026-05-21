"""Mapping tables: merchant_mappings, category_mappings."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MerchantMapping(Base):
    __tablename__ = "merchant_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    original_merchant: Mapped[str] = mapped_column(Text, nullable=False)
    target_merchant: Mapped[str] = mapped_column(Text, nullable=False)
    store_category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("store_categories.id"), nullable=True
    )
    confidence: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, server_default="1.00")
    source: Mapped[str] = mapped_column(String, nullable=False, server_default="user")
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class CategoryMapping(Base):
    __tablename__ = "category_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    original_item: Mapped[str] = mapped_column(Text, nullable=False)
    target_item: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("item_categories.id"), nullable=False
    )
    merchant_pattern: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, server_default="1.00")
    source: Mapped[str] = mapped_column(String, nullable=False, server_default="user")
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
