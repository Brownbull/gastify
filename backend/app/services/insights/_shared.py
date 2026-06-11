"""Deterministic monthly insights rollup engine."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from app.reference.categories import (
    V4_ITEM_CATEGORY_TAXONOMY,
    V4_STORE_CATEGORY_TAXONOMY,
    CategoryDefinition,
)
from app.schemas.insights import (
    InsightCategoryLevel,
    InsightDimension,
    InsightParentLevel,
    ItemInsightFlagKind,
    MonthlyInsightsResponse,
    insight_parent_for_category,
)

if TYPE_CHECKING:
    from uuid import UUID


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


def _parent_key_or_none(dimension: InsightDimension, category_key: str) -> str | None:
    """Parent category key for a leaf, or None if the key/parent is not in the
    static taxonomy. Lets the tree builders skip an orphaned category instead of
    500-ing the whole endpoint on a future dangling-parent taxonomy edit."""

    try:
        return insight_parent_for_category(dimension, category_key).key
    except ValueError:
        return None


def _tree_category_for_level(level: int, key: str) -> CategoryDefinition:
    lookup = _STORE_CATEGORY_BY_KEY if level in (1, 2) else _ITEM_CATEGORY_BY_KEY
    category = lookup.get(key)
    if category is None:
        raise ValueError(f"{key!r} is not a valid level-{level} category key")
    return category


def parse_report_period(value: str) -> tuple[date, date]:
    """Parse a report-period key → (period_start, period_end) inclusive range.

    Accepts the four granularity key formats the series emits (D77 + the W/M/Q/Y
    temporal bar): `YYYY` (year), `YYYY-Qn` (quarter), `YYYY-MM` (month), and
    `YYYY-Wnn` (ISO week, Monday..Sunday — fromisocalendar handles year-boundary
    weeks and rejects W53 in 52-week years). Raises ValueError on a malformed key.
    """
    if len(value) == 4 and value.isdigit():
        year = int(value)
        return date(year, 1, 1), date(year, 12, 31)
    if len(value) == 7 and value[4:6] == "-Q":
        year = int(value[:4])
        quarter = int(value[6])
        if quarter < 1 or quarter > 4:
            raise ValueError(f"quarter out of range: {value}")
        start_month = (quarter - 1) * 3 + 1
        start = date(year, start_month, 1)
        return start, last_day_of_month(date(year, start_month + 2, 1))
    if len(value) == 8 and value[4:6] == "-W":
        year = int(value[:4])
        week = int(value[6:8])
        start = date.fromisocalendar(year, week, 1)  # raises ValueError when invalid
        return start, start + timedelta(days=6)
    if len(value) == 7 and value[4] == "-":
        year = int(value[:4])
        month = int(value[5:7])
        start = date(year, month, 1)
        return start, last_day_of_month(start)
    raise ValueError(f"unrecognized period: {value}")


def first_day_of_month(value: date) -> date:
    return date(value.year, value.month, 1)


def last_day_of_month(value: date) -> date:
    return shift_months(first_day_of_month(value), 1) - timedelta(days=1)


def shift_months(value: date, offset: int) -> date:
    month_index = value.year * 12 + value.month - 1 + offset
    year = month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


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
