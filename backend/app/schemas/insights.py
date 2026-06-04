"""P6 monthly insight API contracts.

Phase 1 locked the response shape and taxonomy invariants. Phase 2 implements
the runtime rollup service against this contract.
"""

from datetime import date
from decimal import Decimal
from typing import Literal, cast

from pydantic import BaseModel, Field, field_validator, model_validator

from app.reference.categories import (
    V4_ITEM_CATEGORY_TAXONOMY,
    V4_STORE_CATEGORY_TAXONOMY,
    CategoryDefinition,
)

InsightDimension = Literal["transaction_category", "item_category"]
InsightCategoryLevel = Literal[2, 4]
InsightParentLevel = Literal[1, 3]
GravityDirection = Literal["growth", "shrink"]
ItemInsightFlagKind = Literal["urgency", "special_case"]
SeriesGranularity = Literal["month", "quarter", "year"]

INSIGHT_SCHEMA_VERSION: Literal["monthly-insights.v1"] = "monthly-insights.v1"
INSIGHT_SERIES_SCHEMA_VERSION: Literal["insights-series.v1"] = "insights-series.v1"
INSIGHT_TREE_SCHEMA_VERSION: Literal["insights-tree.v1"] = "insights-tree.v1"

_STORE_CATEGORY_BY_KEY = {category.key: category for category in V4_STORE_CATEGORY_TAXONOMY}
_ITEM_CATEGORY_BY_KEY = {category.key: category for category in V4_ITEM_CATEGORY_TAXONOMY}


def _category_for_dimension(dimension: InsightDimension, key: str) -> CategoryDefinition | None:
    if dimension == "transaction_category":
        return _STORE_CATEGORY_BY_KEY.get(key)
    return _ITEM_CATEGORY_BY_KEY.get(key)


def _expected_levels(
    dimension: InsightDimension,
) -> tuple[InsightCategoryLevel, InsightParentLevel]:
    if dimension == "transaction_category":
        return 2, 1
    return 4, 3


def _validate_category_path(
    *,
    dimension: InsightDimension,
    category_key: str,
    category_level: int,
    parent_key: str,
    parent_level: int,
) -> None:
    expected_category_level, expected_parent_level = _expected_levels(dimension)
    if category_level != expected_category_level:
        raise ValueError(f"{dimension} rollups must use level {expected_category_level}")
    if parent_level != expected_parent_level:
        raise ValueError(f"{dimension} rollups must use parent level {expected_parent_level}")

    category = _category_for_dimension(dimension, category_key)
    parent = _category_for_dimension(dimension, parent_key)
    if category is None or category.level != expected_category_level:
        raise ValueError(f"{category_key!r} is not a valid {dimension} category key")
    if parent is None or parent.level != expected_parent_level:
        raise ValueError(f"{parent_key!r} is not a valid {dimension} parent key")
    if category.parent_key != parent.key:
        raise ValueError(f"{category_key!r} is not a child of {parent_key!r}")


def insight_parent_for_category(
    dimension: InsightDimension,
    category_key: str,
) -> CategoryDefinition:
    category = _category_for_dimension(dimension, category_key)
    if category is None:
        raise ValueError(f"{category_key!r} is not a valid {dimension} category key")
    if category.parent_key is None:
        raise ValueError(f"{category_key!r} has no deterministic parent")
    parent = _category_for_dimension(dimension, category.parent_key)
    if parent is None:
        raise ValueError(f"{category_key!r} parent {category.parent_key!r} is missing")
    return parent


class InsightCategoryRollup(BaseModel):
    dimension: InsightDimension
    category_key: str
    category_level: InsightCategoryLevel
    parent_key: str
    parent_level: InsightParentLevel
    label: str
    parent_label: str
    total_minor: int = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    share_of_total_percent: Decimal = Field(ge=0, le=100)
    transaction_count: int = Field(ge=0)
    item_count: int = Field(ge=0)
    excluded_total_minor: int = Field(default=0, ge=0)
    excluded_item_count: int = Field(default=0, ge=0)

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def _validate_taxonomy_path(self) -> "InsightCategoryRollup":
        _validate_category_path(
            dimension=self.dimension,
            category_key=self.category_key,
            category_level=self.category_level,
            parent_key=self.parent_key,
            parent_level=self.parent_level,
        )
        return self


class InsightGravityCenter(BaseModel):
    dimension: InsightDimension
    category_key: str
    category_level: InsightCategoryLevel
    parent_key: str
    parent_level: InsightParentLevel
    label: str
    direction: GravityDirection
    current_total_minor: int = Field(ge=0)
    baseline_average_minor: int = Field(ge=0)
    ratio: Decimal = Field(ge=0)
    threshold: Decimal = Field(ge=0)
    explanation: str

    @model_validator(mode="after")
    def _validate_taxonomy_path(self) -> "InsightGravityCenter":
        _validate_category_path(
            dimension=self.dimension,
            category_key=self.category_key,
            category_level=self.category_level,
            parent_key=self.parent_key,
            parent_level=self.parent_level,
        )
        return self


class InsightExcludedItemSummary(BaseModel):
    flag_kind: ItemInsightFlagKind
    total_minor: int = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    item_count: int = Field(ge=0)

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()


class MonthlyInsightsResponse(BaseModel):
    schema_version: Literal["monthly-insights.v1"] = INSIGHT_SCHEMA_VERSION
    period_start: date
    period_end: date
    currency: str = Field(min_length=3, max_length=3)
    total_spend_minor: int = Field(ge=0)
    transaction_count: int = Field(ge=0)
    item_count: int = Field(ge=0)
    top_transaction_categories: list[InsightCategoryRollup] = Field(
        default_factory=list,
        max_length=5,
    )
    top_item_categories: list[InsightCategoryRollup] = Field(
        default_factory=list,
        max_length=5,
    )
    gravity_centers: list[InsightGravityCenter] = Field(default_factory=list)
    excluded_items: list[InsightExcludedItemSummary] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def _validate_response_contract(self) -> "MonthlyInsightsResponse":
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        for transaction_row in self.top_transaction_categories:
            if transaction_row.dimension != "transaction_category":
                raise ValueError(
                    "top_transaction_categories must contain transaction_category rollups"
                )
            if transaction_row.currency != self.currency:
                raise ValueError("top_transaction_categories currency must match response currency")
        for item_row in self.top_item_categories:
            if item_row.dimension != "item_category":
                raise ValueError("top_item_categories must contain item_category rollups")
            if item_row.currency != self.currency:
                raise ValueError("top_item_categories currency must match response currency")
        for excluded_row in self.excluded_items:
            if excluded_row.currency != self.currency:
                raise ValueError("excluded_items currency must match response currency")
        return self


class InsightsSeriesPoint(BaseModel):
    """One time bucket of total spend in the reporting currency.

    `total_spend_minor` uses the same post-exclusion semantics as
    `MonthlyInsightsResponse.total_spend_minor`, so the current-month point of a
    month-granularity series equals the dashboard's monthly total.
    """

    period: str = Field(
        min_length=4,
        max_length=7,
        description="Canonical bucket label: YYYY-MM (month), YYYY-Q{n} (quarter), or YYYY (year).",
    )
    period_start: date
    period_end: date
    total_spend_minor: int = Field(ge=0)
    transaction_count: int = Field(ge=0)

    @model_validator(mode="after")
    def _validate_point(self) -> "InsightsSeriesPoint":
        if self.period_end < self.period_start:
            raise ValueError("point period_end must be on or after period_start")
        return self


class InsightsSeriesResponse(BaseModel):
    """Multi-period spend series for the Trends bar/line chart (D68).

    One additive read-only aggregate over a month range, bucketed by
    granularity. Replaces a client fan-out of N monthly calls.
    """

    schema_version: Literal["insights-series.v1"] = INSIGHT_SERIES_SCHEMA_VERSION
    granularity: SeriesGranularity
    currency: str = Field(min_length=3, max_length=3)
    period_start: date
    period_end: date
    points: list[InsightsSeriesPoint] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def _validate_series_contract(self) -> "InsightsSeriesResponse":
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        return self


class InsightsTreeNode(BaseModel):
    """One node of the drill-down category tree (D69).

    Unlike `InsightCategoryRollup`, `level` is a free 1-4 integer so the tree can
    carry L1 industry / L3 family parent nodes (which the rollup's `Literal[2, 4]`
    category level rejects). `parent_key` is the key of this node's parent *in the
    tree*: for the store cross-walk tree an item-family (L3) is nested under the
    store-type (L2) whose transactions contained it, so its `parent_key` is that
    store-type key rather than its taxonomy family parent. `share_of_total_percent`
    is relative to the response `total_spend_minor`; clients recompute
    within-parent proportions from `total_minor` when rendering a drilled level.

    `excluded_total_minor` is populated only at the transaction-aggregated levels
    (store L1/L2 / item-dimension roots); it is always 0 at the item-level
    cross-walk depths (store L3/L4), where excluded items have already been
    removed before aggregation. Do not read it as "nothing excluded" at depth.
    """

    key: str
    label: str
    parent_key: str | None = None
    level: int = Field(ge=1, le=4)
    total_minor: int = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    share_of_total_percent: Decimal = Field(ge=0, le=100)
    transaction_count: int = Field(ge=0)
    item_count: int = Field(ge=0)
    excluded_total_minor: int = Field(default=0, ge=0)
    children: list["InsightsTreeNode"] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()


class InsightsTreeResponse(BaseModel):
    """Full drill-down category tree for one period + dimension (D69).

    The client fetches this once per (period, dimension) and expands it in memory
    (zero round-trips per drill step). `dimension="transaction_category"` returns
    the 4-level store cross-walk tree (Industry -> Store-type -> Item-family ->
    Item); `dimension="item_category"` returns the 2-level item tree (Family ->
    Item). No top-N truncation — every category with spend is present.
    """

    schema_version: Literal["insights-tree.v1"] = INSIGHT_TREE_SCHEMA_VERSION
    dimension: InsightDimension
    period_start: date
    period_end: date
    currency: str = Field(min_length=3, max_length=3)
    total_spend_minor: int = Field(ge=0)
    transaction_count: int = Field(ge=0)
    item_count: int = Field(ge=0)
    roots: list[InsightsTreeNode] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def _uppercase_currency(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def _validate_tree_contract(self) -> "InsightsTreeResponse":
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        return self


def as_insight_dimension(value: str) -> InsightDimension:
    if value not in {"transaction_category", "item_category"}:
        raise ValueError(f"invalid insight dimension: {value}")
    return cast("InsightDimension", value)


def as_item_insight_flag_kind(value: str) -> ItemInsightFlagKind:
    if value not in {"urgency", "special_case"}:
        raise ValueError(f"invalid item insight flag kind: {value}")
    return cast("ItemInsightFlagKind", value)
