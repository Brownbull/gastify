"""Deterministic monthly insights rollup engine."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from app.schemas.insights import (
    GravityDirection,
    InsightCategoryRollup,
    InsightDimension,
    InsightExcludedItemSummary,
    InsightGravityCenter,
    ItemInsightFlagKind,
    MonthlyInsightsResponse,
    insight_parent_for_category,
)

if TYPE_CHECKING:
    from datetime import date
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.insights_fixtures import InsightSeedTransaction

from app.services.insights._shared import (
    _BASELINE_MONTHS,
    _GRAVITY_CENTER_LIMIT,
    _GROWTH_THRESHOLD,
    _SHRINK_THRESHOLD,
    _TOP_CATEGORY_LIMIT,
    InsightTransactionRecord,
    _category_for_key,
    _category_level_for_dimension,
    _CategoryAccumulator,
    _parent_level_for_dimension,
    _prepare_transaction,
    _PreparedTransaction,
    _ratio,
    _share_percent,
    first_day_of_month,
    last_day_of_month,
    shift_months,
)
from app.services.insights.loading import (
    MONTHLY_INSIGHTS_CACHE,
    MonthlyInsightsCache,
    _database_fingerprint,
    _record_from_seed_row,
    load_insight_records_from_db,
)
from app.services.insights.tombstones import void_reason_for, voided_periods


async def get_monthly_insights(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str,
    user_id: UUID | None = None,
    cache: MonthlyInsightsCache | None = MONTHLY_INSIGHTS_CACHE,
    period_end: date | None = None,
) -> MonthlyInsightsResponse:
    """Build monthly insights for one ownership scope from persisted transactions.

    `period_end` defaults to month-end (unchanged month behavior); pass a quarter/year
    end to aggregate that range (D77 lift). The month cache is bypassed for non-month
    periods — its key is period_start-based and can't distinguish granularities.
    """

    normalized_period = first_day_of_month(period_start)
    # The QUERY range honors the raw start: ISO weeks (the temporal bar) begin
    # mid-month, and snapping would leak pre-period days in. M/Q/Y starts are day-1,
    # so range_start == normalized_period for them (cache/baseline math unchanged).
    range_start = period_start
    normalized_currency = currency.upper()
    range_end = period_end if period_end is not None else last_day_of_month(normalized_period)

    # Void BEFORE any load/cache (D82): if any month in the requested range was
    # tombstoned, the aggregate's underlying data is gone — show a void notice, not
    # a recomputed figure. Checked first so a freshly-tombstoned group can never be
    # served a stale (pre-void) cache entry. No-op for personal scopes (never voided).
    voided = await voided_periods(
        db,
        ownership_scope_id=ownership_scope_id,
        start_date=range_start,
        end_date=range_end,
    )
    if voided:
        return _voided_monthly_response(
            period_start=normalized_period,
            period_end=range_end,
            currency=normalized_currency,
            reason=void_reason_for(voided),
        )

    is_single_month = range_end == last_day_of_month(normalized_period)
    effective_cache = cache if is_single_month else None
    # The trailing baseline window (for gravity centers) + the fingerprint (the cache
    # key) are only needed for single-month periods; quarter/year skip both — no extra
    # baseline read and no wasted fingerprint query when the cache is bypassed.
    db_start = (
        shift_months(normalized_period, -_BASELINE_MONTHS) if is_single_month else range_start
    )

    fingerprint = ""
    if effective_cache is not None:
        fingerprint = await _database_fingerprint(
            db,
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            start_date=db_start,
            end_date=range_end,
        )
        cached = effective_cache.get(
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
        start_date=db_start,
        end_date=range_end,
        currency=normalized_currency,
        user_id=user_id,
    )
    response = build_monthly_insights_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=normalized_period,
        currency=normalized_currency,
        period_end=range_end,
    )
    if effective_cache is not None:
        effective_cache.set(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            period_start=normalized_period,
            currency=normalized_currency,
            fingerprint=fingerprint,
            response=response,
        )
    return response


def _voided_monthly_response(
    *,
    period_start: date,
    period_end: date,
    currency: str,
    reason: str | None,
) -> MonthlyInsightsResponse:
    """A shut-down monthly stat: zeroed totals + the localizable void reason (D82)."""
    return MonthlyInsightsResponse(
        period_start=period_start,
        period_end=period_end,
        currency=currency,
        total_spend_minor=0,
        transaction_count=0,
        item_count=0,
        voided=True,
        void_reason=reason,
    )


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
    period_end: date | None = None,
) -> MonthlyInsightsResponse:
    """Build top-category and gravity-center output from normalized records.

    `period_end` defaults to the end of `period_start`'s month (unchanged month
    behavior). Pass it to aggregate a quarter/year range (D77 lift); gravity centers
    (a per-category month-vs-baseline signal) are computed for single-month periods
    only — for quarter/year the top-category rollups still aggregate over the range.
    """

    normalized_period = first_day_of_month(period_start)
    # The QUERY range honors the raw start: ISO weeks (the temporal bar) begin
    # mid-month, and snapping would leak pre-period days in. M/Q/Y starts are day-1,
    # so range_start == normalized_period for them (cache/baseline math unchanged).
    range_start = period_start
    normalized_currency = currency.upper()
    range_end = period_end if period_end is not None else last_day_of_month(normalized_period)
    is_single_month = range_end == last_day_of_month(normalized_period)
    scoped_records = tuple(
        record
        for record in records
        if record.ownership_scope_id == ownership_scope_id
        and record.currency.upper() == normalized_currency
    )
    current_records = tuple(
        record
        for record in scoped_records
        if normalized_period <= record.transaction_date <= range_end
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
    if current_records and is_single_month:
        gravity_centers = _gravity_centers(
            scoped_records,
            period_start=normalized_period,
            currency=normalized_currency,
        )

    return MonthlyInsightsResponse(
        period_start=normalized_period,
        period_end=range_end,
        currency=normalized_currency,
        total_spend_minor=total_spend_minor,
        transaction_count=len(current_records),
        item_count=item_count,
        top_transaction_categories=transaction_rollups[:_TOP_CATEGORY_LIMIT],
        top_item_categories=item_rollups[:_TOP_CATEGORY_LIMIT],
        gravity_centers=gravity_centers,
        excluded_items=excluded_items,
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
