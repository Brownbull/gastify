"""End-to-end proof of the scheduled retention RUNNER (scripts/ops/run_retention.py).

The service layer (apply_retention) is unit-tested; this proves the actual entrypoint
the GitHub Actions schedule invokes (_run(apply=True)) deletes the expired rows AND
unlinks the receipt-image file — observable DB + filesystem state, not the print/return.
"""

from __future__ import annotations

import importlib.util
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.consent import AuditEvent
from app.models.scan import Scan, ScanStatus
from tests.conftest import TEST_SCOPE_ID

_RUNNER_PATH = Path(__file__).resolve().parents[2] / "scripts" / "ops" / "run_retention.py"


def _load_runner():
    spec = importlib.util.spec_from_file_location("run_retention_under_test", _RUNNER_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


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
