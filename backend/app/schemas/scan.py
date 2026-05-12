"""Pydantic schemas for the scan pipeline (P2 Phases 1-3)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ImageMeta(BaseModel):
    original_filename: str
    content_type: str
    file_size_bytes: int
    width: int | None = None
    height: int | None = None


class ScanSubmission(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ownership_scope_id: uuid.UUID
    status: str
    original_filename: str
    content_type: str
    file_size_bytes: int
    image_path: str
    thumbnail_path: str | None = None
    submitted_at: datetime


class ScanResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    submitted_at: datetime
    processed_at: datetime | None = None
    error_code: str | None = None
    error_message: str | None = None


class ScanEvent(BaseModel):
    event_type: str
    scan_id: uuid.UUID
    step: str
    progress_pct: int = Field(ge=0, le=100)
    data: dict[str, Any] | None = None
    error: dict[str, Any] | None = None


class LineItemExtraction(BaseModel):
    name: str
    qty: Decimal | None = None
    unit_price: Decimal | None = None
    total_price: Decimal


class GeminiExtractionResult(BaseModel):
    merchant_name: str
    transaction_date: str
    currency_code: str
    total_amount: Decimal
    tax_amount: Decimal | None = None
    discount_amount: Decimal | None = None
    line_items: list[LineItemExtraction] = Field(default_factory=list)
    confidence_score: float = Field(ge=0.0, le=1.0)


class CategoryAssignment(BaseModel):
    line_item_index: int
    category_key: str
    confidence: float = Field(ge=0.0, le=1.0)


class CategorizationResult(BaseModel):
    assignments: list[CategoryAssignment] = Field(default_factory=list)


class MathReconciliationVerdict(BaseModel):
    passed: bool
    discrepancy_minor_units: int
    adjusted_total: int | None = None
