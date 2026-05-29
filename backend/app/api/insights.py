"""Monthly insights endpoints."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth  # noqa: TC001 - FastAPI needs runtime Annotated dependency.
from app.db import get_db
from app.schemas.insights import MonthlyInsightsResponse
from app.services.insights import get_monthly_insights

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


def _parse_period(value: str) -> date:
    year_text, month_text = value.split("-", 1)
    try:
        return date(int(year_text), int(month_text), 1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="period must be a valid YYYY-MM month",
        ) from exc
