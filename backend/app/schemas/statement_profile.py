"""Internal contracts for unknown statement profile fallback."""

from __future__ import annotations

from datetime import date  # noqa: TC003 - pydantic resolves this runtime annotation.
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.statement import StatementExtractionOutput  # noqa: TC001 - pydantic model field.

STATEMENT_COMPACT_EVIDENCE_SCHEMA_VERSION: Literal["statement-compact-evidence.v2"] = (
    "statement-compact-evidence.v2"
)

StatementProfileEvidenceStatus = Literal[
    "readable",
    "password_required",
    "password_invalid",
    "extraction_failed",
    "insufficient_text_layer",
]
StatementProfileSignHint = Literal["positive", "negative", "unknown"]
StatementProfileAmountRoleHint = Literal[
    "selected",
    "current_statement_amount",
    "current_installment",
    "purchase_total",
    "plan_total",
    "pending_balance",
    "foreign_original",
    "unknown",
]
StatementProfileSignPolicy = Literal[
    "charges_positive_payments_negative",
    "visible_sign",
    "amount_column_direction",
    "unknown",
]
StatementProfileCurrencyPolicy = Literal[
    "billing_currency_default",
    "selected_amount_currency",
    "mixed_billing_and_original",
    "unknown",
]


class StatementWordToken(BaseModel):
    text: str
    x0: float
    x1: float


class StatementDateToken(BaseModel):
    visible_text: str
    parsed_date: date | None = None
    x0: float | None = None
    x1: float | None = None


class StatementAmountToken(BaseModel):
    visible_text: str
    amount_minor: int
    currency_hint: str | None = Field(default=None, min_length=3, max_length=3)
    sign_hint: StatementProfileSignHint = "unknown"
    role_hint: StatementProfileAmountRoleHint = "unknown"
    x0: float | None = None
    x1: float | None = None

    @field_validator("currency_hint")
    @classmethod
    def _uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class StatementInstallmentToken(BaseModel):
    visible_text: str
    term_current: int | None = Field(default=None, ge=1)
    term_total: int | None = Field(default=None, ge=1)
    x0: float | None = None
    x1: float | None = None


class StatementRowCandidate(BaseModel):
    row_index: int = Field(ge=1)
    page: int = Field(ge=1)
    y0: float
    y1: float
    text: str
    words: list[StatementWordToken] = Field(default_factory=list)
    date_candidates: list[StatementDateToken] = Field(default_factory=list)
    amount_candidates: list[StatementAmountToken] = Field(default_factory=list)
    currency_hints: list[str] = Field(default_factory=list)
    installment_candidates: list[StatementInstallmentToken] = Field(default_factory=list)
    context_before: list[str] = Field(default_factory=list)
    context_after: list[str] = Field(default_factory=list)
    likely_financial: bool = False


class StatementCompactEvidence(BaseModel):
    schema_version: Literal["statement-compact-evidence.v2"] = (
        STATEMENT_COMPACT_EVIDENCE_SCHEMA_VERSION
    )
    input_mode: Literal["profile-rows"] = "profile-rows"
    status: StatementProfileEvidenceStatus
    is_encrypted: bool
    page_count: int | None = Field(default=None, ge=0)
    raw_text_sha256: str | None = None
    text_char_count: int = Field(default=0, ge=0)
    text_line_count: int = Field(default=0, ge=0)
    row_count: int = Field(default=0, ge=0)
    candidate_row_count: int = Field(default=0, ge=0)
    rows: list[StatementRowCandidate] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    privacy: dict[str, bool] = Field(
        default_factory=lambda: {
            "raw_pdf_bytes_included": False,
            "passwords_included": False,
            "decrypted_pdf_written": False,
        }
    )


class StatementRowRange(BaseModel):
    start_row: int = Field(ge=1)
    end_row: int = Field(ge=1)
    reason: str | None = None


class StatementColumnProfile(BaseModel):
    label: str | None = None
    x_min: float | None = None
    x_max: float | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class StatementAmountColumnProfile(StatementColumnProfile):
    role: StatementProfileAmountRoleHint = "unknown"
    currency: str | None = Field(default=None, min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class StatementLayoutProfile(BaseModel):
    document_type: Literal["credit_card_statement_layout_profile"] = (
        "credit_card_statement_layout_profile"
    )
    transaction_row_ranges: list[StatementRowRange] = Field(default_factory=list)
    excluded_row_ranges: list[StatementRowRange] = Field(default_factory=list)
    date_column: StatementColumnProfile | None = None
    description_column: StatementColumnProfile | None = None
    amount_column: StatementColumnProfile | None = None
    amount_columns: list[StatementAmountColumnProfile] = Field(default_factory=list)
    currency_column: StatementColumnProfile | None = None
    installment_column: StatementColumnProfile | None = None
    default_currency: str = Field(default="CLP", min_length=3, max_length=3)
    currency_policy: StatementProfileCurrencyPolicy = "billing_currency_default"
    sign_policy: StatementProfileSignPolicy = "charges_positive_payments_negative"
    confidence: float = Field(default=0.0, ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)
    reasoning_summary: str | None = None

    @field_validator("default_currency")
    @classmethod
    def _uppercase_default_currency(cls, value: str) -> str:
        return value.upper()


class StatementProfileApplicationResult(BaseModel):
    extraction: StatementExtractionOutput
    compact_evidence: StatementCompactEvidence
    layout_profile: StatementLayoutProfile
    unresolved_rows: list[StatementRowCandidate] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
