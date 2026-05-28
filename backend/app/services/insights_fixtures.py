"""Deterministic P6 analytics fixture contract.

The runtime insights engine is implemented in later P6 phases. This module locks
the seed corpus and expected March 2026 response shape that those phases must
match.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal, cast
from uuid import UUID

from app.reference.categories import (
    V4_ITEM_CATEGORY_TAXONOMY,
    V4_STORE_CATEGORY_TAXONOMY,
    CategoryDefinition,
)
from app.schemas.insights import (
    InsightCategoryLevel,
    InsightCategoryRollup,
    InsightDimension,
    InsightExcludedItemSummary,
    InsightGravityCenter,
    InsightParentLevel,
    ItemInsightFlagKind,
    MonthlyInsightsResponse,
    insight_parent_for_category,
)

P6_PRIMARY_SCOPE_ID = UUID("00000000-0000-0000-0000-000000006001")
P6_SECONDARY_SCOPE_ID = UUID("00000000-0000-0000-0000-000000006002")

StoreCategorySource = Literal["ai", "mapping", "user", "unknown"]
ReceiptType = Literal["scan", "statement", "manual"]

_STORE_CATEGORY_BY_KEY = {category.key: category for category in V4_STORE_CATEGORY_TAXONOMY}
_ITEM_CATEGORY_BY_KEY = {category.key: category for category in V4_ITEM_CATEGORY_TAXONOMY}


@dataclass(frozen=True)
class InsightSeedItem:
    name: str
    item_category_key: str
    total_minor: int
    flag_kind: ItemInsightFlagKind | None = None
    reporting_total_minor: int | None = None

    @property
    def analytics_total_minor(self) -> int:
        if self.reporting_total_minor is not None:
            return self.reporting_total_minor
        return self.total_minor


@dataclass(frozen=True)
class InsightSeedTransaction:
    fixture_id: str
    ownership_scope_id: UUID
    transaction_date: date
    merchant: str
    store_category_key: str
    store_category_source: StoreCategorySource
    total_minor: int
    currency: str
    amount_usd_minor: int
    receipt_type: ReceiptType
    items: tuple[InsightSeedItem, ...]
    reporting_currency: str = "CLP"
    reporting_total_minor: int | None = None

    @property
    def analytics_total_minor(self) -> int:
        if self.reporting_total_minor is not None:
            return self.reporting_total_minor
        return self.total_minor


P6_INSIGHTS_SEED_CORPUS: tuple[InsightSeedTransaction, ...] = (
    InsightSeedTransaction(
        fixture_id="primary-2026-01-supermarket",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 1, 5),
        merchant="Jumbo Nunoa",
        store_category_key="Supermarket",
        store_category_source="ai",
        total_minor=100_000,
        currency="CLP",
        amount_usd_minor=105,
        receipt_type="scan",
        items=(
            InsightSeedItem("Produce basket", "Produce", 25_000),
            InsightSeedItem("Pantry staples", "Pantry", 45_000),
            InsightSeedItem("Snacks", "Snacks", 30_000),
        ),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-01-restaurant",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 1, 10),
        merchant="La Picada",
        store_category_key="Restaurant",
        store_category_source="ai",
        total_minor=40_000,
        currency="CLP",
        amount_usd_minor=42,
        receipt_type="scan",
        items=(InsightSeedItem("Dinner", "PreparedFood", 40_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-01-subscription",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 1, 15),
        merchant="Streaming Service",
        store_category_key="SubscriptionService",
        store_category_source="unknown",
        total_minor=18_000,
        currency="CLP",
        amount_usd_minor=19,
        receipt_type="statement",
        items=(InsightSeedItem("Monthly subscription", "Subscription", 18_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-01-fuel",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 1, 22),
        merchant="Copec",
        store_category_key="GasStation",
        store_category_source="mapping",
        total_minor=52_000,
        currency="CLP",
        amount_usd_minor=55,
        receipt_type="scan",
        items=(InsightSeedItem("Fuel", "ServiceCharge", 52_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-02-supermarket",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 2, 4),
        merchant="Jumbo Nunoa",
        store_category_key="Supermarket",
        store_category_source="ai",
        total_minor=105_000,
        currency="CLP",
        amount_usd_minor=110,
        receipt_type="scan",
        items=(
            InsightSeedItem("Produce basket", "Produce", 25_000),
            InsightSeedItem("Pantry staples", "Pantry", 50_000),
            InsightSeedItem("Snacks", "Snacks", 30_000),
        ),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-02-restaurant",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 2, 11),
        merchant="La Picada",
        store_category_key="Restaurant",
        store_category_source="ai",
        total_minor=42_000,
        currency="CLP",
        amount_usd_minor=44,
        receipt_type="scan",
        items=(InsightSeedItem("Dinner", "PreparedFood", 42_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-02-subscription",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 2, 15),
        merchant="Streaming Service",
        store_category_key="SubscriptionService",
        store_category_source="unknown",
        total_minor=18_000,
        currency="CLP",
        amount_usd_minor=19,
        receipt_type="statement",
        items=(InsightSeedItem("Monthly subscription", "Subscription", 18_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-02-fuel",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 2, 20),
        merchant="Copec",
        store_category_key="GasStation",
        store_category_source="mapping",
        total_minor=56_000,
        currency="CLP",
        amount_usd_minor=59,
        receipt_type="scan",
        items=(InsightSeedItem("Fuel", "ServiceCharge", 56_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-03-supermarket-large",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 3, 5),
        merchant="Jumbo Nunoa",
        store_category_key="Supermarket",
        store_category_source="ai",
        total_minor=120_000,
        currency="CLP",
        amount_usd_minor=126,
        receipt_type="scan",
        items=(
            InsightSeedItem("Produce basket", "Produce", 30_000),
            InsightSeedItem("Snacks", "Snacks", 50_000),
            InsightSeedItem("Pantry staples", "Pantry", 40_000),
        ),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-03-supermarket-user-edited",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 3, 8),
        merchant="Carniceria corrected to supermarket basket",
        store_category_key="Supermarket",
        store_category_source="user",
        total_minor=60_000,
        currency="CLP",
        amount_usd_minor=63,
        receipt_type="scan",
        items=(InsightSeedItem("Weekend meat", "MeatSeafood", 60_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-03-restaurant",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 3, 11),
        merchant="La Picada",
        store_category_key="Restaurant",
        store_category_source="ai",
        total_minor=45_000,
        currency="CLP",
        amount_usd_minor=47,
        receipt_type="scan",
        items=(InsightSeedItem("Dinner", "PreparedFood", 45_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-03-subscription-statement",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 3, 15),
        merchant="Streaming Service",
        store_category_key="SubscriptionService",
        store_category_source="unknown",
        total_minor=18_000,
        currency="CLP",
        amount_usd_minor=19,
        receipt_type="statement",
        items=(InsightSeedItem("Monthly subscription", "Subscription", 18_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-03-pharmacy-flagged",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 3, 18),
        merchant="Farmacia",
        store_category_key="Pharmacy",
        store_category_source="ai",
        total_minor=35_000,
        currency="CLP",
        amount_usd_minor=37,
        receipt_type="scan",
        items=(InsightSeedItem("Illness medication", "Medications", 35_000, "special_case"),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-03-fuel-shrink",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 3, 22),
        merchant="Copec",
        store_category_key="GasStation",
        store_category_source="mapping",
        total_minor=24_000,
        currency="CLP",
        amount_usd_minor=25,
        receipt_type="scan",
        items=(InsightSeedItem("Fuel", "ServiceCharge", 24_000),),
    ),
    InsightSeedTransaction(
        fixture_id="primary-2026-03-usd-books-shadow",
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        transaction_date=date(2026, 3, 25),
        merchant="Kindle Store",
        store_category_key="BookStore",
        store_category_source="ai",
        total_minor=1_000,
        currency="USD",
        amount_usd_minor=1_000,
        receipt_type="scan",
        items=(
            InsightSeedItem(
                "E-book",
                "BooksMedia",
                1_000,
                reporting_total_minor=9_500,
            ),
        ),
        reporting_currency="CLP",
        reporting_total_minor=9_500,
    ),
    InsightSeedTransaction(
        fixture_id="secondary-2026-03-supermarket-isolation",
        ownership_scope_id=P6_SECONDARY_SCOPE_ID,
        transaction_date=date(2026, 3, 7),
        merchant="Other Scope Supermarket",
        store_category_key="Supermarket",
        store_category_source="ai",
        total_minor=999_999,
        currency="CLP",
        amount_usd_minor=1_050,
        receipt_type="scan",
        items=(InsightSeedItem("Other user's pantry", "Pantry", 999_999),),
    ),
)


def _rollup(
    *,
    dimension: InsightDimension,
    category_key: str,
    total_minor: int,
    share_of_total_percent: str,
    transaction_count: int,
    item_count: int,
) -> InsightCategoryRollup:
    parent = insight_parent_for_category(dimension, category_key)
    category = _category_for_fixture(dimension, category_key)
    return InsightCategoryRollup(
        dimension=dimension,
        category_key=category.key,
        category_level=_category_level_for_dimension(dimension),
        parent_key=parent.key,
        parent_level=_parent_level_for_dimension(dimension),
        label=category.display_labels["en"],
        parent_label=parent.display_labels["en"],
        total_minor=total_minor,
        currency="CLP",
        share_of_total_percent=Decimal(share_of_total_percent),
        transaction_count=transaction_count,
        item_count=item_count,
    )


def _gravity(
    *,
    dimension: InsightDimension,
    category_key: str,
    direction: Literal["growth", "shrink"],
    current_total_minor: int,
    baseline_average_minor: int,
    ratio: str,
    threshold: str,
    explanation: str,
) -> InsightGravityCenter:
    parent = insight_parent_for_category(dimension, category_key)
    category = _category_for_fixture(dimension, category_key)
    return InsightGravityCenter(
        dimension=dimension,
        category_key=category.key,
        category_level=_category_level_for_dimension(dimension),
        parent_key=parent.key,
        parent_level=_parent_level_for_dimension(dimension),
        label=category.display_labels["en"],
        direction=direction,
        current_total_minor=current_total_minor,
        baseline_average_minor=baseline_average_minor,
        ratio=Decimal(ratio),
        threshold=Decimal(threshold),
        explanation=explanation,
    )


def _category_for_fixture(dimension: InsightDimension, key: str) -> CategoryDefinition:
    if dimension == "transaction_category":
        category = _STORE_CATEGORY_BY_KEY.get(key)
    else:
        category = _ITEM_CATEGORY_BY_KEY.get(key)
    if category is None:
        raise ValueError(f"{key!r} is not a valid {dimension} fixture key")
    return category


def _category_level_for_dimension(dimension: InsightDimension) -> InsightCategoryLevel:
    value = 2 if dimension == "transaction_category" else 4
    return cast("InsightCategoryLevel", value)


def _parent_level_for_dimension(dimension: InsightDimension) -> InsightParentLevel:
    value = 1 if dimension == "transaction_category" else 3
    return cast("InsightParentLevel", value)


P6_MARCH_EXPECTED_INSIGHTS = MonthlyInsightsResponse(
    period_start=date(2026, 3, 1),
    period_end=date(2026, 3, 31),
    currency="CLP",
    total_spend_minor=276_500,
    transaction_count=7,
    item_count=8,
    top_transaction_categories=[
        _rollup(
            dimension="transaction_category",
            category_key="Supermarket",
            total_minor=180_000,
            share_of_total_percent="65.10",
            transaction_count=2,
            item_count=4,
        ),
        _rollup(
            dimension="transaction_category",
            category_key="Restaurant",
            total_minor=45_000,
            share_of_total_percent="16.27",
            transaction_count=1,
            item_count=1,
        ),
        _rollup(
            dimension="transaction_category",
            category_key="GasStation",
            total_minor=24_000,
            share_of_total_percent="8.68",
            transaction_count=1,
            item_count=1,
        ),
        _rollup(
            dimension="transaction_category",
            category_key="SubscriptionService",
            total_minor=18_000,
            share_of_total_percent="6.51",
            transaction_count=1,
            item_count=1,
        ),
        _rollup(
            dimension="transaction_category",
            category_key="BookStore",
            total_minor=9_500,
            share_of_total_percent="3.44",
            transaction_count=1,
            item_count=1,
        ),
    ],
    top_item_categories=[
        _rollup(
            dimension="item_category",
            category_key="MeatSeafood",
            total_minor=60_000,
            share_of_total_percent="21.70",
            transaction_count=1,
            item_count=1,
        ),
        _rollup(
            dimension="item_category",
            category_key="Snacks",
            total_minor=50_000,
            share_of_total_percent="18.08",
            transaction_count=1,
            item_count=1,
        ),
        _rollup(
            dimension="item_category",
            category_key="PreparedFood",
            total_minor=45_000,
            share_of_total_percent="16.27",
            transaction_count=1,
            item_count=1,
        ),
        _rollup(
            dimension="item_category",
            category_key="Pantry",
            total_minor=40_000,
            share_of_total_percent="14.47",
            transaction_count=1,
            item_count=1,
        ),
        _rollup(
            dimension="item_category",
            category_key="Produce",
            total_minor=30_000,
            share_of_total_percent="10.85",
            transaction_count=1,
            item_count=1,
        ),
    ],
    gravity_centers=[
        _gravity(
            dimension="transaction_category",
            category_key="Supermarket",
            direction="growth",
            current_total_minor=180_000,
            baseline_average_minor=102_500,
            ratio="1.76",
            threshold="1.50",
            explanation="Supermarket spend is 1.76x the January-February baseline.",
        ),
        _gravity(
            dimension="item_category",
            category_key="Snacks",
            direction="growth",
            current_total_minor=50_000,
            baseline_average_minor=30_000,
            ratio="1.67",
            threshold="1.50",
            explanation="Snacks spend is 1.67x the January-February baseline.",
        ),
        _gravity(
            dimension="item_category",
            category_key="ServiceCharge",
            direction="shrink",
            current_total_minor=24_000,
            baseline_average_minor=54_000,
            ratio="0.44",
            threshold="0.50",
            explanation="Service charges are below half the January-February baseline.",
        ),
    ],
    excluded_items=[
        InsightExcludedItemSummary(
            flag_kind="special_case",
            total_minor=35_000,
            currency="CLP",
            item_count=1,
        )
    ],
)
