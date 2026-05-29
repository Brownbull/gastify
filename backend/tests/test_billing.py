"""Tests for schema-level monetization plumbing (plan tiers + credits)."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.services.billing import (
    PLAN_MONTHLY_CREDITS,
    PlanTier,
    credits_for_plan,
    deduct_scan_credit,
    get_or_create_balance,
    has_scan_credit,
    set_plan,
)

TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class _SpyHook:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    async def on_plan_change(self, *, ownership_scope_id, old_plan, new_plan) -> None:
        self.calls.append((old_plan, new_plan))


def test_credits_for_plan():
    assert credits_for_plan("free") == 50
    assert credits_for_plan("basic") == 500
    assert credits_for_plan("pro") == 5000
    assert PLAN_MONTHLY_CREDITS[PlanTier.PRO] == 5000


def test_credits_for_plan_rejects_unknown():
    with pytest.raises(ValueError):
        credits_for_plan("enterprise")


@pytest.mark.asyncio
async def test_get_or_create_balance_defaults_to_free(engine):
    async with _factory(engine)() as db:
        balance = await get_or_create_balance(db, ownership_scope_id=TEST_SCOPE_ID)
        await db.commit()
    assert balance.plan_tier == "free"
    assert balance.scan_credits == 50


@pytest.mark.asyncio
async def test_set_plan_reallocates_credits_and_notifies_hook(engine):
    hook = _SpyHook()
    async with _factory(engine)() as db:
        balance = await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="pro", hook=hook)
        await db.commit()
    assert balance.plan_tier == "pro"
    assert balance.scan_credits == 5000
    assert hook.calls == [("free", "pro")]


@pytest.mark.asyncio
async def test_set_plan_rejects_unknown(engine):
    async with _factory(engine)() as db:
        with pytest.raises(ValueError):
            await set_plan(db, ownership_scope_id=TEST_SCOPE_ID, plan="enterprise")


@pytest.mark.asyncio
async def test_deduct_scan_credit_decrements_then_exhausts(engine):
    async with _factory(engine)() as db:
        balance = await get_or_create_balance(db, ownership_scope_id=TEST_SCOPE_ID)
        balance.scan_credits = 1
        await db.flush()

        assert await has_scan_credit(db, ownership_scope_id=TEST_SCOPE_ID) is True
        assert await deduct_scan_credit(db, ownership_scope_id=TEST_SCOPE_ID) is True
        # exhausted now
        assert await has_scan_credit(db, ownership_scope_id=TEST_SCOPE_ID) is False
        assert await deduct_scan_credit(db, ownership_scope_id=TEST_SCOPE_ID) is False
        await db.commit()
