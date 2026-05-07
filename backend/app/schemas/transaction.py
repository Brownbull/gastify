"""Transaction request/response schemas per OpenAPI sketch §2."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# --- Item schemas ---


class TransactionItemCreate(BaseModel):
    name: str
    qty: float | None = None
    unit_price_minor: int | None = None
    total_price_minor: int
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
    item_category_id: UUID | None = None
    item_category_user_edited_at: datetime | None = None
    subcategory: str | None = None
    category_source: str | None = None
    is_flagged: bool
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
    store_category_id: UUID | None = None
    total_minor: int
    currency: str = Field(max_length=3)
    receipt_type: Literal["scan", "manual", "statement", "import"] | None = None
    country: str | None = None
    city: str | None = None
    card_alias_id: UUID | None = None
    merchant_source: Literal["ocr", "user", "ai", "mapping"] | None = None
    llm_tokens_in: int | None = None
    llm_tokens_out: int | None = None
    llm_cost_usd: Decimal | None = None
    scan_duration_ms: int | None = None
    llm_latency_ms: int | None = None
    queue_wait_ms: int | None = None
    thumbnail_gen_ms: int | None = None
    items: list[TransactionItemCreate] = []
    image_urls: list[str] = []


class TransactionUpdate(BaseModel):
    transaction_date: date | None = None
    transaction_time: time | None = None
    merchant: str | None = None
    store_category_id: UUID | None = None
    total_minor: int | None = None
    currency: str | None = Field(default=None, max_length=3)
    receipt_type: str | None = None
    country: str | None = None
    city: str | None = None
    card_alias_id: UUID | None = None
    items: list[TransactionItemUpdate] | None = None


class TransactionListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    transaction_date: date
    transaction_time: time | None = None
    merchant: str
    merchant_user_edited_at: datetime | None = None
    alias: str | None = None
    store_category_id: UUID | None = None
    store_category_user_edited_at: datetime | None = None
    total_minor: int
    currency: str
    amount_usd_minor: int | None = None
    fx_rate_to_usd: Decimal | None = None
    card_alias_id: UUID | None = None
    receipt_type: str | None = None
    thumbnail_url: str | None = None
    country: str | None = None
    city: str | None = None
    item_count: int = 0
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
    store_category_user_edited_at: datetime | None = None
    total_minor: int
    currency: str
    amount_usd_minor: int | None = None
    fx_rate_to_usd: Decimal | None = None
    card_alias_id: UUID | None = None
    receipt_type: str | None = None
    thumbnail_url: str | None = None
    country: str | None = None
    city: str | None = None
    llm_tokens_in: int | None = None
    llm_tokens_out: int | None = None
    llm_cost_usd: Decimal | None = None
    scan_duration_ms: int | None = None
    llm_latency_ms: int | None = None
    queue_wait_ms: int | None = None
    thumbnail_gen_ms: int | None = None
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
