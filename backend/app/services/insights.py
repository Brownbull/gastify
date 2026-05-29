"""Deterministic monthly insights rollup engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING, cast

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.reference import ItemCategory, StoreCategory
from app.models.transaction import Transaction, TransactionItem
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
    ItemInsightFlagKind,
    MonthlyInsightsResponse,
    insight_parent_for_category,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.insights_fixtures import InsightSeedTransaction

_TOP_CATEGORY_LIMIT = 5
_GRAVITY_CENTER_LIMIT = 3
_BASELINE_MONTHS = 3
_GROWTH_THRESHOLD = Decimal("1.50")
_SHRINK_THRESHOLD = Decimal("0.50")
_DECIMAL_TWO_PLACES = Decimal("0.01")
_CACHE_MAX_ENTRIES = 128

_STORE_CATEGORY_BY_KEY = {category.key: category for category in V4_STORE_CATEGORY_TAXONOMY}
_ITEM_CATEGORY_BY_KEY = {category.key: category for category in V4_ITEM_CATEGORY_TAXONOMY}


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
        period_start: date,
        currency: str,
        fingerprint: str,
    ) -> MonthlyInsightsResponse | None:
        key = _InsightsCacheKey(
            ownership_scope_id=ownership_scope_id,
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
        period_start: date,
        currency: str,
        fingerprint: str,
        response: MonthlyInsightsResponse,
    ) -> None:
        if len(self._entries) >= _CACHE_MAX_ENTRIES:
            self._entries.clear()
        key = _InsightsCacheKey(
            ownership_scope_id=ownership_scope_id,
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
        start_date=baseline_start,
        end_date=period_end,
    )

    if cache is not None:
        cached = cache.get(
            ownership_scope_id=ownership_scope_id,
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
) -> tuple[InsightTransactionRecord, ...]:
    """Load persisted transactions into the reporting-currency rollup shape."""

    store_category_keys, item_category_keys = await _load_category_key_maps(db)
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.items))
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
    return "|".join(
        (
            str(transaction_row[0] or 0),
            str(transaction_row[1] or ""),
            str(transaction_row[2] or 0),
            str(item_row[0] or 0),
            str(item_row[1] or ""),
            str(item_row[2] or 0),
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
        flag_kind=_flag_kind_from_item(item),
    )


def _flag_kind_from_item(item: TransactionItem) -> ItemInsightFlagKind | None:
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
