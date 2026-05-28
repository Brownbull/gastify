from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.insights import (
    InsightCategoryRollup,
    MonthlyInsightsResponse,
    insight_parent_for_category,
)
from app.services.insights_fixtures import (
    P6_INSIGHTS_SEED_CORPUS,
    P6_MARCH_EXPECTED_INSIGHTS,
    P6_PRIMARY_SCOPE_ID,
    P6_SECONDARY_SCOPE_ID,
)


def test_p6_seed_corpus_covers_three_months_two_scopes_and_key_edges():
    primary_rows = [
        row for row in P6_INSIGHTS_SEED_CORPUS if row.ownership_scope_id == P6_PRIMARY_SCOPE_ID
    ]
    primary_months = {
        (row.transaction_date.year, row.transaction_date.month) for row in primary_rows
    }

    assert primary_months == {(2026, 1), (2026, 2), (2026, 3)}
    assert any(row.ownership_scope_id == P6_SECONDARY_SCOPE_ID for row in P6_INSIGHTS_SEED_CORPUS)
    assert any(row.receipt_type == "statement" for row in primary_rows)
    assert any(row.store_category_source == "user" for row in primary_rows)
    assert any(item.flag_kind == "special_case" for row in primary_rows for item in row.items)
    usd_rows = [row for row in primary_rows if row.currency == "USD"]
    assert len(usd_rows) == 1
    assert usd_rows[0].amount_usd_minor == usd_rows[0].total_minor
    assert usd_rows[0].reporting_currency == "CLP"
    assert usd_rows[0].analytics_total_minor == 9_500
    assert usd_rows[0].items[0].analytics_total_minor == 9_500


def test_expected_march_insights_lock_financial_totals_and_top_categories():
    response = P6_MARCH_EXPECTED_INSIGHTS

    assert response.schema_version == "monthly-insights.v1"
    assert response.period_start == date(2026, 3, 1)
    assert response.period_end == date(2026, 3, 31)
    assert response.currency == "CLP"
    assert response.total_spend_minor == 276_500
    assert response.transaction_count == 7
    assert response.item_count == 8

    assert [(row.category_key, row.total_minor) for row in response.top_transaction_categories] == [
        ("Supermarket", 180_000),
        ("Restaurant", 45_000),
        ("GasStation", 24_000),
        ("SubscriptionService", 18_000),
        ("BookStore", 9_500),
    ]
    assert [(row.category_key, row.total_minor) for row in response.top_item_categories] == [
        ("MeatSeafood", 60_000),
        ("Snacks", 50_000),
        ("PreparedFood", 45_000),
        ("Pantry", 40_000),
        ("Produce", 30_000),
    ]
    assert response.excluded_items[0].flag_kind == "special_case"
    assert response.excluded_items[0].total_minor == 35_000


def test_expected_march_insights_lock_gravity_center_contract():
    gravity = P6_MARCH_EXPECTED_INSIGHTS.gravity_centers

    assert [(row.dimension, row.category_key, row.direction) for row in gravity] == [
        ("transaction_category", "Supermarket", "growth"),
        ("item_category", "Snacks", "growth"),
        ("item_category", "ServiceCharge", "shrink"),
    ]
    assert gravity[0].baseline_average_minor == 102_500
    assert gravity[0].ratio == Decimal("1.76")
    assert gravity[2].threshold == Decimal("0.50")


def test_expected_rollups_use_deterministic_parent_categories():
    supermarket = P6_MARCH_EXPECTED_INSIGHTS.top_transaction_categories[0]
    snacks = P6_MARCH_EXPECTED_INSIGHTS.top_item_categories[1]

    assert supermarket.parent_key == "SupermarketsIndustry"
    assert supermarket.parent_level == 1
    assert snacks.parent_key == "PackagedFood"
    assert snacks.parent_level == 3
    assert insight_parent_for_category("item_category", "Medications").key == (
        "HealthPersonalCareFamily"
    )


def test_rollup_schema_rejects_prompt_assigned_parent_levels():
    with pytest.raises(ValidationError, match="Input should be 2 or 4"):
        InsightCategoryRollup(
            dimension="transaction_category",
            category_key="SupermarketsIndustry",
            category_level=1,
            parent_key="SupermarketsIndustry",
            parent_level=1,
            label="Supermarkets",
            parent_label="Supermarkets",
            total_minor=1,
            currency="CLP",
            share_of_total_percent=Decimal("1"),
            transaction_count=1,
            item_count=1,
        )

    with pytest.raises(ValidationError, match="'Supermarket' is not a valid item_category"):
        InsightCategoryRollup(
            dimension="item_category",
            category_key="Supermarket",
            category_level=4,
            parent_key="SupermarketsIndustry",
            parent_level=3,
            label="Supermarket",
            parent_label="Supermarkets",
            total_minor=1,
            currency="CLP",
            share_of_total_percent=Decimal("1"),
            transaction_count=1,
            item_count=1,
        )


def test_monthly_insight_schema_normalizes_currency_and_rejects_inverted_period():
    response = MonthlyInsightsResponse(
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        currency="clp",
        total_spend_minor=0,
        transaction_count=0,
        item_count=0,
    )
    assert response.currency == "CLP"

    with pytest.raises(ValidationError, match="period_end must be on or after period_start"):
        MonthlyInsightsResponse(
            period_start=date(2026, 4, 1),
            period_end=date(2026, 3, 31),
            currency="CLP",
            total_spend_minor=0,
            transaction_count=0,
            item_count=0,
        )


def test_monthly_insight_schema_rejects_swapped_or_overlong_rollup_lists():
    transaction_rollup = P6_MARCH_EXPECTED_INSIGHTS.top_transaction_categories[0]
    item_rollup = P6_MARCH_EXPECTED_INSIGHTS.top_item_categories[0]

    with pytest.raises(
        ValidationError,
        match="top_transaction_categories must contain transaction_category rollups",
    ):
        MonthlyInsightsResponse(
            period_start=date(2026, 3, 1),
            period_end=date(2026, 3, 31),
            currency="CLP",
            total_spend_minor=0,
            transaction_count=0,
            item_count=0,
            top_transaction_categories=[item_rollup],
        )

    with pytest.raises(
        ValidationError,
        match="top_item_categories must contain item_category rollups",
    ):
        MonthlyInsightsResponse(
            period_start=date(2026, 3, 1),
            period_end=date(2026, 3, 31),
            currency="CLP",
            total_spend_minor=0,
            transaction_count=0,
            item_count=0,
            top_item_categories=[transaction_rollup],
        )

    with pytest.raises(ValidationError, match="at most 5 items"):
        MonthlyInsightsResponse(
            period_start=date(2026, 3, 1),
            period_end=date(2026, 3, 31),
            currency="CLP",
            total_spend_minor=0,
            transaction_count=0,
            item_count=0,
            top_transaction_categories=[transaction_rollup] * 6,
        )
