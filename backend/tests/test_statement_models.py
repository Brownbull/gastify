"""Tests for P5 statement schema foundation."""

import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.db import Base
from app.models.statement import (
    CardAlias,
    ReconciliationRunStatus,
    ReconciliationVerdict,
    Statement,
    StatementLine,
    StatementLineType,
    StatementReconciliationRun,
    StatementReconciliationVerdict,
    StatementStatus,
)
from app.models.transaction import Transaction

TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def test_statement_reconciliation_tables_persist_foundation_records(engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        alias = CardAlias(ownership_scope_id=TEST_SCOPE_ID, name="CMR Mastercard")
        statement = Statement(
            ownership_scope_id=TEST_SCOPE_ID,
            card_alias=alias,
            status=StatementStatus.EXTRACTED,
            original_filename="cmr202503.pdf",
            file_path="statements/cmr202503.pdf",
            file_sha256="a" * 64,
            content_type="application/pdf",
            file_size_bytes=42,
            ai_processing_consent=True,
            issuer="cmr",
            period_start=date(2025, 3, 1),
            period_end=date(2025, 3, 31),
            due_date=date(2025, 4, 10),
            currency="CLP",
            payment_due_minor=12000,
            pdf_status="readable",
            is_encrypted=False,
            page_count=3,
            extraction_provider="codex-pdf-text",
            confidence=Decimal("0.950"),
        )
        line = StatementLine(
            statement=statement,
            source_order=1,
            line_date=date(2025, 3, 15),
            description="CAFETERIA TEST",
            amount_minor=12000,
            currency="CLP",
            line_type=StatementLineType.CHARGE,
        )
        transaction = Transaction(
            ownership_scope_id=TEST_SCOPE_ID,
            transaction_date=date(2025, 3, 15),
            merchant="Cafeteria Test",
            total_minor=12000,
            currency="CLP",
            receipt_type="scan",
        )
        run = StatementReconciliationRun(
            ownership_scope_id=TEST_SCOPE_ID,
            statement=statement,
            status=ReconciliationRunStatus.COMPLETED,
            total_statement_lines=1,
            matched_count=1,
            coverage_ratio=Decimal("1.0000"),
        )
        verdict = StatementReconciliationVerdict(
            run=run,
            statement_line_id=line.id,
            receipt_transaction_id=transaction.id,
            verdict=ReconciliationVerdict.MATCHED,
            score=Decimal("0.980"),
            reasons=["exact_amount", "same_date"],
        )
        session.add_all([alias, statement, line, transaction, run, verdict])
        await session.commit()

    async with session_factory() as session:
        result = await session.execute(
            select(Statement)
            .options(
                selectinload(Statement.lines),
                selectinload(Statement.reconciliation_runs).selectinload(
                    StatementReconciliationRun.verdicts
                ),
            )
            .where(Statement.ownership_scope_id == TEST_SCOPE_ID)
        )
        stored = result.scalar_one()
        assert stored.card_alias_id == alias.id
        assert stored.status == StatementStatus.EXTRACTED
        assert stored.payment_due_minor == 12000
        assert stored.lines[0].description == "CAFETERIA TEST"
        assert stored.reconciliation_runs[0].verdicts[0].verdict == ReconciliationVerdict.MATCHED


def test_statement_foundation_does_not_add_pci_shaped_columns():
    blocked_exact_names = {
        "account_number",
        "card_number",
        "cvv",
        "expiration",
        "expiry",
        "last4",
        "last_four",
        "pan",
    }
    tables = {
        "card_aliases",
        "statements",
        "statement_lines",
        "statement_reconciliation_runs",
        "statement_reconciliation_verdicts",
    }

    for table_name in tables:
        table = Base.metadata.tables[table_name]
        column_names = {column.name for column in table.columns}
        assert column_names.isdisjoint(blocked_exact_names)


def test_statement_migration_defines_rls_for_scope_bound_tables():
    migration = Path("alembic/versions/015_statement_reconciliation_foundation.py")
    content = migration.read_text(encoding="utf-8")

    for table in (
        "card_aliases",
        "statements",
        "statement_lines",
        "statement_reconciliation_runs",
        "statement_reconciliation_verdicts",
    ):
        assert table in content
    assert "ENABLE ROW LEVEL SECURITY" in content
    assert "FORCE ROW LEVEL SECURITY" in content
    assert "current_setting('app.ownership_scope_id')::uuid" in content
