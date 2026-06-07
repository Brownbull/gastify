"""Deterministic monthly insights rollup engine."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING

from app.schemas.insights import (
    InsightsSeriesPoint,
    InsightsSeriesResponse,
    SeriesGranularity,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.insights_fixtures import InsightSeedTransaction

from app.services.insights._shared import (
    InsightTransactionRecord,
    _prepare_transaction,
    first_day_of_month,
    last_day_of_month,
    shift_months,
)
from app.services.insights.loading import _record_from_seed_row, load_insight_records_from_db


@dataclass
class _SeriesBucketAccumulator:
    period: str
    period_start: date
    period_end: date
    total_minor: int = 0
    transaction_count: int = 0


async def get_insights_series(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    from_month: date,
    to_month: date,
    currency: str,
    granularity: SeriesGranularity = "month",
    user_id: UUID | None = None,
) -> InsightsSeriesResponse:
    """Build a multi-period spend series from persisted transactions (D68).

    One range query + in-memory bucketing — the O(1)-request replacement for a
    client fan-out of N monthly calls.
    """

    normalized_currency = currency.upper()
    start = first_day_of_month(from_month)
    end = last_day_of_month(to_month)
    records = await load_insight_records_from_db(
        db,
        ownership_scope_id=ownership_scope_id,
        start_date=start,
        end_date=end,
        currency=normalized_currency,
        user_id=user_id,
    )
    return build_insights_series_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=start,
        period_end=end,
        currency=normalized_currency,
        granularity=granularity,
    )


def build_insights_series_from_seed(
    rows: tuple[InsightSeedTransaction, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    period_end: date,
    currency: str = "CLP",
    granularity: SeriesGranularity = "month",
) -> InsightsSeriesResponse:
    """Build a spend series from the deterministic P6 fixture corpus."""

    records = tuple(_record_from_seed_row(row) for row in rows)
    return build_insights_series_from_records(
        records,
        ownership_scope_id=ownership_scope_id,
        period_start=period_start,
        period_end=period_end,
        currency=currency,
        granularity=granularity,
    )


def build_insights_series_from_records(
    records: tuple[InsightTransactionRecord, ...],
    *,
    ownership_scope_id: UUID,
    period_start: date,
    period_end: date,
    currency: str,
    granularity: SeriesGranularity = "month",
) -> InsightsSeriesResponse:
    """Bucket per-month spend totals into a month/quarter/year series.

    Emits one point per bucket touched by [period_start, period_end], including
    zero-spend buckets, so the time-series line shows gaps. Per-month
    `total_spend_minor` uses the same post-exclusion `included_total_minor`
    semantics as the monthly endpoint, keeping the current-month point in lock
    step with the dashboard total.
    """

    normalized_currency = currency.upper()
    start = first_day_of_month(period_start)
    last_month = first_day_of_month(period_end)
    range_end = last_day_of_month(period_end)
    scoped_records = tuple(
        record
        for record in records
        if record.ownership_scope_id == ownership_scope_id
        and record.currency.upper() == normalized_currency
    )

    # Weeks don't nest inside months, so they bypass the per-month accumulation and
    # bucket the records directly by ISO week (Monday-start). The window is the same
    # month range; the frontend keeps it short (the cards list is one row per week).
    if granularity == "week":
        return _build_weekly_series(
            scoped_records,
            period_start=period_start,
            period_end=period_end,
            currency=normalized_currency,
        )

    buckets: dict[str, _SeriesBucketAccumulator] = {}
    cursor = start
    while cursor <= last_month:
        month_end = last_day_of_month(cursor)
        in_month = tuple(
            record for record in scoped_records if cursor <= record.transaction_date <= month_end
        )
        month_total = sum(_prepare_transaction(record).included_total_minor for record in in_month)
        month_count = len(in_month)

        key = _series_bucket_key(cursor, granularity)
        accumulator = buckets.get(key)
        if accumulator is None:
            buckets[key] = _SeriesBucketAccumulator(
                period=key,
                period_start=cursor,
                period_end=month_end,
                total_minor=month_total,
                transaction_count=month_count,
            )
        else:
            accumulator.period_start = min(accumulator.period_start, cursor)
            accumulator.period_end = max(accumulator.period_end, month_end)
            accumulator.total_minor += month_total
            accumulator.transaction_count += month_count
        cursor = shift_months(cursor, 1)

    points = [
        InsightsSeriesPoint(
            period=accumulator.period,
            period_start=accumulator.period_start,
            period_end=accumulator.period_end,
            total_spend_minor=accumulator.total_minor,
            transaction_count=accumulator.transaction_count,
        )
        for accumulator in buckets.values()
    ]
    return InsightsSeriesResponse(
        granularity=granularity,
        currency=normalized_currency,
        period_start=start,
        period_end=range_end,
        points=points,
    )


def _build_weekly_series(
    scoped_records: tuple[InsightTransactionRecord, ...],
    *,
    period_start: date,
    period_end: date,
    currency: str,
) -> InsightsSeriesResponse:
    """Bucket records by ISO week (Monday-start) over [period_start, period_end].

    One point per week touched by the range, including zero-spend weeks (so the
    cards show gaps). The bucket key is the ISO year+week (`YYYY-Www`), which the
    clients format as `Week n, YYYY`. Per-week totals use the same post-exclusion
    `included_total_minor` semantics as the month/quarter/year path.
    """
    start_monday = period_start - timedelta(days=period_start.weekday())
    end_monday = period_end - timedelta(days=period_end.weekday())
    points: list[InsightsSeriesPoint] = []
    cursor = start_monday
    while cursor <= end_monday:
        week_end = cursor + timedelta(days=6)
        in_week = tuple(
            record for record in scoped_records if cursor <= record.transaction_date <= week_end
        )
        week_total = sum(_prepare_transaction(record).included_total_minor for record in in_week)
        iso_year, iso_week, _ = cursor.isocalendar()
        points.append(
            InsightsSeriesPoint(
                period=f"{iso_year:04d}-W{iso_week:02d}",
                period_start=cursor,
                period_end=week_end,
                total_spend_minor=week_total,
                transaction_count=len(in_week),
            )
        )
        cursor += timedelta(days=7)
    return InsightsSeriesResponse(
        granularity="week",
        currency=currency,
        period_start=start_monday,
        period_end=end_monday + timedelta(days=6),
        points=points,
    )


def _series_bucket_key(month_start: date, granularity: SeriesGranularity) -> str:
    if granularity == "month":
        return f"{month_start.year:04d}-{month_start.month:02d}"
    if granularity == "quarter":
        quarter = (month_start.month - 1) // 3 + 1
        return f"{month_start.year:04d}-Q{quarter}"
    return f"{month_start.year:04d}"
