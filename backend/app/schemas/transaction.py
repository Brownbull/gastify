"""Transaction request/response schemas per OpenAPI sketch §2."""

import re
from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.insights import ItemInsightFlagKind
from app.schemas.recurrence import RecurrenceInterval, RecurrenceKind, RecurrenceSource
from app.schemas.scan import ScanReviewLevel, ScanReviewSignal

# --- Item schemas ---


# Manual-entry sanitization (user spec): names may contain letters (incl. accents),
# digits, spaces and dots — nothing else. Applies to API creates only; the scan and
# statement pipelines construct models internally with extracted text.
_NAME_PATTERN = re.compile(r"^[\w\sÁÉÍÓÚÜÑáéíóúüñ.]+$", re.UNICODE)


def _validate_clean_name(value: str, field_label: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_label} must not be empty")
    if not _NAME_PATTERN.match(cleaned) or "_" in cleaned:
        raise ValueError(f"{field_label} may only contain letters, numbers, spaces and dots")
    return cleaned


class TransactionItemCreate(BaseModel):
    name: str
    # User spec: quantities are INTEGERS >= 0 (typed float for wire-compat; validated).
    qty: float | None = Field(default=None, ge=0)
    unit_price_minor: int | None = Field(default=None, ge=0)
    total_price_minor: int = Field(ge=0)

    @field_validator("name")
    @classmethod
    def _clean_item_name(cls, value: str) -> str:
        return _validate_clean_name(value, "Item name")

    @field_validator("qty")
    @classmethod
    def _integer_quantity(cls, value: float | None) -> float | None:
        if value is not None and value != int(value):
            raise ValueError("Quantity must be a whole number")
        return value

    discount_minor: int | None = Field(default=None, deprecated=True)
    discount_label: str | None = Field(default=None, deprecated=True)
    item_category_id: UUID | None = None
    subcategory: str | None = None
    category_source: str | None = None
    is_flagged: bool = False
    sort_order: int = 0


class TransactionItemUpdate(BaseModel):
    id: UUID
    name: str | None = None
    qty: float | None = None
    unit_price_minor: int | None = None
    total_price_minor: int | None = None
    discount_minor: int | None = Field(default=None, deprecated=True)
    discount_label: str | None = Field(default=None, deprecated=True)
    item_category_id: UUID | None = None
    subcategory: str | None = None
    category_source: str | None = None
    is_flagged: bool | None = None


class TransactionItemResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    name_user_edited_at: datetime | None = None
    qty: float | None = None
    unit_price_minor: int | None = None
    total_price_minor: int
    discount_minor: int | None = Field(default=None, deprecated=True)
    discount_label: str | None = Field(default=None, deprecated=True)
    item_category_id: UUID | None = None
    item_category_user_edited_at: datetime | None = None
    subcategory: str | None = None
    category_source: str | None = None
    is_flagged: bool
    flags: list[ItemInsightFlagKind] = Field(default_factory=list)
    sort_order: int


# --- Image schemas ---


class TransactionImageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    image_url: str
    is_thumbnail: bool
    sort_order: int


# --- Transaction schemas ---


class TransactionCreate(BaseModel):
    transaction_date: date
    transaction_time: time | None = None
    merchant: str

    @field_validator("merchant")
    @classmethod
    def _clean_merchant(cls, value: str) -> str:
        return _validate_clean_name(value, "Merchant")

    store_category_id: UUID | None = None
    store_category_source: Literal["mapping", "ai", "user", "unknown"] | None = None
    store_category_confidence: Decimal | None = Field(default=None, ge=0, le=1)
    store_category_mapping_id: UUID | None = None
    total_minor: int = Field(ge=0)
    discount_total_minor: int | None = None
    gross_total_minor: int | None = None
    reconstructed_total_minor: int | None = None
    currency: str = Field(max_length=3)
    receipt_type: Literal["scan", "manual", "statement", "import"] | None = None
    country: str | None = None
    city: str | None = None
    card_alias_id: UUID | None = None
    recurrence_kind: RecurrenceKind = "none"
    recurrence_interval: RecurrenceInterval | None = None
    term_current: int | None = Field(default=None, ge=1)
    term_total: int | None = Field(default=None, ge=1)
    recurrence_label: str | None = None
    recurrence_source: RecurrenceSource = "none"
    recurrence_confidence: Decimal | None = Field(default=None, ge=0, le=1)
    merchant_source: Literal["ocr", "user", "ai", "mapping"] | None = None
    llm_tokens_in: int | None = Field(default=None, ge=0)
    llm_tokens_out: int | None = Field(default=None, ge=0)
    llm_cost_usd: Decimal | None = Field(default=None, ge=0)
    scan_duration_ms: int | None = Field(default=None, ge=0)
    llm_latency_ms: int | None = Field(default=None, ge=0)
    queue_wait_ms: int | None = Field(default=None, ge=0)
    thumbnail_gen_ms: int | None = Field(default=None, ge=0)
    items: list[TransactionItemCreate] = []
    image_urls: list[str] = []


class TransactionUpdate(BaseModel):
    transaction_date: date | None = None
    transaction_time: time | None = None
    merchant: str | None = None
    store_category_id: UUID | None = None
    total_minor: int | None = None
    discount_total_minor: int | None = None
    gross_total_minor: int | None = None
    reconstructed_total_minor: int | None = None
    currency: str | None = Field(default=None, max_length=3)
    receipt_type: str | None = None
    country: str | None = None
    city: str | None = None
    card_alias_id: UUID | None = None
    recurrence_kind: RecurrenceKind | None = None
    recurrence_interval: RecurrenceInterval | None = None
    term_current: int | None = Field(default=None, ge=1)
    term_total: int | None = Field(default=None, ge=1)
    recurrence_label: str | None = None
    recurrence_source: RecurrenceSource | None = None
    recurrence_confidence: Decimal | None = Field(default=None, ge=0, le=1)
    items: list[TransactionItemUpdate] | None = None


class TransactionItemFlagsUpdate(BaseModel):
    flags: list[ItemInsightFlagKind] = Field(default_factory=list, max_length=2)


class TransactionListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    transaction_date: date
    transaction_time: time | None = None
    merchant: str
    merchant_user_edited_at: datetime | None = None
    alias: str | None = None
    store_category_id: UUID | None = None
    store_category_source: str | None = None
    store_category_confidence: Decimal | None = None
    store_category_mapping_id: UUID | None = None
    store_category_user_edited_at: datetime | None = None
    total_minor: int
    discount_total_minor: int | None = None
    gross_total_minor: int | None = None
    reconstructed_total_minor: int | None = None
    scan_review_level: ScanReviewLevel = "none"
    currency: str
    amount_usd_minor: int | None = None
    fx_rate_to_usd: Decimal | None = None
    card_alias_id: UUID | None = None
    receipt_type: str | None = None
    thumbnail_url: str | None = None
    country: str | None = None
    city: str | None = None
    recurrence_kind: RecurrenceKind = "none"
    recurrence_interval: RecurrenceInterval | None = None
    term_current: int | None = None
    term_total: int | None = None
    recurrence_label: str | None = None
    recurrence_source: RecurrenceSource = "none"
    recurrence_confidence: Decimal | None = None
    recurrence_user_edited_at: datetime | None = None
    item_count: int = 0
    # D74: True once shared into a group → renders a lock badge in the list.
    is_shared: bool = False
    # A statement-reconciliation MATCHED verdict references this transaction — the
    # ledger's "covered by a statement" indicator (REQ-09 surface).
    statement_matched: bool = False
    created_at: datetime
    updated_at: datetime


class TransactionDetail(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    transaction_date: date
    transaction_time: time | None = None
    merchant: str
    merchant_user_edited_at: datetime | None = None
    alias: str | None = None
    store_category_id: UUID | None = None
    store_category_source: str | None = None
    store_category_confidence: Decimal | None = None
    store_category_mapping_id: UUID | None = None
    store_category_user_edited_at: datetime | None = None
    total_minor: int
    discount_total_minor: int | None = None
    gross_total_minor: int | None = None
    reconstructed_total_minor: int | None = None
    scan_review_level: ScanReviewLevel = "none"
    scan_review_signals: list[ScanReviewSignal] = Field(default_factory=list)
    currency: str
    amount_usd_minor: int | None = None
    fx_rate_to_usd: Decimal | None = None
    fx_captured_at: datetime | None = None
    card_alias_id: UUID | None = None
    receipt_type: str | None = None
    thumbnail_url: str | None = None
    country: str | None = None
    city: str | None = None
    recurrence_kind: RecurrenceKind = "none"
    recurrence_interval: RecurrenceInterval | None = None
    term_current: int | None = None
    term_total: int | None = None
    recurrence_label: str | None = None
    recurrence_source: RecurrenceSource = "none"
    recurrence_confidence: Decimal | None = None
    recurrence_user_edited_at: datetime | None = None
    llm_tokens_in: int | None = None
    llm_tokens_out: int | None = None
    llm_cost_usd: Decimal | None = None
    scan_duration_ms: int | None = None
    llm_latency_ms: int | None = None
    queue_wait_ms: int | None = None
    thumbnail_gen_ms: int | None = None
    # D74: True once shared into a group → content fields are locked client-side.
    is_shared: bool = False
    # A statement-reconciliation MATCHED verdict references this transaction — the
    # ledger's "covered by a statement" indicator (REQ-09 surface).
    statement_matched: bool = False
    items: list[TransactionItemResponse] = []
    images: list[TransactionImageResponse] = []
    created_at: datetime
    updated_at: datetime


# --- Batch operation schemas ---


class BatchUpdateFields(BaseModel):
    merchant: str | None = None
    store_category_id: UUID | None = None


class BatchUpdateRequest(BaseModel):
    transaction_ids: list[UUID] = Field(max_length=200)
    updates: BatchUpdateFields


class BatchDeleteRequest(BaseModel):
    transaction_ids: list[UUID] = Field(max_length=200)


class BatchResult(BaseModel):
    count: int
