"""Matched-transaction indicator (functionality plan, Phase 2): a transaction with a
MATCHED reconciliation verdict carries statement_matched=true on the list AND detail —
the ledger's "covered by a statement" signal the UI renders as a badge."""

import uuid
from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.statement import (
    ReconciliationRunStatus,
    ReconciliationVerdict,
    Statement,
    StatementReconciliationRun,
    StatementReconciliationVerdict,
)
from app.models.transaction import Transaction
from tests.conftest import TEST_SCOPE_ID


def _factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed(db, *, matched: bool) -> uuid.UUID:
    txn = Transaction(
        ownership_scope_id=TEST_SCOPE_ID,
        transaction_date=date(2026, 6, 1),
        merchant="Match Store" if matched else "Plain Store",
        total_minor=1000,
        currency="CLP",
    )
    db.add(txn)
    await db.flush()
    if matched:
        stmt = Statement(
            ownership_scope_id=TEST_SCOPE_ID,
            original_filename="s.pdf",
            file_path="/tmp/m.pdf",
            file_sha256="1" * 64,
            file_size_bytes=10,
            currency="CLP",
        )
        db.add(stmt)
        await db.flush()
        run = StatementReconciliationRun(
            ownership_scope_id=TEST_SCOPE_ID,
            statement_id=stmt.id,
            status=ReconciliationRunStatus.COMPLETED,
        )
        db.add(run)
        await db.flush()
        db.add(
            StatementReconciliationVerdict(
                run_id=run.id,
                receipt_transaction_id=txn.id,
                verdict=ReconciliationVerdict.MATCHED,
            )
        )
    await db.commit()
    return txn.id


@pytest.mark.asyncio
async def test_matched_flag_on_list_and_detail(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        matched_id = await _seed(db, matched=True)
        plain_id = await _seed(db, matched=False)

    listing = await client.get("/api/v1/transactions")
    assert listing.status_code == 200
    by_id = {row["id"]: row for row in listing.json()["data"]}
    assert by_id[str(matched_id)]["statement_matched"] is True
    assert by_id[str(plain_id)]["statement_matched"] is False

    detail = await client.get(f"/api/v1/transactions/{matched_id}")
    assert detail.status_code == 200
    assert detail.json()["statement_matched"] is True
    plain_detail = await client.get(f"/api/v1/transactions/{plain_id}")
    assert plain_detail.json()["statement_matched"] is False
