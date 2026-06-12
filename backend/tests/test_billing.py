"""D96 billing — tier quotas, monthly counters, no rollover, atomic consume."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.services.billing import (
    TIER_QUOTAS,
    PlanTier,
    consume_quota,
    current_period,
    feature_available,
    get_or_create_balance,
    quota_snapshot,
    set_plan,
)
from tests.conftest import TEST_SCOPE_ID


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def test_d96_quota_table():
    assert TIER_QUOTAS[PlanTier.FREE] == {"scan": 20, "statement": 0, "batch": 0}
    assert TIER_QUOTAS[PlanTier.PREMIUM] == {"scan": 60, "statement": 3, "batch": 3}


def test_current_period_is_zero_padded():
    period = current_period()
    assert len(period) == 7 and period[4] == "-"


@pytest.mark.asyncio
async def test_get_or_create_balance_defaults_to_free(engine):
    async with _sf(engine)() as db:
        balance = await get_or_create_balance(db, ownership_scope_id=TEST_SCOPE_ID)
        assert balance.plan_tier == "free"


@pytest.mark.asyncio
async def test_set_plan_flips_tier_and_notifies_hook(engine):
    events = []

    class Hook:
        async def on_plan_change(self, *, ownership_scope_id, old_plan, new_plan):
            events.append((old_plan, new_plan))

    async with _sf(engine)() as db:
        balance = await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="premium", hook=Hook())
        assert balance.plan_tier == "premium"
    assert events == [("free", "premium")]


@pytest.mark.asyncio
async def test_set_plan_rejects_unknown(engine):
    async with _sf(engine)() as db:
        with pytest.raises(ValueError):
            await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="pro")


@pytest.mark.asyncio
async def test_consume_quota_counts_to_the_limit_then_blocks(engine):
    async with _sf(engine)() as db:
        await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="premium")
        for _ in range(3):
            assert (
                await consume_quota(db, ownership_scope_id=TEST_SCOPE_ID, feature="statement")
                is True
            )
        assert (
            await consume_quota(db, ownership_scope_id=TEST_SCOPE_ID, feature="statement") is False
        )


@pytest.mark.asyncio
async def test_zero_allowance_features_never_consume(engine):
    """Free tier: statement/batch allowance is 0 — consume is False without creating
    a counter row (the 403 feature gate fires before any 402 semantics)."""
    async with _sf(engine)() as db:
        assert (
            await consume_quota(db, ownership_scope_id=TEST_SCOPE_ID, feature="statement") is False
        )
        assert (
            await feature_available(db, ownership_scope_id=TEST_SCOPE_ID, feature="statement")
            is False
        )
        assert await feature_available(db, ownership_scope_id=TEST_SCOPE_ID, feature="scan") is True


@pytest.mark.asyncio
async def test_new_month_starts_fresh_and_old_usage_does_not_roll(engine):
    """Monthly recharge + NO ROLLOVER by construction: exhaust March, April is a
    fresh allowance; March's leftover capacity does not add to April's."""
    async with _sf(engine)() as db:
        await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="premium")
        for _ in range(3):
            assert await consume_quota(
                db, ownership_scope_id=TEST_SCOPE_ID, feature="statement", period="2026-03"
            )
        assert (
            await consume_quota(
                db, ownership_scope_id=TEST_SCOPE_ID, feature="statement", period="2026-03"
            )
            is False
        )
        # April: fresh 3 — not 3 + anything left over from earlier months.
        for _ in range(3):
            assert await consume_quota(
                db, ownership_scope_id=TEST_SCOPE_ID, feature="statement", period="2026-04"
            )
        assert (
            await consume_quota(
                db, ownership_scope_id=TEST_SCOPE_ID, feature="statement", period="2026-04"
            )
            is False
        )


@pytest.mark.asyncio
async def test_tier_change_applies_at_consume_time(engine):
    """Quotas compare against the CURRENT tier: a free scope that used all 20 scans
    gets 40 more headroom the moment it upgrades (limit 60 vs used 20)."""
    async with _sf(engine)() as db:
        for _ in range(20):
            assert await consume_quota(
                db, ownership_scope_id=TEST_SCOPE_ID, feature="scan", period="2026-05"
            )
        assert (
            await consume_quota(
                db, ownership_scope_id=TEST_SCOPE_ID, feature="scan", period="2026-05"
            )
            is False
        )
        await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="premium")
        assert await consume_quota(
            db, ownership_scope_id=TEST_SCOPE_ID, feature="scan", period="2026-05"
        )


@pytest.mark.asyncio
async def test_quota_snapshot_shape(engine):
    async with _sf(engine)() as db:
        await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="premium")
        await consume_quota(db, ownership_scope_id=TEST_SCOPE_ID, feature="scan")
        snap = await quota_snapshot(db, ownership_scope_id=TEST_SCOPE_ID)
    assert snap["tier"] == "premium"
    assert snap["period"] == current_period()
    assert snap["features"]["scan"] == {"used": 1, "limit": 60}
    assert snap["features"]["statement"] == {"used": 0, "limit": 3}
    assert snap["features"]["batch"] == {"used": 0, "limit": 3}


@pytest.mark.asyncio
async def test_quota_endpoint_returns_tier_and_features(client, engine):
    resp = await client.get("/api/v1/billing/quota")
    assert resp.status_code == 200
    body = resp.json()
    assert body["tier"] == "free"
    assert body["enforced"] is False
    assert body["features"]["scan"] == {"used": 0, "limit": 20}
    assert body["features"]["statement"] == {"used": 0, "limit": 0}
    assert body["features"]["batch"] == {"used": 0, "limit": 0}
