"""User-specific remembered merchant and item mapping helpers."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import func, select

from app.models.mapping import CategoryMapping, MerchantMapping

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class MerchantMemory:
    target_merchant: str
    store_category_id: uuid.UUID | None
    confidence: Decimal
    mapping_id: uuid.UUID


@dataclass(frozen=True)
class ItemMemory:
    target_item: str | None
    target_category_id: uuid.UUID
    confidence: Decimal
    mapping_id: uuid.UUID


def normalize_mapping_text(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


async def lookup_merchant_mapping(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    merchant_name: str,
) -> MerchantMemory | None:
    normalized = normalize_mapping_text(merchant_name)
    if not normalized:
        return None

    row = await db.execute(
        select(MerchantMapping)
        .where(
            MerchantMapping.ownership_scope_id == ownership_scope_id,
            func.lower(MerchantMapping.original_merchant) == normalized,
        )
        .order_by(MerchantMapping.confidence.desc(), MerchantMapping.updated_at.desc())
        .limit(1)
    )
    mapping = row.scalar_one_or_none()
    if mapping is None:
        return None

    mapping.usage_count += 1
    return MerchantMemory(
        target_merchant=mapping.target_merchant,
        store_category_id=mapping.store_category_id,
        confidence=Decimal(mapping.confidence),
        mapping_id=mapping.id,
    )


async def lookup_item_mapping(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    item_name: str,
    merchant_name: str,
) -> ItemMemory | None:
    normalized_item = normalize_mapping_text(item_name)
    normalized_merchant = normalize_mapping_text(merchant_name)
    if not normalized_item:
        return None

    row = await db.execute(
        select(CategoryMapping)
        .where(
            CategoryMapping.ownership_scope_id == ownership_scope_id,
            func.lower(CategoryMapping.original_item) == normalized_item,
        )
        .order_by(CategoryMapping.confidence.desc(), CategoryMapping.updated_at.desc())
    )
    mappings = row.scalars().all()
    for mapping in mappings:
        pattern = normalize_mapping_text(mapping.merchant_pattern)
        if pattern and pattern not in normalized_merchant:
            continue
        mapping.usage_count += 1
        return ItemMemory(
            target_item=mapping.target_item,
            target_category_id=mapping.target_category_id,
            confidence=Decimal(mapping.confidence),
            mapping_id=mapping.id,
        )
    return None


async def batch_lookup_item_mappings(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    item_names: list[str],
    merchant_name: str,
) -> dict[str, ItemMemory]:
    """Batch-lookup item mappings for multiple items in a single query.

    Returns a dict keyed by the *original* (un-normalised) item name so
    callers can look up results by the name they passed in.
    """
    # Build a mapping from normalised name -> list of original names
    norm_to_originals: dict[str, list[str]] = {}
    for name in item_names:
        norm = normalize_mapping_text(name)
        if norm:
            norm_to_originals.setdefault(norm, []).append(name)

    if not norm_to_originals:
        return {}

    normalized_merchant = normalize_mapping_text(merchant_name)

    row = await db.execute(
        select(CategoryMapping)
        .where(
            CategoryMapping.ownership_scope_id == ownership_scope_id,
            func.lower(CategoryMapping.original_item).in_(list(norm_to_originals)),
        )
        .order_by(
            CategoryMapping.confidence.desc(),
            CategoryMapping.updated_at.desc(),
        )
    )
    all_mappings = row.scalars().all()

    # Group mappings by normalised item name (preserving query order)
    mappings_by_item: dict[str, list[CategoryMapping]] = {}
    for mapping in all_mappings:
        key = normalize_mapping_text(mapping.original_item)
        mappings_by_item.setdefault(key, []).append(mapping)

    result: dict[str, ItemMemory] = {}
    for norm, originals in norm_to_originals.items():
        candidates = mappings_by_item.get(norm, [])
        matched: ItemMemory | None = None
        for mapping in candidates:
            pattern = normalize_mapping_text(mapping.merchant_pattern)
            if pattern and pattern not in normalized_merchant:
                continue
            mapping.usage_count += 1
            matched = ItemMemory(
                target_item=mapping.target_item,
                target_category_id=mapping.target_category_id,
                confidence=Decimal(mapping.confidence),
                mapping_id=mapping.id,
            )
            break
        if matched is not None:
            for original in originals:
                result[original] = matched

    return result


async def remember_merchant_mapping(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    original_merchant: str,
    target_merchant: str,
    store_category_id: uuid.UUID | None,
) -> MerchantMapping | None:
    normalized = normalize_mapping_text(original_merchant)
    target = target_merchant.strip()
    if not normalized or not target:
        return None

    row = await db.execute(
        select(MerchantMapping)
        .where(
            MerchantMapping.ownership_scope_id == ownership_scope_id,
            func.lower(MerchantMapping.original_merchant) == normalized,
        )
        .order_by(MerchantMapping.updated_at.desc())
        .limit(1)
    )
    mapping = row.scalar_one_or_none()
    if mapping is None:
        mapping = MerchantMapping(
            ownership_scope_id=ownership_scope_id,
            original_merchant=normalized,
            target_merchant=target,
            store_category_id=store_category_id,
            confidence=1.0,
            source="user",
        )
        db.add(mapping)
        return mapping

    mapping.target_merchant = target
    mapping.store_category_id = store_category_id
    mapping.confidence = 1.0
    mapping.source = "user"
    return mapping


async def remember_item_mapping(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    original_item: str,
    target_item: str | None,
    target_category_id: uuid.UUID | None,
    merchant_name: str | None,
) -> CategoryMapping | None:
    normalized_item = normalize_mapping_text(original_item)
    if not normalized_item or target_category_id is None:
        return None
    normalized_merchant = normalize_mapping_text(merchant_name) or None
    target = target_item.strip() if target_item else None

    row = await db.execute(
        select(CategoryMapping)
        .where(
            CategoryMapping.ownership_scope_id == ownership_scope_id,
            func.lower(CategoryMapping.original_item) == normalized_item,
            CategoryMapping.merchant_pattern == normalized_merchant,
        )
        .order_by(CategoryMapping.updated_at.desc())
        .limit(1)
    )
    mapping = row.scalar_one_or_none()
    if mapping is None:
        mapping = CategoryMapping(
            ownership_scope_id=ownership_scope_id,
            original_item=normalized_item,
            target_item=target,
            target_category_id=target_category_id,
            merchant_pattern=normalized_merchant,
            confidence=1.0,
            source="user",
        )
        db.add(mapping)
        return mapping

    mapping.target_item = target
    mapping.target_category_id = target_category_id
    mapping.confidence = 1.0
    mapping.source = "user"
    return mapping
