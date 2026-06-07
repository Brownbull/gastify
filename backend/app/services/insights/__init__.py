"""Deterministic insights rollup engine (split into _shared/loading/series/tree/monthly)."""

from app.services.insights._shared import (
    _TAXONOMY_VERSION_TOKEN,
    SERIES_MAX_MONTHS,
    InsightItemRecord,
    InsightTransactionRecord,
    _taxonomy_fingerprint,
    parse_report_period,
)
from app.services.insights.loading import (
    MONTHLY_INSIGHTS_CACHE,
    MonthlyInsightsCache,
    _database_fingerprint,
    load_insight_records_from_db,
)
from app.services.insights.monthly import (
    build_monthly_insights_from_records,
    build_monthly_insights_from_seed,
    get_monthly_insights,
)
from app.services.insights.series import (
    build_insights_series_from_records,
    build_insights_series_from_seed,
    get_insights_series,
)
from app.services.insights.tree import (
    build_insights_tree_from_records,
    build_insights_tree_from_seed,
    get_insights_tree,
)

__all__ = [
    "InsightItemRecord",
    "InsightTransactionRecord",
    "MONTHLY_INSIGHTS_CACHE",
    "MonthlyInsightsCache",
    "SERIES_MAX_MONTHS",
    "_TAXONOMY_VERSION_TOKEN",
    "_database_fingerprint",
    "_taxonomy_fingerprint",
    "build_insights_series_from_records",
    "build_insights_series_from_seed",
    "build_insights_tree_from_records",
    "build_insights_tree_from_seed",
    "build_monthly_insights_from_records",
    "build_monthly_insights_from_seed",
    "get_insights_series",
    "get_insights_tree",
    "get_monthly_insights",
    "load_insight_records_from_db",
    "parse_report_period",
]
