"""Group-leave keep-vs-delete choice tests — SQLite app layer (T5, D82).

Leaving a group is the ONLY place a keep-vs-delete choice lives (D82). KEEP (the
default) leaves the caller's shared copies in the group's statistics (D72), hidden
from the list as a departed contributor. DELETE voids them: the (group, month)
stats their shares fed are tombstoned (reason member_removed_data) and the rows drop
from the list — scoped to THIS group only, the caller's own account/data untouched.
SQLite has no RLS; cross-scope write isolation rides the live-PG harness.
"""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.consent import AuditEvent
from app.models.transaction import Transaction, TransactionItem
from tests.test_groups import _acting_as, _add_member, _make_auth, _seed_user


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_personal_txn(engine, *, scope_id, when: date, total_minor: int) -> uuid.UUID:
    async with _sf(engine)() as s:
        txn = Transaction(
            ownership_scope_id=scope_id,
            transaction_date=when,
            merchant="Tienda",
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


async def _setup_sharer_in_group(client, engine, *, when: date, total_minor: int):
    """A (TEST_USER, owner) + group; B (member) shares one personal txn into it.
    Returns (group_id, b_uid, b_scope)."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    b_uid, b_scope = await _seed_user(engine, "bee")
    await _add_member(engine, uuid.UUID(group_id), b_uid, "member")
    txn_id = await _seed_personal_txn(engine, scope_id=b_scope, when=when, total_minor=total_minor)
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        shared = await client.post(
            f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
        )
        assert shared.status_code == 201
    return group_id, b_uid, b_scope


async def _group_monthly(client, group_id: str, period: str = "2026-03"):
    return (
        await client.get(
            "/api/v1/insights/monthly", params={"period": period, "group_id": group_id}
        )
    ).json()


@pytest.mark.asyncio
async def test_leave_keep_leaves_group_stats_intact(client, engine):
    group_id, b_uid, b_scope = await _setup_sharer_in_group(
        client, engine, when=date(2026, 3, 15), total_minor=50_000
    )
    # B leaves WITHOUT deleting — the default keep.
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        left = await client.post(f"/api/v1/groups/{group_id}/leave")
        assert left.status_code == 204

    # A still sees B's shared spend in the group's March stats (D72 — kept).
    stats = await _group_monthly(client, group_id)
    assert stats["voided"] is False
    assert stats["total_spend_minor"] == 50_000


@pytest.mark.asyncio
async def test_leave_delete_voids_group_stats(client, engine):
    group_id, b_uid, b_scope = await _setup_sharer_in_group(
        client, engine, when=date(2026, 3, 15), total_minor=50_000
    )
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        left = await client.post(
            f"/api/v1/groups/{group_id}/leave", params={"delete_shared": "true"}
        )
        assert left.status_code == 204

    # The March stats are shut down — voided with the leave-delete reason.
    stats = await _group_monthly(client, group_id)
    assert stats["voided"] is True
    assert stats["void_reason"] == "member_removed_data"
    assert stats["total_spend_minor"] == 0


@pytest.mark.asyncio
async def test_leave_delete_is_scoped_to_the_left_group_only(client, engine):
    """B shares into TWO groups, leaves group1 with delete → group1 voided, group2 intact."""
    group1, b_uid, b_scope = await _setup_sharer_in_group(
        client, engine, when=date(2026, 3, 15), total_minor=50_000
    )
    # A second group B also shares into.
    group2 = (await client.post("/api/v1/groups", json={"name": "Oficina"})).json()["id"]
    await _add_member(engine, uuid.UUID(group2), b_uid, "member")
    txn2 = await _seed_personal_txn(
        engine, scope_id=b_scope, when=date(2026, 3, 20), total_minor=9_000
    )
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        assert (
            await client.post(f"/api/v1/groups/{group2}/share", json={"transaction_id": str(txn2)})
        ).status_code == 201
        # Leave only group1, deleting the shares there.
        assert (
            await client.post(f"/api/v1/groups/{group1}/leave", params={"delete_shared": "true"})
        ).status_code == 204

    assert (await _group_monthly(client, group1))["voided"] is True
    # group2 is untouched — B is still a member and its stats stand.
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        g2 = await _group_monthly(client, group2)
    assert g2["voided"] is False
    assert g2["total_spend_minor"] == 9_000


@pytest.mark.asyncio
async def test_leave_delete_emits_a_proof_of_processing_audit_event(client, engine):
    """Leave-delete is a user-initiated data deletion → it must leave a D4 audit trail."""
    group_id, b_uid, b_scope = await _setup_sharer_in_group(
        client, engine, when=date(2026, 3, 15), total_minor=50_000
    )
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        assert (
            await client.post(f"/api/v1/groups/{group_id}/leave", params={"delete_shared": "true"})
        ).status_code == 204

    async with _sf(engine)() as s:
        events = (
            (
                await s.execute(
                    select(AuditEvent).where(
                        AuditEvent.ownership_scope_id == uuid.UUID(group_id),
                        AuditEvent.event_type == "dsr_group_leave_delete",
                    )
                )
            )
            .scalars()
            .all()
        )
    assert len(events) == 1
    assert events[0].user_id == b_uid


@pytest.mark.asyncio
async def test_leave_keep_emits_no_deletion_audit_event(client, engine):
    """The keep path is not a deletion — no dsr_group_leave_delete event."""
    group_id, b_uid, b_scope = await _setup_sharer_in_group(
        client, engine, when=date(2026, 3, 15), total_minor=50_000
    )
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        assert (await client.post(f"/api/v1/groups/{group_id}/leave")).status_code == 204

    async with _sf(engine)() as s:
        count = await s.scalar(
            select(func.count())
            .select_from(AuditEvent)
            .where(AuditEvent.event_type == "dsr_group_leave_delete")
        )
    assert count == 0


@pytest.mark.asyncio
async def test_leave_delete_does_not_touch_the_members_own_data(client, engine):
    """Leave-delete voids the GROUP copy's stats; the member keeps their own account
    and their personal transaction (the share's source) intact."""
    group_id, b_uid, b_scope = await _setup_sharer_in_group(
        client, engine, when=date(2026, 3, 15), total_minor=50_000
    )
    with _acting_as(_make_auth(b_uid, b_scope, "B")):
        assert (
            await client.post(f"/api/v1/groups/{group_id}/leave", params={"delete_shared": "true"})
        ).status_code == 204

    async with _sf(engine)() as s:
        # B's own personal transaction (the source) survives in B's scope.
        own = await s.scalar(
            select(func.count())
            .select_from(Transaction)
            .where(Transaction.ownership_scope_id == b_scope)
        )
        assert own == 1
