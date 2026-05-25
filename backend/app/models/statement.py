"""Statement reconciliation persistence models."""

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class StatementStatus(enum.StrEnum):
    UPLOADED = "uploaded"
    PASSWORD_REQUIRED = "password_required"
    PASSWORD_INVALID = "password_invalid"
    QUEUED = "queued"
    EXTRACTING = "extracting"
    EXTRACTED = "extracted"
    RECONCILING = "reconciling"
    COMPLETED = "completed"
    FAILED = "failed"


class StatementLineType(enum.StrEnum):
    CHARGE = "charge"
    PAYMENT = "payment"
    INTEREST = "interest"
    FEE = "fee"
    INSURANCE = "insurance"
    TAX = "tax"
    ADJUSTMENT = "adjustment"
    OTHER = "other"


class ReconciliationRunStatus(enum.StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ReconciliationVerdict(enum.StrEnum):
    MATCHED = "matched"
    STATEMENT_ONLY = "statement_only"
    RECEIPT_ONLY = "receipt_only"
    AMBIGUOUS = "ambiguous"
    FAILED = "failed"


class CardAlias(Base):
    __tablename__ = "card_aliases"
    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="ck_card_aliases_name_not_blank"),
        UniqueConstraint("id", "ownership_scope_id", name="uq_card_aliases_id_scope"),
        Index("ix_card_aliases_scope_archived", "ownership_scope_id", "archived_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    statements: Mapped[list["Statement"]] = relationship(back_populates="card_alias")


class Statement(Base):
    __tablename__ = "statements"
    __table_args__ = (
        CheckConstraint("file_size_bytes >= 0", name="ck_statements_file_size_bytes_gte0"),
        CheckConstraint("page_count IS NULL OR page_count >= 0", name="ck_statements_page_count"),
        CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
            name="ck_statements_confidence_range",
        ),
        CheckConstraint(
            "total_debit_minor IS NULL OR total_debit_minor >= 0",
            name="ck_statements_total_debit_gte0",
        ),
        CheckConstraint(
            "total_credit_minor IS NULL OR total_credit_minor >= 0",
            name="ck_statements_total_credit_gte0",
        ),
        CheckConstraint(
            "payment_due_minor IS NULL OR payment_due_minor >= 0",
            name="ck_statements_payment_due_gte0",
        ),
        UniqueConstraint("ownership_scope_id", "file_sha256", name="uq_statements_scope_sha256"),
        Index("ix_statements_scope_status", "ownership_scope_id", "status"),
        Index("ix_statements_scope_period", "ownership_scope_id", "period_start", "period_end"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    card_alias_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("card_aliases.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[StatementStatus] = mapped_column(
        Enum(
            StatementStatus,
            name="statement_status",
            values_callable=lambda enum_values: [value.value for value in enum_values],
        ),
        nullable=False,
        server_default=StatementStatus.UPLOADED.value,
    )
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    content_type: Mapped[str] = mapped_column(
        String(100), nullable=False, server_default="application/pdf"
    )
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    issuer: Mapped[str | None] = mapped_column(Text, nullable=True)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    closing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), ForeignKey("currencies.code"), nullable=False)
    total_debit_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_credit_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    payment_due_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    pdf_status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="readable")
    is_encrypted: Mapped[bool] = mapped_column(nullable=False, server_default="false")
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extraction_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    extraction_prompt_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_model_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3), nullable=True)
    warnings: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list, server_default="[]"
    )
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    extracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reconciled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    card_alias: Mapped[CardAlias | None] = relationship(back_populates="statements")
    lines: Mapped[list["StatementLine"]] = relationship(
        back_populates="statement",
        cascade="all, delete-orphan",
        order_by="StatementLine.source_order",
    )
    reconciliation_runs: Mapped[list["StatementReconciliationRun"]] = relationship(
        back_populates="statement",
        cascade="all, delete-orphan",
        order_by="StatementReconciliationRun.created_at",
    )


class StatementLine(Base):
    __tablename__ = "statement_lines"
    __table_args__ = (
        CheckConstraint("source_order >= 1", name="ck_statement_lines_source_order_gte1"),
        UniqueConstraint("statement_id", "source_order", name="uq_statement_lines_order"),
        Index("ix_statement_lines_statement_date", "statement_id", "line_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    statement_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("statements.id", ondelete="CASCADE"), nullable=False
    )
    source_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    line_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), ForeignKey("currencies.code"), nullable=False)
    line_type: Mapped[StatementLineType] = mapped_column(
        Enum(
            StatementLineType,
            name="statement_line_type",
            values_callable=lambda enum_values: [value.value for value in enum_values],
        ),
        nullable=False,
        server_default=StatementLineType.OTHER.value,
    )
    installment: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    original_amount_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    card_alias_candidate: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    statement: Mapped[Statement] = relationship(back_populates="lines")


class StatementReconciliationRun(Base):
    __tablename__ = "statement_reconciliation_runs"
    __table_args__ = (
        CheckConstraint("total_statement_lines >= 0", name="ck_recon_runs_total_lines_gte0"),
        CheckConstraint("matched_count >= 0", name="ck_recon_runs_matched_gte0"),
        CheckConstraint("statement_only_count >= 0", name="ck_recon_runs_statement_only_gte0"),
        CheckConstraint("receipt_only_count >= 0", name="ck_recon_runs_receipt_only_gte0"),
        CheckConstraint("ambiguous_count >= 0", name="ck_recon_runs_ambiguous_gte0"),
        CheckConstraint(
            "coverage_ratio IS NULL OR (coverage_ratio >= 0 AND coverage_ratio <= 1)",
            name="ck_recon_runs_coverage_ratio",
        ),
        Index("ix_recon_runs_scope_statement", "ownership_scope_id", "statement_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False, index=True
    )
    statement_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("statements.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[ReconciliationRunStatus] = mapped_column(
        Enum(
            ReconciliationRunStatus,
            name="statement_reconciliation_run_status",
            values_callable=lambda enum_values: [value.value for value in enum_values],
        ),
        nullable=False,
        server_default=ReconciliationRunStatus.PENDING.value,
    )
    total_statement_lines: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    matched_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    statement_only_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    receipt_only_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    ambiguous_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    coverage_ratio: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    statement: Mapped[Statement] = relationship(back_populates="reconciliation_runs")
    verdicts: Mapped[list["StatementReconciliationVerdict"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="StatementReconciliationVerdict.created_at",
    )


class StatementReconciliationVerdict(Base):
    __tablename__ = "statement_reconciliation_verdicts"
    __table_args__ = (
        CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 1)",
            name="ck_recon_verdicts_score",
        ),
        CheckConstraint(
            "statement_line_id IS NOT NULL OR receipt_transaction_id IS NOT NULL",
            name="ck_recon_verdicts_has_source",
        ),
        Index("ix_recon_verdicts_run_verdict", "run_id", "verdict"),
        Index("ix_recon_verdicts_statement_line", "statement_line_id"),
        Index("ix_recon_verdicts_receipt_transaction", "receipt_transaction_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("statement_reconciliation_runs.id", ondelete="CASCADE"), nullable=False
    )
    statement_line_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("statement_lines.id", ondelete="SET NULL"), nullable=True
    )
    receipt_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )
    verdict: Mapped[ReconciliationVerdict] = mapped_column(
        Enum(
            ReconciliationVerdict,
            name="statement_reconciliation_verdict",
            values_callable=lambda enum_values: [value.value for value in enum_values],
        ),
        nullable=False,
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(4, 3), nullable=True)
    reasons: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list, server_default="[]"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    run: Mapped[StatementReconciliationRun] = relationship(back_populates="verdicts")
