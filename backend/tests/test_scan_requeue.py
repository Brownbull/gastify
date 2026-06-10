"""Throttle-recovery requeue sweep (P16 Phase 3, exit signal c).

Parking a throttled scan in QUEUED (graceful, no 5xx) only helps if something later
reprocesses it. These assert the OBSERVABLE recovery: the sweep atomically flips
throttled QUEUED scans → SUBMITTED and re-dispatches each through process_scan.
"""

import asyncio
import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.scan import Scan, ScanStatus
from app.services import scan_worker
from tests.conftest import TEST_SCOPE_ID


async def _seed_scan(factory, *, status: ScanStatus) -> uuid.UUID:
    sid = uuid.uuid4()
    throttled = status == ScanStatus.QUEUED
    async with factory() as db:
        db.add(
            Scan(
                id=sid,
                ownership_scope_id=TEST_SCOPE_ID,
                status=status,
                image_path=f"/tmp/{sid}.jpg",
                original_filename="r.jpg",
                content_type="image/jpeg",
                file_size_bytes=10,
                submitted_at=datetime.now(UTC),
                error_code="QUOTA_EXCEEDED" if throttled else None,
                error_message="throttled" if throttled else None,
            )
        )
        await db.commit()
    return sid


@pytest.mark.asyncio
async def test_requeue_atomically_flips_queued_to_submitted(engine, monkeypatch):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(scan_worker, "async_session", factory)
    queued = [await _seed_scan(factory, status=ScanStatus.QUEUED) for _ in range(3)]
    other = await _seed_scan(factory, status=ScanStatus.PROCESSING)  # must NOT be touched

    claimed = await scan_worker.requeue_quota_throttled_scans()

    assert sorted(claimed) == sorted(queued)
    async with factory() as db:
        rows = {r.id: r for r in (await db.execute(select(Scan))).scalars()}
    for sid in queued:
        assert rows[sid].status == ScanStatus.SUBMITTED
        assert rows[sid].error_code is None and rows[sid].error_message is None
    assert rows[other].status == ScanStatus.PROCESSING  # only QUEUED scans are claimed


@pytest.mark.asyncio
async def test_run_requeue_sweep_redispatches_each_claimed_scan(engine, monkeypatch):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(scan_worker, "async_session", factory)
    queued = [await _seed_scan(factory, status=ScanStatus.QUEUED) for _ in range(2)]

    dispatched: list[uuid.UUID] = []

    async def _fake_process(scan_id, **_kw):
        dispatched.append(scan_id)
        return True

    monkeypatch.setattr(scan_worker, "process_scan", _fake_process)

    n = await scan_worker.run_requeue_sweep()
    await asyncio.sleep(0.05)  # let the create_task'd re-dispatches run

    assert n == 2
    assert sorted(dispatched) == sorted(queued)  # every claimed scan was reprocessed


@pytest.mark.asyncio
async def test_run_requeue_sweep_is_a_noop_with_no_queued_scans(engine, monkeypatch):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(scan_worker, "async_session", factory)
    await _seed_scan(factory, status=ScanStatus.COMPLETED)
    assert await scan_worker.run_requeue_sweep() == 0


# --- Forced-throttle hook + queue-depth observability (P16 Phase 3, Chunk 2) ---

from unittest.mock import AsyncMock, patch  # noqa: E402

from app.services.scan_providers import mock_case_for_scan  # noqa: E402


def test_mock_case_for_scan_recognizes_throttle_token():
    """The forced-throttle hook: a `throttle` filename selects the throttle case
    (mock/fixture providers only — never the prod Gemini path)."""
    assert mock_case_for_scan("gastify-test-case-throttle.jpg").outcome == "throttle"
    assert mock_case_for_scan("receipt.jpg").outcome != "throttle"


@pytest.mark.asyncio
async def test_throttle_fixture_scan_degrades_to_queued_not_failed():
    """The throttle hook routes through the REAL degradation path → QUEUED + scan_queued
    event, not a terminal failure."""
    sid = uuid.uuid4()
    with (
        patch("app.services.scan_worker._queue_scan", new_callable=AsyncMock) as queue,
        patch("app.services.scan_worker._fail_scan", new_callable=AsyncMock) as fail,
        patch("app.services.scan_worker._emit", new_callable=AsyncMock) as emit,
        patch("app.services.scan_worker.dispatcher"),
    ):
        result = await scan_worker._throttle_fixture_scan(sid)
    assert result is False
    queue.assert_awaited_once()
    fail.assert_not_awaited()
    assert queue.await_args.args[1] == "QUOTA_EXCEEDED"
    assert any(c.args[1] == "scan_queued" for c in emit.call_args_list)


def test_metric_help_includes_queued_signals():
    from app.observability import METRIC_HELP

    assert "scans_queued" in METRIC_HELP
    assert "scans_queued_depth" in METRIC_HELP


@pytest.mark.asyncio
async def test_metrics_queue_depth_gauge_reflects_queued_rows(engine, monkeypatch):
    """/metrics scans_queued_depth gauge is set from the live QUEUED-scan count (D90
    observable-state evidence)."""
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr("app.api.metrics.async_session", factory)
    for _ in range(2):
        await _seed_scan(factory, status=ScanStatus.QUEUED)
    await _seed_scan(factory, status=ScanStatus.COMPLETED)

    from app.api.metrics import _refresh_queue_depth_gauge
    from app.observability import metrics

    await _refresh_queue_depth_gauge()
    assert metrics.snapshot()["gauges"]["scans_queued_depth"] == 2
