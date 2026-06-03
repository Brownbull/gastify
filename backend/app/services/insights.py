"""Deterministic monthly insights rollup engine."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING, cast

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.reference import ItemCategory, StoreCategory
from app.models.transaction import Transaction, TransactionItem, TransactionItemFlag
from app.reference.categories import (
    V4_ITEM_CATEGORY_TAXONOMY,
    V4_STORE_CATEGORY_TAXONOMY,
    CategoryDefinition,
)
from app.schemas.insights import (
    GravityDirection,
    InsightCategoryLevel,
    InsightCategoryRollup,
    InsightDimension,
    InsightExcludedItemSummary,
    InsightGravityCenter,
    InsightParentLevel,
    InsightsSeriesPoint,
    InsightsSeriesResponse,
    InsightsTreeNode,
    InsightsTreeResponse,
    ItemInsightFlagKind,
    MonthlyInsightsResponse,
    SeriesGranularity,
    as_item_insight_flag_kind,
    insight_parent_for_category,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.insights_fixtures import InsightSeedTransaction

_TOP_CATEGORY_LIMIT = 5
_GRAVITY_CENTER_LIMIT = 3
_BASELINE_MONTHS = 3
SERIES_MAX_MONTHS = 24
_GROWTH_THRESHOLD = Decimal("1.50")
_SHRINK_THRESHOLD = Decimal("0.50")
_DECIMAL_TWO_PLACES = Decimal("0.01")
_CACHE_MAX_ENTRIES = 128

_STORE_CATEGORY_BY_KEY = {category.key: category for category in V4_STORE_CATEGORY_TAXONOMY}
_ITEM_CATEGORY_BY_KEY = {category.key: category for category in V4_ITEM_CATEGORY_TAXONOMY}


def _taxonomy_fingerprint(categories: tuple[CategoryDefinition, ...]) -> str:
    """Order-independent digest of (key, level, parent_key) across a taxonomy.

    Folded into the cache fingerprint so a category remap (a node's parent or
    level changing) busts cached insights even though the static taxonomy lives
    in code rather than in the rows the rest of the fingerprint hashes (D69 HIGH
    gate). A future DB-backed taxonomy or shared cache inherits remap-busting
    for free.
    """

    parts = sorted(
        f"{category.key}:{category.level}:{category.parent_key or ''}" for category in categories
    )
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:16]


_TAXONOMY_VERSION_TOKEN = _taxonomy_fingerprint(
    (*V4_STORE_CATEGORY_TAXONOMY, *V4_ITEM_CATEGORY_TAXONOMY)
)


@dataclass(frozen=True)
class InsightItemRecord:
    """Normalized transaction-item input for monthly rollups."""

    category_key: str | None
    total_minor: int
    flag_kind: ItemInsightFlagKind | None = None


@dataclass(frozen=True)
class InsightTransactionRecord:
    """Normalized transaction input in the reporting currency."""

    record_id: str
    ownership_scope_id: UUID
    transaction_date: date
    transaction_category_key: str | None
    total_minor: int
    currency: str
    items: tuple[InsightItemRecord, ...]


@dataclass
class _CategoryAccumulator:
    total_minor: int = 0
    item_count: int = 0
    transaction_ids: set[str] = field(default_factory=set)
    excluded_total_minor: int = 0
    excluded_item_count: int = 0


@dataclass(frozen=True)
class _PreparedTransaction:
    record: InsightTransactionRecord
    included_items: tuple[InsightItemRecord, ...]
    excluded_items: tuple[InsightItemRecord, ...]
    included_total_minor: int


@dataclass(frozen=True)
class _InsightsCacheKey:
    ownership_scope_id: UUID
    user_id: UUID | None
    period_start: date
    currency: str


@dataclass(frozen=True)
class _InsightsCacheEntry:
    fingerprint: str
    response: MonthlyInsightsResponse


class MonthlyInsightsCache:
    """Small process-local cache guarded by a database fingerprint."""

    def __init__(self) -> None:
        self._entries: dict[_InsightsCacheKey, _InsightsCacheEntry] = {}

    def get(
        self,
        *,
        ownership_scope_id: UUID,
        user_id: UUID | None = None,
        period_start: date,
        currency: str,
        fingerprint: str,
    ) -> MonthlyInsightsResponse | None:
        key = _InsightsCacheKey(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            period_start=period_start,
            currency=currency.upper(),
        )
        entry = self._entries.get(key)
        if entry is None or entry.fingerprint != fingerprint:
            return None
        return entry.response.model_copy(deep=True)

    def set(
        self,
        *,
        ownership_scope_id: UUID,
        user_id: UUID | None = None,
        period_start: date,
        currency: str,
        fingerprint: str,
        response: MonthlyInsightsResponse,
    ) -> None:
        if len(self._entries) >= _CACHE_MAX_ENTRIES:
            self._entries.clear()
        key = _InsightsCacheKey(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            period_start=period_start,
            currency=currency.upper(),
        )
        self._entries[key] = _InsightsCacheEntry(
            fingerprint=fingerprint,
            response=response.model_copy(deep=True),
        )

    def clear(self) -> None:
        self._entries.clear()


MONTHLY_INSIGHTS_CACHE = MonthlyInsightsCache()


async def get_monthly_insights(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str,
    user_id: UUID | None = None,
    cache: MonthlyInsightsCache | None = MONTHLY_INSIGHTS_CACHE,
) -> MonthlyInsightsResponse:
    """Build monthly insights for one ownership scope from persisted transactions."""

    normalized_period = first_day_of_month(period_start)
    normalized_currency = currency.upper()
    baseline_start = shift_months(normalized_period, -_BASELINE_MONTHS)
    period_end = last_day_of_month(normalized_period)
    fingerprint = await _database_fingerprint(
        db,
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        start_date=baseline_start,
        end_date=period_end,
    )

    if cache is not None:
        cached = cache.get(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            period_start=normalized_period,
            currency=normalized_currency,
            fingerprint=fingerprint,
        )
        if cached is not None:
            return cached

    records = await load_insight_records_from_db(
        db,
        ownership_scope_id=ownership_scope_id,
        start_date=baseline_start,
        end_date=period_end,
        currency=normalized_currency,
        user_id=user_id,
    )
    response = build_monthly_insights_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=normalized_period,
        currency=normalized_currency,
    )
    if cache is not None:
        cache.set(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            period_start=normalized_period,
            currency=normalized_currency,
            fingerprint=fingerprint,
            response=response,
        )
    return response


async def load_insight_records_from_db(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    start_date: date,
    end_date: date,
    currency: str,
    user_id: UUID | None = None,
) -> tuple[InsightTransactionRecord, ...]:
    """Load persisted transactions into the reporting-currency rollup shape."""

    store_category_keys, item_category_keys = await _load_category_key_maps(db)
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.items).selectinload(TransactionItem.item_flags))
        .where(
            Transaction.ownership_scope_id == ownership_scope_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .order_by(Transaction.transaction_date, Transaction.id)
    )
    transactions = list(result.scalars().all())

    records: list[InsightTransactionRecord] = []
    for txn in transactions:
        total_minor = _reporting_total_minor_for_transaction(txn, currency=currency)
        if total_minor is None:
            continue

        raw_items = tuple(txn.items)
        item_records = tuple(
            _item_record_from_db(
                item,
                item_category_keys=item_category_keys,
                source_total_minor=txn.total_minor,
                reporting_total_minor=total_minor,
                user_id=user_id,
            )
            for item in raw_items
        )
        records.append(
            InsightTransactionRecord(
                record_id=str(txn.id),
                ownership_scope_id=txn.ownership_scope_id,
                transaction_date=txn.transaction_date,
                transaction_category_key=(
                    store_category_keys.get(txn.store_category_id)
                    if txn.store_category_id is not None
                    else None
                ),
                total_minor=total_minor,
                currency=currency.upper(),
                items=item_records,
            )
        )
    return tuple(records)


def build_monthly_insights_from_seed(
    rows: tuple[InsightSeedTransaction, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str = "CLP",
) -> MonthlyInsightsResponse:
    """Build insights from the deterministic P6 fixture corpus."""

    records = tuple(_record_from_seed_row(row) for row in rows)
    return build_monthly_insights_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=period_start,
        currency=currency,
    )


def build_monthly_insights_from_records(
    records: tuple[InsightTransactionRecord, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str,
) -> MonthlyInsightsResponse:
    """Build top-category and gravity-center output from normalized records."""

    normalized_period = first_day_of_month(period_start)
    normalized_currency = currency.upper()
    period_end = last_day_of_month(normalized_period)
    scoped_records = tuple(
        record
        for record in records
        if record.ownership_scope_id == ownership_scope_id
        and record.currency.upper() == normalized_currency
    )
    current_records = tuple(
        record
        for record in scoped_records
        if normalized_period <= record.transaction_date <= period_end
    )

    prepared_current = tuple(_prepare_transaction(record) for record in current_records)
    total_spend_minor = sum(prepared.included_total_minor for prepared in prepared_current)
    item_count = sum(len(prepared.included_items) for prepared in prepared_current)
    excluded_items = _excluded_item_summary(prepared_current, currency=normalized_currency)

    transaction_rollups = _rollups_for_dimension(
        prepared_current,
        dimension="transaction_category",
        currency=normalized_currency,
        total_spend_minor=total_spend_minor,
    )
    item_rollups = _rollups_for_dimension(
        prepared_current,
        dimension="item_category",
        currency=normalized_currency,
        total_spend_minor=total_spend_minor,
    )

    gravity_centers: list[InsightGravityCenter] = []
    if current_records:
        gravity_centers = _gravity_centers(
            scoped_records,
            period_start=normalized_period,
            currency=normalized_currency,
        )

    return MonthlyInsightsResponse(
        period_start=normalized_period,
        period_end=period_end,
        currency=normalized_currency,
        total_spend_minor=total_spend_minor,
        transaction_count=len(current_records),
        item_count=item_count,
        top_transaction_categories=transaction_rollups[:_TOP_CATEGORY_LIMIT],
        top_item_categories=item_rollups[:_TOP_CATEGORY_LIMIT],
        gravity_centers=gravity_centers,
        excluded_items=excluded_items,
    )


@dataclass
class _SeriesBucketAccumulator:
    period: str
    period_start: date
    period_end: date
    total_minor: int = 0
    transaction_count: int = 0


async def get_insights_series(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    from_month: date,
    to_month: date,
    currency: str,
    granularity: SeriesGranularity = "month",
    user_id: UUID | None = None,
) -> InsightsSeriesResponse:
    """Build a multi-period spend series from persisted transactions (D68).

    One range query + in-memory bucketing — the O(1)-request replacement for a
    client fan-out of N monthly calls.
    """

    normalized_currency = currency.upper()
    start = first_day_of_month(from_month)
    end = last_day_of_month(to_month)
    records = await load_insight_records_from_db(
        db,
        ownership_scope_id=ownership_scope_id,
        start_date=start,
        end_date=end,
        currency=normalized_currency,
        user_id=user_id,
    )
    return build_insights_series_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=start,
        period_end=end,
        currency=normalized_currency,
        granularity=granularity,
    )


def build_insights_series_from_seed(
    rows: tuple[InsightSeedTransaction, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    period_end: date,
    currency: str = "CLP",
    granularity: SeriesGranularity = "month",
) -> InsightsSeriesResponse:
    """Build a spend series from the deterministic P6 fixture corpus."""

    records = tuple(_record_from_seed_row(row) for row in rows)
    return build_insights_series_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=period_start,
        period_end=period_end,
        currency=currency,
        granularity=granularity,
    )


def build_insights_series_from_records(
    records: tuple[InsightTransactionRecord, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    period_end: date,
    currency: str,
    granularity: SeriesGranularity = "month",
) -> InsightsSeriesResponse:
    """Bucket per-month spend totals into a month/quarter/year series.

    Emits one point per bucket touched by [period_start, period_end], including
    zero-spend buckets, so the time-series line shows gaps. Per-month
    `total_spend_minor` uses the same post-exclusion `included_total_minor`
    semantics as the monthly endpoint, keeping the current-month point in lock
    step with the dashboard total.
    """

    normalized_currency = currency.upper()
    start = first_day_of_month(period_start)
    last_month = first_day_of_month(period_end)
    range_end = last_day_of_month(period_end)
    scoped_records = tuple(
        record
        for record in records
        if record.ownership_scope_id == ownership_scope_id
        and record.currency.upper() == normalized_currency
    )

    buckets: dict[str, _SeriesBucketAccumulator] = {}
    cursor = start
    while cursor <= last_month:
        month_end = last_day_of_month(cursor)
        in_month = tuple(
            record for record in scoped_records if cursor <= record.transaction_date <= month_end
        )
        month_total = sum(_prepare_transaction(record).included_total_minor for record in in_month)
        month_count = len(in_month)

        key = _series_bucket_key(cursor, granularity)
        accumulator = buckets.get(key)
        if accumulator is None:
            buckets[key] = _SeriesBucketAccumulator(
                period=key,
                period_start=cursor,
                period_end=month_end,
                total_minor=month_total,
                transaction_count=month_count,
            )
        else:
            accumulator.period_start = min(accumulator.period_start, cursor)
            accumulator.period_end = max(accumulator.period_end, month_end)
            accumulator.total_minor += month_total
            accumulator.transaction_count += month_count
        cursor = shift_months(cursor, 1)

    points = [
        InsightsSeriesPoint(
            period=accumulator.period,
            period_start=accumulator.period_start,
            period_end=accumulator.period_end,
            total_spend_minor=accumulator.total_minor,
            transaction_count=accumulator.transaction_count,
        )
        for accumulator in buckets.values()
    ]
    return InsightsSeriesResponse(
        granularity=granularity,
        currency=normalized_currency,
        period_start=start,
        period_end=range_end,
        points=points,
    )


async def get_insights_tree(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str,
    dimension: InsightDimension = "transaction_category",
    user_id: UUID | None = None,
) -> InsightsTreeResponse:
    """Build the full drill-down category tree for one period + dimension (D69).

    One single-month range query + in-memory aggregation. The store dimension
    cross-walks each store-type's transactions into the item families/categories
    they contained, yielding a 4-level Industry -> Store-type -> Family -> Item
    tree; the item dimension yields a 2-level Family -> Item tree. No top-N
    truncation — every category with spend is present so the client can expand
    the whole tree in memory.
    """

    normalized_currency = currency.upper()
    normalized_period = first_day_of_month(period_start)
    period_end = last_day_of_month(normalized_period)
    records = await load_insight_records_from_db(
        db,
        ownership_scope_id=ownership_scope_id,
        start_date=normalized_period,
        end_date=period_end,
        currency=normalized_currency,
        user_id=user_id,
    )
    return build_insights_tree_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=normalized_period,
        currency=normalized_currency,
        dimension=dimension,
    )


def build_insights_tree_from_seed(
    rows: tuple[InsightSeedTransaction, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str = "CLP",
    dimension: InsightDimension = "transaction_category",
) -> InsightsTreeResponse:
    """Build the drill-down tree from the deterministic P6 fixture corpus."""

    records = tuple(_record_from_seed_row(row) for row in rows)
    return build_insights_tree_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=period_start,
        currency=currency,
        dimension=dimension,
    )


def build_insights_tree_from_records(
    records: tuple[InsightTransactionRecord, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str,
    dimension: InsightDimension = "transaction_category",
) -> InsightsTreeResponse:
    """Build the full (untruncated) drill-down tree from normalized records.

    Reuses the monthly engine's scoping, `_prepare_transaction` exclusion split,
    and post-exclusion `included_total_minor`, so leaf totals roll up to the same
    `total_spend_minor` as `/monthly` and `/series`.
    """

    normalized_currency = currency.upper()
    normalized_period = first_day_of_month(period_start)
    period_end = last_day_of_month(normalized_period)
    scoped_records = tuple(
        record
        for record in records
        if record.ownership_scope_id == ownership_scope_id
        and record.currency.upper() == normalized_currency
    )
    current_records = tuple(
        record
        for record in scoped_records
        if normalized_period <= record.transaction_date <= period_end
    )
    prepared_current = tuple(_prepare_transaction(record) for record in current_records)
    total_spend_minor = sum(prepared.included_total_minor for prepared in prepared_current)
    item_count = sum(len(prepared.included_items) for prepared in prepared_current)

    if dimension == "transaction_category":
        roots = _build_store_cross_walk_tree(
            prepared_current,
            currency=normalized_currency,
            total_spend_minor=total_spend_minor,
        )
    else:
        roots = _build_item_family_tree(
            prepared_current,
            currency=normalized_currency,
            total_spend_minor=total_spend_minor,
        )

    return InsightsTreeResponse(
        dimension=dimension,
        period_start=normalized_period,
        period_end=period_end,
        currency=normalized_currency,
        total_spend_minor=total_spend_minor,
        transaction_count=len(current_records),
        item_count=item_count,
        roots=roots,
    )


def _build_store_cross_walk_tree(
    prepared_transactions: tuple[_PreparedTransaction, ...],
    *,
    currency: str,
    total_spend_minor: int,
) -> list[InsightsTreeNode]:
    """Industry (L1) -> Store-type (L2) -> Item-family (L3) -> Item (L4).

    L1/L2 aggregate at the transaction level (by store category); L3/L4 are the
    cross-walk — the item families/categories of the *items inside* each
    store-type's transactions. The gap between an L2 total and the sum of its L3
    children (itemless transactions) surfaces as the client donut's "Other".
    """

    industry_accumulators: dict[str, _CategoryAccumulator] = {}
    store_accumulators: dict[str, _CategoryAccumulator] = {}
    store_industry: dict[str, str] = {}
    family_accumulators: dict[tuple[str, str], _CategoryAccumulator] = {}
    item_accumulators: dict[tuple[str, str], _CategoryAccumulator] = {}

    for prepared in prepared_transactions:
        store_key = prepared.record.transaction_category_key
        if not store_key or prepared.included_total_minor <= 0:
            continue
        industry_key = insight_parent_for_category("transaction_category", store_key).key
        store_industry[store_key] = industry_key
        _accumulate_transaction_into(
            industry_accumulators.setdefault(industry_key, _CategoryAccumulator()), prepared
        )
        _accumulate_transaction_into(
            store_accumulators.setdefault(store_key, _CategoryAccumulator()), prepared
        )
        for item in prepared.included_items:
            if item.category_key is None or item.total_minor <= 0:
                continue
            family_key = insight_parent_for_category("item_category", item.category_key).key
            _accumulate_item_into(
                family_accumulators.setdefault((store_key, family_key), _CategoryAccumulator()),
                total_minor=item.total_minor,
                record_id=prepared.record.record_id,
            )
            _accumulate_item_into(
                item_accumulators.setdefault(
                    (store_key, item.category_key), _CategoryAccumulator()
                ),
                total_minor=item.total_minor,
                record_id=prepared.record.record_id,
            )

    roots: list[InsightsTreeNode] = []
    for industry_key, industry_accumulator in industry_accumulators.items():
        store_children: list[InsightsTreeNode] = []
        for store_key, store_accumulator in store_accumulators.items():
            if store_industry[store_key] != industry_key:
                continue
            family_children: list[InsightsTreeNode] = []
            for (family_store_key, family_key), family_accumulator in family_accumulators.items():
                if family_store_key != store_key:
                    continue
                item_children = [
                    _tree_node(
                        key=item_key,
                        parent_key=family_key,
                        level=4,
                        accumulator=item_accumulator,
                        currency=currency,
                        total_spend_minor=total_spend_minor,
                        children=[],
                    )
                    for (item_store_key, item_key), item_accumulator in item_accumulators.items()
                    if item_store_key == store_key
                    and insight_parent_for_category("item_category", item_key).key == family_key
                ]
                family_children.append(
                    _tree_node(
                        key=family_key,
                        parent_key=store_key,
                        level=3,
                        accumulator=family_accumulator,
                        currency=currency,
                        total_spend_minor=total_spend_minor,
                        children=_sorted_tree_nodes(item_children),
                    )
                )
            store_children.append(
                _tree_node(
                    key=store_key,
                    parent_key=industry_key,
                    level=2,
                    accumulator=store_accumulator,
                    currency=currency,
                    total_spend_minor=total_spend_minor,
                    children=_sorted_tree_nodes(family_children),
                )
            )
        roots.append(
            _tree_node(
                key=industry_key,
                parent_key=None,
                level=1,
                accumulator=industry_accumulator,
                currency=currency,
                total_spend_minor=total_spend_minor,
                children=_sorted_tree_nodes(store_children),
            )
        )
    return _sorted_tree_nodes(roots)


def _build_item_family_tree(
    prepared_transactions: tuple[_PreparedTransaction, ...],
    *,
    currency: str,
    total_spend_minor: int,
) -> list[InsightsTreeNode]:
    """Item-family (L3) -> Item (L4) — the 2-level item-dimension tree."""

    family_accumulators: dict[str, _CategoryAccumulator] = {}
    item_accumulators: dict[str, _CategoryAccumulator] = {}
    for prepared in prepared_transactions:
        for item in prepared.included_items:
            if item.category_key is None or item.total_minor <= 0:
                continue
            family_key = insight_parent_for_category("item_category", item.category_key).key
            _accumulate_item_into(
                family_accumulators.setdefault(family_key, _CategoryAccumulator()),
                total_minor=item.total_minor,
                record_id=prepared.record.record_id,
            )
            _accumulate_item_into(
                item_accumulators.setdefault(item.category_key, _CategoryAccumulator()),
                total_minor=item.total_minor,
                record_id=prepared.record.record_id,
            )

    roots: list[InsightsTreeNode] = []
    for family_key, family_accumulator in family_accumulators.items():
        item_children = [
            _tree_node(
                key=item_key,
                parent_key=family_key,
                level=4,
                accumulator=item_accumulator,
                currency=currency,
                total_spend_minor=total_spend_minor,
                children=[],
            )
            for item_key, item_accumulator in item_accumulators.items()
            if insight_parent_for_category("item_category", item_key).key == family_key
        ]
        roots.append(
            _tree_node(
                key=family_key,
                parent_key=None,
                level=3,
                accumulator=family_accumulator,
                currency=currency,
                total_spend_minor=total_spend_minor,
                children=_sorted_tree_nodes(item_children),
            )
        )
    return _sorted_tree_nodes(roots)


def _accumulate_transaction_into(
    accumulator: _CategoryAccumulator, prepared: _PreparedTransaction
) -> None:
    accumulator.total_minor += prepared.included_total_minor
    accumulator.item_count += len(prepared.included_items)
    accumulator.transaction_ids.add(prepared.record.record_id)
    accumulator.excluded_total_minor += sum(item.total_minor for item in prepared.excluded_items)
    accumulator.excluded_item_count += len(prepared.excluded_items)


def _accumulate_item_into(
    accumulator: _CategoryAccumulator, *, total_minor: int, record_id: str
) -> None:
    accumulator.total_minor += total_minor
    accumulator.item_count += 1
    accumulator.transaction_ids.add(record_id)


def _tree_node(
    *,
    key: str,
    parent_key: str | None,
    level: int,
    accumulator: _CategoryAccumulator,
    currency: str,
    total_spend_minor: int,
    children: list[InsightsTreeNode],
) -> InsightsTreeNode:
    category = _tree_category_for_level(level, key)
    return InsightsTreeNode(
        key=category.key,
        label=category.display_labels["en"],
        parent_key=parent_key,
        level=level,
        total_minor=accumulator.total_minor,
        currency=currency,
        share_of_total_percent=_share_percent(accumulator.total_minor, total_spend_minor),
        transaction_count=len(accumulator.transaction_ids),
        item_count=accumulator.item_count,
        excluded_total_minor=accumulator.excluded_total_minor,
        children=children,
    )


def _tree_category_for_level(level: int, key: str) -> CategoryDefinition:
    lookup = _STORE_CATEGORY_BY_KEY if level in (1, 2) else _ITEM_CATEGORY_BY_KEY
    category = lookup.get(key)
    if category is None:
        raise ValueError(f"{key!r} is not a valid level-{level} category key")
    return category


def _sorted_tree_nodes(nodes: list[InsightsTreeNode]) -> list[InsightsTreeNode]:
    return sorted(nodes, key=lambda node: (-node.total_minor, node.label, node.key))


def _series_bucket_key(month_start: date, granularity: SeriesGranularity) -> str:
    if granularity == "month":
        return f"{month_start.year:04d}-{month_start.month:02d}"
    if granularity == "quarter":
        quarter = (month_start.month - 1) // 3 + 1
        return f"{month_start.year:04d}-Q{quarter}"
    return f"{month_start.year:04d}"


def first_day_of_month(value: date) -> date:
    return date(value.year, value.month, 1)


def last_day_of_month(value: date) -> date:
    return shift_months(first_day_of_month(value), 1) - timedelta(days=1)


def shift_months(value: date, offset: int) -> date:
    month_index = value.year * 12 + value.month - 1 + offset
    year = month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


async def _database_fingerprint(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    user_id: UUID | None,
    start_date: date,
    end_date: date,
) -> str:
    transaction_row = (
        await db.execute(
            select(
                func.count(Transaction.id),
                func.max(Transaction.updated_at),
                func.sum(Transaction.total_minor),
            ).where(
                Transaction.ownership_scope_id == ownership_scope_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
        )
    ).one()
    item_row = (
        await db.execute(
            select(
                func.count(TransactionItem.id),
                func.max(TransactionItem.updated_at),
                func.sum(TransactionItem.total_price_minor),
            )
            .join(Transaction, TransactionItem.transaction_id == Transaction.id)
            .where(
                Transaction.ownership_scope_id == ownership_scope_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
        )
    ).one()
    flag_query = (
        select(
            func.count(TransactionItemFlag.id),
            func.max(TransactionItemFlag.updated_at),
        )
        .join(TransactionItem, TransactionItemFlag.transaction_item_id == TransactionItem.id)
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .where(
            Transaction.ownership_scope_id == ownership_scope_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
    )
    if user_id is not None:
        flag_query = flag_query.where(TransactionItemFlag.user_id == user_id)
    flag_row = (await db.execute(flag_query)).one()
    return "|".join(
        (
            str(transaction_row[0] or 0),
            str(transaction_row[1] or ""),
            str(transaction_row[2] or 0),
            str(item_row[0] or 0),
            str(item_row[1] or ""),
            str(item_row[2] or 0),
            str(flag_row[0] or 0),
            str(flag_row[1] or ""),
            _TAXONOMY_VERSION_TOKEN,
        )
    )


async def _load_category_key_maps(
    db: AsyncSession,
) -> tuple[dict[UUID, str], dict[UUID, str]]:
    store_result = await db.execute(
        select(StoreCategory.id, StoreCategory.key).where(StoreCategory.level == 2)
    )
    item_result = await db.execute(
        select(ItemCategory.id, ItemCategory.key).where(ItemCategory.level == 4)
    )
    store_keys = {
        cast("UUID", category_id): str(category_key)
        for category_id, category_key in store_result.all()
    }
    item_keys = {
        cast("UUID", category_id): str(category_key)
        for category_id, category_key in item_result.all()
    }
    return store_keys, item_keys


def _reporting_total_minor_for_transaction(txn: Transaction, *, currency: str) -> int | None:
    normalized_currency = currency.upper()
    if txn.currency.upper() == normalized_currency:
        return txn.total_minor
    if normalized_currency == "USD" and txn.amount_usd_minor is not None:
        return txn.amount_usd_minor
    return None


def _item_record_from_db(
    item: TransactionItem,
    *,
    item_category_keys: dict[UUID, str],
    source_total_minor: int,
    reporting_total_minor: int,
    user_id: UUID | None,
) -> InsightItemRecord:
    if source_total_minor == reporting_total_minor:
        total_minor = item.total_price_minor
    else:
        total_minor = _scale_minor(
            item.total_price_minor,
            source_total_minor=source_total_minor,
            reporting_total_minor=reporting_total_minor,
        )
    return InsightItemRecord(
        category_key=(
            item_category_keys.get(item.item_category_id)
            if item.item_category_id is not None
            else None
        ),
        total_minor=total_minor,
        flag_kind=_flag_kind_from_item(item, user_id=user_id),
    )


def _flag_kind_from_item(
    item: TransactionItem,
    *,
    user_id: UUID | None,
) -> ItemInsightFlagKind | None:
    if user_id is not None:
        user_flag_kinds = [
            as_item_insight_flag_kind(flag.flag_kind)
            for flag in item.item_flags
            if flag.user_id == user_id
        ]
        if "special_case" in user_flag_kinds:
            return "special_case"
        if "urgency" in user_flag_kinds:
            return "urgency"
    if item.is_flagged and item.category_source != "statement_unidentified":
        return "special_case"
    return None


def _record_from_seed_row(row: InsightSeedTransaction) -> InsightTransactionRecord:
    return InsightTransactionRecord(
        record_id=row.fixture_id,
        ownership_scope_id=row.ownership_scope_id,
        transaction_date=row.transaction_date,
        transaction_category_key=row.store_category_key,
        total_minor=row.analytics_total_minor,
        currency=row.reporting_currency.upper(),
        items=tuple(
            InsightItemRecord(
                category_key=item.item_category_key,
                total_minor=item.analytics_total_minor,
                flag_kind=item.flag_kind,
            )
            for item in row.items
        ),
    )


def _scale_minor(
    value_minor: int,
    *,
    source_total_minor: int,
    reporting_total_minor: int,
) -> int:
    if source_total_minor <= 0:
        return 0
    return int(
        (
            Decimal(value_minor) * Decimal(reporting_total_minor) / Decimal(source_total_minor)
        ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )


def _prepare_transaction(record: InsightTransactionRecord) -> _PreparedTransaction:
    included_items = tuple(item for item in record.items if item.flag_kind is None)
    excluded_items = tuple(item for item in record.items if item.flag_kind is not None)
    if record.items:
        included_total_minor = sum(item.total_minor for item in included_items)
    else:
        included_total_minor = record.total_minor
    return _PreparedTransaction(
        record=record,
        included_items=included_items,
        excluded_items=excluded_items,
        included_total_minor=included_total_minor,
    )


def _excluded_item_summary(
    prepared_transactions: tuple[_PreparedTransaction, ...],
    *,
    currency: str,
) -> list[InsightExcludedItemSummary]:
    totals: dict[ItemInsightFlagKind, tuple[int, int]] = {}
    for prepared in prepared_transactions:
        for item in prepared.excluded_items:
            if item.flag_kind is None:
                continue
            total_minor, item_count = totals.get(item.flag_kind, (0, 0))
            totals[item.flag_kind] = (total_minor + item.total_minor, item_count + 1)

    return [
        InsightExcludedItemSummary(
            flag_kind=flag_kind,
            total_minor=total_minor,
            currency=currency,
            item_count=item_count,
        )
        for flag_kind, (total_minor, item_count) in sorted(
            totals.items(),
            key=lambda item: (-item[1][0], item[0]),
        )
    ]


def _rollups_for_dimension(
    prepared_transactions: tuple[_PreparedTransaction, ...],
    *,
    dimension: InsightDimension,
    currency: str,
    total_spend_minor: int,
) -> list[InsightCategoryRollup]:
    accumulators: dict[str, _CategoryAccumulator] = {}
    for prepared in prepared_transactions:
        if dimension == "transaction_category":
            _add_transaction_rollup(accumulators, prepared)
        else:
            _add_item_rollups(accumulators, prepared)

    rollups = [
        _build_rollup(
            dimension=dimension,
            category_key=category_key,
            accumulator=accumulator,
            currency=currency,
            total_spend_minor=total_spend_minor,
        )
        for category_key, accumulator in accumulators.items()
        if accumulator.total_minor > 0
    ]
    return sorted(rollups, key=lambda row: (-row.total_minor, row.label, row.category_key))


def _add_transaction_rollup(
    accumulators: dict[str, _CategoryAccumulator],
    prepared: _PreparedTransaction,
) -> None:
    category_key = prepared.record.transaction_category_key
    if not category_key or prepared.included_total_minor <= 0:
        return
    accumulator = accumulators.setdefault(category_key, _CategoryAccumulator())
    accumulator.total_minor += prepared.included_total_minor
    accumulator.item_count += len(prepared.included_items)
    accumulator.transaction_ids.add(prepared.record.record_id)
    accumulator.excluded_total_minor += sum(item.total_minor for item in prepared.excluded_items)
    accumulator.excluded_item_count += len(prepared.excluded_items)


def _add_item_rollups(
    accumulators: dict[str, _CategoryAccumulator],
    prepared: _PreparedTransaction,
) -> None:
    for item in prepared.included_items:
        if item.category_key is None or item.total_minor <= 0:
            continue
        accumulator = accumulators.setdefault(item.category_key, _CategoryAccumulator())
        accumulator.total_minor += item.total_minor
        accumulator.item_count += 1
        accumulator.transaction_ids.add(prepared.record.record_id)


def _build_rollup(
    *,
    dimension: InsightDimension,
    category_key: str,
    accumulator: _CategoryAccumulator,
    currency: str,
    total_spend_minor: int,
) -> InsightCategoryRollup:
    category = _category_for_key(dimension, category_key)
    parent = insight_parent_for_category(dimension, category_key)
    return InsightCategoryRollup(
        dimension=dimension,
        category_key=category.key,
        category_level=_category_level_for_dimension(dimension),
        parent_key=parent.key,
        parent_level=_parent_level_for_dimension(dimension),
        label=category.display_labels["en"],
        parent_label=parent.display_labels["en"],
        total_minor=accumulator.total_minor,
        currency=currency,
        share_of_total_percent=_share_percent(accumulator.total_minor, total_spend_minor),
        transaction_count=len(accumulator.transaction_ids),
        item_count=accumulator.item_count,
        excluded_total_minor=accumulator.excluded_total_minor,
        excluded_item_count=accumulator.excluded_item_count,
    )


def _gravity_centers(
    records: tuple[InsightTransactionRecord, ...],
    *,
    period_start: date,
    currency: str,
) -> list[InsightGravityCenter]:
    baseline_months = _baseline_months(records, period_start=period_start)
    if not baseline_months:
        return []

    current_prepared = tuple(
        _prepare_transaction(record)
        for record in records
        if period_start <= record.transaction_date <= last_day_of_month(period_start)
    )
    candidates: list[InsightGravityCenter] = []
    for dimension in ("transaction_category", "item_category"):
        current_totals = _totals_by_category(current_prepared, dimension=dimension)
        baseline_totals = _baseline_totals_by_category(
            records,
            dimension=dimension,
            baseline_months=baseline_months,
        )
        all_category_keys = set(current_totals) | set(baseline_totals)
        for category_key in all_category_keys:
            baseline_average = _baseline_average_minor(
                baseline_totals.get(category_key, {}),
                baseline_months=baseline_months,
            )
            if baseline_average <= 0:
                continue
            current_total = current_totals.get(category_key, 0)
            ratio = _ratio(current_total, baseline_average)
            gravity = _gravity_center_for_ratio(
                dimension=dimension,
                category_key=category_key,
                current_total_minor=current_total,
                baseline_average_minor=baseline_average,
                ratio=ratio,
                currency=currency,
                baseline_months=baseline_months,
            )
            if gravity is not None:
                candidates.append(gravity)

    return sorted(
        candidates,
        key=lambda row: (
            0 if row.direction == "growth" else 1,
            -abs(row.current_total_minor - row.baseline_average_minor),
            row.dimension,
            row.category_key,
        ),
    )[:_GRAVITY_CENTER_LIMIT]


def _baseline_months(
    records: tuple[InsightTransactionRecord, ...],
    *,
    period_start: date,
) -> tuple[date, ...]:
    previous_month = shift_months(period_start, -1)
    requested_start = shift_months(period_start, -_BASELINE_MONTHS)
    earlier_records = [record for record in records if record.transaction_date < period_start]
    if not earlier_records:
        return ()
    first_data_month = first_day_of_month(
        min(record.transaction_date for record in earlier_records)
    )
    start = max(requested_start, first_data_month)
    months: list[date] = []
    cursor = start
    while cursor <= previous_month:
        months.append(cursor)
        cursor = shift_months(cursor, 1)
    return tuple(months)


def _totals_by_category(
    prepared_transactions: tuple[_PreparedTransaction, ...],
    *,
    dimension: InsightDimension,
) -> dict[str, int]:
    accumulators: dict[str, _CategoryAccumulator] = {}
    for prepared in prepared_transactions:
        if dimension == "transaction_category":
            _add_transaction_rollup(accumulators, prepared)
        else:
            _add_item_rollups(accumulators, prepared)
    return {
        category_key: accumulator.total_minor
        for category_key, accumulator in accumulators.items()
        if accumulator.total_minor > 0
    }


def _baseline_totals_by_category(
    records: tuple[InsightTransactionRecord, ...],
    *,
    dimension: InsightDimension,
    baseline_months: tuple[date, ...],
) -> dict[str, dict[date, int]]:
    totals: dict[str, dict[date, int]] = {}
    baseline_month_set = set(baseline_months)
    for record in records:
        month = first_day_of_month(record.transaction_date)
        if month not in baseline_month_set:
            continue
        prepared = _prepare_transaction(record)
        month_totals = _totals_by_category((prepared,), dimension=dimension)
        for category_key, total_minor in month_totals.items():
            category_totals = totals.setdefault(category_key, {})
            category_totals[month] = category_totals.get(month, 0) + total_minor
    return totals


def _baseline_average_minor(
    category_totals: dict[date, int],
    *,
    baseline_months: tuple[date, ...],
) -> int:
    if not baseline_months:
        return 0
    total = sum(category_totals.get(month, 0) for month in baseline_months)
    return int((Decimal(total) / Decimal(len(baseline_months))).quantize(Decimal("1")))


def _gravity_center_for_ratio(
    *,
    dimension: InsightDimension,
    category_key: str,
    current_total_minor: int,
    baseline_average_minor: int,
    ratio: Decimal,
    currency: str,
    baseline_months: tuple[date, ...],
) -> InsightGravityCenter | None:
    direction: GravityDirection
    threshold: Decimal
    if ratio >= _GROWTH_THRESHOLD and current_total_minor > baseline_average_minor:
        direction = "growth"
        threshold = _GROWTH_THRESHOLD
    elif ratio <= _SHRINK_THRESHOLD and current_total_minor < baseline_average_minor:
        direction = "shrink"
        threshold = _SHRINK_THRESHOLD
    else:
        return None

    category = _category_for_key(dimension, category_key)
    parent = insight_parent_for_category(dimension, category_key)
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
        ratio=ratio,
        threshold=threshold,
        explanation=_gravity_explanation(
            label=category.display_labels["en"],
            direction=direction,
            ratio=ratio,
            baseline_months=baseline_months,
            currency=currency,
        ),
    )


def _gravity_explanation(
    *,
    label: str,
    direction: GravityDirection,
    ratio: Decimal,
    baseline_months: tuple[date, ...],
    currency: str,
) -> str:
    month_label = _month_range_label(baseline_months)
    if direction == "growth":
        return f"{label} spend is {ratio}x the {month_label} baseline."
    if label == "Service Charge":
        return f"Service charges are below half the {month_label} baseline."
    return f"{label} spend is below half the {month_label} baseline."


def _month_range_label(months: tuple[date, ...]) -> str:
    if not months:
        return "trailing"
    if len(months) == 1:
        return months[0].strftime("%B")
    return f"{months[0].strftime('%B')}-{months[-1].strftime('%B')}"


def _share_percent(total_minor: int, total_spend_minor: int) -> Decimal:
    if total_spend_minor <= 0:
        return Decimal("0.00")
    return (Decimal(total_minor) * Decimal(100) / Decimal(total_spend_minor)).quantize(
        _DECIMAL_TWO_PLACES, rounding=ROUND_HALF_UP
    )


def _ratio(current_total_minor: int, baseline_average_minor: int) -> Decimal:
    if baseline_average_minor <= 0:
        return Decimal("0.00")
    return (Decimal(current_total_minor) / Decimal(baseline_average_minor)).quantize(
        _DECIMAL_TWO_PLACES,
        rounding=ROUND_HALF_UP,
    )


def _category_for_key(dimension: InsightDimension, key: str) -> CategoryDefinition:
    if dimension == "transaction_category":
        category = _STORE_CATEGORY_BY_KEY.get(key)
    else:
        category = _ITEM_CATEGORY_BY_KEY.get(key)
    if category is None:
        raise ValueError(f"{key!r} is not a valid {dimension} category key")
    return category


def _category_level_for_dimension(dimension: InsightDimension) -> InsightCategoryLevel:
    return 2 if dimension == "transaction_category" else 4


def _parent_level_for_dimension(dimension: InsightDimension) -> InsightParentLevel:
    return 1 if dimension == "transaction_category" else 3
