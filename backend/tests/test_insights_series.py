"""Time-series rollup engine tests (D68 — GET /insights/series).

Series totals are cross-checked against the locked monthly engine so the
current-month point of a month-granularity series equals the dashboard total.
"""

import uuid
from datetime import date

from app.services.insights import (
    build_insights_series_from_seed,
    build_monthly_insights_from_seed,
)
from app.services.insights_fixtures import (
    P6_INSIGHTS_SEED_CORPUS,
    P6_PRIMARY_SCOPE_ID,
)

_SEED_MONTHS = (date(2026, 1, 1), date(2026, 2, 1), date(2026, 3, 1))


def _monthly_total(period_start: date) -> int:
    return build_monthly_insights_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=period_start,
    ).total_spend_minor


def _monthly_count(period_start: date) -> int:
    return build_monthly_insights_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=period_start,
    ).transaction_count


def test_month_series_points_match_monthly_engine_totals():
    response = build_insights_series_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 1, 1),
        period_end=date(2026, 3, 1),
        granularity="month",
    )

    assert response.granularity == "month"
    assert response.currency == "CLP"
    assert [point.period for point in response.points] == ["2026-01", "2026-02", "2026-03"]
    for point, month in zip(response.points, _SEED_MONTHS, strict=True):
        assert point.total_spend_minor == _monthly_total(month)
        assert point.transaction_count == _monthly_count(month)
        assert point.period_start == month
    # Each monthly point has real spend (the seed corpus is non-empty Jan-Mar).
    assert all(point.total_spend_minor > 0 for point in response.points)


def test_quarter_series_sums_the_three_months():
    response = build_insights_series_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 1, 1),
        period_end=date(2026, 3, 1),
        granularity="quarter",
    )

    assert [point.period for point in response.points] == ["2026-Q1"]
    point = response.points[0]
    assert point.total_spend_minor == sum(_monthly_total(month) for month in _SEED_MONTHS)
    assert point.transaction_count == sum(_monthly_count(month) for month in _SEED_MONTHS)
    assert point.period_start == date(2026, 1, 1)
    assert point.period_end == date(2026, 3, 31)


def test_year_series_sums_the_three_months():
    response = build_insights_series_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 1, 1),
        period_end=date(2026, 3, 1),
        granularity="year",
    )

    assert [point.period for point in response.points] == ["2026"]
    point = response.points[0]
    assert point.total_spend_minor == sum(_monthly_total(month) for month in _SEED_MONTHS)
    assert point.period_start == date(2026, 1, 1)
    assert point.period_end == date(2026, 3, 31)


def test_empty_months_emit_zero_points_so_the_line_shows_gaps():
    response = build_insights_series_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 1, 1),
        period_end=date(2026, 4, 1),  # April has no seed data
        granularity="month",
    )

    assert [point.period for point in response.points] == [
        "2026-01",
        "2026-02",
        "2026-03",
        "2026-04",
    ]
    april = response.points[-1]
    assert april.total_spend_minor == 0
    assert april.transaction_count == 0


def test_series_excludes_other_ownership_scope():
    other_scope = uuid.UUID("00000000-0000-0000-0000-000000006102")
    response = build_insights_series_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=other_scope,
        period_start=date(2026, 1, 1),
        period_end=date(2026, 3, 1),
        granularity="month",
    )

    assert all(point.total_spend_minor == 0 for point in response.points)
    assert all(point.transaction_count == 0 for point in response.points)


def test_non_reporting_currency_is_filtered_out():
    response = build_insights_series_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 1, 1),
        period_end=date(2026, 3, 1),
        currency="USD",  # seed corpus is CLP
        granularity="month",
    )

    assert response.currency == "USD"
    assert all(point.total_spend_minor == 0 for point in response.points)
