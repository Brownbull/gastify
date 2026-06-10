"""End-to-end proof of the scheduled retention RUNNER (app.services.retention_runner).

The service layer (apply_retention) is unit-tested; this proves the actual in-image
entrypoint the Railway cron + GitHub Action invoke (_run(apply=True)) deletes the expired
rows AND unlinks the receipt-image file — observable DB + filesystem state, not the return.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.consent import AuditEvent
from app.models.scan import Scan, ScanStatus
from app.services import retention_runner
from tests.conftest import TEST_SCOPE_ID


def _load_runner():
    return retention_runner


@pytest.mark.asyncio
async def test_run_retention_apply_deletes_rows_and_unlinks_image(engine, tmp_path, monkeypatch):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    now = datetime.now(UTC)
    image = tmp_path / "old-receipt.jpg"
    image.write_bytes(b"jpegdata")

    async with factory() as db:
        db.add(
            Scan(
                id=uuid.uuid4(),
                ownership_scope_id=TEST_SCOPE_ID,
                status=ScanStatus.COMPLETED,
                image_path=str(image),
                original_filename="r.jpg",
                content_type="image/jpeg",
                file_size_bytes=8,
                submitted_at=now - timedelta(days=200),
                processed_at=now - timedelta(days=200),
            )
        )
        db.add(
            AuditEvent(
                id=uuid.uuid4(),
                ownership_scope_id=TEST_SCOPE_ID,
                user_id=None,
                event_type="consent_granted",
                created_at=now - timedelta(days=365 * 7),
            )
        )
        await db.commit()

    # The runner opens its OWN session via app.db.async_session — point it at the test DB.
    monkeypatch.setattr("app.db.async_session", factory)
    runner = _load_runner()
    rc = await runner._run(apply=True)
    assert rc == 0

    # Observable state: the expired rows are GONE and the image is unlinked off disk.
    async with factory() as db:
        scans = (await db.execute(sa.select(sa.func.count()).select_from(Scan))).scalar_one()
        audit = (await db.execute(sa.select(sa.func.count()).select_from(AuditEvent))).scalar_one()
    assert scans == 0
    assert audit == 0
    assert not image.exists()


@pytest.mark.asyncio
async def test_run_retention_dry_run_deletes_nothing(engine, tmp_path, monkeypatch):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    now = datetime.now(UTC)
    async with factory() as db:
        db.add(
            AuditEvent(
                id=uuid.uuid4(),
                ownership_scope_id=TEST_SCOPE_ID,
                user_id=None,
                event_type="consent_granted",
                created_at=now - timedelta(days=365 * 7),
            )
        )
        await db.commit()

    monkeypatch.setattr("app.db.async_session", factory)
    runner = _load_runner()
    rc = await runner._run(apply=False)
    assert rc == 0

    async with factory() as db:
        audit = (await db.execute(sa.select(sa.func.count()).select_from(AuditEvent))).scalar_one()
    assert audit == 1  # dry run: nothing deleted
