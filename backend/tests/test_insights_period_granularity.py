"""Reports v2 Phase 3: quarter/year period support on /insights/tree + /monthly (D77 lift)."""

from datetime import date

import pytest

from app.services.insights import parse_report_period
from tests.test_insights_engine import _seed_p6_database


def test_parse_report_period_month_quarter_year() -> None:
    assert parse_report_period("2026-03") == (date(2026, 3, 1), date(2026, 3, 31))
    assert parse_report_period("2026-Q1") == (date(2026, 1, 1), date(2026, 3, 31))
    assert parse_report_period("2026-Q4") == (date(2026, 10, 1), date(2026, 12, 31))
    assert parse_report_period("2026") == (date(2026, 1, 1), date(2026, 12, 31))


def test_parse_report_period_rejects_malformed() -> None:
    for bad in ["2026-13", "2026-Q5", "2026-Q0", "nope", "202603", "2026-1", ""]:
        with pytest.raises(ValueError):
            parse_report_period(bad)


async def test_tree_quarter_and_year_span_the_constituent_months(engine, client) -> None:
    # The P6 seed is March-2026-only, so Q1 (Jan-Mar) and the full year both aggregate
    # to exactly the March tree — but the response period spans the wider range.
    await _seed_p6_database(engine)
    march = (
        await client.get("/api/v1/insights/tree", params={"period": "2026-03", "currency": "CLP"})
    ).json()

    assert march["total_spend_minor"] == 276_500

    # Q1 (Jan-Mar) aggregates the seed's baseline months too → strictly more than March,
    # and a superset of March's category roots, over the quarter's date range.
    q1 = (await client.get("/api/v1/insights/tree", params={"period": "2026-Q1", "currency": "CLP"})).json()
    assert q1["total_spend_minor"] > march["total_spend_minor"]
    assert q1["period_start"] == "2026-01-01"
    assert q1["period_end"] == "2026-03-31"
    assert {n["key"] for n in march["roots"]} <= {n["key"] for n in q1["roots"]}

    # All 2026 spend falls in Jan-Mar, so the full year equals Q1 — over the year range.
    year = (await client.get("/api/v1/insights/tree", params={"period": "2026", "currency": "CLP"})).json()
    assert year["total_spend_minor"] == q1["total_spend_minor"]
    assert year["period_start"] == "2026-01-01"
    assert year["period_end"] == "2026-12-31"


async def test_monthly_quarter_aggregates_rollups_but_omits_gravity(engine, client) -> None:
    await _seed_p6_database(engine)
    march = (
        await client.get("/api/v1/insights/monthly", params={"period": "2026-03", "currency": "CLP"})
    ).json()
    q1 = (await client.get("/api/v1/insights/monthly", params={"period": "2026-Q1", "currency": "CLP"})).json()

    # Top-category rollups aggregate over the whole quarter (more than March alone).
    assert q1["total_spend_minor"] > march["total_spend_minor"]
    assert len(q1["top_transaction_categories"]) > 0
    # Gravity centers are a single-month vs-baseline signal — omitted for a quarter/year.
    assert q1["gravity_centers"] == []
    # March (a single month) still computes its gravity signal — unchanged behavior.
    assert isinstance(march["gravity_centers"], list)


async def test_year_period_monthly_is_accepted(engine, client) -> None:
    await _seed_p6_database(engine)
    year = (await client.get("/api/v1/insights/monthly", params={"period": "2026", "currency": "CLP"})).json()
    assert year["period_start"] == "2026-01-01"
    assert year["period_end"] == "2026-12-31"
    assert year["gravity_centers"] == []


async def test_malformed_period_returns_422(engine, client) -> None:
    await _seed_p6_database(engine)
    for bad in ["2026-13", "2026-Q5", "nope"]:
        resp = await client.get("/api/v1/insights/tree", params={"period": bad, "currency": "CLP"})
        assert resp.status_code == 422, bad
