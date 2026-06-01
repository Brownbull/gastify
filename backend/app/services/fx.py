"""Lazy read-through FX cache — per D2 architecture.

On transaction create: look up fx_rates(today, from, USD).
Miss → call external FX API → INSERT ON CONFLICT DO NOTHING → re-read.
Ent tier: 3s timeout, exp backoff 3x retry.
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.fx import FxRate

logger = logging.getLogger(__name__)

_FX_TIMEOUT_S = 3.0
_FX_MAX_RETRIES = 3
_FX_BASE_DELAY_S = 0.5


@dataclass(frozen=True)
class FxResult:
    rate: Decimal
    captured_at: datetime


class FxServiceError(Exception):
    pass


async def _fetch_external_rate(from_currency: str, to_currency: str) -> Decimal:
    """Fetch rate from external FX API with exp backoff + 3s timeout per D2."""
    api_url = settings.fx_api_url
    delay = _FX_BASE_DELAY_S

    for attempt in range(_FX_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=_FX_TIMEOUT_S) as client:
                resp = await client.get(
                    f"{api_url}/v6/latest/{from_currency}",
                )
                resp.raise_for_status()
                data = resp.json()
                # open.er-api: {"result":"success","rates":{"USD":<rate>,...}}.
                # Frankfurter (ECB) was the old default but doesn't price CLP — the
                # app's primary currency — so USD-shadow (REQ-18) was broken (P42).
                return Decimal(str(data["rates"][to_currency]))
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning(
                "fx_fetch_failed",
                extra={
                    "attempt": attempt + 1,
                    "from": from_currency,
                    "to": to_currency,
                    "error": str(exc),
                },
            )
            if attempt < _FX_MAX_RETRIES - 1:
                await asyncio.sleep(delay)
                delay *= 2
            else:
                raise FxServiceError(
                    f"FX rate unavailable after {_FX_MAX_RETRIES} attempts for "
                    f"{from_currency}/{to_currency} — retry later"
                ) from exc
    raise FxServiceError("Unreachable")


async def get_fx_rate(
    db: AsyncSession,
    from_currency: str,
    to_currency: str,
    rate_date: date | None = None,
) -> FxResult:
    """Read-through cache: DB hit first, external fetch on miss.

    Returns the rate and capture timestamp. Uses INSERT ON CONFLICT DO NOTHING
    for structural idempotency per D2.
    """
    if from_currency == to_currency:
        return FxResult(rate=Decimal("1"), captured_at=datetime.now(UTC))

    target_date = rate_date or date.today()

    cached = await db.execute(
        select(FxRate).where(
            FxRate.rate_date == target_date,
            FxRate.from_currency == from_currency,
            FxRate.to_currency == to_currency,
        )
    )
    existing = cached.scalar_one_or_none()
    if existing is not None:
        return FxResult(rate=existing.rate, captured_at=existing.created_at)

    rate = await _fetch_external_rate(from_currency, to_currency)
    now = datetime.now(UTC)

    await db.execute(
        text("""
            INSERT INTO fx_rates (rate_date, from_currency, to_currency, rate, source, created_at)
            VALUES (:rate_date, :from_currency, :to_currency, :rate, :source, :created_at)
            ON CONFLICT (rate_date, from_currency, to_currency) DO NOTHING
        """),
        {
            "rate_date": target_date,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": float(rate),
            "source": "open-er-api",
            "created_at": now,
        },
    )
    await db.flush()

    result = await db.execute(
        select(FxRate).where(
            FxRate.rate_date == target_date,
            FxRate.from_currency == from_currency,
            FxRate.to_currency == to_currency,
        )
    )
    winner = result.scalar_one()
    return FxResult(rate=winner.rate, captured_at=winner.created_at)


def compute_usd_shadow(
    total_minor: int,
    from_exponent: int,
    fx_rate: Decimal,
) -> int:
    """Convert total_minor to USD minor units (cents).

    Handles exponent differences: CLP (exp=0) stores 15990 meaning $15,990 CLP.
    USD (exp=2) stores cents. So: usd_cents = total_minor * rate * 10^(usd_exp - from_exp).
    """
    usd_exponent = 2
    exponent_diff = usd_exponent - from_exponent
    usd_amount = Decimal(total_minor) * fx_rate * (Decimal(10) ** exponent_diff)
    return int(usd_amount.quantize(Decimal("1")))
