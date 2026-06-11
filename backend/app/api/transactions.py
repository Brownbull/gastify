"""Transactions CRUD endpoints per OpenAPI sketch §2."""

import logging
from datetime import UTC, date, datetime, timedelta
from typing import TYPE_CHECKING, Annotated, Any, Literal, cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import Auth, AuthContext
from app.config import settings
from app.db import get_db
from app.models.reference import Currency
from app.models.statement import CardAlias, ReconciliationVerdict, StatementReconciliationVerdict
from app.models.transaction import (
    Transaction,
    TransactionImage,
    TransactionItem,
    TransactionItemFlag,
)
from app.schemas.common import PaginatedResponse
from app.schemas.insights import ItemInsightFlagKind, as_item_insight_flag_kind
from app.schemas.recurrence import (
    as_recurrence_interval,
    as_recurrence_kind,
    as_recurrence_source,
)
from app.schemas.transaction import (
    BatchDeleteRequest,
    BatchResult,
    BatchUpdateRequest,
    TransactionCreate,
    TransactionDetail,
    TransactionItemFlagsUpdate,
    TransactionListItem,
    TransactionUpdate,
)
from app.services.fx import FxServiceError, compute_usd_shadow, get_fx_rate
from app.services.mappings import remember_item_mapping, remember_merchant_mapping
from app.services.recurrence import validate_recurrence_fields

if TYPE_CHECKING:
    from sqlalchemy.engine import CursorResult

    from app.schemas.scan import ScanReviewLevel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["transactions"])

DB = Annotated[AsyncSession, Depends(get_db)]

# D74: receipt-content fields frozen once a transaction is shared into a group.
# Anything NOT in this set (card_alias_id, recurrence_*) stays editable so the
# owner can still pair the txn to a card or mark it recurrent. Item edits are
# blocked separately (body.items); personal item flags use their own endpoint.
_CONTENT_LOCKED_FIELDS = frozenset(
    {
        "merchant",
        "store_category_id",
        "transaction_date",
        "transaction_time",
        "total_minor",
        "discount_total_minor",
        "gross_total_minor",
        "reconstructed_total_minor",
        "currency",
        "receipt_type",
        "country",
        "city",
    }
)


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
    card_alias: str | None = Query(default=None),
    source: Literal["scan", "manual", "statement", "import"] | None = Query(
        default=None, description="Filter by origin (receipt_type)."
    ),
    matched: bool | None = Query(
        default=None,
        description=(
            "true: only transactions matched against a card statement; false: only unmatched ones."
        ),
    ),
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
    if card_alias:
        query = query.where(Transaction.alias.ilike(f"%{card_alias}%"))
    if source:
        query = query.where(Transaction.receipt_type == source)
    if matched is not None:
        matched_subq = (
            select(StatementReconciliationVerdict.id)
            .where(
                StatementReconciliationVerdict.receipt_transaction_id == Transaction.id,
                StatementReconciliationVerdict.verdict == ReconciliationVerdict.MATCHED,
            )
            .exists()
        )
        query = query.where(matched_subq if matched else ~matched_subq)
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
    item_counts: dict[UUID, int] = {}
    matched_ids: set[UUID] = set()
    if txn_ids:
        count_result = await db.execute(
            select(TransactionItem.transaction_id, func.count())
            .where(TransactionItem.transaction_id.in_(txn_ids))
            .group_by(TransactionItem.transaction_id)
        )
        item_counts = {transaction_id: int(count) for transaction_id, count in count_result.all()}
        matched_result = await db.execute(
            select(StatementReconciliationVerdict.receipt_transaction_id.distinct()).where(
                StatementReconciliationVerdict.receipt_transaction_id.in_(txn_ids),
                StatementReconciliationVerdict.verdict == ReconciliationVerdict.MATCHED,
            )
        )
        matched_ids = {row for row in matched_result.scalars() if row is not None}

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
                store_category_source=txn.store_category_source,
                store_category_confidence=txn.store_category_confidence,
                store_category_mapping_id=txn.store_category_mapping_id,
                store_category_user_edited_at=txn.store_category_user_edited_at,
                total_minor=txn.total_minor,
                discount_total_minor=txn.discount_total_minor,
                gross_total_minor=txn.gross_total_minor,
                reconstructed_total_minor=txn.reconstructed_total_minor,
                scan_review_level=cast("ScanReviewLevel", txn.scan_review_level),
                currency=txn.currency,
                amount_usd_minor=txn.amount_usd_minor,
                fx_rate_to_usd=txn.fx_rate_to_usd,
                card_alias_id=txn.card_alias_id,
                receipt_type=txn.receipt_type,
                thumbnail_url=txn.thumbnail_url,
                country=txn.country,
                city=txn.city,
                recurrence_kind=as_recurrence_kind(txn.recurrence_kind),
                recurrence_interval=as_recurrence_interval(txn.recurrence_interval),
                term_current=txn.term_current,
                term_total=txn.term_total,
                recurrence_label=txn.recurrence_label,
                recurrence_source=as_recurrence_source(txn.recurrence_source),
                recurrence_confidence=txn.recurrence_confidence,
                recurrence_user_edited_at=txn.recurrence_user_edited_at,
                item_count=item_counts.get(txn.id, 0),
                is_shared=txn.is_shared,
                statement_matched=txn.id in matched_ids,
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
    txn = await _load_owned_transaction_detail(db, auth=auth, transaction_id=transaction_id)
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return _transaction_detail_for_user(
        txn, user_id=auth.user_id, statement_matched=await _is_statement_matched(db, txn.id)
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    auth: Auth,
    db: DB,
) -> dict[str, str]:
    if body.card_alias_id is not None:
        await _assert_active_card_alias(db, auth=auth, card_alias_id=body.card_alias_id)
    _validate_recurrence_payload(
        recurrence_kind=body.recurrence_kind,
        term_current=body.term_current,
        term_total=body.term_total,
    )

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
        store_category_source=body.store_category_source,
        store_category_confidence=body.store_category_confidence,
        store_category_mapping_id=body.store_category_mapping_id,
        total_minor=body.total_minor,
        discount_total_minor=body.discount_total_minor,
        gross_total_minor=body.gross_total_minor,
        reconstructed_total_minor=body.reconstructed_total_minor,
        currency=body.currency,
        amount_usd_minor=amount_usd_minor,
        fx_rate_to_usd=fx_rate_to_usd,
        fx_captured_at=fx_captured_at,
        receipt_type=body.receipt_type,
        country=body.country,
        city=body.city,
        card_alias_id=body.card_alias_id,
        recurrence_kind=body.recurrence_kind,
        recurrence_interval=body.recurrence_interval,
        term_current=body.term_current,
        term_total=body.term_total,
        recurrence_label=body.recurrence_label,
        recurrence_source=body.recurrence_source,
        recurrence_confidence=body.recurrence_confidence,
        merchant_source=body.merchant_source,
        llm_tokens_in=body.llm_tokens_in,
        llm_tokens_out=body.llm_tokens_out,
        llm_cost_usd=body.llm_cost_usd,
        scan_duration_ms=body.scan_duration_ms,
        llm_latency_ms=body.llm_latency_ms,
        queue_wait_ms=body.queue_wait_ms,
        thumbnail_gen_ms=body.thumbnail_gen_ms,
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
            discount_minor=item_data.discount_minor,
            discount_label=item_data.discount_label,
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
    txn = await _load_owned_transaction_detail(db, auth=auth, transaction_id=transaction_id)
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    now = datetime.now(UTC)
    update_data = body.model_dump(exclude_unset=True, exclude={"items"})
    original_merchant = txn.merchant

    # D74: a source shared into a group is content-locked — its group copy is a
    # point-in-time snapshot, so the receipt's contents must not change underneath
    # it. Block content fields + item edits; still allow tangential ops (card
    # pairing, recurrence) here and personal item flags via the flags endpoint.
    locks_content = bool(_CONTENT_LOCKED_FIELDS.intersection(update_data)) or body.items is not None
    if txn.is_shared and locks_content:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This transaction is shared to a group and locked for content edits. "
                "You can still pair it to a card or mark it recurrent."
            ),
        )
    # Lock-on-match: a MATCHED reconciliation verdict makes the statement the external
    # source of truth — the matched content must not drift underneath it. Same shape
    # as the D74 share lock (tangential ops stay allowed); deleting the statement
    # removes its verdicts (CASCADE) and unlocks.
    if locks_content and await _is_statement_matched(db, txn.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This transaction is matched against a card statement and locked for "
                "content edits. Delete the statement to unlock it."
            ),
        )

    if "merchant" in update_data:
        txn.merchant = update_data["merchant"]
        txn.merchant_user_edited_at = now
    if "store_category_id" in update_data:
        txn.store_category_id = update_data["store_category_id"]
        txn.store_category_source = "user"
        txn.store_category_confidence = None
        txn.store_category_mapping_id = None
        txn.store_category_user_edited_at = now
    if "transaction_date" in update_data:
        txn.transaction_date = update_data["transaction_date"]
    if "transaction_time" in update_data:
        txn.transaction_time = update_data["transaction_time"]
    if "total_minor" in update_data:
        txn.total_minor = update_data["total_minor"]
    if "discount_total_minor" in update_data:
        txn.discount_total_minor = update_data["discount_total_minor"]
    if "gross_total_minor" in update_data:
        txn.gross_total_minor = update_data["gross_total_minor"]
    if "reconstructed_total_minor" in update_data:
        txn.reconstructed_total_minor = update_data["reconstructed_total_minor"]
    if "currency" in update_data:
        txn.currency = update_data["currency"]
    if "receipt_type" in update_data:
        txn.receipt_type = update_data["receipt_type"]
    if "country" in update_data:
        txn.country = update_data["country"]
    if "city" in update_data:
        txn.city = update_data["city"]
    if "card_alias_id" in update_data:
        if update_data["card_alias_id"] is not None:
            await _assert_active_card_alias(
                db,
                auth=auth,
                card_alias_id=update_data["card_alias_id"],
            )
        txn.card_alias_id = update_data["card_alias_id"]
    recurrence_fields = {
        "recurrence_kind",
        "recurrence_interval",
        "term_current",
        "term_total",
        "recurrence_label",
        "recurrence_source",
        "recurrence_confidence",
    }
    if recurrence_fields.intersection(update_data):
        for field in recurrence_fields:
            if field in update_data and field != "recurrence_source":
                setattr(txn, field, update_data[field])
        txn.recurrence_source = "user"
        txn.recurrence_user_edited_at = now
        _validate_recurrence_payload(
            recurrence_kind=txn.recurrence_kind,
            term_current=txn.term_current,
            term_total=txn.term_total,
        )

    if body.items is not None:
        for item_update in body.items:
            existing = next((i for i in txn.items if i.id == item_update.id), None)
            if existing is None:
                continue
            original_item_name = existing.name
            item_fields = item_update.model_dump(exclude_unset=True, exclude={"id"})
            if "name" in item_fields:
                existing.name = item_fields["name"]
                existing.name_user_edited_at = now
            item_settable = {
                "qty",
                "unit_price_minor",
                "total_price_minor",
                "discount_minor",
                "discount_label",
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
            if {"name", "item_category_id"}.intersection(item_fields):
                await remember_item_mapping(
                    db,
                    ownership_scope_id=auth.ownership_scope_id,
                    original_item=original_item_name,
                    target_item=existing.name,
                    target_category_id=existing.item_category_id,
                    merchant_name=txn.merchant,
                )

    if {"merchant", "store_category_id"}.intersection(update_data):
        await remember_merchant_mapping(
            db,
            ownership_scope_id=auth.ownership_scope_id,
            original_merchant=original_merchant,
            target_merchant=txn.merchant,
            store_category_id=txn.store_category_id,
        )

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

    refreshed = await _load_owned_transaction_detail(db, auth=auth, transaction_id=transaction_id)
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return _transaction_detail_for_user(
        refreshed,
        user_id=auth.user_id,
        statement_matched=await _is_statement_matched(db, refreshed.id),
    )


@router.put("/{transaction_id}/items/{item_id}/flags", response_model=TransactionDetail)
async def update_transaction_item_flags(
    transaction_id: UUID,
    item_id: UUID,
    body: TransactionItemFlagsUpdate,
    auth: Auth,
    db: DB,
) -> TransactionDetail:
    txn = await _load_owned_transaction_detail(db, auth=auth, transaction_id=transaction_id)
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    item = next((candidate for candidate in txn.items if candidate.id == item_id), None)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction item not found",
        )

    normalized_flags = _dedupe_flags(body.flags)
    await db.execute(
        delete(TransactionItemFlag).where(
            TransactionItemFlag.transaction_item_id == item_id,
            TransactionItemFlag.user_id == auth.user_id,
        )
    )
    for flag_kind in normalized_flags:
        db.add(
            TransactionItemFlag(
                ownership_scope_id=auth.ownership_scope_id,
                transaction_item_id=item_id,
                user_id=auth.user_id,
                flag_kind=flag_kind,
            )
        )

    await db.commit()

    refreshed = await _load_owned_transaction_detail(db, auth=auth, transaction_id=transaction_id)
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return _transaction_detail_for_user(
        refreshed,
        user_id=auth.user_id,
        statement_matched=await _is_statement_matched(db, refreshed.id),
    )


async def _assert_none_statement_matched(
    db: AsyncSession, transaction_ids: list[UUID], ownership_scope_id: UUID
) -> None:
    """Whole-batch rejection when ANY selected transaction is statement-matched
    (mirrors the D74 batch lock: explicit 409 over silent partials)."""
    matched = await db.scalar(
        select(func.count())
        .select_from(StatementReconciliationVerdict)
        .join(Transaction, Transaction.id == StatementReconciliationVerdict.receipt_transaction_id)
        .where(
            StatementReconciliationVerdict.receipt_transaction_id.in_(transaction_ids),
            StatementReconciliationVerdict.verdict == ReconciliationVerdict.MATCHED,
            Transaction.ownership_scope_id == ownership_scope_id,
        )
    )
    if int(matched or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Some selected transactions are matched against a card statement and "
                "locked. Deselect them to continue."
            ),
        )


def _assert_within_delete_window(dates: list[date]) -> None:
    """UX-11: deletes are only allowed for transactions newer than the window, so the
    statistics of settled periods can't shift underneath the user. 409 names the rule.
    DSR erasure intentionally bypasses this (bulk path in consent.py, a legal right)."""
    window = settings.transaction_delete_window_days
    if window <= 0:
        return
    cutoff = datetime.now(UTC).date() - timedelta(days=window)
    if any(d < cutoff for d in dates):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Transactions older than {window} days are locked: past periods' "
                "statistics are settled. Contact support or use account data export."
            ),
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

    if await _is_statement_matched(db, txn.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This transaction is matched against a card statement and cannot be "
                "deleted. Delete the statement to unlock it."
            ),
        )
    _assert_within_delete_window([txn.transaction_date])
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
    set_values: dict[str, object] = {}
    update_fields = body.updates.model_dump(exclude_unset=True)

    if "store_category_id" in update_fields:
        set_values["store_category_id"] = update_fields["store_category_id"]
        set_values["store_category_source"] = "user"
        set_values["store_category_confidence"] = None
        set_values["store_category_mapping_id"] = None
        set_values["store_category_user_edited_at"] = now
    if "merchant" in update_fields:
        set_values["merchant"] = update_fields["merchant"]
        set_values["merchant_user_edited_at"] = now

    if not set_values:
        return BatchResult(count=0)

    # D74: batch-update only ever sets content fields (merchant, store_category_id),
    # so it must honour the shared-source content-lock exactly like the single PATCH.
    # If ANY targeted transaction is shared into a group, reject the whole batch
    # (409) rather than silently skipping rows — mirrors update_transaction's lock.
    shared_count = await db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(
            Transaction.id.in_(body.transaction_ids),
            Transaction.ownership_scope_id == auth.ownership_scope_id,
            Transaction.is_shared.is_(True),
        )
    )
    if int(shared_count or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Some selected transactions are shared to a group and locked for "
                "content edits. Deselect them to continue."
            ),
        )
    await _assert_none_statement_matched(db, body.transaction_ids, auth.ownership_scope_id)

    set_values["updated_at"] = now

    # Capture the ORIGINAL merchants BEFORE the bulk update so batch edits LEARN the
    # same way single edits do (the learned-mappings contract: a merchant/category
    # correction teaches the next scan). Batch previously skipped learning entirely.
    originals = (
        await db.execute(
            select(Transaction.merchant).where(
                Transaction.id.in_(body.transaction_ids),
                Transaction.ownership_scope_id == auth.ownership_scope_id,
            )
        )
    ).scalars()
    original_merchants = {m for m in originals if m}

    stmt = (
        update(Transaction)
        .where(
            Transaction.id.in_(body.transaction_ids),
            Transaction.ownership_scope_id == auth.ownership_scope_id,
        )
        .values(**set_values)
    )
    result = cast("CursorResult[Any]", await db.execute(stmt))

    new_merchant = update_fields.get("merchant")
    new_store_category = update_fields.get("store_category_id")
    for original in original_merchants:
        await remember_merchant_mapping(
            db,
            ownership_scope_id=auth.ownership_scope_id,
            original_merchant=original,
            # A category-only batch keeps each original name as its own target.
            target_merchant=new_merchant or original,
            store_category_id=new_store_category,
        )
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

    # Whole-batch rejection on any out-of-window row (mirrors the D74 lock pattern:
    # explicit 409 over silently skipping rows).
    dates = (
        (
            await db.execute(
                select(Transaction.transaction_date).where(
                    Transaction.id.in_(body.transaction_ids),
                    Transaction.ownership_scope_id == auth.ownership_scope_id,
                )
            )
        )
        .scalars()
        .all()
    )
    _assert_within_delete_window(list(dates))
    await _assert_none_statement_matched(db, body.transaction_ids, auth.ownership_scope_id)

    stmt = delete(Transaction).where(
        Transaction.id.in_(body.transaction_ids),
        Transaction.ownership_scope_id == auth.ownership_scope_id,
    )
    result = cast("CursorResult[Any]", await db.execute(stmt))
    await db.commit()
    return BatchResult(count=result.rowcount)


async def _load_owned_transaction_detail(
    db: AsyncSession,
    *,
    auth: AuthContext,
    transaction_id: UUID,
) -> Transaction | None:
    result = await db.execute(
        select(Transaction)
        .options(
            selectinload(Transaction.items).selectinload(TransactionItem.item_flags),
            selectinload(Transaction.images),
        )
        .where(
            Transaction.id == transaction_id,
            Transaction.ownership_scope_id == auth.ownership_scope_id,
        )
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def _is_statement_matched(db: AsyncSession, transaction_id: UUID) -> bool:
    verdict = await db.scalar(
        select(StatementReconciliationVerdict.id)
        .where(
            StatementReconciliationVerdict.receipt_transaction_id == transaction_id,
            StatementReconciliationVerdict.verdict == ReconciliationVerdict.MATCHED,
        )
        .limit(1)
    )
    return verdict is not None


def _transaction_detail_for_user(
    txn: Transaction, *, user_id: UUID, statement_matched: bool = False
) -> TransactionDetail:
    detail = TransactionDetail.model_validate(txn)
    detail.statement_matched = statement_matched
    item_by_id = {item.id: item for item in txn.items}
    for item_response in detail.items:
        item = item_by_id.get(item_response.id)
        if item is None:
            continue
        flags = _flag_kinds_for_user(item, user_id=user_id)
        item_response.flags = flags
        item_response.is_flagged = item_response.is_flagged or bool(flags)
    return detail


def _flag_kinds_for_user(item: TransactionItem, *, user_id: UUID) -> list[ItemInsightFlagKind]:
    flags: list[ItemInsightFlagKind] = []
    for flag in item.item_flags:
        if flag.user_id != user_id:
            continue
        flag_kind = as_item_insight_flag_kind(flag.flag_kind)
        if flag_kind not in flags:
            flags.append(flag_kind)
    return flags


def _dedupe_flags(flags: list[ItemInsightFlagKind]) -> list[ItemInsightFlagKind]:
    deduped: list[ItemInsightFlagKind] = []
    for flag in flags:
        if flag not in deduped:
            deduped.append(flag)
    return deduped


async def _assert_active_card_alias(
    db: AsyncSession,
    *,
    auth: Auth,
    card_alias_id: UUID,
) -> None:
    result = await db.execute(
        select(CardAlias.id).where(
            CardAlias.id == card_alias_id,
            CardAlias.ownership_scope_id == auth.ownership_scope_id,
            CardAlias.archived_at.is_(None),
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown active card alias",
        )


def _validate_recurrence_payload(
    *,
    recurrence_kind: str,
    term_current: int | None,
    term_total: int | None,
) -> None:
    try:
        validate_recurrence_fields(
            recurrence_kind=recurrence_kind,
            term_current=term_current,
            term_total=term_total,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
