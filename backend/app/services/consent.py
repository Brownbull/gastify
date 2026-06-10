"""Consent + audit service — business logic for consent management."""

import json
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import AuditEvent, ConsentRecord, ProcessingRegister
from app.observability import metrics
from app.services.consent_propagation import (
    AI_TRAINING_CONSENT_PURPOSE,
    COHORT_CONSENT_PURPOSE,
    PROPAGATING_PURPOSES,
)

if TYPE_CHECKING:
    from sqlalchemy.engine import CursorResult

# Names the downstream surface each propagating purpose governs, so the audit
# trail labels an ai_training change as the AI pipeline (not the cohort).
_PROPAGATION_SURFACE = {
    COHORT_CONSENT_PURPOSE: "cohort_benchmarking",
    AI_TRAINING_CONSENT_PURPOSE: "ai_training_pipeline",
}


async def _log_consent_propagation(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID,
    purpose: str,
    granted: bool,
) -> None:
    """Record the downstream effect of a consent change for propagating purposes
    (cohort data-sharing, AI-training). Eligibility itself is derived live in
    `consent_propagation`; this leaves an audit trail of the propagation."""
    if purpose not in PROPAGATING_PURPOSES:
        return
    await log_audit_event(
        db,
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        event_type="consent_propagation",
        resource_type="consent_record",
        details=json.dumps(
            {
                "purpose": purpose,
                "granted": granted,
                "downstream_effect": {
                    "surface": _PROPAGATION_SURFACE.get(purpose, purpose),
                    "state": "included" if granted else "excluded",
                },
            }
        ),
    )


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
        existing.withdrawn_at = None
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

    await _log_consent_propagation(
        db,
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        purpose=purpose,
        granted=True,
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
    # User-initiated withdrawal (distinct from system revocation on erasure).
    record.withdrawn_at = now
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

    await _log_consent_propagation(
        db,
        ownership_scope_id=ownership_scope_id,
        user_id=user_id,
        purpose=purpose,
        granted=False,
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
    # Observability (REQ-21): count every compliance event by type so DSR /
    # consent activity is queryable on /metrics, not only in the audit table.
    metrics.inc(f"audit_event_{event_type}")
    return event


async def revoke_all_consents(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    """Revoke all granted consents for a user — SYSTEM-INITIATED only (DSR erasure).

    Sets `revoked_at` but intentionally leaves `withdrawn_at` null: per the model
    contract, `withdrawn_at` marks a *user*-initiated withdrawal (GDPR Art 7(3)).
    A future user-facing "revoke all" action must NOT reuse this function as-is —
    it should set `withdrawn_at` (e.g. via a `caller_initiated` flag).
    """
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
        await _log_consent_propagation(
            db,
            ownership_scope_id=ownership_scope_id,
            user_id=user_id,
            purpose=record.purpose,
            granted=False,
        )

    return len(records)


async def delete_user_personal_data(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
) -> dict[str, int]:
    """Hard-delete ALL of the user's own personal-scope data (D89, amends D4).

    Account deletion is TOTAL (D82): every table the user owns under their PERSONAL
    scope is genuinely removed — not just transactions. The surviving rows are
    deliberate: the ``users`` shell (scrubbed in ``anonymize_user_profile``), the
    PII-free ``audit_events`` (D4 proof of processing — PII scrubbed in
    ``scrub_user_audit_trail``), the user's ``consent_records`` (revoked + retained as
    proof, PII scrubbed), and the empty personal ``ownership_scopes`` shell. Group
    copies the user shared into OTHER scopes are NOT touched here — D82's group void
    (tombstone + de-member) handles those.

    ``ownership_scope_id`` is the caller's PERSONAL scope: ``auth.ownership_scope_id``
    is never a swapped group scope (the D69/D70 read swap goes through
    ``resolve_analytics_scope`` and does not rebind base auth), so every row deleted
    here is the erasing user's own.

    Returns per-table delete counts (for the audit event + erasure response). Deletes
    children before parents in explicit FK order — robust on SQLite (where ON DELETE
    CASCADE needs PRAGMA foreign_keys=ON) and correct on Postgres.
    """
    from app.models.credit import CreditBalance
    from app.models.mapping import CategoryMapping, MerchantMapping
    from app.models.notification import Notification
    from app.models.scan import Scan
    from app.models.statement import (
        CardAlias,
        Statement,
        StatementLine,
        StatementReconciliationRun,
        StatementReconciliationVerdict,
    )
    from app.models.transaction import (
        Transaction,
        TransactionImage,
        TransactionItem,
        TransactionItemFlag,
    )

    scope = ownership_scope_id
    scope_txn_ids = select(Transaction.id).where(Transaction.ownership_scope_id == scope)
    scope_statement_ids = select(Statement.id).where(Statement.ownership_scope_id == scope)
    scope_run_ids = select(StatementReconciliationRun.id).where(
        StatementReconciliationRun.ownership_scope_id == scope
    )

    async def _del(stmt: Any) -> int:
        result = cast("CursorResult[Any]", await db.execute(stmt))
        return result.rowcount or 0

    counts: dict[str, int] = {}
    # Statement subtree (verdicts -> runs/lines -> statements -> card aliases).
    counts["statement_recon_verdicts"] = await _del(
        delete(StatementReconciliationVerdict).where(
            StatementReconciliationVerdict.run_id.in_(scope_run_ids)
        )
    )
    counts["statement_recon_runs"] = await _del(
        delete(StatementReconciliationRun).where(
            StatementReconciliationRun.ownership_scope_id == scope
        )
    )
    counts["statement_lines"] = await _del(
        delete(StatementLine).where(StatementLine.statement_id.in_(scope_statement_ids))
    )
    counts["statements"] = await _del(
        delete(Statement).where(Statement.ownership_scope_id == scope)
    )
    counts["card_aliases"] = await _del(
        delete(CardAlias).where(CardAlias.ownership_scope_id == scope)
    )
    # Independent scoped tables (scans' transaction_id is SET NULL, so order-free).
    counts["scans"] = await _del(delete(Scan).where(Scan.ownership_scope_id == scope))
    counts["notifications"] = await _del(
        delete(Notification).where(Notification.ownership_scope_id == scope)
    )
    counts["merchant_mappings"] = await _del(
        delete(MerchantMapping).where(MerchantMapping.ownership_scope_id == scope)
    )
    counts["category_mappings"] = await _del(
        delete(CategoryMapping).where(CategoryMapping.ownership_scope_id == scope)
    )
    counts["credit_balances"] = await _del(
        delete(CreditBalance).where(CreditBalance.ownership_scope_id == scope)
    )
    # Transaction subtree (flags -> items/images -> transactions). In a personal
    # scope every flag is the erasing user's own.
    counts["transaction_item_flags"] = await _del(
        delete(TransactionItemFlag).where(TransactionItemFlag.ownership_scope_id == scope)
    )
    counts["transaction_items"] = await _del(
        delete(TransactionItem).where(TransactionItem.transaction_id.in_(scope_txn_ids))
    )
    counts["transaction_images"] = await _del(
        delete(TransactionImage).where(TransactionImage.transaction_id.in_(scope_txn_ids))
    )
    counts["transactions"] = await _del(
        delete(Transaction).where(Transaction.ownership_scope_id == scope)
    )
    return counts


async def scrub_user_audit_trail(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Strip residual PII from the rows erasure deliberately RETAINS (D89: PII-free).

    ``audit_events`` (kept as D4 proof of processing) and the user's
    ``consent_records`` (revoked but retained as consent proof) carry ``ip_address``
    and ``user_agent`` — both personal data under GDPR. Null them so the surviving
    proof rows hold no personal content, only the event/consent facts.
    """
    from app.models.consent import AuditEvent, ConsentRecord

    await db.execute(
        update(AuditEvent)
        .where(AuditEvent.ownership_scope_id == ownership_scope_id)
        .values(ip_address=None)
    )
    await db.execute(
        update(ConsentRecord)
        .where(ConsentRecord.user_id == user_id)
        .values(ip_address=None, user_agent=None)
    )


async def anonymize_user_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> None:
    from app.models.user import User

    await db.execute(
        update(User).where(User.id == user_id).values(email=None, display_name="[REDACTED]")
    )
