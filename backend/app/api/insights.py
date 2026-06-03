"""Monthly insights endpoints."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth  # noqa: TC001 - FastAPI needs runtime Annotated dependency.
from app.db import get_db
from app.schemas.insights import (
    InsightsSeriesResponse,
    MonthlyInsightsResponse,
    SeriesGranularity,
)
from app.services.insights import SERIES_MAX_MONTHS, get_insights_series, get_monthly_insights

router = APIRouter(prefix="/insights", tags=["insights"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/monthly", response_model=MonthlyInsightsResponse)
async def get_monthly_insights_endpoint(
    auth: Auth,
    db: DB,
    period: str = Query(
        ...,
        description="Monthly period in YYYY-MM format.",
        pattern=r"^\d{4}-\d{2}$",
    ),
    currency: str | None = Query(
        default=None,
        min_length=3,
        max_length=3,
        description="Reporting currency. Defaults to the user's default currency.",
    ),
) -> MonthlyInsightsResponse:
    period_start = _parse_period(period)
    reporting_currency = (currency or auth.user.default_currency).upper()
    return await get_monthly_insights(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        period_start=period_start,
        currency=reporting_currency,
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
) -> InsightsSeriesResponse:
    from_month = _parse_period(range_from)
    to_month = _parse_period(range_to)
    if to_month < from_month:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'to' must be on or after 'from'",
        )
    month_span = (to_month.year * 12 + to_month.month) - (
        from_month.year * 12 + from_month.month
    ) + 1
    if month_span > SERIES_MAX_MONTHS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"range may not exceed {SERIES_MAX_MONTHS} months",
        )
    reporting_currency = (currency or auth.user.default_currency).upper()
    return await get_insights_series(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        from_month=from_month,
        to_month=to_month,
        currency=reporting_currency,
        granularity=granularity,
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
