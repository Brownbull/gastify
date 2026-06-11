"""P83 contract: deleting a group releases its sources' content locks (share_count).

The bug: delete_group removed the copies but never reset is_shared on the personal
sources — locked-forever strands. The fix denormalizes the live-copy count
(cross-scope existence checks are impossible under FORCE RLS): share +1, group
deletion −1, is_shared == share_count > 0.
"""

import uuid
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.transaction import Transaction
from tests.conftest import TEST_SCOPE_ID


def _factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_txn(db) -> uuid.UUID:
    txn = Transaction(
        ownership_scope_id=TEST_SCOPE_ID,
        transaction_date=date(2026, 6, 1),
        merchant="Release Store",
        total_minor=1000,
        currency="CLP",
    )
    db.add(txn)
    await db.commit()
    return txn.id


async def _create_group(client, name: str) -> str:
    resp = await client.post("/api/v1/groups", json={"name": name})
    assert resp.status_code == 201
    return resp.json()["id"]


async def _share(client, group_id: str, txn_id: uuid.UUID) -> None:
    resp = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
    )
    assert resp.status_code == 201


async def _source(factory, txn_id) -> Transaction:
    async with factory() as db:
        return (
            await db.execute(select(Transaction).where(Transaction.id == txn_id))
        ).scalar_one()


@pytest.mark.asyncio
async def test_share_locks_and_counts(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        txn_id = await _seed_txn(db)
    gid = await _create_group(client, "Rel G1")
    await _share(client, gid, txn_id)
    src = await _source(factory, txn_id)
    assert src.is_shared is True
    assert src.share_count == 1


@pytest.mark.asyncio
async def test_group_delete_releases_the_last_copy(client, engine):
    """THE P83 FIX: when the group holding the only copy dies, the source unlocks."""
    factory = _factory(engine)
    async with factory() as db:
        txn_id = await _seed_txn(db)
    gid = await _create_group(client, "Rel G2")
    await _share(client, gid, txn_id)

    resp = await client.delete(f"/api/v1/groups/{gid}")
    assert resp.status_code == 204

    src = await _source(factory, txn_id)
    assert src.share_count == 0
    assert src.is_shared is False  # editable again — no more locked-forever strand

    # And the unlock is real: a content edit now succeeds.
    patch = await client.patch(
        f"/api/v1/transactions/{txn_id}", json={"merchant": "Edited After Release"}
    )
    assert patch.status_code == 200


@pytest.mark.asyncio
async def test_delete_one_of_two_groups_keeps_the_lock(client, engine):
    """A source shared into TWO groups stays locked while any copy survives."""
    factory = _factory(engine)
    async with factory() as db:
        txn_id = await _seed_txn(db)
    g1 = await _create_group(client, "Rel G3a")
    g2 = await _create_group(client, "Rel G3b")
    await _share(client, g1, txn_id)
    await _share(client, g2, txn_id)

    src = await _source(factory, txn_id)
    assert src.share_count == 2

    assert (await client.delete(f"/api/v1/groups/{g1}")).status_code == 204
    src = await _source(factory, txn_id)
    assert src.share_count == 1
    assert src.is_shared is True  # still locked — a live copy remains in g2

    assert (await client.delete(f"/api/v1/groups/{g2}")).status_code == 204
    src = await _source(factory, txn_id)
    assert src.share_count == 0
    assert src.is_shared is False
