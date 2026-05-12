"""In-memory scan event dispatcher — pub/sub with per-scan subscriber queues.

Each active SSE/WebSocket connection subscribes to a scan_id. The pipeline
emits ScanEvent instances via `emit()`, which fans out to all subscribers.
Backpressure: each subscriber queue holds at most `buffer_size` events
(drop-oldest on overflow). Heartbeat events are emitted separately by the
transport layer, not by the dispatcher.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections import defaultdict
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    import uuid

    from app.schemas.scan import ScanEvent

logger = structlog.get_logger()


class _Subscription:
    __slots__ = ("queue", "scan_id", "buffer_size")

    def __init__(self, scan_id: uuid.UUID, buffer_size: int) -> None:
        self.scan_id = scan_id
        self.buffer_size = buffer_size
        self.queue: asyncio.Queue[ScanEvent | None] = asyncio.Queue(maxsize=buffer_size)

    def put_nowait(self, event: ScanEvent) -> None:
        if self.queue.full():
            with contextlib.suppress(asyncio.QueueEmpty):
                self.queue.get_nowait()
        self.queue.put_nowait(event)

    def close(self) -> None:
        try:
            self.queue.put_nowait(None)
        except asyncio.QueueFull:
            with contextlib.suppress(asyncio.QueueEmpty):
                self.queue.get_nowait()
            self.queue.put_nowait(None)

    async def __aiter__(self):
        while True:
            event = await self.queue.get()
            if event is None:
                break
            yield event


class ScanEventDispatcher:
    """Module-level singleton. Thread-safe via asyncio event loop serialization."""

    def __init__(self, buffer_size: int = 32) -> None:
        self._subs: dict[uuid.UUID, list[_Subscription]] = defaultdict(list)
        self._buffer_size = buffer_size

    def subscribe(self, scan_id: uuid.UUID) -> _Subscription:
        sub = _Subscription(scan_id, self._buffer_size)
        self._subs[scan_id].append(sub)
        sub_count = len(self._subs[scan_id])
        logger.debug("scan_event_subscribed", scan_id=str(scan_id), subscribers=sub_count)
        return sub

    def unsubscribe(self, sub: _Subscription) -> None:
        subs = self._subs.get(sub.scan_id)
        if subs is not None:
            with contextlib.suppress(ValueError):
                subs.remove(sub)
            if not subs:
                del self._subs[sub.scan_id]
        logger.debug("scan_event_unsubscribed", scan_id=str(sub.scan_id))

    def emit(self, event: ScanEvent) -> int:
        """Fan out event to all subscribers for this scan. Returns subscriber count."""
        subs = self._subs.get(event.scan_id, [])
        for sub in subs:
            sub.put_nowait(event)
        return len(subs)

    def close_scan(self, scan_id: uuid.UUID) -> None:
        """Signal all subscribers that the scan stream is done."""
        subs = self._subs.pop(scan_id, [])
        for sub in subs:
            sub.close()

    @property
    def active_scans(self) -> int:
        return len(self._subs)

    def subscriber_count(self, scan_id: uuid.UUID) -> int:
        return len(self._subs.get(scan_id, []))


def _default_buffer_size() -> int:
    try:
        from app.config import settings
        return settings.scan_event_buffer_size
    except Exception:
        return 32


dispatcher = ScanEventDispatcher(buffer_size=_default_buffer_size())
