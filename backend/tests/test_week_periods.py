"""ISO-week report periods (bars-port plan, Phase 1): YYYY-Wnn → Monday..Sunday range,
accepted by the tree + monthly endpoints — the data contract behind the temporal bar's
weekly view (the series endpoint already speaks weeks)."""

from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.transaction import Transaction
from app.services.insights._shared import parse_report_period
from tests.conftest import TEST_SCOPE_ID


def test_week_period_mid_year():
    start, end = parse_report_period("2026-W24")
    assert start == date(2026, 6, 8)  # Monday
    assert end == date(2026, 6, 14)  # Sunday
    assert (end - start).days == 6


def test_week_period_year_boundary_w01_starts_in_prior_year():
    # ISO 2026-W01 begins Monday 2025-12-29 — the classic boundary case.
    start, end = parse_report_period("2026-W01")
    assert start == date(2025, 12, 29)
    assert end == date(2026, 1, 4)


def test_week_53_only_in_53_week_years():
    # 2026 has 53 ISO weeks (Jan 1 is a Thursday); 2025 does not.
    start, _ = parse_report_period("2026-W53")
    assert start.isocalendar().week == 53
    with pytest.raises(ValueError):
        parse_report_period("2025-W53")


@pytest.mark.parametrize("bad", ["2026-W00", "2026-W54", "2026-w24", "2026-W5"])
def test_malformed_week_keys_rejected(bad):
    with pytest.raises(ValueError):
        parse_report_period(bad)


@pytest.mark.asyncio
async def test_tree_and_monthly_accept_week_periods(client, engine):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        db.add(
            Transaction(
                ownership_scope_id=TEST_SCOPE_ID,
                transaction_date=date(2026, 6, 10),  # inside 2026-W24
                merchant="Week Store",
                total_minor=7000,
                currency="CLP",
            )
        )
        db.add(
            Transaction(
                ownership_scope_id=TEST_SCOPE_ID,
                transaction_date=date(2026, 6, 1),  # W23 — must be EXCLUDED
                merchant="Other Week",
                total_minor=999,
                currency="CLP",
            )
        )
        await db.commit()

    monthly = await client.get("/api/v1/insights/monthly?period=2026-W24")
    assert monthly.status_code == 200
    assert monthly.json()["total_spend_minor"] == 7000  # only the in-week txn

    tree = await client.get("/api/v1/insights/tree?period=2026-W24")
    assert tree.status_code == 200
    assert tree.json()["total_spend_minor"] == 7000

    bad = await client.get("/api/v1/insights/tree?period=2026-W54")
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_week_starting_on_day_one_of_month(client, engine):
    """W23-2026 starts MONDAY JUNE 1 — a week whose start coincides with month-begin
    (the deployed gallery caught this returning empty)."""
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        for d in (date(2026, 6, 1), date(2026, 6, 3), date(2026, 6, 6)):
            db.add(
                Transaction(
                    ownership_scope_id=TEST_SCOPE_ID,
                    transaction_date=d,
                    merchant=f"W23 {d}",
                    total_minor=1000,
                    currency="CLP",
                )
            )
        await db.commit()
    tree = await client.get("/api/v1/insights/tree?period=2026-W23")
    assert tree.status_code == 200
    assert tree.json()["total_spend_minor"] == 3000
