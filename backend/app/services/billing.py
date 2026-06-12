"""Billing: D96 tier/quota model — monthly feature quotas, no rollover.

Two tiers (D96, 2026-06-12): FREE = 20 receipt scans/month, no statements, no batch;
PREMIUM (CLP $5.000/mo) = 60 scans, 3 statements, 3 batch scans per month. The
premium flag is set manually until a payment provider ships (`set_plan` is the seam;
`BillingHook` is where the provider plugs in).

Consumption lives in `usage_counters` keyed (scope, feature, "YYYY-MM"): the month
key rotates naturally, so the monthly recharge and the NO-ROLLOVER rule hold by
construction — there is no reset job to forget. `credit_balances` survives as the
TIER ledger (its legacy `scan_credits` balance column is dormant).

Enforcement is gated by `billing_enforcement_enabled` (the launch cutover flips it);
until then the interim statement rate limit (RATE-LIMIT-PLAN ★2) guards prod spend.
"""

import enum
import uuid
from datetime import UTC, datetime
from typing import Any, Literal, Protocol

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit import CreditBalance
from app.models.usage_counter import UsageCounter


class PlanTier(enum.StrEnum):
    FREE = "free"
    PREMIUM = "premium"


QuotaFeature = Literal["scan", "statement", "batch"]

# D96 monthly allowances per tier. 0 = the feature is NOT AVAILABLE on the tier
# (surface a 403 feature gate, not a 402 quota exhaustion).
TIER_QUOTAS: dict[PlanTier, dict[QuotaFeature, int]] = {
    PlanTier.FREE: {"scan": 20, "statement": 0, "batch": 0},
    PlanTier.PREMIUM: {"scan": 60, "statement": 3, "batch": 3},
}


def current_period() -> str:
    """The canonical zero-padded 'YYYY-MM' quota month (UTC)."""
    now = datetime.now(UTC)
    return f"{now.year:04d}-{now.month:02d}"


def _credit_upsert_nothing(ownership_scope_id: uuid.UUID, dialect_name: str) -> Any:
    """Dialect-aware INSERT ... ON CONFLICT (ownership_scope_id) DO NOTHING for the
    default FREE tier row — race-safe first-create on Postgres + SQLite (P36 fix)."""
    values = {
        "ownership_scope_id": ownership_scope_id,
        "plan_tier": PlanTier.FREE.value,
    }
    if dialect_name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        return (
            pg_insert(CreditBalance)
            .values(**values)
            .on_conflict_do_nothing(index_elements=["ownership_scope_id"])
        )
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert

    return (
        sqlite_insert(CreditBalance)
        .values(**values)
        .on_conflict_do_nothing(index_elements=["ownership_scope_id"])
    )


def _counter_upsert_nothing(
    ownership_scope_id: uuid.UUID, feature: str, period: str, dialect_name: str
) -> Any:
    """Race-safe first-create of the (scope, feature, period) counter at used=0."""
    values = {
        "ownership_scope_id": ownership_scope_id,
        "feature": feature,
        "period": period,
        "used": 0,
    }
    index = ["ownership_scope_id", "feature", "period"]
    if dialect_name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        return pg_insert(UsageCounter).values(**values).on_conflict_do_nothing(index_elements=index)
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert

    return sqlite_insert(UsageCounter).values(**values).on_conflict_do_nothing(index_elements=index)


class BillingHook(Protocol):
    """Seam a real payment provider (Webpay/MercadoPago/...) implements to react to
    plan changes. The default is a no-op so the tier flag works without a provider."""

    async def on_plan_change(
        self,
        *,
        ownership_scope_id: uuid.UUID,
        old_plan: str,
        new_plan: str,
    ) -> None: ...


class NullBillingHook:
    """No-op billing hook (default — no live provider)."""

    async def on_plan_change(
        self,
        *,
        ownership_scope_id: uuid.UUID,
        old_plan: str,
        new_plan: str,
    ) -> None:
        return None


async def get_or_create_balance(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
) -> CreditBalance:
    # Race-safe first-create (P36 fix): INSERT ... ON CONFLICT DO NOTHING then re-select,
    # so concurrent first-creates don't TOCTOU-race on unique(ownership_scope_id).
    dialect = db.bind.dialect.name if db.bind is not None else "sqlite"
    await db.execute(_credit_upsert_nothing(ownership_scope_id, dialect))
    await db.flush()
    result = await db.execute(
        select(CreditBalance).where(CreditBalance.ownership_scope_id == ownership_scope_id)
    )
    return result.scalar_one()


async def get_plan(db: AsyncSession, *, ownership_scope_id: uuid.UUID) -> PlanTier:
    balance = await get_or_create_balance(db, ownership_scope_id=ownership_scope_id)
    return PlanTier(balance.plan_tier)


async def set_plan(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    plan: str,
    hook: BillingHook | None = None,
) -> CreditBalance:
    """Set a scope's plan tier (free | premium) and notify the billing hook.
    Raises ValueError for an unknown plan. Quotas need no reallocation — the
    monthly counters compare against the CURRENT tier's allowance at consume time."""
    plan_tier = PlanTier(plan)
    balance = await get_or_create_balance(db, ownership_scope_id=ownership_scope_id)
    old_plan = balance.plan_tier
    balance.plan_tier = plan_tier.value
    await db.flush()
    await (hook or NullBillingHook()).on_plan_change(
        ownership_scope_id=ownership_scope_id,
        old_plan=old_plan,
        new_plan=plan_tier.value,
    )
    return balance


async def consume_quota(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    feature: QuotaFeature,
    period: str | None = None,
) -> bool:
    """Atomically consume one unit of a feature's monthly quota. True = consumed;
    False = exhausted (or the feature's allowance is 0 on this tier).

    Concurrency-safe like the old credit deduct (P36): the single
    `UPDATE ... SET used = used + 1 WHERE used < limit RETURNING` takes a row lock,
    so N concurrent calls consume EXACTLY min(N, remaining)."""
    plan = await get_plan(db, ownership_scope_id=ownership_scope_id)
    limit = TIER_QUOTAS[plan][feature]
    if limit <= 0:
        return False
    month = period or current_period()
    dialect = db.bind.dialect.name if db.bind is not None else "sqlite"
    await db.execute(_counter_upsert_nothing(ownership_scope_id, feature, month, dialect))
    await db.flush()
    result = await db.execute(
        update(UsageCounter)
        .where(
            UsageCounter.ownership_scope_id == ownership_scope_id,
            UsageCounter.feature == feature,
            UsageCounter.period == month,
            UsageCounter.used < limit,
        )
        .values(used=UsageCounter.used + 1)
        .returning(UsageCounter.used)
    )
    consumed = result.first() is not None
    await db.flush()
    return consumed


async def feature_available(
    db: AsyncSession, *, ownership_scope_id: uuid.UUID, feature: QuotaFeature
) -> bool:
    """Whether the scope's TIER includes the feature at all (allowance > 0).
    False means a 403 feature gate, not a 402 quota exhaustion."""
    plan = await get_plan(db, ownership_scope_id=ownership_scope_id)
    return TIER_QUOTAS[plan][feature] > 0


async def quota_snapshot(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    period: str | None = None,
) -> dict[str, Any]:
    """Tier + per-feature used/limit for the current quota month (the /billing/quota
    payload — clients render 'X of Y left' and gate premium-only UI off it)."""
    plan = await get_plan(db, ownership_scope_id=ownership_scope_id)
    month = period or current_period()
    rows = await db.execute(
        select(UsageCounter.feature, UsageCounter.used).where(
            UsageCounter.ownership_scope_id == ownership_scope_id,
            UsageCounter.period == month,
        )
    )
    used_by_feature = {feature: used for feature, used in rows.all()}
    return {
        "tier": plan.value,
        "period": month,
        "features": {
            feature: {"used": used_by_feature.get(feature, 0), "limit": limit}
            for feature, limit in TIER_QUOTAS[plan].items()
        },
    }
