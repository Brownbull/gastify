"""Transactions CRUD endpoints per OpenAPI sketch §2."""

import logging
from datetime import UTC, date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import Auth
from app.db import get_db
from app.models.reference import Currency
from app.models.transaction import Transaction, TransactionImage, TransactionItem
from app.schemas.common import PaginatedResponse
from app.schemas.transaction import (
    BatchDeleteRequest,
    BatchResult,
    BatchUpdateRequest,
    TransactionCreate,
    TransactionDetail,
    TransactionImageResponse,
    TransactionItemResponse,
    TransactionListItem,
    TransactionUpdate,
)
from app.services.fx import FxServiceError, compute_usd_shadow, get_fx_rate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["transactions"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=PaginatedResponse[TransactionListItem])
async def list_transactions(
    auth: Auth,
    db: DB,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    category: UUID | None = Query(default=None),
    merchant: str | None = Query(default=None),
    currency: str | None = Query(default=None),
) -> PaginatedResponse[TransactionListItem]:
    query = (
        select(Transaction)
        .where(Transaction.ownership_scope_id == auth.ownership_scope_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.id)
    )

    if date_from:
        query = query.where(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.where(Transaction.transaction_date <= date_to)
    if category:
        query = query.where(Transaction.store_category_id == category)
    if merchant:
        query = query.where(Transaction.merchant.ilike(f"%{merchant}%"))
    if currency:
        query = query.where(Transaction.currency == currency)
    if cursor:
        parts = cursor.split("|", 1)
        if len(parts) == 2:
            cursor_date, cursor_id = parts[0], UUID(parts[1])
            query = query.where(
                (Transaction.transaction_date < cursor_date)
                | ((Transaction.transaction_date == cursor_date) & (Transaction.id > cursor_id))
            )

    query = query.limit(limit + 1)

    result = await db.execute(query)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    txn_ids = [txn.id for txn in rows]
    item_counts: dict = {}
    if txn_ids:
        count_result = await db.execute(
            select(TransactionItem.transaction_id, func.count())
            .where(TransactionItem.transaction_id.in_(txn_ids))
            .group_by(TransactionItem.transaction_id)
        )
        item_counts = dict(count_result.all())

    items: list[TransactionListItem] = []
    for txn in rows:
        items.append(
            TransactionListItem(
                id=txn.id,
                transaction_date=txn.transaction_date,
                transaction_time=txn.transaction_time,
                merchant=txn.merchant,
                merchant_user_edited_at=txn.merchant_user_edited_at,
                alias=txn.alias,
                store_category_id=txn.store_category_id,
                store_category_user_edited_at=txn.store_category_user_edited_at,
                total_minor=txn.total_minor,
                currency=txn.currency,
                amount_usd_minor=txn.amount_usd_minor,
                fx_rate_to_usd=txn.fx_rate_to_usd,
                card_alias_id=txn.card_alias_id,
                receipt_type=txn.receipt_type,
                thumbnail_url=txn.thumbnail_url,
                country=txn.country,
                city=txn.city,
                item_count=item_counts.get(txn.id, 0),
                created_at=txn.created_at,
                updated_at=txn.updated_at,
            )
        )

    next_cursor = f"{rows[-1].transaction_date}|{rows[-1].id}" if has_more and rows else None

    return PaginatedResponse(data=items, cursor=next_cursor, has_more=has_more)


@router.get("/{transaction_id}", response_model=TransactionDetail)
async def get_transaction(
    transaction_id: UUID,
    auth: Auth,
    db: DB,
) -> TransactionDetail:
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.items), selectinload(Transaction.images))
        .where(
            Transaction.id == transaction_id,
            Transaction.ownership_scope_id == auth.ownership_scope_id,
        )
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return TransactionDetail(
        id=txn.id,
        transaction_date=txn.transaction_date,
        transaction_time=txn.transaction_time,
        merchant=txn.merchant,
        merchant_user_edited_at=txn.merchant_user_edited_at,
        alias=txn.alias,
        store_category_id=txn.store_category_id,
        store_category_user_edited_at=txn.store_category_user_edited_at,
        total_minor=txn.total_minor,
        currency=txn.currency,
        amount_usd_minor=txn.amount_usd_minor,
        fx_rate_to_usd=txn.fx_rate_to_usd,
        card_alias_id=txn.card_alias_id,
        receipt_type=txn.receipt_type,
        thumbnail_url=txn.thumbnail_url,
        country=txn.country,
        city=txn.city,
        items=[TransactionItemResponse.model_validate(i) for i in txn.items],
        images=[TransactionImageResponse.model_validate(i) for i in txn.images],
        created_at=txn.created_at,
        updated_at=txn.updated_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    auth: Auth,
    db: DB,
) -> dict[str, str]:
    fx_rate_to_usd = None
    amount_usd_minor = None
    fx_captured_at = None

    if body.currency != "USD":
        try:
            cur_result = await db.execute(
                select(Currency.exponent).where(Currency.code == body.currency)
            )
            from_exponent = cur_result.scalar_one_or_none()
            if from_exponent is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unknown currency: {body.currency}",
                )

            fx = await get_fx_rate(db, body.currency, "USD", body.transaction_date)
            fx_rate_to_usd = fx.rate
            fx_captured_at = fx.captured_at
            amount_usd_minor = compute_usd_shadow(body.total_minor, from_exponent, fx.rate)
        except FxServiceError as exc:
            logger.warning("fx_unavailable", extra={"currency": body.currency})
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Exchange rate unavailable — please retry later",
            ) from exc
    else:
        amount_usd_minor = body.total_minor
        fx_rate_to_usd = None
        fx_captured_at = None

    txn = Transaction(
        ownership_scope_id=auth.ownership_scope_id,
        transaction_date=body.transaction_date,
        transaction_time=body.transaction_time,
        merchant=body.merchant,
        store_category_id=body.store_category_id,
        total_minor=body.total_minor,
        currency=body.currency,
        amount_usd_minor=amount_usd_minor,
        fx_rate_to_usd=fx_rate_to_usd,
        fx_captured_at=fx_captured_at,
        receipt_type=body.receipt_type,
        country=body.country,
        city=body.city,
        card_alias_id=body.card_alias_id,
        merchant_source=body.merchant_source,
    )
    db.add(txn)
    await db.flush()

    for idx, item_data in enumerate(body.items):
        item = TransactionItem(
            transaction_id=txn.id,
            name=item_data.name,
            qty=item_data.qty,
            unit_price_minor=item_data.unit_price_minor,
            total_price_minor=item_data.total_price_minor,
            item_category_id=item_data.item_category_id,
            subcategory=item_data.subcategory,
            category_source=item_data.category_source,
            is_flagged=item_data.is_flagged,
            sort_order=item_data.sort_order if item_data.sort_order else idx,
        )
        db.add(item)

    for idx, url in enumerate(body.image_urls):
        image = TransactionImage(
            transaction_id=txn.id,
            image_url=url,
            is_thumbnail=(idx == 0),
            sort_order=idx,
        )
        db.add(image)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid reference data — check currency code and category IDs",
        ) from exc
    return {"id": str(txn.id)}


@router.patch("/{transaction_id}", response_model=TransactionDetail)
async def update_transaction(
    transaction_id: UUID,
    body: TransactionUpdate,
    auth: Auth,
    db: DB,
) -> TransactionDetail:
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.items), selectinload(Transaction.images))
        .where(
            Transaction.id == transaction_id,
            Transaction.ownership_scope_id == auth.ownership_scope_id,
        )
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    now = datetime.now(UTC)
    update_data = body.model_dump(exclude_unset=True, exclude={"items"})

    if "merchant" in update_data:
        txn.merchant = update_data["merchant"]
        txn.merchant_user_edited_at = now
    if "store_category_id" in update_data:
        txn.store_category_id = update_data["store_category_id"]
        txn.store_category_user_edited_at = now
    if "transaction_date" in update_data:
        txn.transaction_date = update_data["transaction_date"]
    if "transaction_time" in update_data:
        txn.transaction_time = update_data["transaction_time"]
    if "total_minor" in update_data:
        txn.total_minor = update_data["total_minor"]
    if "currency" in update_data:
        txn.currency = update_data["currency"]
    if "receipt_type" in update_data:
        txn.receipt_type = update_data["receipt_type"]
    if "country" in update_data:
        txn.country = update_data["country"]
    if "city" in update_data:
        txn.city = update_data["city"]
    if "card_alias_id" in update_data:
        txn.card_alias_id = update_data["card_alias_id"]

    if body.items is not None:
        for item_update in body.items:
            existing = next((i for i in txn.items if i.id == item_update.id), None)
            if existing is None:
                continue
            item_fields = item_update.model_dump(exclude_unset=True, exclude={"id"})
            if "name" in item_fields:
                existing.name = item_fields["name"]
                existing.name_user_edited_at = now
            item_settable = {
                "qty",
                "unit_price_minor",
                "total_price_minor",
                "subcategory",
                "category_source",
                "is_flagged",
            }
            for field, value in item_fields.items():
                if field == "name":
                    continue
                if field == "item_category_id":
                    existing.item_category_id = value
                    existing.item_category_user_edited_at = now
                elif field in item_settable:
                    setattr(existing, field, value)

    money_fields = ("transaction_date", "total_minor", "currency")
    money_fields_changed = any(f in update_data for f in money_fields)
    if money_fields_changed:
        if txn.currency != "USD":
            try:
                cur_result = await db.execute(
                    select(Currency.exponent).where(Currency.code == txn.currency)
                )
                from_exponent = cur_result.scalar_one_or_none()
                if from_exponent is not None:
                    fx = await get_fx_rate(db, txn.currency, "USD", txn.transaction_date)
                    txn.fx_rate_to_usd = fx.rate
                    txn.fx_captured_at = fx.captured_at
                    txn.amount_usd_minor = compute_usd_shadow(
                        txn.total_minor,
                        from_exponent,
                        fx.rate,
                    )
            except FxServiceError:
                logger.warning("fx_unavailable_on_update", extra={"currency": txn.currency})
                txn.amount_usd_minor = None
                txn.fx_rate_to_usd = None
                txn.fx_captured_at = None
        else:
            txn.amount_usd_minor = txn.total_minor
            txn.fx_rate_to_usd = None
            txn.fx_captured_at = None

    await db.commit()
    await db.refresh(txn)

    return TransactionDetail(
        id=txn.id,
        transaction_date=txn.transaction_date,
        transaction_time=txn.transaction_time,
        merchant=txn.merchant,
        merchant_user_edited_at=txn.merchant_user_edited_at,
        alias=txn.alias,
        store_category_id=txn.store_category_id,
        store_category_user_edited_at=txn.store_category_user_edited_at,
        total_minor=txn.total_minor,
        currency=txn.currency,
        amount_usd_minor=txn.amount_usd_minor,
        fx_rate_to_usd=txn.fx_rate_to_usd,
        card_alias_id=txn.card_alias_id,
        receipt_type=txn.receipt_type,
        thumbnail_url=txn.thumbnail_url,
        country=txn.country,
        city=txn.city,
        items=[TransactionItemResponse.model_validate(i) for i in txn.items],
        images=[TransactionImageResponse.model_validate(i) for i in txn.images],
        created_at=txn.created_at,
        updated_at=txn.updated_at,
    )


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    auth: Auth,
    db: DB,
) -> None:
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.ownership_scope_id == auth.ownership_scope_id,
        )
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    await db.delete(txn)
    await db.commit()


@router.post("/batch-update", response_model=BatchResult)
async def batch_update_transactions(
    body: BatchUpdateRequest,
    auth: Auth,
    db: DB,
) -> BatchResult:
    if not body.transaction_ids:
        return BatchResult(count=0)

    now = datetime.now(UTC)
    set_values: dict = {}
    update_fields = body.updates.model_dump(exclude_unset=True)

    if "store_category_id" in update_fields:
        set_values["store_category_id"] = update_fields["store_category_id"]
        set_values["store_category_user_edited_at"] = now
    if "merchant" in update_fields:
        set_values["merchant"] = update_fields["merchant"]
        set_values["merchant_user_edited_at"] = now

    if not set_values:
        return BatchResult(count=0)

    set_values["updated_at"] = now

    stmt = (
        update(Transaction)
        .where(
            Transaction.id.in_(body.transaction_ids),
            Transaction.ownership_scope_id == auth.ownership_scope_id,
        )
        .values(**set_values)
    )
    result = await db.execute(stmt)
    await db.commit()
    return BatchResult(count=result.rowcount)


@router.post("/batch-delete", response_model=BatchResult)
async def batch_delete_transactions(
    body: BatchDeleteRequest,
    auth: Auth,
    db: DB,
) -> BatchResult:
    if not body.transaction_ids:
        return BatchResult(count=0)

    stmt = delete(Transaction).where(
        Transaction.id.in_(body.transaction_ids),
        Transaction.ownership_scope_id == auth.ownership_scope_id,
    )
    result = await db.execute(stmt)
    await db.commit()
    return BatchResult(count=result.rowcount)
