"""Lock-on-match contracts (statement-hardening plan, Phase 1).

A MATCHED reconciliation verdict makes the statement the external source of truth:
the matched transaction refuses content edits and deletion (single + batch, 409 with
the rule named; tangential ops stay allowed, D74's shape). Deleting the statement
cascades the verdicts away and UNLOCKS — the full cycle is pinned.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select
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


async def _seed_matched(db) -> tuple[uuid.UUID, uuid.UUID]:
    """A transaction + the statement whose run MATCHED it. Returns (txn_id, stmt_id)."""
    txn = Transaction(
        ownership_scope_id=TEST_SCOPE_ID,
        transaction_date=datetime.now(UTC).date() - timedelta(days=3),
        merchant="Matched Store",
        total_minor=9900,
        currency="CLP",
    )
    db.add(txn)
    stmt = Statement(
        ownership_scope_id=TEST_SCOPE_ID,
        original_filename="s.pdf",
        file_path="/tmp/lock-match.pdf",
        file_sha256="2" * 64,
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
    return txn.id, stmt.id


@pytest.mark.asyncio
async def test_matched_refuses_content_edit_allows_tangential(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        txn_id, _ = await _seed_matched(db)

    edit = await client.patch(f"/api/v1/transactions/{txn_id}", json={"merchant": "Drifted"})
    assert edit.status_code == 409
    assert "matched against a card statement" in edit.json()["detail"]

    # Tangential ops stay allowed (D74's shape): recurrence marking works.
    tangential = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={"recurrence_kind": "recurring", "recurrence_interval": "monthly"},
    )
    assert tangential.status_code == 200


@pytest.mark.asyncio
async def test_matched_refuses_delete_single_and_batch(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        txn_id, _ = await _seed_matched(db)

    single = await client.delete(f"/api/v1/transactions/{txn_id}")
    assert single.status_code == 409

    batch = await client.post(
        "/api/v1/transactions/batch-delete", json={"transaction_ids": [str(txn_id)]}
    )
    assert batch.status_code == 409

    update = await client.post(
        "/api/v1/transactions/batch-update",
        json={"transaction_ids": [str(txn_id)], "updates": {"merchant": "Drifted"}},
    )
    assert update.status_code == 409


@pytest.mark.asyncio
async def test_deleting_the_statement_unlocks(client, engine):
    """THE CYCLE: matched → locked → DELETE /statements/{id} (cascades verdicts) →
    editable + deletable again."""
    factory = _factory(engine)
    async with factory() as db:
        txn_id, stmt_id = await _seed_matched(db)

    assert (
        await client.patch(f"/api/v1/transactions/{txn_id}", json={"merchant": "X"})
    ).status_code == 409

    gone = await client.delete(f"/api/v1/statements/{stmt_id}")
    assert gone.status_code == 204

    async with factory() as db:
        leftover = (await db.execute(select(StatementReconciliationVerdict))).scalars().all()
    assert leftover == []  # verdicts cascaded with the run

    edit = await client.patch(f"/api/v1/transactions/{txn_id}", json={"merchant": "Unlocked Store"})
    assert edit.status_code == 200
    assert (await client.delete(f"/api/v1/transactions/{txn_id}")).status_code == 204
