"""Items API — cross-transaction line-item list (Phase 6).

A flat, filterable, cursor-paginated list of `transaction_items` across the caller's
transactions. Scope is resolved by `resolve_analytics_scope` (D69/D70), so passing a
`group_id` lists items across all members' shared transactions for free — the same
RLS scope-swap every /insights/* endpoint uses (zero new isolation code). A
non-member or unknown group yields 404 (anti-enumeration).
"""

from __future__ import annotations

from datetime import date  # noqa: TC003 - FastAPI resolves Query annotations at runtime.
from typing import Annotated
from uuid import UUID  # noqa: TC003 - FastAPI resolves Query/path annotations at runtime.

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Auth is a runtime Annotated FastAPI dep (TC001); resolve_analytics_scope is a plain
# coroutine called at runtime — the line-level noqa keeps both importable.
from app.auth.deps import Auth, resolve_analytics_scope  # noqa: TC001
from app.db import get_db
from app.models.reference import ItemCategory, StoreCategory
from app.models.transaction import Transaction, TransactionItem
from app.schemas.common import PaginatedResponse
from app.schemas.items import ItemListRow

router = APIRouter(prefix="/items", tags=["items"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=PaginatedResponse[ItemListRow])
async def list_items(
    auth: Auth,
    db: DB,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    search: str | None = Query(default=None),
    item_category_id: UUID | None = Query(default=None),
    store_category_id: UUID | None = Query(default=None),
    merchant: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    group_id: UUID | None = Query(default=None),
) -> PaginatedResponse[ItemListRow]:
    scope_id = await resolve_analytics_scope(db, auth, group_id)

    # Columns-select (not entity-load): one row per line item with denormalized
    # category keys + parent-transaction context.
    query = (
        select(
            TransactionItem.id,
            TransactionItem.name,
            TransactionItem.qty,
            TransactionItem.total_price_minor,
            TransactionItem.item_category_id,
            ItemCategory.key,
            Transaction.store_category_id,
            StoreCategory.key,
            Transaction.id,
            Transaction.transaction_date,
            Transaction.transaction_time,
            Transaction.merchant,
            Transaction.currency,
            TransactionItem.created_at,
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .outerjoin(ItemCategory, TransactionItem.item_category_id == ItemCategory.id)
        .outerjoin(StoreCategory, Transaction.store_category_id == StoreCategory.id)
        .where(Transaction.ownership_scope_id == scope_id)
        # Stable total order for the cursor: newest txn first, then a deterministic
        # tie-break by transaction id, then by item id (UNIQUE) so multiple items of
        # the same transaction page correctly across a boundary.
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.id,
            TransactionItem.id,
        )
    )

    if search:
        query = query.where(TransactionItem.name.ilike(f"%{search}%"))
    if item_category_id:
        query = query.where(TransactionItem.item_category_id == item_category_id)
    if store_category_id:
        query = query.where(Transaction.store_category_id == store_category_id)
    if merchant:
        query = query.where(Transaction.merchant.ilike(f"%{merchant}%"))
    if date_from:
        query = query.where(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.where(Transaction.transaction_date <= date_to)
    if cursor:
        # 3-part cursor "<txn_date>|<txn_id>|<item_id>": the items list has multiple
        # rows per transaction, so a 2-part (date, txn_id) cursor (like
        # list_transactions) would skip a transaction's remaining items at a page
        # boundary. The item-id tier continues within the same transaction.
        parts = cursor.split("|", 2)
        if len(parts) == 3:
            c_date, c_txn, c_item = parts[0], UUID(parts[1]), UUID(parts[2])
            query = query.where(
                (Transaction.transaction_date < c_date)
                | ((Transaction.transaction_date == c_date) & (Transaction.id > c_txn))
                | (
                    (Transaction.transaction_date == c_date)
                    & (Transaction.id == c_txn)
                    & (TransactionItem.id > c_item)
                )
            )

    query = query.limit(limit + 1)
    rows = list((await db.execute(query)).all())

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    data = [
        ItemListRow(
            id=r[0],
            name=r[1],
            qty=r[2],
            total_minor=r[3],
            item_category_id=r[4],
            item_category_key=r[5],
            store_category_id=r[6],
            store_category_key=r[7],
            transaction_id=r[8],
            transaction_date=r[9],
            transaction_time=r[10],
            merchant=r[11],
            currency=r[12],
            created_at=r[13],
        )
        for r in rows
    ]

    next_cursor = f"{rows[-1][9]}|{rows[-1][8]}|{rows[-1][0]}" if has_more and rows else None
    return PaginatedResponse(data=data, cursor=next_cursor, has_more=has_more)
