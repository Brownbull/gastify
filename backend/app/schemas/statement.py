"""Statement extraction contracts for P5 prompt-lab and runtime design."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, cast
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.transaction import TransactionCreate, TransactionItemCreate

date_type = date

StatementPdfStatus = Literal[
    "readable",
    "password_required",
    "password_invalid",
    "extraction_failed",
]
STATEMENT_PDF_STATUSES = frozenset(
    {"readable", "password_required", "password_invalid", "extraction_failed"}
)

StatementLifecycleStatus = Literal[
    "uploaded",
    "password_required",
    "password_invalid",
    "queued",
    "extracting",
    "extracted",
    "reconciling",
    "completed",
    "failed",
]

StatementReconciliationRunStatus = Literal[
    "pending",
    "running",
    "completed",
    "failed",
]

StatementLineType = Literal[
    "charge",
    "payment",
    "interest",
    "fee",
    "insurance",
    "tax",
    "adjustment",
    "other",
]
STATEMENT_LINE_TYPES = frozenset(
    {"charge", "payment", "interest", "fee", "insurance", "tax", "adjustment", "other"}
)

StatementRowType = Literal[
    "charge",
    "payment",
    "interest",
    "fee",
    "insurance",
    "tax",
    "adjustment",
    "summary",
    "other",
    "unknown",
]
STATEMENT_ROW_TYPES = frozenset(
    {
        "charge",
        "payment",
        "interest",
        "fee",
        "insurance",
        "tax",
        "adjustment",
        "summary",
        "other",
        "unknown",
    }
)

StatementAmountRole = Literal[
    "selected",
    "current_statement_amount",
    "current_installment",
    "purchase_total",
    "plan_total",
    "pending_balance",
    "foreign_original",
    "unknown",
]
STATEMENT_AMOUNT_ROLES = frozenset(
    {
        "selected",
        "current_statement_amount",
        "current_installment",
        "purchase_total",
        "plan_total",
        "pending_balance",
        "foreign_original",
        "unknown",
    }
)

StatementReconciliationVerdict = Literal[
    "matched",
    "statement_only",
    "receipt_only",
    "ambiguous",
    "failed",
]


def as_statement_pdf_status(value: str) -> StatementPdfStatus:
    if value not in STATEMENT_PDF_STATUSES:
        raise ValueError(f"invalid statement pdf status: {value}")
    return cast("StatementPdfStatus", value)


def as_statement_line_type(value: str) -> StatementLineType:
    if value not in STATEMENT_LINE_TYPES:
        raise ValueError(f"invalid statement line type: {value}")
    return cast("StatementLineType", value)


def as_statement_row_type(value: str) -> StatementRowType:
    if value not in STATEMENT_ROW_TYPES:
        raise ValueError(f"invalid statement row type: {value}")
    return cast("StatementRowType", value)


def as_statement_amount_role(value: str) -> StatementAmountRole:
    if value not in STATEMENT_AMOUNT_ROLES:
        raise ValueError(f"invalid statement amount role: {value}")
    return cast("StatementAmountRole", value)


class StatementPdfMetadata(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    issuer: str
    filename: str
    sha256: str
    size_bytes: int = Field(ge=0)
    page_count: int | None = Field(default=None, ge=0)
    is_encrypted: bool
    password_source_exists: bool = False
    status: StatementPdfStatus


class StatementInfo(BaseModel):
    issuer: str | None = None
    period_start: date_type | None = None
    period_end: date_type | None = None
    closing_date: date_type | None = None
    due_date: date_type | None = None
    currency: str = Field(default="CLP", min_length=3, max_length=3)
    total_debit_minor: int | None = None
    total_credit_minor: int | None = None
    payment_due_minor: int | None = None
    card_alias_candidate: str | None = None

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()


class StatementAmountCandidate(BaseModel):
    role: StatementAmountRole = "unknown"
    amount_minor: int
    currency: str = Field(default="CLP", min_length=3, max_length=3)
    visible_text: str | None = None
    column_label: str | None = None

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()


class StatementLine(BaseModel):
    source_order: int = Field(ge=1)
    row_type: StatementRowType = "unknown"
    date: date_type | None = None
    description: str
    amount_minor: int
    currency: str = Field(default="CLP", min_length=3, max_length=3)
    line_type: StatementLineType = "other"
    installment: str | None = None
    original_currency: str | None = Field(default=None, min_length=3, max_length=3)
    original_amount_minor: int | None = None
    card_alias_candidate: str | None = None
    category_key: str | None = None
    amount_selection_reason: str | None
    amount_candidates: list[StatementAmountCandidate]
    ledger_ready: bool = True
    confidence: float | None = Field(default=None, ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)
    source_row_index: int | None = Field(default=None, ge=1)
    source_page: int | None = Field(default=None, ge=1)
    field_provenance: dict[str, object] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _default_amount_evidence(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        values = dict(data)
        values.setdefault("row_type", values.get("line_type", "unknown"))
        values.setdefault("amount_selection_reason", None)
        values.setdefault("amount_candidates", [])
        values.setdefault("ledger_ready", True)
        values.setdefault("warnings", [])
        values.setdefault("field_provenance", {})
        return values

    @field_validator("currency", "original_currency")
    @classmethod
    def _uppercase_optional_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class StatementProcessingMetadata(BaseModel):
    provider: Literal["codex-pdf-text", "gemini", "fixture", "manual"] = "codex-pdf-text"
    prompt_id: str | None = None
    model_name: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    page_count: int | None = Field(default=None, ge=0)
    raw_text_sha256: str | None = None
    text_char_count: int = Field(default=0, ge=0)
    text_line_count: int = Field(default=0, ge=0)
    input_mode: str | None = None
    llm_input_tokens: int | None = Field(default=None, ge=0)
    llm_output_tokens: int | None = Field(default=None, ge=0)
    llm_cost_usd: Decimal | None = Field(default=None, ge=0)
    fallback_reason: str | None = None
    cache_status: str | None = None
    deterministic_routing_reasons: list[str] = Field(default_factory=list)
    evidence_row_count: int | None = Field(default=None, ge=0)
    evidence_candidate_row_count: int | None = Field(default=None, ge=0)
    warnings: list[str] = Field(default_factory=list)


class StatementExtractionOutput(BaseModel):
    document_type: Literal["credit_card_statement"] = "credit_card_statement"
    pdf_status: StatementPdfStatus = "readable"
    statement: StatementInfo
    lines: list[StatementLine] = Field(default_factory=list)
    processing: StatementProcessingMetadata


class StatementReconciliationResult(BaseModel):
    statement_line_id: str | None = None
    receipt_transaction_id: str | None = None
    verdict: StatementReconciliationVerdict
    score: float | None = Field(default=None, ge=0, le=1)
    reasons: list[str] = Field(default_factory=list)


class StatementRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    card_alias_id: UUID | None = None
    status: StatementLifecycleStatus
    original_filename: str
    file_sha256: str
    content_type: str
    file_size_bytes: int
    ai_processing_consent: bool
    issuer: str | None = None
    period_start: date_type | None = None
    period_end: date_type | None = None
    closing_date: date_type | None = None
    due_date: date_type | None = None
    currency: str
    total_debit_minor: int | None = None
    total_credit_minor: int | None = None
    payment_due_minor: int | None = None
    pdf_status: StatementPdfStatus
    is_encrypted: bool
    page_count: int | None = None
    confidence: float | None = None
    warnings: list[str] = Field(default_factory=list)
    error_code: str | None = None
    uploaded_at: datetime
    extracted_at: datetime | None = None
    reconciled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class StatementUploadResponse(BaseModel):
    statement: StatementRecordResponse
    duplicate: bool = False
    queued: bool = False
    password_required: bool = False


class StatementProcessRequest(BaseModel):
    password: str | None = Field(default=None, repr=False)


class StatementEvent(BaseModel):
    event_type: str
    statement_id: UUID
    step: str
    progress_pct: int = Field(ge=0, le=100)
    data: dict[str, object] | None = None
    error: dict[str, object] | None = None


class StatementLineRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    statement_id: UUID
    source_order: int
    row_type: StatementRowType = "unknown"
    line_date: date_type | None = None
    description: str
    amount_minor: int
    currency: str
    line_type: StatementLineType
    installment: str | None = None
    original_currency: str | None = None
    original_amount_minor: int | None = None
    card_alias_candidate: str | None = None
    category_key: str | None = None
    amount_selection_reason: str | None = None
    amount_candidates: list[StatementAmountCandidate] = Field(default_factory=list)
    ledger_ready: bool = True
    confidence: float | None = None
    warnings: list[str] = Field(default_factory=list)
    source_row_index: int | None = None
    source_page: int | None = None
    field_provenance: dict[str, object] = Field(default_factory=dict)


class StatementReconciliationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    statement_id: UUID
    status: StatementReconciliationRunStatus
    total_statement_lines: int
    matched_count: int
    statement_only_count: int
    receipt_only_count: int
    ambiguous_count: int
    coverage_ratio: float | None = None
    error_code: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class StatementReconciliationVerdictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID
    statement_line_id: UUID | None = None
    receipt_transaction_id: UUID | None = None
    verdict: StatementReconciliationVerdict
    score: float | None = Field(default=None, ge=0, le=1)
    reasons: list[str] = Field(default_factory=list)
    created_at: datetime


class StatementReconciliationLineSummary(BaseModel):
    id: UUID
    statement_id: UUID
    source_order: int
    row_type: StatementRowType = "unknown"
    line_date: date_type | None = None
    description: str
    amount_minor: int
    currency: str
    line_type: StatementLineType
    installment: str | None = None
    card_alias_candidate: str | None = None
    ledger_ready: bool = True
    warnings: list[str] = Field(default_factory=list)


class StatementReconciliationReceiptSummary(BaseModel):
    id: UUID
    transaction_date: date_type
    merchant: str
    merchant_user_edited_at: datetime | None = None
    total_minor: int
    currency: str
    card_alias_id: UUID | None = None
    receipt_type: str | None = None


class StatementTransactionCandidateItem(TransactionItemCreate):
    """Transaction item payload for a statement-only line accepted into the ledger."""


class StatementTransactionCandidate(TransactionCreate):
    """Ready-to-submit transaction payload for a statement-only spend line."""


class StatementReconciliationBucketItem(BaseModel):
    verdict: StatementReconciliationVerdictResponse
    statement_line: StatementReconciliationLineSummary | None = None
    receipt_transaction: StatementReconciliationReceiptSummary | None = None
    candidate_transaction: StatementTransactionCandidate | None = None


class StatementReconciliationResponse(BaseModel):
    run: StatementReconciliationRunResponse
    matched: list[StatementReconciliationBucketItem] = Field(default_factory=list)
    statement_only: list[StatementReconciliationBucketItem] = Field(default_factory=list)
    receipt_only: list[StatementReconciliationBucketItem] = Field(default_factory=list)
    ambiguous: list[StatementReconciliationBucketItem] = Field(default_factory=list)
    failed: list[StatementReconciliationBucketItem] = Field(default_factory=list)
