"""Schema-level monetization plumbing.

Plan tiers, per-plan scan-credit allowances, credit allocation/deduction
primitives, and a billing-hook seam a real payment provider plugs into later.

SCOPE §9.2: Gastify is paid-from-launch, but the pricing MECHANISM (checkout,
proration, dunning, enforcement) is a deferred ADR. This module is the
plumbing only — it does NOT enforce credits in the live scan flow, and there is
no live provider. `BillingHook` is the seam; `NullBillingHook` is the default.
"""

import enum
import uuid
from typing import Any, Protocol

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit import CreditBalance


def _credit_upsert_nothing(ownership_scope_id: uuid.UUID, dialect_name: str) -> Any:
    """Dialect-aware INSERT ... ON CONFLICT (ownership_scope_id) DO NOTHING for the
    default FREE balance — race-safe first-create on Postgres + SQLite (P36 fix)."""
    values = {
        "ownership_scope_id": ownership_scope_id,
        "plan_tier": PlanTier.FREE.value,
        "scan_credits": PLAN_MONTHLY_CREDITS[PlanTier.FREE],
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


class PlanTier(enum.StrEnum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"


# Monthly scan-credit allowance per plan (schema-level config).
PLAN_MONTHLY_CREDITS: dict[PlanTier, int] = {
    PlanTier.FREE: 50,
    PlanTier.BASIC: 500,
    PlanTier.PRO: 5000,
}


def credits_for_plan(plan: str) -> int:
    """Monthly scan-credit allowance for a plan tier. Raises ValueError if unknown."""
    return PLAN_MONTHLY_CREDITS[PlanTier(plan)]


class BillingHook(Protocol):
    """Seam a real payment provider (Stripe/Paddle/...) implements to react to
    plan changes. The default is a no-op so the schema works without a provider."""

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


async def set_plan(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    plan: str,
    hook: BillingHook | None = None,
) -> CreditBalance:
    """Set a scope's plan tier and (re)allocate its monthly scan credits, then
    notify the billing hook. Raises ValueError for an unknown plan."""
    plan_tier = PlanTier(plan)
    balance = await get_or_create_balance(db, ownership_scope_id=ownership_scope_id)
    old_plan = balance.plan_tier
    balance.plan_tier = plan_tier.value
    balance.scan_credits = PLAN_MONTHLY_CREDITS[plan_tier]
    await db.flush()
    await (hook or NullBillingHook()).on_plan_change(
        ownership_scope_id=ownership_scope_id,
        old_plan=old_plan,
        new_plan=plan_tier.value,
    )
    return balance


async def has_scan_credit(db: AsyncSession, *, ownership_scope_id: uuid.UUID) -> bool:
    balance = await get_or_create_balance(db, ownership_scope_id=ownership_scope_id)
    return balance.scan_credits > 0


async def deduct_scan_credit(db: AsyncSession, *, ownership_scope_id: uuid.UUID) -> bool:
    """Atomically decrement one scan credit if available. Returns True if deducted,
    False if exhausted. Wired into the live scan flow when billing_enforcement_enabled.

    Concurrency-safe (P36 fix): the single `UPDATE ... SET scan_credits = scan_credits - 1
    WHERE scan_credits > 0 RETURNING` takes a row lock, so N concurrent calls deduct
    EXACTLY min(N, available) — never double-spend, never negative. The prior
    read-check-decrement could let two sessions both read 1 and both decrement to -1."""
    await get_or_create_balance(db, ownership_scope_id=ownership_scope_id)
    result = await db.execute(
        update(CreditBalance)
        .where(
            CreditBalance.ownership_scope_id == ownership_scope_id,
            CreditBalance.scan_credits > 0,
        )
        .values(scan_credits=CreditBalance.scan_credits - 1)
        .returning(CreditBalance.scan_credits)
    )
    deducted = result.first() is not None
    await db.flush()
    return deducted
