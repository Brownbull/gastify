"""Share-to-group tests — SQLite app layer (5c).

Sharing copies a personal transaction (read under the caller's personal scope)
into a group they belong to (written under the group scope). These prove the copy
semantics, the membership/ownership gating, dedup, and — end to end — that the
shared spend then shows up in the GROUP's analytics. SQLite has no RLS; the
cross-scope write isolation (WITH CHECK) is proven generically in
test_rls_postgres.py.
"""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.models.transaction import Transaction, TransactionItem
from app.models.user import OwnershipScope
from tests.conftest import TEST_SCOPE_ID, TEST_USER_ID
from tests.test_groups import _acting_as, _add_member, _make_auth, _seed_user


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_personal_txn(
    engine, *, scope_id=TEST_SCOPE_ID, total_minor=50_000, merchant="Tienda"
) -> uuid.UUID:
    async with _sf(engine)() as s:
        txn = Transaction(
            ownership_scope_id=scope_id,
            transaction_date=date(2026, 3, 15),
            merchant=merchant,
            total_minor=total_minor,
            currency="CLP",
        )
        s.add(txn)
        await s.flush()
        s.add(
            TransactionItem(
                transaction_id=txn.id,
                name="Pan",
                total_price_minor=total_minor,
                sort_order=0,
                # Explicit: the Boolean server_default "false" reads back as True on
                # SQLite (a test-env quirk; Postgres reads false), which would make
                # the insights engine treat the item as D58-flagged and exclude it.
                is_flagged=False,
            )
        )
        await s.commit()
        return txn.id


async def _make_group(client, name="Casa") -> str:
    return (await client.post("/api/v1/groups", json={"name": name})).json()["id"]


@pytest.mark.asyncio
async def test_share_copies_transaction_into_group(client, engine):
    group_id = await _make_group(client)
    txn_id = await _seed_personal_txn(engine, total_minor=50_000)

    resp = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["total_minor"] == 50_000
    assert body["shared_from_transaction_id"] == str(txn_id)

    async with _sf(engine)() as s:
        # The copy lives in the group scope, attributes the contributor, carries items.
        copy = (
            await s.execute(
                select(Transaction)
                .where(Transaction.ownership_scope_id == uuid.UUID(group_id))
                .options(selectinload(Transaction.items))
            )
        ).scalar_one()
        assert copy.shared_by_user_id == TEST_USER_ID
        assert copy.shared_from_transaction_id == txn_id
        assert copy.total_minor == 50_000
        assert len(copy.items) == 1
        # The original is untouched in the personal scope.
        original = await s.get(Transaction, txn_id)
        assert original.ownership_scope_id == TEST_SCOPE_ID
        assert original.shared_by_user_id is None


@pytest.mark.asyncio
async def test_share_unknown_or_foreign_transaction_404(client, engine):
    group_id = await _make_group(client)
    # A transaction in someone else's scope.
    other_scope = uuid.uuid4()
    async with _sf(engine)() as s:
        s.add(OwnershipScope(id=other_scope, scope_type="individual"))
        await s.commit()
    foreign_txn = await _seed_personal_txn(engine, scope_id=other_scope)

    foreign = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(foreign_txn)}
    )
    assert foreign.status_code == 404
    unknown = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(uuid.uuid4())}
    )
    assert unknown.status_code == 404


@pytest.mark.asyncio
async def test_share_into_non_member_group_404(client, engine):
    txn_id = await _seed_personal_txn(engine)
    async with _sf(engine)() as s:
        scope = OwnershipScope(scope_type="group", name="Strangers")
        s.add(scope)
        await s.commit()
        gid = scope.id
    resp = await client.post(f"/api/v1/groups/{gid}/share", json={"transaction_id": str(txn_id)})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_share_is_deduped(client, engine):
    group_id = await _make_group(client)
    txn_id = await _seed_personal_txn(engine)
    first = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
    )
    assert first.status_code == 201
    second = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
    )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_shared_spend_appears_in_group_analytics(client, engine):
    """The payoff: a shared transaction shows up in the GROUP's monthly insights."""
    group_id = await _make_group(client)
    txn_id = await _seed_personal_txn(engine, total_minor=73_500)
    await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)})

    personal = await client.get("/api/v1/insights/monthly", params={"period": "2026-03"})
    group = await client.get(
        "/api/v1/insights/monthly", params={"period": "2026-03", "group_id": group_id}
    )
    assert group.status_code == 200
    assert group.json()["total_spend_minor"] == 73_500
    # The personal scope still has its own (un-shared) copy too — both exist.
    assert personal.json()["total_spend_minor"] == 73_500


@pytest.mark.asyncio
async def test_delete_group_keeps_personal_originals(client, engine):
    """Deleting a group removes ONLY its shared COPIES (ownership_scope_id == group);
    the personal originals — and any other scope's transactions — are untouched."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    txn_id = await _seed_personal_txn(engine, total_minor=50_000)
    # A second user's unrelated personal transaction (must also survive).
    bystander = uuid.uuid4()
    async with _sf(engine)() as s:
        s.add(OwnershipScope(id=bystander, scope_type="individual"))
        await s.commit()
    bystander_txn = await _seed_personal_txn(engine, scope_id=bystander, total_minor=9_000)

    shared = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
    )
    assert shared.status_code == 201
    async with _sf(engine)() as s:
        assert await s.scalar(select(func.count()).select_from(Transaction)) == 3  # 2 personal + 1 copy

    assert (await client.delete(f"/api/v1/groups/{group_id}")).status_code == 204

    async with _sf(engine)() as s:
        # The group copy is gone…
        group_count = await s.scalar(
            select(func.count())
            .select_from(Transaction)
            .where(Transaction.ownership_scope_id == uuid.UUID(group_id))
        )
        assert group_count == 0
        # …but BOTH personal originals survive, in their own scopes.
        original = await s.get(Transaction, txn_id)
        assert original is not None and original.ownership_scope_id == TEST_SCOPE_ID
        other = await s.get(Transaction, bystander_txn)
        assert other is not None and other.ownership_scope_id == bystander


@pytest.mark.asyncio
async def test_shared_transactions_remain_in_statistics_after_sharer_leaves(client, engine):
    """A departed member's shared spend stays in the group's STATISTICS (D70 caveat):
    leaving removes the membership row, never the shared transactions."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    sharer_uid, sharer_scope = await _seed_user(engine, "sharer")
    await _add_member(engine, uuid.UUID(group_id), sharer_uid, "member")
    txn_id = await _seed_personal_txn(engine, scope_id=sharer_scope, total_minor=42_000)

    with _acting_as(_make_auth(sharer_uid, sharer_scope, "Sh")):
        shared = await client.post(
            f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
        )
        assert shared.status_code == 201
        left = await client.post(f"/api/v1/groups/{group_id}/leave")
        assert left.status_code == 204

    # The owner still sees the shared spend in the group's monthly statistics.
    group_monthly = await client.get(
        "/api/v1/insights/monthly", params={"period": "2026-03", "group_id": group_id}
    )
    assert group_monthly.json()["total_spend_minor"] == 42_000
    # The copy still physically exists in the group scope.
    async with _sf(engine)() as s:
        count = await s.scalar(
            select(func.count())
            .select_from(Transaction)
            .where(Transaction.ownership_scope_id == uuid.UUID(group_id))
        )
        assert count == 1
