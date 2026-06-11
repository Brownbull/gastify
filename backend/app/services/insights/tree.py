"""Deterministic monthly insights rollup engine."""

from __future__ import annotations

from datetime import date, timedelta
from typing import TYPE_CHECKING

from app.schemas.insights import (
    InsightDimension,
    InsightsSeriesPoint,
    InsightsTreeNode,
    InsightsTreeResponse,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.insights_fixtures import InsightSeedTransaction

from app.services.insights._shared import (
    InsightTransactionRecord,
    _CategoryAccumulator,
    _parent_key_or_none,
    _prepare_transaction,
    _PreparedTransaction,
    _share_percent,
    _tree_category_for_level,
    first_day_of_month,
    last_day_of_month,
    shift_months,
)
from app.services.insights.loading import _record_from_seed_row, load_insight_records_from_db
from app.services.insights.series import _series_bucket_key
from app.services.insights.tombstones import void_reason_for, voided_periods


async def get_insights_tree(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    period_start: date,
    currency: str,
    dimension: InsightDimension = "transaction_category",
    user_id: UUID | None = None,
    period_end: date | None = None,
    include_series: bool = False,
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
    # Weeks (the W/M/Q/Y temporal bar) start mid-month; snapping to month-begin would
    # leak pre-period days in. M/Q/Y starts are already day-1, so this is a no-op there.
    normalized_period = period_start if period_start.day != 1 else first_day_of_month(period_start)
    range_end = period_end if period_end is not None else last_day_of_month(normalized_period)

    # Void BEFORE loading (D82): a tombstoned month in the range shuts the whole
    # period's tree down — an empty void notice, not a recomputed tree. No-op for
    # personal scopes (never tombstoned).
    voided = await voided_periods(
        db,
        ownership_scope_id=ownership_scope_id,
        start_date=normalized_period,
        end_date=range_end,
    )
    if voided:
        return _voided_tree_response(
            period_start=normalized_period,
            period_end=range_end,
            currency=normalized_currency,
            dimension=dimension,
            reason=void_reason_for(voided),
        )

    records = await load_insight_records_from_db(
        db,
        ownership_scope_id=ownership_scope_id,
        start_date=normalized_period,
        end_date=range_end,
        currency=normalized_currency,
        user_id=user_id,
    )
    return build_insights_tree_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=normalized_period,
        currency=normalized_currency,
        dimension=dimension,
        period_end=range_end,
        include_series=include_series,
    )


def _voided_tree_response(
    *,
    period_start: date,
    period_end: date,
    currency: str,
    dimension: InsightDimension,
    reason: str | None,
) -> InsightsTreeResponse:
    """A shut-down tree: no roots + the localizable void reason (D82)."""
    return InsightsTreeResponse(
        dimension=dimension,
        period_start=period_start,
        period_end=period_end,
        currency=currency,
        total_spend_minor=0,
        transaction_count=0,
        item_count=0,
        roots=[],
        voided=True,
        void_reason=reason,
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
    period_end: date | None = None,
    include_series: bool = False,
) -> InsightsTreeResponse:
    """Build the full (untruncated) drill-down tree from normalized records.

    Reuses the monthly engine's scoping, `_prepare_transaction` exclusion split,
    and post-exclusion `included_total_minor`, so leaf totals roll up to the same
    `total_spend_minor` as `/monthly` and `/series`. `period_end` defaults to the
    end of `period_start`'s month (unchanged month behavior); pass it explicitly to
    span a quarter/year range (D77 lift).
    """

    normalized_currency = currency.upper()
    # Weeks (the W/M/Q/Y temporal bar) start mid-month; snapping to month-begin would
    # leak pre-period days in. M/Q/Y starts are already day-1, so this is a no-op there.
    normalized_period = period_start if period_start.day != 1 else first_day_of_month(period_start)
    range_end = period_end if period_end is not None else last_day_of_month(normalized_period)
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

    if include_series:
        series_map = _build_root_node_series(
            prepared_current,
            dimension=dimension,
            period_start=normalized_period,
            period_end=range_end,
        )
        roots = [root.model_copy(update={"series": series_map.get(root.key)}) for root in roots]

    return InsightsTreeResponse(
        dimension=dimension,
        period_start=normalized_period,
        period_end=range_end,
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
    item_family: dict[str, str] = {}

    for prepared in prepared_transactions:
        store_key = prepared.record.transaction_category_key
        if not store_key or prepared.included_total_minor <= 0:
            continue
        industry_key = _parent_key_or_none("transaction_category", store_key)
        if industry_key is None:
            continue
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
            family_key = _parent_key_or_none("item_category", item.category_key)
            if family_key is None:
                continue
            item_family[item.category_key] = family_key
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
                    if item_store_key == store_key and item_family[item_key] == family_key
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
    item_family: dict[str, str] = {}
    for prepared in prepared_transactions:
        for item in prepared.included_items:
            if item.category_key is None or item.total_minor <= 0:
                continue
            family_key = _parent_key_or_none("item_category", item.category_key)
            if family_key is None:
                continue
            item_family[item.category_key] = family_key
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
            if item_family[item_key] == family_key
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


def _node_sub_buckets(period_start: date, period_end: date) -> list[tuple[str, date, date]]:
    """Ordered (key, start, end) sub-period buckets WITHIN [period_start, period_end]
    for the per-node sparkline series: ISO weeks (Monday-start) for a single month,
    else calendar months. Empty buckets are kept by the caller so the line shows gaps."""

    buckets: list[tuple[str, date, date]] = []
    if period_end == last_day_of_month(period_start):  # single month -> weekly
        cursor = period_start - timedelta(days=period_start.weekday())
        end_monday = period_end - timedelta(days=period_end.weekday())
        while cursor <= end_monday:
            iso_year, iso_week, _ = cursor.isocalendar()
            buckets.append((f"{iso_year:04d}-W{iso_week:02d}", cursor, cursor + timedelta(days=6)))
            cursor += timedelta(days=7)
        return buckets
    cursor = first_day_of_month(period_start)  # quarter/year -> monthly
    last_month = first_day_of_month(period_end)
    while cursor <= last_month:
        buckets.append((_series_bucket_key(cursor, "month"), cursor, last_day_of_month(cursor)))
        cursor = shift_months(cursor, 1)
    return buckets


def _build_root_node_series(
    prepared_transactions: tuple[_PreparedTransaction, ...],
    *,
    dimension: InsightDimension,
    period_start: date,
    period_end: date,
) -> dict[str, list[InsightsSeriesPoint]]:
    """Per-ROOT (top-level node) sub-period spend series within the viewed period.

    Store roots bucket transaction `included_total_minor` by industry; item roots
    bucket item `total_minor` by family — the same root resolution the tree builders
    use, so a root's series sums to its node total. Zero-spend buckets are emitted so
    the sparkline shows the true shape. Only roots are keyed (placement: parent groups).

    `prepared_transactions` are expected to be the tree's `current_records` (already
    filtered to [period_start, period_end]); the loop re-clamps to that window anyway,
    so a stray out-of-period row can never skew a bucket — the ISO-week buckets of a
    single month straddle the month edges, so the bucket span is wider than the period.
    """

    buckets = _node_sub_buckets(period_start, period_end)
    if not buckets:
        return {}
    totals: dict[str, list[int]] = {}
    record_ids: dict[str, list[set[str]]] = {}

    def _bucket_index(when: date) -> int | None:
        for index, (_, b_start, b_end) in enumerate(buckets):
            if b_start <= when <= b_end:
                return index
        return None

    def _add(root_key: str, index: int, amount: int, record_id: str) -> None:
        if root_key not in totals:
            totals[root_key] = [0] * len(buckets)
            record_ids[root_key] = [set() for _ in buckets]
        totals[root_key][index] += amount
        record_ids[root_key][index].add(record_id)

    for prepared in prepared_transactions:
        when = prepared.record.transaction_date
        if when < period_start or when > period_end:
            continue  # defensive: keep the series within the viewed period
        index = _bucket_index(when)
        if index is None:
            continue
        record_id = prepared.record.record_id
        if dimension == "transaction_category":
            store_key = prepared.record.transaction_category_key
            if not store_key or prepared.included_total_minor <= 0:
                continue
            root_key = _parent_key_or_none("transaction_category", store_key)
            if root_key is not None:
                _add(root_key, index, prepared.included_total_minor, record_id)
            continue
        for item in prepared.included_items:
            if item.category_key is None or item.total_minor <= 0:
                continue
            root_key = _parent_key_or_none("item_category", item.category_key)
            if root_key is not None:
                _add(root_key, index, item.total_minor, record_id)

    return {
        root_key: [
            InsightsSeriesPoint(
                period=key,
                period_start=b_start,
                period_end=b_end,
                total_spend_minor=totals[root_key][index],
                transaction_count=len(record_ids[root_key][index]),
            )
            for index, (key, b_start, b_end) in enumerate(buckets)
        ]
        for root_key in totals
    }


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
        label=category.display_labels.get("en", category.key),
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


def _sorted_tree_nodes(nodes: list[InsightsTreeNode]) -> list[InsightsTreeNode]:
    return sorted(nodes, key=lambda node: (-node.total_minor, node.label, node.key))
