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
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit import CreditBalance


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
    # CONCURRENCY (deferred with the pricing-enforcement ADR, SCOPE §9.2): the
    # select-then-insert has a TOCTOU window — concurrent first-creates race on
    # the unique(ownership_scope_id) constraint. Safe for the current
    # single-caller plumbing; before set_plan is exposed to concurrent callers
    # (e.g. billing webhooks), switch to INSERT ... ON CONFLICT DO NOTHING +
    # re-select. Tracked in PENDING.
    result = await db.execute(
        select(CreditBalance).where(CreditBalance.ownership_scope_id == ownership_scope_id)
    )
    balance = result.scalar_one_or_none()
    if balance is None:
        balance = CreditBalance(
            ownership_scope_id=ownership_scope_id,
            plan_tier=PlanTier.FREE.value,
            scan_credits=PLAN_MONTHLY_CREDITS[PlanTier.FREE],
        )
        db.add(balance)
        await db.flush()
    return balance


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
    """Decrement one scan credit if available. Returns True if deducted, False if
    exhausted. NOT wired into the live scan flow — enforcement is the deferred
    pricing mechanism (SCOPE §9.2); this is the primitive it will call.

    CONCURRENCY (deferred with enforcement): this read-check-decrement is correct
    within a single session but not atomic across concurrent sessions (two could
    each read 1 and both decrement to -1). When enforcement lands, replace with an
    atomic `UPDATE ... SET scan_credits = scan_credits - 1 WHERE scan_credits > 0`.
    Tracked in PENDING."""
    balance = await get_or_create_balance(db, ownership_scope_id=ownership_scope_id)
    if balance.scan_credits <= 0:
        return False
    balance.scan_credits -= 1
    await db.flush()
    return True
