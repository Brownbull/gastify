"""Account-delete → group-share void tests — SQLite app layer (T4, D82).

Account deletion is TOTAL erasure (D82): besides hard-deleting the user's own data
(T2), it must shut down the group-period statistics their shared copies fed and
revoke those copies' visibility — WITHOUT mutating the content-locked group copy
(D74). The mechanism: tombstone the affected (group, month) pairs (T3) + remove the
erasing user's group memberships, so D72's current-member list filter drops their
rows while the tombstone voids the aggregates. SQLite has no RLS; cross-scope write
isolation is proven generically in the live-PG harness.
"""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.transaction import Transaction, TransactionItem
from app.models.user import OwnershipScopeMember
from tests.conftest import TEST_SCOPE_ID, TEST_USER_ID
from tests.test_groups import _acting_as, _add_member, _make_auth, _seed_user


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_personal_txn(
    engine, *, scope_id, when: date, total_minor: int, merchant="Tienda"
) -> uuid.UUID:
    async with _sf(engine)() as s:
        txn = Transaction(
            ownership_scope_id=scope_id,
            transaction_date=when,
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
                is_flagged=False,
            )
        )
        await s.commit()
        return txn.id


@pytest.mark.asyncio
async def test_account_delete_voids_group_stats_and_revokes_visibility(client, engine):
    """A (TEST_USER) shares into a group with B → A account-deletes → A's shared
    spend is voided in the group stats and gone from B's list; A is de-membered."""
    # A owns a group; B is a member who can view it.
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    b_uid, b_scope = await _seed_user(engine, "bee")
    await _add_member(engine, uuid.UUID(group_id), b_uid, "member")

    # A shares a March personal transaction into the group.
    txn_id = await _seed_personal_txn(
        engine, scope_id=TEST_SCOPE_ID, when=date(2026, 3, 15), total_minor=64_000
    )
    shared = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
    )
    assert shared.status_code == 201

    # Before deletion, B sees the shared spend in the group's March stats.
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        before = await client.get(
            "/api/v1/insights/monthly", params={"period": "2026-03", "group_id": group_id}
        )
        assert before.json()["total_spend_minor"] == 64_000
        assert before.json()["voided"] is False

    # A exercises the right to erasure (account deletion).
    erasure = await client.post("/api/v1/privacy/erasure")
    assert erasure.status_code == 200
    body = erasure.json()
    assert body["group_periods_voided"] == 1
    assert body["group_memberships_removed"] == 1

    # B now sees the March stats SHUT DOWN — not recomputed, voided with a reason.
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        after = await client.get(
            "/api/v1/insights/monthly", params={"period": "2026-03", "group_id": group_id}
        )
        assert after.json()["voided"] is True
        assert after.json()["void_reason"] == "account_deleted"
        assert after.json()["total_spend_minor"] == 0

        # And A's row is gone from the group transactions list (de-membered → D72 filter).
        listing = await client.get(f"/api/v1/groups/{group_id}/transactions")
        assert listing.status_code == 200
        assert all(row["shared_by_user_id"] != str(TEST_USER_ID) for row in listing.json())

    async with _sf(engine)() as s:
        # A's membership is removed; the content-locked group copy is NOT mutated/deleted
        # (D74) — it survives, orphaned + invisible, behind the void.
        a_membership = await s.scalar(
            select(func.count())
            .select_from(OwnershipScopeMember)
            .where(
                OwnershipScopeMember.ownership_scope_id == uuid.UUID(group_id),
                OwnershipScopeMember.user_id == TEST_USER_ID,
            )
        )
        assert a_membership == 0
        copy_count = await s.scalar(
            select(func.count())
            .select_from(Transaction)
            .where(
                Transaction.ownership_scope_id == uuid.UUID(group_id),
                Transaction.shared_by_user_id == TEST_USER_ID,
            )
        )
        assert copy_count == 1  # snapshot copy preserved (D74), just voided + de-listed


@pytest.mark.asyncio
async def test_account_delete_without_group_shares_voids_nothing(client, engine):
    """The common case: a user with no group shares erases cleanly — no tombstones,
    no memberships to remove — so the group-void path is a no-op."""
    erasure = await client.post("/api/v1/privacy/erasure")
    assert erasure.status_code == 200
    body = erasure.json()
    assert body["group_periods_voided"] == 0
    assert body["group_memberships_removed"] == 0


@pytest.mark.asyncio
async def test_account_delete_voids_each_affected_month(client, engine):
    """Shares across two months → both (group, month) pairs are tombstoned."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    for when, amount in ((date(2026, 1, 5), 10_000), (date(2026, 3, 9), 20_000)):
        txn_id = await _seed_personal_txn(
            engine, scope_id=TEST_SCOPE_ID, when=when, total_minor=amount
        )
        resp = await client.post(
            f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
        )
        assert resp.status_code == 201

    erasure = await client.post("/api/v1/privacy/erasure")
    assert erasure.json()["group_periods_voided"] == 2
