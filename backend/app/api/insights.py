"""Monthly insights endpoints."""

from __future__ import annotations

import uuid  # noqa: TC003 - FastAPI resolves the Query(uuid.UUID) annotation at runtime.
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

# Auth is a runtime Annotated FastAPI dep (TC001); resolve_analytics_scope is a
# plain coroutine imported on the same line, so the line-level noqa covers both.
from app.auth.deps import Auth, resolve_analytics_scope  # noqa: TC001
from app.db import get_db
from app.schemas.insights import (
    InsightDimension,
    InsightsSeriesResponse,
    InsightsTreeResponse,
    MonthlyInsightsResponse,
    SeriesGranularity,
)
from app.services.insights import (
    SERIES_MAX_MONTHS,
    get_insights_series,
    get_insights_tree,
    get_monthly_insights,
    parse_report_period,
)

router = APIRouter(prefix="/insights", tags=["insights"])

DB = Annotated[AsyncSession, Depends(get_db)]

# A report period: YYYY-MM (month), YYYY-Qn (quarter), or YYYY (year). Quarter/year
# aggregate the constituent months (D77 lift); month is the original behavior.
_REPORT_PERIOD_PATTERN = r"^[1-9]\d{3}(-(0[1-9]|1[0-2]|Q[1-4]))?$"


def _parse_report_range(value: str) -> tuple[date, date]:
    try:
        return parse_report_period(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="period must be YYYY-MM, YYYY-Qn, or YYYY",
        ) from exc


@router.get("/monthly", response_model=MonthlyInsightsResponse)
async def get_monthly_insights_endpoint(
    auth: Auth,
    db: DB,
    period: str = Query(
        ...,
        description="Report period: YYYY-MM (month), YYYY-Qn (quarter), or YYYY (year).",
        pattern=_REPORT_PERIOD_PATTERN,
    ),
    currency: str | None = Query(
        default=None,
        min_length=3,
        max_length=3,
        description="Reporting currency. Defaults to the user's default currency.",
    ),
    group_id: uuid.UUID | None = Query(
        default=None,
        description="Analyze a group scope you belong to; defaults to your personal scope.",
    ),
) -> MonthlyInsightsResponse:
    period_start, period_end = _parse_report_range(period)
    reporting_currency = (currency or auth.user.default_currency).upper()
    scope_id = await resolve_analytics_scope(db, auth, group_id)
    return await get_monthly_insights(
        db,
        ownership_scope_id=scope_id,
        user_id=auth.user_id,
        period_start=period_start,
        currency=reporting_currency,
        period_end=period_end,
    )


@router.get("/series", response_model=InsightsSeriesResponse)
async def get_insights_series_endpoint(
    auth: Auth,
    db: DB,
    range_from: str = Query(
        ...,
        alias="from",
        description="Inclusive start month in YYYY-MM format.",
        pattern=r"^\d{4}-\d{2}$",
    ),
    range_to: str = Query(
        ...,
        alias="to",
        description="Inclusive end month in YYYY-MM format.",
        pattern=r"^\d{4}-\d{2}$",
    ),
    granularity: SeriesGranularity = Query(
        default="month",
        description="Bucket grain: month, quarter, or year.",
    ),
    currency: str | None = Query(
        default=None,
        min_length=3,
        max_length=3,
        description="Reporting currency. Defaults to the user's default currency.",
    ),
    group_id: uuid.UUID | None = Query(
        default=None,
        description="Analyze a group scope you belong to; defaults to your personal scope.",
    ),
) -> InsightsSeriesResponse:
    from_month = _parse_period(range_from)
    to_month = _parse_period(range_to)
    if to_month < from_month:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'to' must be on or after 'from'",
        )
    month_span = (
        (to_month.year * 12 + to_month.month) - (from_month.year * 12 + from_month.month) + 1
    )
    if month_span > SERIES_MAX_MONTHS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"range may not exceed {SERIES_MAX_MONTHS} months",
        )
    reporting_currency = (currency or auth.user.default_currency).upper()
    scope_id = await resolve_analytics_scope(db, auth, group_id)
    return await get_insights_series(
        db,
        ownership_scope_id=scope_id,
        user_id=auth.user_id,
        from_month=from_month,
        to_month=to_month,
        currency=reporting_currency,
        granularity=granularity,
    )


@router.get("/tree", response_model=InsightsTreeResponse)
async def get_insights_tree_endpoint(
    auth: Auth,
    db: DB,
    period: str = Query(
        ...,
        description="Report period: YYYY-MM (month), YYYY-Qn (quarter), or YYYY (year).",
        pattern=_REPORT_PERIOD_PATTERN,
    ),
    dimension: InsightDimension = Query(
        default="transaction_category",
        description=(
            "transaction_category -> 4-level Industry/Store-type/Item-family/Item "
            "cross-walk tree; item_category -> 2-level Family/Item tree."
        ),
    ),
    currency: str | None = Query(
        default=None,
        min_length=3,
        max_length=3,
        description="Reporting currency. Defaults to the user's default currency.",
    ),
    group_id: uuid.UUID | None = Query(
        default=None,
        description="Analyze a group scope you belong to; defaults to your personal scope.",
    ),
    include_series: bool = Query(
        default=False,
        description=(
            "Attach a within-period sub-bucket spend series to each top-level (root) "
            "node, for the report-detail trend sparklines. Off by default to keep the "
            "tree lean for consumers that only drill (dashboard/trends)."
        ),
    ),
) -> InsightsTreeResponse:
    period_start, period_end = _parse_report_range(period)
    reporting_currency = (currency or auth.user.default_currency).upper()
    scope_id = await resolve_analytics_scope(db, auth, group_id)
    return await get_insights_tree(
        db,
        ownership_scope_id=scope_id,
        user_id=auth.user_id,
        period_start=period_start,
        currency=reporting_currency,
        dimension=dimension,
        period_end=period_end,
        include_series=include_series,
    )


def _parse_period(value: str) -> date:
    year_text, month_text = value.split("-", 1)
    try:
        return date(int(year_text), int(month_text), 1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="period must be a valid YYYY-MM month",
        ) from exc
