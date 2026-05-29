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

INSIGHT_SCHEMA_VERSION: Literal["monthly-insights.v1"] = "monthly-insights.v1"

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


def as_insight_dimension(value: str) -> InsightDimension:
    if value not in {"transaction_category", "item_category"}:
        raise ValueError(f"invalid insight dimension: {value}")
    return cast("InsightDimension", value)


def as_item_insight_flag_kind(value: str) -> ItemInsightFlagKind:
    if value not in {"urgency", "special_case"}:
        raise ValueError(f"invalid item insight flag kind: {value}")
    return cast("ItemInsightFlagKind", value)
