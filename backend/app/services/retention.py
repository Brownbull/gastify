"""Data-retention enforcement.

Deletes data that has aged past its declared retention window:

- **Scan jobs** are transient processing artifacts — once a scan reaches a
  terminal state the resulting Transaction persists independently, so the scan
  row + its receipt image can be purged after a retention window.
- **Audit events** are kept for a long compliance window (audit trail), then
  purged once past it.

Financial transactions are NEVER deleted by THIS retention job — but data-subject
erasure now HARD-DELETES them (D89, amends D4: transactions/items/images/flags +
statements, card aliases, scans, notifications, mappings, credit balances are
genuinely removed; only the PII-free `dsr_erasure` audit event is retained). This
job only removes transient + expired operational data. The scheduled invocation
lives in `scripts/ops/run_retention.py`.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import AuditEvent
from app.models.scan import Scan, ScanStatus

if TYPE_CHECKING:
    from sqlalchemy.engine import CursorResult

# Declared retention windows (the "TTL" the roadmap exit signal refers to).
#
# NOTE on the scan window vs the ProcessingRegister `receipt_scanning` policy
# ("duration of account + 7 years"): that 7-year period governs the FINANCIAL
# RECORD — the Transaction created from a scan, which persists independently while
# the account lives and is HARD-DELETED (not anonymized) under DSR erasure (D89). A
# `Scan` row is only the transient
# processing job + its receipt image; once terminal, keeping it past 90 days has
# no compliance value, so it is purged here. The 7-year retention lives with the
# Transaction, not the scan job. AUDIT_RETENTION is the operational audit-trail
# window (conservative for all four jurisdictions; no longer mandate exists for
# this event-log category).
SCAN_RETENTION = timedelta(days=90)
AUDIT_RETENTION = timedelta(days=365 * 6)  # ~6y compliance audit-trail window

# Scans safe to purge once aged: only terminal states (never in-flight/queued).
_TERMINAL_SCAN_STATUSES = (
    ScanStatus.COMPLETED,
    ScanStatus.FAILED,
    ScanStatus.NEEDS_REVIEW,
)


@dataclass(frozen=True)
class RetentionResult:
    scans_deleted: int
    scan_image_paths: tuple[str, ...]
    audit_events_deleted: int


async def count_expired(
    db: AsyncSession,
    *,
    now: datetime,
    scan_ttl: timedelta = SCAN_RETENTION,
    audit_ttl: timedelta = AUDIT_RETENTION,
) -> tuple[int, int]:
    """Count expired rows WITHOUT deleting (dry-run). Returns (scans, audit_events)."""
    scan_count = (
        await db.execute(
            select(func.count())
            .select_from(Scan)
            .where(
                Scan.status.in_(_TERMINAL_SCAN_STATUSES),
                Scan.processed_at.is_not(None),
                Scan.processed_at < now - scan_ttl,
            )
        )
    ).scalar_one()
    audit_count = (
        await db.execute(
            select(func.count())
            .select_from(AuditEvent)
            .where(AuditEvent.created_at < now - audit_ttl)
        )
    ).scalar_one()
    return scan_count, audit_count


async def purge_expired_scans(
    db: AsyncSession,
    *,
    now: datetime,
    scan_ttl: timedelta = SCAN_RETENTION,
) -> tuple[int, list[str]]:
    """Delete terminal scan rows older than the retention window. Returns the
    count + the image paths of deleted scans for the caller to clean up on disk.
    Does not commit."""
    cutoff = now - scan_ttl
    rows = (
        await db.execute(
            select(Scan.id, Scan.image_path).where(
                Scan.status.in_(_TERMINAL_SCAN_STATUSES),
                Scan.processed_at.is_not(None),
                Scan.processed_at < cutoff,
            )
        )
    ).all()
    ids = [row[0] for row in rows]
    paths = [row[1] for row in rows]
    if ids:
        await db.execute(delete(Scan).where(Scan.id.in_(ids)))
    return len(ids), paths


async def purge_expired_audit_events(
    db: AsyncSession,
    *,
    now: datetime,
    audit_ttl: timedelta = AUDIT_RETENTION,
) -> int:
    """Delete audit events older than the compliance retention window. Does not commit."""
    result = cast(
        "CursorResult[Any]",
        await db.execute(delete(AuditEvent).where(AuditEvent.created_at < now - audit_ttl)),
    )
    return result.rowcount or 0


async def apply_retention(db: AsyncSession, *, now: datetime) -> RetentionResult:
    """Run the full retention policy and commit. Returns counts + scan image paths
    (for best-effort on-disk cleanup by the caller)."""
    scans_deleted, paths = await purge_expired_scans(db, now=now)
    audit_deleted = await purge_expired_audit_events(db, now=now)
    await db.commit()
    return RetentionResult(
        scans_deleted=scans_deleted,
        scan_image_paths=tuple(paths),
        audit_events_deleted=audit_deleted,
    )
