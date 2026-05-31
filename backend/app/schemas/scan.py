"""Pydantic schemas for the scan pipeline (P2 Phases 1-3)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.reference.categories import V4_CATEGORY_KEYS, V4_STORE_CATEGORY_KEYS
from app.schemas.recurrence import RecurrenceHint


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
    # Set once the scan persists its transaction (completed / needs_review). Lets the
    # mobile poll fallback navigate to the result transaction without the WS event (D66).
    transaction_id: uuid.UUID | None = None


class ScanEvent(BaseModel):
    event_type: str
    scan_id: uuid.UUID
    step: str
    progress_pct: int = Field(ge=0, le=100)
    data: dict[str, Any] | None = None
    error: dict[str, Any] | None = None


type ScanReviewLevel = Literal["none", "warning", "needs_review"]
type ScanReviewSignalCode = Literal[
    "math_reconciliation_delta",
    "item_structure_changed",
    "discount_evidence_unresolved",
    "visible_total_conflict",
    "synthesized_service_item",
]
type ScanReviewSignalSeverity = Literal["warning", "needs_review"]
type ScanReviewSignalSourceStage = Literal["extraction", "postprocess", "math_gate"]


class ScanReviewSignal(BaseModel):
    code: ScanReviewSignalCode
    severity: ScanReviewSignalSeverity
    source_stage: ScanReviewSignalSourceStage
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ScanCompleteLineItem(BaseModel):
    name: str
    qty: float | None = None
    unit_price: float | None = None
    total_price: float


class ScanCompleteData(BaseModel):
    status: Literal["completed", "needs_review"]
    transaction_id: str
    merchant_name: str
    transaction_date: str
    currency_code: str
    total_amount: float
    discount_amount: float | None = None
    gross_total_amount: float | None = None
    reconstructed_total: int | None = None
    reconciliation_severity: str
    line_items_count: int
    line_items: list[ScanCompleteLineItem] = Field(default_factory=list)
    confidence_score: float
    is_unknown_merchant: bool
    review_level: ScanReviewLevel = "none"
    review_signals: list[ScanReviewSignal] = Field(default_factory=list)
    discrepancy: int | None = None
    discrepancy_ratio: float | None = None


class LineItemExtraction(BaseModel):
    name: str
    qty: Decimal | None = None
    unit_price: Decimal | None = Field(
        default=None,
        description=(
            "Integer minor-unit money amount. Example: CLP 1.890 -> 1890, USD $48.50 -> 4850."
        ),
    )
    total_price: Decimal = Field(
        description=(
            "Integer minor-unit money amount. Example: CLP 1.890 -> 1890, USD $48.50 -> 4850."
        )
    )
    discount_amount: Decimal | None = Field(
        default=None,
        description=(
            "Deprecated compatibility field. Scan-created items leave this null; "
            "receipt discounts are transaction-level."
        ),
        deprecated=True,
    )
    discount_label: str | None = Field(
        default=None,
        description=(
            "Deprecated compatibility field. Scan-created items leave this null; "
            "receipt discounts are transaction-level."
        ),
        deprecated=True,
    )
    discount_attribution_confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        deprecated=True,
    )
    source_lines: list[str] = Field(
        default_factory=list,
        description="Visible receipt text lines used to construct this item.",
    )


class ReceiptAdjustmentEvidence(BaseModel):
    label: str = "Discount"
    amount: Decimal = Field(description="Positive integer minor-unit receipt adjustment amount.")
    source_lines: list[str] = Field(default_factory=list)
    applies_to_line_item_indexes: list[int] = Field(
        default_factory=list,
        description=(
            "Deprecated compatibility field. Scan post-processing ignores item attribution "
            "and uses receipt-level discount evidence only."
        ),
        deprecated=True,
    )
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class RawLineItemExtraction(LineItemExtraction):
    modifier_lines: list[str] = Field(
        default_factory=list,
        description="Visible quantity, unit-price, weight, or promotion lines near this item.",
    )


class RawGeminiExtractionResult(BaseModel):
    merchant_name: str
    transaction_date: str
    currency_code: str
    total_amount: Decimal | None = Field(
        default=None,
        description=(
            "Integer minor-unit grand total when visible. Null is allowed for raw model output; "
            "post-processing resolves a final total from visible or reconstructed evidence."
        ),
    )
    tax_amount: Decimal | None = Field(
        default=None,
        description="Integer minor-unit tax amount when separately listed.",
    )
    discount_amount: Decimal | None = Field(
        default=None,
        description="Positive integer minor-unit summary discount when separately listed.",
    )
    line_items: list[RawLineItemExtraction] = Field(default_factory=list)
    adjustment_lines: list[ReceiptAdjustmentEvidence] = Field(default_factory=list)
    source_lines: list[str] = Field(default_factory=list)
    recurrence_hint: RecurrenceHint | None = None
    confidence_score: float = Field(ge=0.0, le=1.0)


class GeminiExtractionResult(BaseModel):
    merchant_name: str
    transaction_date: str
    currency_code: str
    total_amount: Decimal = Field(
        description=(
            "Integer minor-unit grand total. Example: CLP 102.052 -> 102052, USD $48.50 -> 4850."
        )
    )
    tax_amount: Decimal | None = Field(
        default=None,
        description="Integer minor-unit tax amount when separately listed.",
    )
    discount_amount: Decimal | None = Field(
        default=None,
        description=("Positive integer minor-unit receipt discount total, or null when absent."),
    )
    line_items: list[LineItemExtraction] = Field(default_factory=list)
    recurrence_hint: RecurrenceHint | None = None
    confidence_score: float = Field(ge=0.0, le=1.0)


class CategoryAssignment(BaseModel):
    line_item_index: int
    category_key: str
    confidence: float = Field(ge=0.0, le=1.0)
    subcategory: str | None = Field(
        default=None,
        description="Optional free-form item subcategory narrower than the selected L4 category.",
    )

    @field_validator("category_key")
    @classmethod
    def validate_l4_item_category(cls, value: str) -> str:
        if value not in V4_CATEGORY_KEYS:
            raise ValueError(f"category_key must be a valid L4 item category key; got {value!r}")
        return value


class CategorizationResult(BaseModel):
    assignments: list[CategoryAssignment] = Field(default_factory=list)


class StoreCategorizationResult(BaseModel):
    category_key: str
    confidence: float = Field(ge=0.0, le=1.0)
    rationale_short: str | None = Field(default=None, max_length=160)
    needs_review: bool = False

    @field_validator("category_key")
    @classmethod
    def validate_l2_store_category(cls, value: str) -> str:
        if value not in V4_STORE_CATEGORY_KEYS:
            raise ValueError(f"category_key must be a valid L2 store category key; got {value!r}")
        return value


class MathReconciliationVerdict(BaseModel):
    passed: bool
    discrepancy_minor_units: int
    reconstructed_total: int | None = Field(
        default=None,
        description="Deterministic item/tax/discount reconstruction in minor units.",
    )
    discrepancy_ratio: float = Field(
        default=0.0,
        description="Absolute discrepancy divided by stated receipt total.",
    )
    severity: str = Field(
        default="none",
        description="Reconciliation severity: none, minor, or major_warning.",
    )
    adjusted_total: int | None = None
