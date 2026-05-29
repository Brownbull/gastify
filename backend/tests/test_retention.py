"""Tests for data-retention enforcement (scan jobs + audit events)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.consent import AuditEvent
from app.models.scan import Scan, ScanStatus
from app.services.retention import (
    apply_retention,
    count_expired,
    purge_expired_audit_events,
    purge_expired_scans,
)

TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
NOW = datetime(2026, 6, 1, tzinfo=UTC)


def _factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_scan(db, *, status, processed_at, image_path):
    scan = Scan(
        id=uuid.uuid4(),
        ownership_scope_id=TEST_SCOPE_ID,
        status=status,
        image_path=image_path,
        original_filename="r.jpg",
        content_type="image/jpeg",
        file_size_bytes=1024,
        submitted_at=processed_at or NOW,
        processed_at=processed_at,
    )
    db.add(scan)
    return scan.id


async def _seed_audit(db, *, created_at):
    event = AuditEvent(
        id=uuid.uuid4(),
        ownership_scope_id=TEST_SCOPE_ID,
        user_id=None,
        event_type="dsr_access",
        created_at=created_at,
    )
    db.add(event)
    return event.id


@pytest.mark.asyncio
async def test_purge_expired_scans_only_old_terminal(engine):
    factory = _factory(engine)
    async with factory() as db:
        old = await _seed_scan(
            db,
            status=ScanStatus.COMPLETED,
            processed_at=NOW - timedelta(days=120),
            image_path="/tmp/old.jpg",
        )
        old_review = await _seed_scan(
            db,
            status=ScanStatus.NEEDS_REVIEW,
            processed_at=NOW - timedelta(days=200),
            image_path="/tmp/old-review.jpg",
        )
        recent = await _seed_scan(
            db,
            status=ScanStatus.FAILED,
            processed_at=NOW - timedelta(days=10),
            image_path="/tmp/recent.jpg",
        )
        # non-terminal scans must NEVER be purged, however old
        queued = await _seed_scan(
            db,
            status=ScanStatus.QUEUED,
            processed_at=None,
            image_path="/tmp/queued.jpg",
        )
        submitted = await _seed_scan(
            db,
            status=ScanStatus.SUBMITTED,
            processed_at=None,
            image_path="/tmp/submitted.jpg",
        )
        processing = await _seed_scan(
            db,
            status=ScanStatus.PROCESSING,
            processed_at=NOW - timedelta(days=300),
            image_path="/tmp/processing.jpg",
        )
        await db.commit()

        count, paths = await purge_expired_scans(db, now=NOW)
        await db.commit()

    # both old terminal scans (COMPLETED + NEEDS_REVIEW) purged; nothing else
    assert count == 2
    assert set(paths) == {"/tmp/old.jpg", "/tmp/old-review.jpg"}
    ids = [old, old_review, recent, queued, submitted, processing]
    async with factory() as db:
        remaining = (await db.execute(sa.select(Scan.id).where(Scan.id.in_(ids)))).scalars().all()
    assert set(remaining) == {recent, queued, submitted, processing}


@pytest.mark.asyncio
async def test_purge_expired_audit_events(engine):
    factory = _factory(engine)
    async with factory() as db:
        old = await _seed_audit(db, created_at=NOW - timedelta(days=365 * 6 + 30))
        recent = await _seed_audit(db, created_at=NOW - timedelta(days=30))
        await db.commit()

        deleted = await purge_expired_audit_events(db, now=NOW)
        await db.commit()

    assert deleted == 1
    async with factory() as db:
        remaining = (
            (await db.execute(sa.select(AuditEvent.id).where(AuditEvent.id.in_([old, recent]))))
            .scalars()
            .all()
        )
    assert remaining == [recent]


@pytest.mark.asyncio
async def test_count_expired_is_nondestructive(engine):
    factory = _factory(engine)
    async with factory() as db:
        await _seed_scan(
            db,
            status=ScanStatus.COMPLETED,
            processed_at=NOW - timedelta(days=200),
            image_path="/tmp/x.jpg",
        )
        await _seed_audit(db, created_at=NOW - timedelta(days=365 * 7))
        await db.commit()

        scans, audit = await count_expired(db, now=NOW)
        assert scans == 1
        assert audit == 1

        # nothing deleted
        still_scans = (await db.execute(sa.select(sa.func.count()).select_from(Scan))).scalar_one()
        still_audit = (
            await db.execute(sa.select(sa.func.count()).select_from(AuditEvent))
        ).scalar_one()
    assert still_scans == 1
    assert still_audit == 1


@pytest.mark.asyncio
async def test_apply_retention_commits_combined(engine):
    factory = _factory(engine)
    async with factory() as db:
        await _seed_scan(
            db,
            status=ScanStatus.COMPLETED,
            processed_at=NOW - timedelta(days=120),
            image_path="/tmp/a.jpg",
        )
        await _seed_audit(db, created_at=NOW - timedelta(days=365 * 6 + 1))
        await db.commit()

        result = await apply_retention(db, now=NOW)

    assert result.scans_deleted == 1
    assert result.audit_events_deleted == 1
    assert result.scan_image_paths == ("/tmp/a.jpg",)
    # committed: a fresh session sees the deletions
    async with factory() as db:
        scans = (await db.execute(sa.select(sa.func.count()).select_from(Scan))).scalar_one()
        audit = (await db.execute(sa.select(sa.func.count()).select_from(AuditEvent))).scalar_one()
    assert scans == 0
    assert audit == 0
