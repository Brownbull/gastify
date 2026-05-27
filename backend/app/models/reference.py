"""Reference tables: currencies, store_categories, item_categories."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, SmallInteger, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Currency(Base):
    __tablename__ = "currencies"

    code: Mapped[str] = mapped_column(String(3), primary_key=True)
    exponent: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    display_labels: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class StoreCategory(Base):
    __tablename__ = "store_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="2")
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("store_categories.id"), nullable=True
    )
    display_labels: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, server_default="{}"
    )
    is_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ItemCategory(Base):
    __tablename__ = "item_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="4")
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("item_categories.id"), nullable=True
    )
    display_labels: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, server_default="{}"
    )
    is_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
