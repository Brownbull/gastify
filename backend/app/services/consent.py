"""Consent + audit service — business logic for consent management."""

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import AuditEvent, ConsentRecord, ProcessingRegister


async def get_processing_purpose(db: AsyncSession, purpose: str) -> ProcessingRegister | None:
    result = await db.execute(
        select(ProcessingRegister).where(
            ProcessingRegister.purpose == purpose,
            ProcessingRegister.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def grant_consent(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID,
    purpose: str,
    jurisdiction: str,
    legal_basis: str,
    consent_version: str = "1.0",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ConsentRecord:
    now = datetime.now(UTC)

    result = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.purpose == purpose,
        )
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        existing.status = "granted"
        existing.legal_basis = legal_basis
        existing.jurisdiction = jurisdiction
        existing.granted_at = now
        existing.revoked_at = None
        existing.consent_version = consent_version
        existing.ip_address = ip_address
        existing.user_agent = user_agent
        existing.updated_at = now
        await db.flush()
        record = existing
    else:
        record = ConsentRecord(
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            purpose=purpose,
            status="granted",
            legal_basis=legal_basis,
            jurisdiction=jurisdiction,
            granted_at=now,
            consent_version=consent_version,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(record)
        await db.flush()

    await log_audit_event(
        db,
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        event_type="consent_granted",
        resource_type="consent_record",
        resource_id=record.id,
        details=json.dumps(
            {
                "purpose": purpose,
                "jurisdiction": jurisdiction,
                "legal_basis": legal_basis,
                "consent_version": consent_version,
            }
        ),
        ip_address=ip_address,
    )

    return record


async def revoke_consent(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID,
    purpose: str,
    ip_address: str | None = None,
) -> ConsentRecord | None:
    now = datetime.now(UTC)

    result = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.purpose == purpose,
            ConsentRecord.ownership_scope_id == ownership_scope_id,
        )
    )
    record = result.scalar_one_or_none()

    if record is None or record.status == "revoked":
        return None

    record.status = "revoked"
    record.revoked_at = now
    record.updated_at = now

    await log_audit_event(
        db,
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        event_type="consent_revoked",
        resource_type="consent_record",
        resource_id=record.id,
        details=json.dumps({"purpose": purpose}),
        ip_address=ip_address,
    )

    return record


async def list_consents(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    ownership_scope_id: uuid.UUID,
) -> list[ConsentRecord]:
    result = await db.execute(
        select(ConsentRecord)
        .where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.ownership_scope_id == ownership_scope_id,
        )
        .order_by(ConsentRecord.purpose)
    )
    return list(result.scalars().all())


async def list_audit_events(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    limit: int = 100,
) -> list[AuditEvent]:
    result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.ownership_scope_id == ownership_scope_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def log_audit_event(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID | None,
    event_type: str,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    details: str | None = None,
    ip_address: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        event_type=event_type,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(event)
    await db.flush()
    return event


async def revoke_all_consents(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    result = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.ownership_scope_id == ownership_scope_id,
            ConsentRecord.status == "granted",
        )
    )
    records = list(result.scalars().all())

    now = datetime.now(UTC)
    for record in records:
        record.status = "revoked"
        record.revoked_at = now

    return len(records)


async def anonymize_user_transactions(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
) -> int:
    from app.models.transaction import Transaction, TransactionImage, TransactionItem

    stmt = (
        update(Transaction)
        .where(Transaction.ownership_scope_id == ownership_scope_id)
        .values(
            merchant="[REDACTED]",
            alias=None,
            thumbnail_url=None,
            city=None,
            country=None,
        )
    )
    result = await db.execute(stmt)
    txn_count = result.rowcount

    scope_txn_ids = select(Transaction.id).where(
        Transaction.ownership_scope_id == ownership_scope_id
    )

    await db.execute(
        update(TransactionItem)
        .where(TransactionItem.transaction_id.in_(scope_txn_ids))
        .values(name="[REDACTED]", subcategory=None)
    )

    await db.execute(
        update(TransactionImage)
        .where(TransactionImage.transaction_id.in_(scope_txn_ids))
        .values(image_url="[REDACTED]")
    )

    return txn_count


async def anonymize_user_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> None:
    from app.models.user import User

    await db.execute(
        update(User).where(User.id == user_id).values(email=None, display_name="[REDACTED]")
    )
