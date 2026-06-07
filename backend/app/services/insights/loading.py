"""Deterministic monthly insights rollup engine."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.reference import ItemCategory, StoreCategory
from app.models.transaction import Transaction, TransactionItem, TransactionItemFlag
from app.schemas.insights import (
    ItemInsightFlagKind,
    MonthlyInsightsResponse,
    as_item_insight_flag_kind,
)

if TYPE_CHECKING:
    from datetime import date
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.insights_fixtures import InsightSeedTransaction

from app.services.insights._shared import (
    _CACHE_MAX_ENTRIES,
    _TAXONOMY_VERSION_TOKEN,
    InsightItemRecord,
    InsightTransactionRecord,
    _InsightsCacheEntry,
    _InsightsCacheKey,
    _scale_minor,
)


class MonthlyInsightsCache:
    """Small process-local cache guarded by a database fingerprint."""

    def __init__(self) -> None:
        self._entries: dict[_InsightsCacheKey, _InsightsCacheEntry] = {}

    def get(
        self,
        *,
        ownership_scope_id: UUID,
        user_id: UUID | None = None,
        period_start: date,
        currency: str,
        fingerprint: str,
    ) -> MonthlyInsightsResponse | None:
        key = _InsightsCacheKey(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            period_start=period_start,
            currency=currency.upper(),
        )
        entry = self._entries.get(key)
        if entry is None or entry.fingerprint != fingerprint:
            return None
        return entry.response.model_copy(deep=True)

    def set(
        self,
        *,
        ownership_scope_id: UUID,
        user_id: UUID | None = None,
        period_start: date,
        currency: str,
        fingerprint: str,
        response: MonthlyInsightsResponse,
    ) -> None:
        if len(self._entries) >= _CACHE_MAX_ENTRIES:
            self._entries.clear()
        key = _InsightsCacheKey(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            period_start=period_start,
            currency=currency.upper(),
        )
        self._entries[key] = _InsightsCacheEntry(
            fingerprint=fingerprint,
            response=response.model_copy(deep=True),
        )

    def clear(self) -> None:
        self._entries.clear()


MONTHLY_INSIGHTS_CACHE = MonthlyInsightsCache()


async def load_insight_records_from_db(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    start_date: date,
    end_date: date,
    currency: str,
    user_id: UUID | None = None,
) -> tuple[InsightTransactionRecord, ...]:
    """Load persisted transactions into the reporting-currency rollup shape."""

    store_category_keys, item_category_keys = await _load_category_key_maps(db)
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.items).selectinload(TransactionItem.item_flags))
        .where(
            Transaction.ownership_scope_id == ownership_scope_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .order_by(Transaction.transaction_date, Transaction.id)
    )
    transactions = list(result.scalars().all())

    records: list[InsightTransactionRecord] = []
    for txn in transactions:
        total_minor = _reporting_total_minor_for_transaction(txn, currency=currency)
        if total_minor is None:
            continue

        raw_items = tuple(txn.items)
        item_records = tuple(
            _item_record_from_db(
                item,
                item_category_keys=item_category_keys,
                source_total_minor=txn.total_minor,
                reporting_total_minor=total_minor,
                user_id=user_id,
            )
            for item in raw_items
        )
        records.append(
            InsightTransactionRecord(
                record_id=str(txn.id),
                ownership_scope_id=txn.ownership_scope_id,
                transaction_date=txn.transaction_date,
                transaction_category_key=(
                    store_category_keys.get(txn.store_category_id)
                    if txn.store_category_id is not None
                    else None
                ),
                total_minor=total_minor,
                currency=currency.upper(),
                items=item_records,
            )
        )
    return tuple(records)


async def _database_fingerprint(
    db: AsyncSession,
    *,
    ownership_scope_id: UUID,
    user_id: UUID | None,
    start_date: date,
    end_date: date,
) -> str:
    transaction_row = (
        await db.execute(
            select(
                func.count(Transaction.id),
                func.max(Transaction.updated_at),
                func.sum(Transaction.total_minor),
            ).where(
                Transaction.ownership_scope_id == ownership_scope_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
        )
    ).one()
    item_row = (
        await db.execute(
            select(
                func.count(TransactionItem.id),
                func.max(TransactionItem.updated_at),
                func.sum(TransactionItem.total_price_minor),
            )
            .join(Transaction, TransactionItem.transaction_id == Transaction.id)
            .where(
                Transaction.ownership_scope_id == ownership_scope_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
        )
    ).one()
    flag_query = (
        select(
            func.count(TransactionItemFlag.id),
            func.max(TransactionItemFlag.updated_at),
        )
        .join(TransactionItem, TransactionItemFlag.transaction_item_id == TransactionItem.id)
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .where(
            Transaction.ownership_scope_id == ownership_scope_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
    )
    if user_id is not None:
        flag_query = flag_query.where(TransactionItemFlag.user_id == user_id)
    flag_row = (await db.execute(flag_query)).one()
    return "|".join(
        (
            str(transaction_row[0] or 0),
            str(transaction_row[1] or ""),
            str(transaction_row[2] or 0),
            str(item_row[0] or 0),
            str(item_row[1] or ""),
            str(item_row[2] or 0),
            str(flag_row[0] or 0),
            str(flag_row[1] or ""),
            _TAXONOMY_VERSION_TOKEN,
        )
    )


async def _load_category_key_maps(
    db: AsyncSession,
) -> tuple[dict[UUID, str], dict[UUID, str]]:
    store_result = await db.execute(
        select(StoreCategory.id, StoreCategory.key).where(StoreCategory.level == 2)
    )
    item_result = await db.execute(
        select(ItemCategory.id, ItemCategory.key).where(ItemCategory.level == 4)
    )
    store_keys = {
        cast("UUID", category_id): str(category_key)
        for category_id, category_key in store_result.all()
    }
    item_keys = {
        cast("UUID", category_id): str(category_key)
        for category_id, category_key in item_result.all()
    }
    return store_keys, item_keys


def _reporting_total_minor_for_transaction(txn: Transaction, *, currency: str) -> int | None:
    normalized_currency = currency.upper()
    if txn.currency.upper() == normalized_currency:
        return txn.total_minor
    if normalized_currency == "USD" and txn.amount_usd_minor is not None:
        return txn.amount_usd_minor
    return None


def _item_record_from_db(
    item: TransactionItem,
    *,
    item_category_keys: dict[UUID, str],
    source_total_minor: int,
    reporting_total_minor: int,
    user_id: UUID | None,
) -> InsightItemRecord:
    if source_total_minor == reporting_total_minor:
        total_minor = item.total_price_minor
    else:
        total_minor = _scale_minor(
            item.total_price_minor,
            source_total_minor=source_total_minor,
            reporting_total_minor=reporting_total_minor,
        )
    return InsightItemRecord(
        category_key=(
            item_category_keys.get(item.item_category_id)
            if item.item_category_id is not None
            else None
        ),
        total_minor=total_minor,
        flag_kind=_flag_kind_from_item(item, user_id=user_id),
    )


def _flag_kind_from_item(
    item: TransactionItem,
    *,
    user_id: UUID | None,
) -> ItemInsightFlagKind | None:
    if user_id is not None:
        user_flag_kinds = [
            as_item_insight_flag_kind(flag.flag_kind)
            for flag in item.item_flags
            if flag.user_id == user_id
        ]
        if "special_case" in user_flag_kinds:
            return "special_case"
        if "urgency" in user_flag_kinds:
            return "urgency"
    if item.is_flagged and item.category_source != "statement_unidentified":
        return "special_case"
    return None


def _record_from_seed_row(row: InsightSeedTransaction) -> InsightTransactionRecord:
    return InsightTransactionRecord(
        record_id=row.fixture_id,
        ownership_scope_id=row.ownership_scope_id,
        transaction_date=row.transaction_date,
        transaction_category_key=row.store_category_key,
        total_minor=row.analytics_total_minor,
        currency=row.reporting_currency.upper(),
        items=tuple(
            InsightItemRecord(
                category_key=item.item_category_key,
                total_minor=item.analytics_total_minor,
                flag_kind=item.flag_kind,
            )
            for item in row.items
        ),
    )
