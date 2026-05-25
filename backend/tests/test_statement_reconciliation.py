"""Tests for deterministic statement reconciliation."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.statement import (
    CardAlias,
    ReconciliationVerdict,
    Statement,
    StatementLine,
    StatementLineType,
    StatementReconciliationRun,
    StatementReconciliationVerdict,
    StatementStatus,
)
from app.models.transaction import Transaction
from tests.conftest import TEST_SCOPE_ID


async def _create_statement(
    engine,
    *,
    alias: CardAlias | None = None,
    status: StatementStatus = StatementStatus.EXTRACTED,
    lines: list[dict],
) -> uuid.UUID:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        if alias is not None:
            alias = await session.merge(alias)
        statement = Statement(
            ownership_scope_id=TEST_SCOPE_ID,
            card_alias=alias,
            status=status,
            original_filename="statement.pdf",
            file_path="/tmp/statement.pdf",
            file_sha256=uuid.uuid4().hex + uuid.uuid4().hex,
            content_type="application/pdf",
            file_size_bytes=100,
            issuer="fixture-bank",
            period_start=date(2026, 5, 1),
            period_end=date(2026, 5, 31),
            currency="CLP",
            pdf_status="readable",
            is_encrypted=False,
        )
        session.add(statement)
        await session.flush()
        for index, line_data in enumerate(lines, start=1):
            session.add(
                StatementLine(
                    statement_id=statement.id,
                    source_order=index,
                    line_date=line_data.get("date", date(2026, 5, 20)),
                    description=line_data["description"],
                    amount_minor=line_data["amount_minor"],
                    currency=line_data.get("currency", "CLP"),
                    line_type=StatementLineType(line_data.get("line_type", "charge")),
                    card_alias_candidate=line_data.get("card_alias_candidate"),
                )
            )
        await session.commit()
        return statement.id


async def _create_alias(engine, *, archived: bool = False) -> CardAlias:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        alias = CardAlias(
            ownership_scope_id=TEST_SCOPE_ID,
            name=f"Alias {uuid.uuid4()}",
            archived_at=datetime.now(UTC) if archived else None,
        )
        session.add(alias)
        await session.commit()
        return alias


async def _create_transaction(
    engine,
    *,
    merchant: str,
    total_minor: int,
    transaction_date: date = date(2026, 5, 20),
    currency: str = "CLP",
    card_alias_id: uuid.UUID | None = None,
    merchant_user_edited_at: datetime | None = None,
) -> uuid.UUID:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        transaction = Transaction(
            ownership_scope_id=TEST_SCOPE_ID,
            transaction_date=transaction_date,
            merchant=merchant,
            merchant_user_edited_at=merchant_user_edited_at,
            total_minor=total_minor,
            currency=currency,
            card_alias_id=card_alias_id,
            receipt_type="scan",
        )
        session.add(transaction)
        await session.commit()
        return transaction.id


@pytest.mark.asyncio
async def test_reconcile_exact_match_persists_idempotent_run(client, engine):
    alias = await _create_alias(engine)
    statement_id = await _create_statement(
        engine,
        alias=alias,
        lines=[{"description": "SUPERMERCADO FIXTURE", "amount_minor": 19_990}],
    )
    transaction_id = await _create_transaction(
        engine,
        merchant="Supermercado Fixture",
        total_minor=19_990,
        card_alias_id=alias.id,
    )

    first = await client.post(f"/api/v1/statements/{statement_id}/reconcile")
    second = await client.post(f"/api/v1/statements/{statement_id}/reconcile")

    assert first.status_code == 200
    assert second.status_code == 200
    body = second.json()
    assert body["run"]["matched_count"] == 1
    assert body["run"]["statement_only_count"] == 0
    assert body["run"]["receipt_only_count"] == 0
    assert body["run"]["coverage_ratio"] == 1.0
    assert body["matched"][0]["receipt_transaction"]["id"] == str(transaction_id)
    assert "card_alias_match" in body["matched"][0]["verdict"]["reasons"]

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        run_count = await session.scalar(
            sa.select(sa.func.count()).select_from(StatementReconciliationRun)
        )
        verdict_count = await session.scalar(
            sa.select(sa.func.count()).select_from(StatementReconciliationVerdict)
        )
    assert run_count == 1
    assert verdict_count == 1


@pytest.mark.asyncio
async def test_reconcile_uses_fuzzy_merchant_date_and_amount_tolerance(client, engine):
    statement_id = await _create_statement(
        engine,
        lines=[{"description": "MERPAGO CSBYTE", "amount_minor": 10_000}],
    )
    await _create_transaction(
        engine,
        merchant="Mercado Pago Csbyte",
        total_minor=10_050,
        transaction_date=date(2026, 5, 22),
    )

    response = await client.post(f"/api/v1/statements/{statement_id}/reconcile")

    assert response.status_code == 200
    item = response.json()["matched"][0]
    reasons = item["verdict"]["reasons"]
    assert "fuzzy_merchant" in reasons
    assert "date_tolerance:2d" in reasons
    assert "amount_tolerance:50" in reasons


@pytest.mark.asyncio
async def test_reconcile_produces_statement_only_and_receipt_only_buckets(client, engine):
    statement_id = await _create_statement(
        engine,
        lines=[{"description": "NO RECEIPT", "amount_minor": 15_000}],
    )
    await _create_transaction(engine, merchant="Different merchant", total_minor=22_000)

    response = await client.post(f"/api/v1/statements/{statement_id}/reconcile")

    assert response.status_code == 200
    body = response.json()
    assert body["run"]["matched_count"] == 0
    assert body["run"]["statement_only_count"] == 1
    assert body["run"]["receipt_only_count"] == 1
    assert body["statement_only"][0]["statement_line"]["description"] == "NO RECEIPT"
    assert body["receipt_only"][0]["receipt_transaction"]["merchant"] == "Different merchant"


@pytest.mark.asyncio
async def test_reconcile_marks_ambiguous_duplicate_receipts(client, engine):
    statement_id = await _create_statement(
        engine,
        lines=[{"description": "CAFE CENTRAL", "amount_minor": 5_000}],
    )
    await _create_transaction(engine, merchant="Cafe Central", total_minor=5_000)
    await _create_transaction(engine, merchant="Cafe Central", total_minor=5_000)

    response = await client.post(f"/api/v1/statements/{statement_id}/reconcile")

    assert response.status_code == 200
    body = response.json()
    assert body["run"]["matched_count"] == 0
    assert body["run"]["ambiguous_count"] == 1
    assert body["run"]["receipt_only_count"] == 0
    assert body["ambiguous"][0]["verdict"]["verdict"] == ReconciliationVerdict.AMBIGUOUS.value
    assert "ambiguous_receipt_candidates" in body["ambiguous"][0]["verdict"]["reasons"]


@pytest.mark.asyncio
async def test_reconcile_matches_archived_alias_by_stored_transaction_id(client, engine):
    alias = await _create_alias(engine, archived=True)
    statement_id = await _create_statement(
        engine,
        alias=alias,
        lines=[{"description": "ARCHIVED CARD MERCHANT", "amount_minor": 11_000}],
    )
    await _create_transaction(
        engine,
        merchant="Archived Card Merchant",
        total_minor=11_000,
        card_alias_id=alias.id,
    )

    response = await client.post(f"/api/v1/statements/{statement_id}/reconcile")

    assert response.status_code == 200
    assert response.json()["run"]["matched_count"] == 1
    assert "card_alias_match" in response.json()["matched"][0]["verdict"]["reasons"]


@pytest.mark.asyncio
async def test_reconcile_respects_user_edited_transaction_fields(client, engine):
    edited_at = datetime.now(UTC)
    statement_id = await _create_statement(
        engine,
        lines=[{"description": "USER EDITED MERCHANT", "amount_minor": 8_900}],
    )
    transaction_id = await _create_transaction(
        engine,
        merchant="User Edited Merchant",
        total_minor=8_900,
        merchant_user_edited_at=edited_at,
    )

    response = await client.post(f"/api/v1/statements/{statement_id}/reconcile")

    assert response.status_code == 200
    assert response.json()["run"]["matched_count"] == 1
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        transaction = await session.get(Transaction, transaction_id)
    assert transaction is not None
    assert transaction.merchant == "User Edited Merchant"
    assert transaction.merchant_user_edited_at == edited_at.replace(tzinfo=None)


@pytest.mark.asyncio
async def test_reconcile_rejects_unextracted_statement(client, engine):
    statement_id = await _create_statement(
        engine,
        status=StatementStatus.QUEUED,
        lines=[{"description": "WAITING", "amount_minor": 1_000}],
    )

    response = await client.post(f"/api/v1/statements/{statement_id}/reconcile")

    assert response.status_code == 409
    assert "cannot reconcile" in response.json()["detail"]
