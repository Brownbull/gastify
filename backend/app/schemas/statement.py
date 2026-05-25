"""Statement extraction contracts for P5 prompt-lab and runtime design."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

date_type = date

StatementPdfStatus = Literal[
    "readable",
    "password_required",
    "password_invalid",
    "extraction_failed",
]

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

StatementReconciliationVerdict = Literal[
    "matched",
    "statement_only",
    "receipt_only",
    "ambiguous",
    "failed",
]


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


class StatementLine(BaseModel):
    source_order: int = Field(ge=1)
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


class StatementLineRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    statement_id: UUID
    source_order: int
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
