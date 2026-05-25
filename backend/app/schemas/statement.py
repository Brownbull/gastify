"""Statement extraction contracts for P5 prompt-lab and runtime design."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

date_type = date

StatementPdfStatus = Literal[
    "readable",
    "password_required",
    "password_invalid",
    "extraction_failed",
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
