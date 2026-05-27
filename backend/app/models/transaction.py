"""Transaction tables: transactions, transaction_items, transaction_images."""

import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("llm_tokens_in >= 0", name="ck_transactions_llm_tokens_in_gte0"),
        CheckConstraint("llm_tokens_out >= 0", name="ck_transactions_llm_tokens_out_gte0"),
        CheckConstraint("llm_cost_usd >= 0", name="ck_transactions_llm_cost_usd_gte0"),
        CheckConstraint("scan_duration_ms >= 0", name="ck_transactions_scan_duration_ms_gte0"),
        CheckConstraint("llm_latency_ms >= 0", name="ck_transactions_llm_latency_ms_gte0"),
        CheckConstraint("queue_wait_ms >= 0", name="ck_transactions_queue_wait_ms_gte0"),
        CheckConstraint("thumbnail_gen_ms >= 0", name="ck_transactions_thumbnail_gen_ms_gte0"),
        CheckConstraint(
            "scan_review_level IN ('none', 'warning', 'needs_review')",
            name="ck_transactions_scan_review_level",
        ),
        CheckConstraint(
            "recurrence_kind IN ('none', 'fixed_term', 'recurring', 'unknown')",
            name="ck_transactions_recurrence_kind",
        ),
        CheckConstraint(
            "recurrence_interval IS NULL OR recurrence_interval IN "
            "('monthly', 'weekly', 'biweekly', 'annual', 'custom', 'unknown')",
            name="ck_transactions_recurrence_interval",
        ),
        CheckConstraint(
            "recurrence_source IN ('statement', 'receipt', 'user', 'inferred', 'none')",
            name="ck_transactions_recurrence_source",
        ),
        CheckConstraint(
            "term_current IS NULL OR term_current >= 1",
            name="ck_transactions_term_current_gte1",
        ),
        CheckConstraint(
            "term_total IS NULL OR term_total >= 1",
            name="ck_transactions_term_total_gte1",
        ),
        CheckConstraint(
            "term_current IS NULL OR term_total IS NULL OR term_current <= term_total",
            name="ck_transactions_term_current_lte_total",
        ),
        CheckConstraint(
            "recurrence_kind != 'fixed_term' OR term_total IS NOT NULL",
            name="ck_transactions_fixed_term_total_present",
        ),
        CheckConstraint(
            "recurrence_confidence IS NULL OR "
            "(recurrence_confidence >= 0 AND recurrence_confidence <= 1)",
            name="ck_transactions_recurrence_confidence_range",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    transaction_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    merchant: Mapped[str] = mapped_column(Text, nullable=False)
    merchant_user_edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    alias: Mapped[str | None] = mapped_column(Text, nullable=True)
    store_category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("store_categories.id"), nullable=True
    )
    store_category_source: Mapped[str | None] = mapped_column(String, nullable=True)
    store_category_confidence: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    store_category_mapping_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("merchant_mappings.id"), nullable=True
    )
    store_category_user_edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    discount_total_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    gross_total_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    reconstructed_total_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), ForeignKey("currencies.code"), nullable=False)
    amount_usd_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    fx_rate_to_usd: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    fx_captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    card_alias_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    receipt_type: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_kind: Mapped[str] = mapped_column(
        String, nullable=False, default="none", server_default="none"
    )
    recurrence_interval: Mapped[str | None] = mapped_column(String, nullable=True)
    term_current: Mapped[int | None] = mapped_column(Integer, nullable=True)
    term_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recurrence_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_source: Mapped[str] = mapped_column(
        String, nullable=False, default="none", server_default="none"
    )
    recurrence_confidence: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    recurrence_user_edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    prompt_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    merchant_source: Mapped[str | None] = mapped_column(String, nullable=True)
    scan_review_level: Mapped[str] = mapped_column(String, nullable=False, server_default="none")
    scan_review_signals: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, server_default="[]"
    )

    llm_tokens_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    llm_tokens_out: Mapped[int | None] = mapped_column(Integer, nullable=True)
    llm_cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)
    scan_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    llm_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    queue_wait_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thumbnail_gen_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["TransactionItem"]] = relationship(
        back_populates="transaction",
        cascade="all, delete-orphan",
        order_by="TransactionItem.sort_order",
    )
    images: Mapped[list["TransactionImage"]] = relationship(
        back_populates="transaction",
        cascade="all, delete-orphan",
        order_by="TransactionImage.sort_order",
    )


class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    name_user_edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    qty: Mapped[float | None] = mapped_column(Numeric(10, 3), nullable=True)
    unit_price_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_price_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    discount_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    discount_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    item_category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("item_categories.id"), nullable=True
    )
    item_category_user_edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    subcategory: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_source: Mapped[str | None] = mapped_column(String, nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    transaction: Mapped[Transaction] = relationship(back_populates="items")


class TransactionImage(Base):
    __tablename__ = "transaction_images"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_thumbnail: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    transaction: Mapped[Transaction] = relationship(back_populates="images")
