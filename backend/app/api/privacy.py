"""DSR (Data Subject Request) endpoints — access, rectification, erasure, portability.

Covers Law 21.719 (CL), GDPR (EU), PIPEDA (CA), CCPA/CPRA (US-CA).
"""

import json
import logging
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth
from app.db import get_db
from app.models.transaction import Transaction
from app.schemas.consent import (
    ConsentResponse,
    DataAccessResponse,
    ErasureResponse,
    PortabilityResponse,
    PortabilityTransaction,
    RectificationRequest,
    RectificationResponse,
    UserDataExport,
)
from app.services.consent import (
    anonymize_user_profile,
    anonymize_user_transactions,
    list_consents,
    log_audit_event,
    revoke_all_consents,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/privacy", tags=["privacy"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/data-access", response_model=DataAccessResponse)
async def data_access(request: Request, auth: Auth, db: DB) -> DataAccessResponse:
    """GDPR Art 15 / Law 21.719 Art 8 / PIPEDA / CCPA — right of access."""
    now = datetime.now(UTC)
    ip = request.client.host if request.client else None

    consents = await list_consents(
        db,
        user_id=auth.user_id,
        ownership_scope_id=auth.ownership_scope_id,
    )

    count_result = await db.execute(
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.ownership_scope_id == auth.ownership_scope_id)
    )
    txn_count = count_result.scalar_one()

    await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_access",
        ip_address=ip,
        details=json.dumps(
            {
                "transactions_count": txn_count,
                "consents_count": len(consents),
            }
        ),
    )
    await db.commit()

    user = auth.user
    return DataAccessResponse(
        user=UserDataExport(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            default_currency=user.default_currency,
            locale=user.locale,
            created_at=user.created_at,
        ),
        consents=[ConsentResponse.model_validate(c) for c in consents],
        transactions_count=txn_count,
        exported_at=now,
    )


@router.post("/rectification", response_model=RectificationResponse)
async def rectification(
    body: RectificationRequest,
    request: Request,
    auth: Auth,
    db: DB,
) -> RectificationResponse:
    """GDPR Art 16 / Law 21.719 / CPRA — right to rectification."""
    now = datetime.now(UTC)
    ip = request.client.host if request.client else None
    user = auth.user
    updated_fields: list[str] = []
    update_data = body.model_dump(exclude_unset=True)

    if "display_name" in update_data:
        user.display_name = update_data["display_name"]
        updated_fields.append("display_name")
    if "email" in update_data:
        user.email = update_data["email"]
        updated_fields.append("email")
    if "default_currency" in update_data:
        from app.models.reference import Currency

        valid = await db.execute(
            select(Currency).where(Currency.code == update_data["default_currency"])
        )
        if valid.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid currency code: {update_data['default_currency']}",
            )
        user.default_currency = update_data["default_currency"]
        updated_fields.append("default_currency")
    if "locale" in update_data:
        user.locale = update_data["locale"]
        updated_fields.append("locale")

    await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_rectification",
        resource_type="user",
        resource_id=user.id,
        ip_address=ip,
        details=json.dumps({"updated_fields": updated_fields}),
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid field value: default_currency must be a valid currency code",
        ) from exc

    return RectificationResponse(
        updated_fields=updated_fields,
        updated_at=now,
    )


@router.post("/erasure", response_model=ErasureResponse)
async def erasure(request: Request, auth: Auth, db: DB) -> ErasureResponse:
    """GDPR Art 17 / Law 21.719 / CCPA — right to erasure.

    Soft-delete: anonymizes PII in user profile, transactions, items, images;
    revokes all consents. Does not hard-delete rows (audit trail per D4).
    """
    now = datetime.now(UTC)
    ip = request.client.host if request.client else None

    consents_revoked = await revoke_all_consents(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
    )

    txn_anonymized = await anonymize_user_transactions(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
    )

    await anonymize_user_profile(db, user_id=auth.user_id)

    event = await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_erasure",
        ip_address=ip,
        details=json.dumps(
            {
                "consents_revoked": consents_revoked,
                "transactions_anonymized": txn_anonymized,
                "user_anonymized": True,
            }
        ),
    )
    await db.commit()

    logger.info(
        "dsr_erasure_completed",
        extra={
            "user_id": str(auth.user_id),
            "consents_revoked": consents_revoked,
            "transactions_anonymized": txn_anonymized,
        },
    )

    return ErasureResponse(
        consents_revoked=consents_revoked,
        transactions_anonymized=txn_anonymized,
        user_anonymized=True,
        audit_event_id=event.id,
        erased_at=now,
    )


@router.get("/portability", response_model=PortabilityResponse)
async def portability(request: Request, auth: Auth, db: DB) -> PortabilityResponse:
    """GDPR Art 20 / Law 21.719 / CCPA — right to data portability.

    Returns all user data in machine-readable JSON format.
    """
    now = datetime.now(UTC)
    ip = request.client.host if request.client else None
    user = auth.user
    export_limit = 10_000

    consents = await list_consents(
        db,
        user_id=auth.user_id,
        ownership_scope_id=auth.ownership_scope_id,
    )

    total_result = await db.execute(
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.ownership_scope_id == auth.ownership_scope_id)
    )
    total_txn = total_result.scalar_one()

    txn_result = await db.execute(
        select(Transaction)
        .where(Transaction.ownership_scope_id == auth.ownership_scope_id)
        .order_by(Transaction.transaction_date.desc())
        .limit(export_limit)
    )
    transactions = list(txn_result.scalars().all())

    await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_portability",
        ip_address=ip,
        details=json.dumps(
            {
                "transactions_exported": len(transactions),
                "transactions_total": total_txn,
                "truncated": total_txn > export_limit,
                "consents_count": len(consents),
            }
        ),
    )
    await db.commit()

    return PortabilityResponse(
        exported_at=now,
        user=UserDataExport(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            default_currency=user.default_currency,
            locale=user.locale,
            created_at=user.created_at,
        ),
        consents=[ConsentResponse.model_validate(c) for c in consents],
        transactions=[
            PortabilityTransaction(
                id=t.id,
                transaction_date=t.transaction_date,
                merchant=t.merchant,
                total_minor=t.total_minor,
                currency=t.currency,
                amount_usd_minor=t.amount_usd_minor,
                receipt_type=t.receipt_type,
                country=t.country,
                city=t.city,
                created_at=t.created_at,
            )
            for t in transactions
        ],
        total_transactions=total_txn,
        truncated=total_txn > export_limit,
    )
