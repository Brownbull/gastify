"""Persist extraction + categorization results as Transaction + LineItems.

Creates immutable Transaction and TransactionItem rows from a completed
scan pipeline. Handles USD shadow conversion via FX service, links
category_id FK to V4 taxonomy, and attaches scan image as TransactionImage.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select

from app.agents.store_categorization import categorize_store
from app.config import settings
from app.models.reference import Currency, ItemCategory, StoreCategory
from app.models.transaction import Transaction, TransactionImage, TransactionItem
from app.prompts import active_prompt_version
from app.services.coalesce import to_minor_units
from app.services.fx import FxServiceError, compute_usd_shadow, get_fx_rate
from app.services.llm_costs import estimate_llm_cost_usd
from app.services.mappings import (
    ItemMemory,
    MerchantMemory,
    batch_lookup_item_mappings,
    lookup_merchant_mapping,
)
from app.services.recurrence import recurrence_fields_from_hint

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.agents.categorization import CategorizationOutput
    from app.agents.extraction import ExtractionResult
    from app.models.scan import Scan
    from app.schemas.scan import MathReconciliationVerdict, ScanReviewLevel, ScanReviewSignal

logger = structlog.get_logger()


@dataclass(frozen=True)
class _CategorySelection:
    category_id: uuid.UUID | None
    category_key: str | None
    subcategory: str | None
    source: str | None


@dataclass(frozen=True)
class _StoreCategorySelection:
    category_id: uuid.UUID | None
    source: str
    confidence: Decimal | None = None
    mapping_id: uuid.UUID | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0


async def persist_scan_result(
    db: AsyncSession,
    scan: Scan,
    extraction: ExtractionResult,
    categorization: CategorizationOutput,
    verdict: MathReconciliationVerdict,
    review_level: ScanReviewLevel = "none",
    review_signals: list[ScanReviewSignal] | None = None,
) -> Transaction:
    """Create Transaction + LineItems + Image from a completed scan pipeline."""
    ext = extraction.extraction
    currency_code = ext.currency_code
    tx_date = _parse_date(ext.transaction_date)

    total_minor = to_minor_units(ext.total_amount, currency_code)
    discount_total_minor = (
        to_minor_units(ext.discount_amount, currency_code) if ext.discount_amount else None
    )
    gross_total_minor = (
        total_minor + discount_total_minor if discount_total_minor is not None else None
    )
    reconstructed_total_minor = (
        verdict.reconstructed_total if verdict.reconstructed_total is not None else total_minor
    )
    review_signal_payload = [signal.model_dump(mode="json") for signal in (review_signals or [])]
    recurrence_fields = recurrence_fields_from_hint(ext.recurrence_hint, source="receipt")

    currency_row = await db.execute(select(Currency).where(Currency.code == currency_code))
    currency = currency_row.scalar_one_or_none()
    from_exponent = currency.exponent if currency else (0 if currency_code in _ZERO_EXP else 2)

    amount_usd_minor, fx_rate, fx_captured_at = await _get_usd_shadow(
        db, currency_code, total_minor, from_exponent, tx_date
    )

    merchant_memory = await lookup_merchant_mapping(
        db,
        ownership_scope_id=scan.ownership_scope_id,
        merchant_name=ext.merchant_name,
    )
    effective_merchant = merchant_memory.target_merchant if merchant_memory else ext.merchant_name
    merchant_source = "mapping" if merchant_memory else "ocr"

    category_map = await _build_category_map(db, categorization)
    subcategory_map = _build_subcategory_map(categorization)

    # Batch-fetch all item mappings in a single query (avoids N+1)
    all_item_names = [li.name for li in ext.line_items]
    item_memory_map = await batch_lookup_item_mappings(
        db,
        ownership_scope_id=scan.ownership_scope_id,
        item_names=all_item_names,
        merchant_name=effective_merchant,
    )

    item_selections: dict[int, _CategorySelection] = {}
    effective_item_names: list[str] = []
    effective_item_category_keys: list[str] = []
    for i, line_item in enumerate(ext.line_items):
        item_memory = item_memory_map.get(line_item.name)
        selection = await _resolve_item_category(
            db,
            index=i,
            category_map=category_map,
            subcategory_map=subcategory_map,
            item_memory=item_memory,
        )
        item_selections[i] = selection
        effective_item_names.append(
            item_memory.target_item if item_memory and item_memory.target_item else line_item.name
        )
        if selection.category_key:
            effective_item_category_keys.append(selection.category_key)

    store_selection = await _resolve_store_category(
        db,
        merchant_memory=merchant_memory,
        merchant_name=effective_merchant,
        currency_code=currency_code,
        item_category_keys=effective_item_category_keys,
        item_names=effective_item_names,
    )

    tx_id = uuid.uuid4()
    tx = Transaction(
        id=tx_id,
        ownership_scope_id=scan.ownership_scope_id,
        transaction_date=tx_date,
        merchant=effective_merchant,
        store_category_id=store_selection.category_id,
        store_category_source=store_selection.source,
        store_category_confidence=store_selection.confidence,
        store_category_mapping_id=store_selection.mapping_id,
        total_minor=total_minor,
        discount_total_minor=discount_total_minor,
        gross_total_minor=gross_total_minor,
        reconstructed_total_minor=reconstructed_total_minor,
        currency=currency_code,
        amount_usd_minor=amount_usd_minor,
        fx_rate_to_usd=fx_rate,
        fx_captured_at=fx_captured_at,
        receipt_type="scan",
        **recurrence_fields,
        thumbnail_url=scan.thumbnail_path,
        merchant_source=merchant_source,
        scan_review_level=review_level,
        scan_review_signals=review_signal_payload,
        prompt_version=_scan_prompt_version(extraction, categorization),
        llm_tokens_in=(
            extraction.usage.input_tokens
            + categorization.usage.input_tokens
            + store_selection.input_tokens
        ),
        llm_tokens_out=(
            extraction.usage.output_tokens
            + categorization.usage.output_tokens
            + store_selection.output_tokens
        ),
        llm_cost_usd=_estimate_total_cost(extraction, categorization, store_selection),
        llm_latency_ms=round(
            extraction.usage.latency_ms
            + categorization.usage.latency_ms
            + store_selection.latency_ms
        ),
    )
    db.add(tx)

    for i, line_item in enumerate(ext.line_items):
        selection = item_selections[i]
        item = TransactionItem(
            transaction_id=tx_id,
            name=effective_item_names[i],
            qty=float(line_item.qty) if line_item.qty else None,
            unit_price_minor=(
                to_minor_units(line_item.unit_price, currency_code)
                if line_item.unit_price
                else None
            ),
            total_price_minor=to_minor_units(line_item.total_price, currency_code),
            discount_minor=None,
            discount_label=None,
            item_category_id=selection.category_id,
            subcategory=selection.subcategory,
            category_source=selection.source,
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
        merchant=effective_merchant,
        total_minor=total_minor,
        currency=currency_code,
        items=len(ext.line_items),
        usd_shadow=amount_usd_minor,
        store_category_source=store_selection.source,
        scan_review_level=review_level,
        scan_review_signal_count=len(review_signal_payload),
    )

    return tx


_ZERO_EXP = frozenset({"CLP", "JPY", "KRW", "VND", "ISK", "UGX", "RWF", "DJF", "GNF"})


def _scan_prompt_version(
    extraction: ExtractionResult,
    categorization: CategorizationOutput,
) -> str:
    model = extraction.model_name or categorization.model_name or settings.gemini_model
    return active_prompt_version(
        extraction_prompt_id=extraction.prompt_id,
        categorization_prompt_id=categorization.prompt_id,
        store_categorization_prompt_id=settings.store_categorization_prompt_id,
        model=model,
    )


async def _resolve_item_category(
    db: AsyncSession,
    *,
    index: int,
    category_map: dict[int, tuple[uuid.UUID | None, str | None]],
    subcategory_map: dict[int, str],
    item_memory: ItemMemory | None,
) -> _CategorySelection:
    if item_memory is not None:
        key = await _item_category_key_for_id(db, item_memory.target_category_id)
        return _CategorySelection(
            category_id=item_memory.target_category_id,
            category_key=key,
            subcategory=None,
            source="mapping",
        )

    category_id, category_key = category_map.get(index, (None, None))
    return _CategorySelection(
        category_id=category_id,
        category_key=category_key,
        subcategory=subcategory_map.get(index),
        source="ai" if category_key else None,
    )


async def _resolve_store_category(
    db: AsyncSession,
    *,
    merchant_memory: MerchantMemory | None,
    merchant_name: str,
    currency_code: str,
    item_category_keys: list[str],
    item_names: list[str],
) -> _StoreCategorySelection:
    if (
        merchant_memory is not None
        and merchant_memory.store_category_id is not None
        and merchant_memory.confidence >= Decimal("0.70")
    ):
        return _StoreCategorySelection(
            category_id=merchant_memory.store_category_id,
            source="mapping",
            confidence=merchant_memory.confidence,
            mapping_id=merchant_memory.mapping_id,
        )

    if settings.scan_provider != "gemini":
        return _StoreCategorySelection(category_id=None, source="unknown")

    try:
        ai_result = await categorize_store(
            merchant_name=merchant_name,
            currency_code=currency_code,
            item_category_keys=item_category_keys,
            item_names=item_names,
        )
    except Exception as exc:
        logger.warning("store_categorization_failed", error=str(exc))
        return _StoreCategorySelection(category_id=None, source="unknown")

    confidence = Decimal(str(ai_result.result.confidence))
    if ai_result.result.needs_review or confidence < Decimal("0.70"):
        return _StoreCategorySelection(category_id=None, source="unknown", confidence=confidence)

    row = await db.execute(
        select(StoreCategory).where(
            StoreCategory.key == ai_result.result.category_key,
            StoreCategory.level == 2,
        )
    )
    category = row.scalar_one_or_none()
    if category is None:
        logger.warning("store_category_not_found", category_key=ai_result.result.category_key)
        return _StoreCategorySelection(category_id=None, source="unknown", confidence=confidence)

    return _StoreCategorySelection(
        category_id=category.id,
        source="ai",
        confidence=confidence,
        input_tokens=ai_result.usage.input_tokens,
        output_tokens=ai_result.usage.output_tokens,
        latency_ms=ai_result.usage.latency_ms,
    )


def _estimate_total_cost(
    extraction: ExtractionResult,
    categorization: CategorizationOutput,
    store_selection: _StoreCategorySelection | None = None,
) -> Decimal:
    store_in = store_selection.input_tokens if store_selection else 0
    store_out = store_selection.output_tokens if store_selection else 0
    total_in = extraction.usage.input_tokens + categorization.usage.input_tokens + store_in
    total_out = extraction.usage.output_tokens + categorization.usage.output_tokens + store_out
    model = extraction.model_name or categorization.model_name or settings.gemini_model
    return estimate_llm_cost_usd(
        input_tokens=total_in,
        output_tokens=total_out,
        model_name=model,
        quantize=Decimal("0.000001"),
    )


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
) -> dict[int, tuple[uuid.UUID | None, str | None]]:
    """Map line_item_index to item_category_id and validated L4 key."""
    assignments = categorization.result.assignments
    if not assignments:
        return {}

    keys = {a.category_key for a in assignments}
    rows = await db.execute(select(ItemCategory).where(ItemCategory.key.in_(keys)))
    key_to_id: dict[str, uuid.UUID] = {row.key: row.id for row in rows.scalars()}

    result: dict[int, tuple[uuid.UUID | None, str | None]] = {}
    for a in assignments:
        cat_id = key_to_id.get(a.category_key)
        if cat_id is None:
            logger.warning(
                "category_not_found",
                category_key=a.category_key,
                line_item_index=a.line_item_index,
            )
        result[a.line_item_index] = (cat_id, a.category_key if cat_id else None)
    return result


async def _item_category_key_for_id(db: AsyncSession, category_id: uuid.UUID) -> str | None:
    row = await db.execute(select(ItemCategory.key).where(ItemCategory.id == category_id))
    return row.scalar_one_or_none()


def _build_subcategory_map(categorization: CategorizationOutput) -> dict[int, str]:
    result: dict[int, str] = {}
    for assignment in categorization.result.assignments:
        if assignment.subcategory:
            result[assignment.line_item_index] = assignment.subcategory
    return result
