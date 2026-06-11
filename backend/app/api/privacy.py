"""DSR (Data Subject Request) endpoints — access, rectification, erasure, portability.

Covers Law 21.719 (CL), GDPR (EU), PIPEDA (CA), CCPA/CPRA (US-CA).
"""

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

# `_user_group_rows` + `_set_postgres_ownership_scope` drive the D82 group void from
# the erasure path: enumerate the user's groups cross-scope (D71 reader), then swap
# the GUC per group to tombstone + de-member. Imported at the api layer (api→api).
from app.api.groups import _user_group_rows
from app.auth.deps import Auth, _set_postgres_ownership_scope
from app.db import get_db
from app.models.transaction import Transaction
from app.models.user import OwnershipScopeMember
from app.schemas.consent import (
    ConsentResponse,
    DataAccessResponse,
    ErasureResponse,
    PortabilityResponse,
    PortabilityTransaction,
    ProfileResponse,
    RectificationRequest,
    RectificationResponse,
    UserDataExport,
)
from app.services.consent import (
    anonymize_user_profile,
    delete_user_personal_data,
    list_consents,
    log_audit_event,
    revoke_all_consents,
    scrub_user_audit_trail,
)
from app.services.insights.tombstones import tombstone_member_shares

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


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(auth: Auth) -> ProfileResponse:
    """The settings-screen read: current profile prefs (incl. default_currency) without
    composing the full data-access export."""
    user = auth.user
    return ProfileResponse(
        display_name=user.display_name,
        email=user.email,
        default_currency=user.default_currency,
        locale=user.locale,
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


async def _void_user_group_shares(
    db: AsyncSession, *, user_id: uuid.UUID, personal_scope_id: uuid.UUID
) -> tuple[int, int]:
    """Account-delete is TOTAL (D82): for every group the user belongs to, tombstone
    the (group, month) periods their shared copies fed and remove their membership.

    The tombstones void the affected aggregates (T3); removing the membership makes
    D72's current-member list filter drop the user's rows. The content-locked group
    copies are left in place (D74) — invisible behind the void, never mutated or
    deleted. Returns ``(periods_voided, memberships_removed)``.

    RLS-correct: the user's groups are enumerated via the cross-scope
    ``app_user_groups`` reader (D71, RLS-exempt members table), then the GUC is
    swapped to each group to read its shared periods + delete the membership, before
    the personal scope is restored for the remaining erasure steps. The last-admin /
    sole-owner guard that blocks a normal leave is intentionally NOT applied —
    erasure is a right that cannot be refused; an orphaned group is the accepted edge.
    """
    group_rows = await _user_group_rows(db, user_id)
    periods_voided = 0
    memberships_removed = 0
    for group_id, *_ in group_rows:
        await _set_postgres_ownership_scope(db, group_id)
        periods_voided += await tombstone_member_shares(
            db, ownership_scope_id=group_id, user_id=user_id, reason="account_deleted"
        )
        membership = await db.scalar(
            select(OwnershipScopeMember).where(
                OwnershipScopeMember.ownership_scope_id == group_id,
                OwnershipScopeMember.user_id == user_id,
            )
        )
        if membership is not None:
            await db.delete(membership)
            # FLUSH WHILE THE GUC IS STILL THIS GROUP. db.delete only marks the row;
            # without an explicit flush the DELETE would emit at the next ORM
            # statement — under the NEXT group's GUC or (after the restore below) the
            # personal GUC. ownership_scope_members is RLS-bound for the runtime role,
            # so a DELETE under the wrong GUC matches 0 rows and (no version_id →
            # warn-not-raise) silently leaves the membership in place on Postgres.
            await db.flush()
            memberships_removed += 1
    # Re-point the session at the personal scope so the remaining erasure steps
    # (anonymize_user_profile, the dsr_erasure audit event) run personally-scoped.
    await _set_postgres_ownership_scope(db, personal_scope_id)
    return periods_voided, memberships_removed


@router.post("/erasure", response_model=ErasureResponse)
async def erasure(auth: Auth, db: DB) -> ErasureResponse:
    """GDPR Art 17 / Law 21.719 / CCPA — right to erasure (account deletion).

    Account deletion is TOTAL (D82): hard-delete ALL the user's personal-scope data
    (D89, amends D4 — transactions/items/images/flags, statements + lines + recon,
    card aliases, scans, notifications, merchant/category mappings, credit balances
    all genuinely removed) + revoke all consents, AND void the group-period statistics
    their shared copies fed (tombstone the affected (group, month) pairs) while removing
    their group memberships so those copies fall out of every member-facing list (D72).
    The content-locked group copies themselves are left in place (D74), invisible behind
    the void. What deliberately SURVIVES is PII-free: the scrubbed ``users`` shell, the
    user's revoked ``consent_records`` and the ``audit_events`` (D4 proof of
    processing) — all stripped of ``ip_address``/``user_agent`` so no personal content
    remains. The ``dsr_erasure`` event itself is logged WITHOUT the request IP.
    """
    now = datetime.now(UTC)

    consents_revoked = await revoke_all_consents(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
    )

    deleted = await delete_user_personal_data(
        db,
        ownership_scope_id=auth.ownership_scope_id,
    )
    txn_deleted = deleted["transactions"]

    group_periods_voided, group_memberships_removed = await _void_user_group_shares(
        db,
        user_id=auth.user_id,
        personal_scope_id=auth.ownership_scope_id,
    )

    await anonymize_user_profile(db, user_id=auth.user_id)
    # Strip residual PII from the rows erasure retains as proof (D89: PII-free).
    await scrub_user_audit_trail(
        db, ownership_scope_id=auth.ownership_scope_id, user_id=auth.user_id
    )

    event = await log_audit_event(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        event_type="dsr_erasure",
        # No ip_address: the dsr_erasure event must be PII-free (D89). The request IP
        # is GDPR personal data; the durable proof carries only the erasure facts.
        details=json.dumps(
            {
                "consents_revoked": consents_revoked,
                "records_deleted": deleted,
                "group_periods_voided": group_periods_voided,
                "group_memberships_removed": group_memberships_removed,
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
            "records_deleted": sum(deleted.values()),
            "group_periods_voided": group_periods_voided,
            "group_memberships_removed": group_memberships_removed,
        },
    )

    return ErasureResponse(
        consents_revoked=consents_revoked,
        transactions_deleted=txn_deleted,
        group_periods_voided=group_periods_voided,
        group_memberships_removed=group_memberships_removed,
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
