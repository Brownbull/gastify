"""DSR (Data Subject Request) endpoints — access, rectification, erasure, portability.

Covers Law 21.719 (CL), GDPR (EU), PIPEDA (CA), CCPA/CPRA (US-CA).
"""

import json
import logging
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
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
    anonymize_user_transactions,
    list_consents,
    log_audit_event,
    revoke_all_consents,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/privacy", tags=["privacy"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/data-access", response_model=DataAccessResponse)
async def data_access(auth: Auth, db: DB) -> DataAccessResponse:
    """GDPR Art 15 / Law 21.719 Art 8 / PIPEDA / CCPA — right of access."""
    now = datetime.now(UTC)

    consents = await list_consents(
        db,
        user_id=auth.user_id,
        ownership_scope_id=auth.ownership_scope_id,
    )

    count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(
            Transaction.ownership_scope_id == auth.ownership_scope_id
        )
    )
    txn_count = count_result.scalar_one()

    await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_access",
        details=json.dumps({
            "transactions_count": txn_count,
            "consents_count": len(consents),
        }),
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
        consents=[
            ConsentResponse.model_validate(c) for c in consents
        ],
        transactions_count=txn_count,
        exported_at=now,
    )


@router.post("/rectification", response_model=RectificationResponse)
async def rectification(
    body: RectificationRequest,
    auth: Auth,
    db: DB,
) -> RectificationResponse:
    """GDPR Art 16 / Law 21.719 / CPRA — right to rectification."""
    now = datetime.now(UTC)
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
        details=json.dumps({"updated_fields": updated_fields}),
    )
    await db.commit()

    return RectificationResponse(
        updated_fields=updated_fields,
        updated_at=now,
    )


@router.post("/erasure", response_model=ErasureResponse)
async def erasure(auth: Auth, db: DB) -> ErasureResponse:
    """GDPR Art 17 / Law 21.719 / CCPA — right to erasure.

    Soft-delete: anonymizes PII in transactions, revokes all consents.
    Does not hard-delete rows (audit trail preserved per D4).
    """
    now = datetime.now(UTC)

    consents_revoked = await revoke_all_consents(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
    )

    txn_anonymized = await anonymize_user_transactions(
        db,
        ownership_scope_id=auth.ownership_scope_id,
    )

    event = await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_erasure",
        details=json.dumps({
            "consents_revoked": consents_revoked,
            "transactions_anonymized": txn_anonymized,
        }),
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
        audit_event_id=event.id,
        erased_at=now,
    )


@router.get("/portability", response_model=PortabilityResponse)
async def portability(auth: Auth, db: DB) -> PortabilityResponse:
    """GDPR Art 20 / Law 21.719 / CCPA — right to data portability.

    Returns all user data in machine-readable JSON format.
    """
    now = datetime.now(UTC)
    user = auth.user

    consents = await list_consents(
        db,
        user_id=auth.user_id,
        ownership_scope_id=auth.ownership_scope_id,
    )

    txn_result = await db.execute(
        select(Transaction)
        .where(
            Transaction.ownership_scope_id == auth.ownership_scope_id
        )
        .order_by(Transaction.transaction_date.desc())
    )
    transactions = list(txn_result.scalars().all())

    await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_portability",
        details=json.dumps({
            "transactions_count": len(transactions),
            "consents_count": len(consents),
        }),
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
        consents=[
            ConsentResponse.model_validate(c) for c in consents
        ],
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
    )
