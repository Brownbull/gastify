"""Persist extraction + categorization results as Transaction + LineItems.

Creates immutable Transaction and TransactionItem rows from a completed
scan pipeline. Handles USD shadow conversion via FX service, links
category_id FK to V4 taxonomy, and attaches scan image as TransactionImage.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select

from app.models.reference import Currency, ItemCategory
from app.models.transaction import Transaction, TransactionImage, TransactionItem
from app.services.coalesce import to_minor_units
from app.services.fx import FxServiceError, compute_usd_shadow, get_fx_rate

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.agents.categorization import CategorizationOutput
    from app.agents.extraction import ExtractionResult
    from app.models.scan import Scan
    from app.schemas.scan import MathReconciliationVerdict

logger = structlog.get_logger()


async def persist_scan_result(
    db: AsyncSession,
    scan: Scan,
    extraction: ExtractionResult,
    categorization: CategorizationOutput,
    verdict: MathReconciliationVerdict,
) -> Transaction:
    """Create Transaction + LineItems + Image from a completed scan pipeline."""
    ext = extraction.extraction
    currency_code = ext.currency_code
    tx_date = _parse_date(ext.transaction_date)

    total_minor = to_minor_units(ext.total_amount, currency_code)
    if verdict.adjusted_total is not None:
        total_minor = verdict.adjusted_total

    currency_row = await db.execute(select(Currency).where(Currency.code == currency_code))
    currency = currency_row.scalar_one_or_none()
    from_exponent = currency.exponent if currency else (0 if currency_code in _ZERO_EXP else 2)

    amount_usd_minor, fx_rate, fx_captured_at = await _get_usd_shadow(
        db, currency_code, total_minor, from_exponent, tx_date
    )

    category_map = await _build_category_map(db, categorization)

    tx_id = uuid.uuid4()
    tx = Transaction(
        id=tx_id,
        ownership_scope_id=scan.ownership_scope_id,
        transaction_date=tx_date,
        merchant=ext.merchant_name,
        total_minor=total_minor,
        currency=currency_code,
        amount_usd_minor=amount_usd_minor,
        fx_rate_to_usd=fx_rate,
        fx_captured_at=fx_captured_at,
        receipt_type="scan",
        thumbnail_url=scan.thumbnail_path,
        merchant_source="ocr",
        llm_tokens_in=(extraction.usage.input_tokens + categorization.usage.input_tokens),
        llm_tokens_out=(extraction.usage.output_tokens + categorization.usage.output_tokens),
        llm_cost_usd=_estimate_total_cost(extraction, categorization),
        llm_latency_ms=round(extraction.usage.latency_ms + categorization.usage.latency_ms),
    )
    db.add(tx)

    for i, line_item in enumerate(ext.line_items):
        cat_id = category_map.get(i)
        item = TransactionItem(
            transaction_id=tx_id,
            name=line_item.name,
            qty=float(line_item.qty) if line_item.qty else None,
            unit_price_minor=(
                to_minor_units(line_item.unit_price, currency_code)
                if line_item.unit_price
                else None
            ),
            total_price_minor=to_minor_units(line_item.total_price, currency_code),
            item_category_id=cat_id,
            category_source="ai",
            sort_order=i,
        )
        db.add(item)

    if scan.image_path:
        img = TransactionImage(
            transaction_id=tx_id,
            image_url=scan.image_path,
            is_thumbnail=False,
            sort_order=0,
        )
        db.add(img)
    if scan.thumbnail_path:
        thumb = TransactionImage(
            transaction_id=tx_id,
            image_url=scan.thumbnail_path,
            is_thumbnail=True,
            sort_order=1,
        )
        db.add(thumb)

    await db.flush()

    logger.info(
        "scan_persisted",
        transaction_id=str(tx_id),
        scan_id=str(scan.id),
        merchant=ext.merchant_name,
        total_minor=total_minor,
        currency=currency_code,
        items=len(ext.line_items),
        usd_shadow=amount_usd_minor,
    )

    return tx


_ZERO_EXP = frozenset({"CLP", "JPY", "KRW", "VND", "ISK", "UGX", "RWF", "DJF", "GNF"})

GEMINI_INPUT_COST_PER_M = 0.15
GEMINI_OUTPUT_COST_PER_M = 0.60


def _estimate_total_cost(
    extraction: ExtractionResult,
    categorization: CategorizationOutput,
) -> Decimal:
    total_in = extraction.usage.input_tokens + categorization.usage.input_tokens
    total_out = extraction.usage.output_tokens + categorization.usage.output_tokens
    cost = total_in * GEMINI_INPUT_COST_PER_M + total_out * GEMINI_OUTPUT_COST_PER_M
    return Decimal(str(round(cost / 1_000_000, 6)))


def _parse_date(date_str: str) -> date:
    try:
        return date.fromisoformat(date_str)
    except (ValueError, TypeError):
        return date.today()


async def _get_usd_shadow(
    db: AsyncSession,
    currency_code: str,
    total_minor: int,
    from_exponent: int,
    tx_date: date,
) -> tuple[int | None, Decimal | None, datetime | None]:
    if currency_code == "USD":
        return total_minor, Decimal("1"), None

    try:
        fx = await get_fx_rate(db, currency_code, "USD", rate_date=tx_date)
        usd_minor = compute_usd_shadow(total_minor, from_exponent, fx.rate)
        return usd_minor, fx.rate, fx.captured_at
    except FxServiceError:
        logger.warning("usd_shadow_skipped", currency=currency_code, reason="fx_unavailable")
        return None, None, None


async def _build_category_map(
    db: AsyncSession,
    categorization: CategorizationOutput,
) -> dict[int, uuid.UUID | None]:
    """Map line_item_index → item_category_id UUID from V4 taxonomy."""
    assignments = categorization.result.assignments
    if not assignments:
        return {}

    keys = {a.category_key for a in assignments}
    rows = await db.execute(select(ItemCategory).where(ItemCategory.key.in_(keys)))
    key_to_id: dict[str, uuid.UUID] = {row.key: row.id for row in rows.scalars()}

    result: dict[int, uuid.UUID | None] = {}
    for a in assignments:
        cat_id = key_to_id.get(a.category_key)
        if cat_id is None:
            logger.warning(
                "category_not_found",
                category_key=a.category_key,
                line_item_index=a.line_item_index,
            )
        result[a.line_item_index] = cat_id
    return result
