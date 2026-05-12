"""Tests for scan event dispatcher — pub/sub, backpressure, cleanup."""

import uuid

import pytest

from app.schemas.scan import ScanEvent
from app.services.scan_events import ScanEventDispatcher, _Subscription


def _event(scan_id: uuid.UUID, event_type: str = "scan_started", pct: int = 0) -> ScanEvent:
    return ScanEvent(
        event_type=event_type,
        scan_id=scan_id,
        step="test",
        progress_pct=pct,
    )


class TestSubscription:
    def test_put_nowait_normal(self) -> None:
        scan_id = uuid.uuid4()
        sub = _Subscription(scan_id, buffer_size=4)
        e = _event(scan_id)
        sub.put_nowait(e)
        assert sub.queue.qsize() == 1

    def test_put_nowait_drop_oldest_on_overflow(self) -> None:
        scan_id = uuid.uuid4()
        sub = _Subscription(scan_id, buffer_size=2)
        e1 = _event(scan_id, pct=10)
        e2 = _event(scan_id, pct=20)
        e3 = _event(scan_id, pct=30)
        sub.put_nowait(e1)
        sub.put_nowait(e2)
        sub.put_nowait(e3)
        assert sub.queue.qsize() == 2
        got = sub.queue.get_nowait()
        assert got.progress_pct == 20

    def test_close_sends_sentinel(self) -> None:
        scan_id = uuid.uuid4()
        sub = _Subscription(scan_id, buffer_size=4)
        sub.close()
        assert sub.queue.get_nowait() is None

    def test_close_on_full_queue_replaces_oldest(self) -> None:
        scan_id = uuid.uuid4()
        sub = _Subscription(scan_id, buffer_size=1)
        sub.put_nowait(_event(scan_id))
        sub.close()
        assert sub.queue.get_nowait() is None

    @pytest.mark.asyncio
    async def test_async_iteration_yields_events(self) -> None:
        scan_id = uuid.uuid4()
        sub = _Subscription(scan_id, buffer_size=8)
        sub.put_nowait(_event(scan_id, pct=10))
        sub.put_nowait(_event(scan_id, pct=40))
        sub.close()

        events = [e async for e in sub]
        assert len(events) == 2
        assert events[0].progress_pct == 10
        assert events[1].progress_pct == 40


class TestScanEventDispatcher:
    def test_subscribe_and_emit(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        sub = d.subscribe(scan_id)
        count = d.emit(_event(scan_id, pct=50))
        assert count == 1
        got = sub.queue.get_nowait()
        assert got.progress_pct == 50

    def test_emit_to_multiple_subscribers(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        sub1 = d.subscribe(scan_id)
        sub2 = d.subscribe(scan_id)
        count = d.emit(_event(scan_id))
        assert count == 2
        assert sub1.queue.qsize() == 1
        assert sub2.queue.qsize() == 1

    def test_emit_to_nonexistent_scan_returns_zero(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        count = d.emit(_event(uuid.uuid4()))
        assert count == 0

    def test_unsubscribe_removes_subscriber(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        sub = d.subscribe(scan_id)
        d.unsubscribe(sub)
        assert d.subscriber_count(scan_id) == 0

    def test_unsubscribe_idempotent(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        sub = d.subscribe(scan_id)
        d.unsubscribe(sub)
        d.unsubscribe(sub)
        assert d.subscriber_count(scan_id) == 0

    def test_close_scan_signals_all_subscribers(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        sub1 = d.subscribe(scan_id)
        sub2 = d.subscribe(scan_id)
        d.close_scan(scan_id)
        assert sub1.queue.get_nowait() is None
        assert sub2.queue.get_nowait() is None
        assert d.subscriber_count(scan_id) == 0

    def test_active_scans_count(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        id1 = uuid.uuid4()
        id2 = uuid.uuid4()
        d.subscribe(id1)
        d.subscribe(id2)
        assert d.active_scans == 2
        d.close_scan(id1)
        assert d.active_scans == 1

    def test_backpressure_drops_oldest_across_emit(self) -> None:
        d = ScanEventDispatcher(buffer_size=2)
        scan_id = uuid.uuid4()
        sub = d.subscribe(scan_id)
        d.emit(_event(scan_id, pct=10))
        d.emit(_event(scan_id, pct=20))
        d.emit(_event(scan_id, pct=30))
        assert sub.queue.qsize() == 2
        got = sub.queue.get_nowait()
        assert got.progress_pct == 20

    @pytest.mark.asyncio
    async def test_full_lifecycle_async(self) -> None:
        d = ScanEventDispatcher(buffer_size=32)
        scan_id = uuid.uuid4()
        sub = d.subscribe(scan_id)

        d.emit(_event(scan_id, "scan_started", 0))
        d.emit(_event(scan_id, "extraction_complete", 40))
        d.emit(_event(scan_id, "scan_complete", 100))
        d.close_scan(scan_id)

        events = [e async for e in sub]
        assert len(events) == 3
        assert [e.event_type for e in events] == [
            "scan_started",
            "extraction_complete",
            "scan_complete",
        ]
        assert [e.progress_pct for e in events] == [0, 40, 100]


class TestTerminalSnapshot:
    def test_store_terminal_scan_complete(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        terminal = _event(scan_id, "scan_complete", 100)
        d.store_terminal(terminal)
        assert d._terminal[scan_id] is terminal

    def test_store_terminal_scan_failed(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        terminal = _event(scan_id, "scan_failed", 0)
        d.store_terminal(terminal)
        assert d._terminal[scan_id] is terminal

    def test_store_terminal_ignores_non_terminal(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        d.store_terminal(_event(scan_id, "scan_started", 0))
        assert scan_id not in d._terminal

    @pytest.mark.asyncio
    async def test_late_subscribe_after_complete(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()

        sub_live = d.subscribe(scan_id)
        d.emit(_event(scan_id, "scan_complete", 100))
        d.store_terminal(_event(scan_id, "scan_complete", 100))
        d.close_scan(scan_id)

        _ = [e async for e in sub_live]

        sub_late = d.subscribe(scan_id)
        events = [e async for e in sub_late]
        assert len(events) == 1
        assert events[0].event_type == "scan_complete"
        assert events[0].progress_pct == 100

    @pytest.mark.asyncio
    async def test_late_subscribe_after_failed(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()

        d.store_terminal(_event(scan_id, "scan_failed", 0))
        d.close_scan(scan_id)

        sub = d.subscribe(scan_id)
        events = [e async for e in sub]
        assert len(events) == 1
        assert events[0].event_type == "scan_failed"

    def test_late_subscribe_not_added_to_active_subs(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        d.store_terminal(_event(scan_id, "scan_complete", 100))

        d.subscribe(scan_id)
        assert d.subscriber_count(scan_id) == 0

    def test_clear_terminal(self) -> None:
        d = ScanEventDispatcher(buffer_size=8)
        scan_id = uuid.uuid4()
        d.store_terminal(_event(scan_id, "scan_complete", 100))
        d.clear_terminal(scan_id)
        assert scan_id not in d._terminal

    def test_terminal_eviction_at_max(self) -> None:
        from app.services.scan_events import _MAX_TERMINAL_SNAPSHOTS

        d = ScanEventDispatcher(buffer_size=8)
        ids = [uuid.uuid4() for _ in range(_MAX_TERMINAL_SNAPSHOTS)]
        for sid in ids:
            d.store_terminal(_event(sid, "scan_complete", 100))

        new_id = uuid.uuid4()
        d.store_terminal(_event(new_id, "scan_complete", 100))
        assert new_id in d._terminal
        assert ids[0] not in d._terminal
        assert len(d._terminal) == _MAX_TERMINAL_SNAPSHOTS
