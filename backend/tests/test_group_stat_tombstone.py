"""Group-stat tombstone void tests — SQLite stats layer (T3, D82).

A tombstone marks one (group scope, month) VOID: the insights layer checks for it
BEFORE display and returns a void notice instead of the numbers — voiding, never
recomputing (D82: "a voided figure is stronger for privacy than a recomputed one
— gone, not adjusted"). SQLite has no RLS; the cross-scope write isolation of the
tombstone table is covered generically by the live-PG harness. Here we prove the
void BEHAVIOUR: a real group-period total is hidden once its month is tombstoned,
the void is scoped to exactly the affected (group, month), and personal scopes —
which are never tombstoned — are untouched.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.transaction import Transaction
from app.models.user import OwnershipScope
from app.services.insights import get_insights_series, get_insights_tree, get_monthly_insights
from app.services.insights.tombstones import (
    period_key,
    tombstone_group_period,
    voided_periods,
)
from tests.conftest import TEST_SCOPE_ID

if TYPE_CHECKING:
    import uuid


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_group_with_spend(
    engine, *, when: date, total_minor: int = 80_000
) -> uuid.UUID:
    """A group scope holding one (shared-style) transaction on `when`."""
    async with _sf(engine)() as s:
        scope = OwnershipScope(scope_type="group", name="Casa")
        s.add(scope)
        await s.flush()
        s.add(
            Transaction(
                ownership_scope_id=scope.id,
                shared_by_user_id=None,
                transaction_date=when,
                merchant="Líder",
                total_minor=total_minor,
                currency="CLP",
            )
        )
        await s.commit()
        return scope.id


@pytest.mark.asyncio
async def test_tombstoned_month_voids_group_monthly(engine):
    group_id = await _seed_group_with_spend(engine, when=date(2026, 3, 15), total_minor=80_000)

    async with _sf(engine)() as s:
        # Before the tombstone, the group-period stat shows the real total.
        before = await get_monthly_insights(
            s,
            ownership_scope_id=group_id,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=None,
        )
        assert before.voided is False
        assert before.total_spend_minor == 80_000

        await tombstone_group_period(
            s, ownership_scope_id=group_id, period="2026-03", reason="account_deleted"
        )
        await s.commit()

    async with _sf(engine)() as s:
        after = await get_monthly_insights(
            s,
            ownership_scope_id=group_id,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=None,
        )
    # The stat is shut down: no numbers, a reason the client can localize.
    assert after.voided is True
    assert after.void_reason == "account_deleted"
    assert after.total_spend_minor == 0
    assert after.top_transaction_categories == []
    assert after.gravity_centers == []


@pytest.mark.asyncio
async def test_tombstoned_month_voids_group_tree(engine):
    group_id = await _seed_group_with_spend(engine, when=date(2026, 3, 15))

    async with _sf(engine)() as s:
        await tombstone_group_period(
            s, ownership_scope_id=group_id, period="2026-03", reason="member_removed_data"
        )
        await s.commit()

    async with _sf(engine)() as s:
        tree = await get_insights_tree(
            s,
            ownership_scope_id=group_id,
            period_start=date(2026, 3, 1),
            currency="CLP",
        )
    assert tree.voided is True
    assert tree.void_reason == "member_removed_data"
    assert tree.total_spend_minor == 0
    assert tree.roots == []


@pytest.mark.asyncio
async def test_series_voids_only_the_affected_bucket(engine):
    group_id = await _seed_group_with_spend(engine, when=date(2026, 3, 15), total_minor=80_000)
    async with _sf(engine)() as s:
        s.add(
            Transaction(
                ownership_scope_id=group_id,
                transaction_date=date(2026, 1, 10),
                merchant="Jumbo",
                total_minor=40_000,
                currency="CLP",
            )
        )
        await tombstone_group_period(
            s, ownership_scope_id=group_id, period="2026-03", reason="account_deleted"
        )
        await s.commit()

    async with _sf(engine)() as s:
        series = await get_insights_series(
            s,
            ownership_scope_id=group_id,
            from_month=date(2026, 1, 1),
            to_month=date(2026, 3, 1),
            currency="CLP",
            granularity="month",
        )
    points = {p.period: p for p in series.points}
    # January is intact; March is shut down (zeroed + reason), February empty/untouched.
    assert points["2026-01"].voided is False
    assert points["2026-01"].total_spend_minor == 40_000
    assert points["2026-03"].voided is True
    assert points["2026-03"].void_reason == "account_deleted"
    assert points["2026-03"].total_spend_minor == 0


@pytest.mark.asyncio
async def test_quarter_voided_when_any_constituent_month_tombstoned(engine):
    group_id = await _seed_group_with_spend(engine, when=date(2026, 2, 14), total_minor=55_000)
    async with _sf(engine)() as s:
        await tombstone_group_period(
            s, ownership_scope_id=group_id, period="2026-02", reason="account_deleted"
        )
        await s.commit()

    async with _sf(engine)() as s:
        # 2026-Q1 spans Jan–Mar; Feb is tombstoned, so the whole quarter is voided.
        quarter = await get_monthly_insights(
            s,
            ownership_scope_id=group_id,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 3, 31),
            currency="CLP",
            cache=None,
        )
    assert quarter.voided is True
    assert quarter.void_reason == "account_deleted"
    assert quarter.total_spend_minor == 0


@pytest.mark.asyncio
async def test_personal_scope_is_never_voided(engine):
    # A tombstone exists for SOME group, but the personal scope's identical period
    # is unaffected (personal scopes are never tombstoned).
    group_id = await _seed_group_with_spend(engine, when=date(2026, 3, 15))
    async with _sf(engine)() as s:
        s.add(
            Transaction(
                ownership_scope_id=TEST_SCOPE_ID,
                transaction_date=date(2026, 3, 9),
                merchant="Personal",
                total_minor=12_000,
                currency="CLP",
            )
        )
        await tombstone_group_period(
            s, ownership_scope_id=group_id, period="2026-03", reason="account_deleted"
        )
        await s.commit()

    async with _sf(engine)() as s:
        personal = await get_monthly_insights(
            s,
            ownership_scope_id=TEST_SCOPE_ID,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=None,
        )
    assert personal.voided is False
    assert personal.total_spend_minor == 12_000


@pytest.mark.asyncio
async def test_tombstone_group_period_is_idempotent(engine):
    group_id = await _seed_group_with_spend(engine, when=date(2026, 3, 15))
    async with _sf(engine)() as s:
        first = await tombstone_group_period(
            s, ownership_scope_id=group_id, period="2026-03", reason="account_deleted"
        )
        # A second deletion touching the same (group, month) is a no-op; the first wins.
        second = await tombstone_group_period(
            s, ownership_scope_id=group_id, period="2026-03", reason="member_removed_data"
        )
        await s.commit()
        voided = await voided_periods(
            s,
            ownership_scope_id=group_id,
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
        )
    assert first is True
    assert second is False
    assert voided == {"2026-03": "account_deleted"}


def test_period_key_is_zero_padded():
    assert period_key(date(2026, 3, 1)) == "2026-03"
    assert period_key(date(2026, 12, 31)) == "2026-12"
