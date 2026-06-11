"""The 90-day delete window (UX-11 parity): deletes of settled periods are refused.

Contract: transactions newer than the window delete normally (and stats reflect it);
older ones 409 — past periods' statistics never shift. DSR erasure is explicitly NOT
gated (a legal right; it uses the bulk path, not these endpoints).
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.models.transaction import Transaction
from app.services.consent import delete_user_personal_data
from tests.conftest import TEST_SCOPE_ID


def _factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed(db, *, days_ago: int) -> uuid.UUID:
    txn = Transaction(
        ownership_scope_id=TEST_SCOPE_ID,
        transaction_date=datetime.now(UTC).date() - timedelta(days=days_ago),
        merchant="Window Store",
        total_minor=1000,
        currency="CLP",
    )
    db.add(txn)
    await db.commit()
    return txn.id


@pytest.mark.asyncio
async def test_recent_delete_works_and_is_observable(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        tid = await _seed(db, days_ago=5)
    resp = await client.delete(f"/api/v1/transactions/{tid}")
    assert resp.status_code == 204
    async with factory() as db:
        n = await db.scalar(select(func.count()).select_from(Transaction))
    assert n == 0  # the row is gone — stats computed from transactions reflect it


@pytest.mark.asyncio
async def test_old_delete_is_refused_409(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        tid = await _seed(db, days_ago=91)
    resp = await client.delete(f"/api/v1/transactions/{tid}")
    assert resp.status_code == 409
    assert "older than 90 days" in resp.json()["detail"]
    async with factory() as db:
        n = await db.scalar(select(func.count()).select_from(Transaction))
    assert n == 1  # untouched


@pytest.mark.asyncio
async def test_boundary_at_exactly_window_days_still_deletable(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        tid = await _seed(db, days_ago=90)  # exactly on the cutoff — NOT older than it
    resp = await client.delete(f"/api/v1/transactions/{tid}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_batch_delete_rejects_whole_batch_on_any_old_row(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        recent = await _seed(db, days_ago=3)
        old = await _seed(db, days_ago=120)
    resp = await client.post(
        "/api/v1/transactions/batch-delete",
        json={"transaction_ids": [str(recent), str(old)]},
    )
    assert resp.status_code == 409
    async with factory() as db:
        n = await db.scalar(select(func.count()).select_from(Transaction))
    assert n == 2  # nothing deleted — explicit rejection over silent partial


@pytest.mark.asyncio
async def test_window_disabled_allows_old_delete(client, engine, monkeypatch):
    monkeypatch.setattr(settings, "transaction_delete_window_days", 0)
    factory = _factory(engine)
    async with factory() as db:
        tid = await _seed(db, days_ago=400)
    resp = await client.delete(f"/api/v1/transactions/{tid}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_dsr_erasure_ignores_the_window(client, engine):
    """The legal right always wins: erasure hard-deletes ALL ages via the bulk path."""
    factory = _factory(engine)
    async with factory() as db:
        await _seed(db, days_ago=5)
        await _seed(db, days_ago=400)
        counts = await delete_user_personal_data(db, ownership_scope_id=TEST_SCOPE_ID)
        await db.commit()
    assert counts["transactions"] == 2
    async with factory() as db:
        n = await db.scalar(select(func.count()).select_from(Transaction))
    assert n == 0
