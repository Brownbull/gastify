"""In-memory statement event dispatcher for P5 statement extraction."""

from __future__ import annotations

import asyncio
import contextlib
from collections import defaultdict
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    import uuid
    from collections.abc import AsyncIterator

    from app.schemas.statement import StatementEvent

logger = structlog.get_logger()


class _StatementSubscription:
    __slots__ = ("buffer_size", "queue", "statement_id")

    def __init__(self, statement_id: uuid.UUID, buffer_size: int) -> None:
        self.statement_id = statement_id
        self.buffer_size = buffer_size
        self.queue: asyncio.Queue[StatementEvent | None] = asyncio.Queue(maxsize=buffer_size)

    def put_nowait(self, event: StatementEvent) -> None:
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

    async def __aiter__(self) -> AsyncIterator[StatementEvent]:
        while True:
            event = await self.queue.get()
            if event is None:
                break
            yield event


_TERMINAL_EVENT_TYPES = frozenset(
    {
        "statement_completed",
        "statement_failed",
        "statement_password_required",
        "statement_password_invalid",
    }
)
_MAX_TERMINAL_SNAPSHOTS = 1024


class StatementEventDispatcher:
    def __init__(self, buffer_size: int = 32) -> None:
        self._subs: dict[uuid.UUID, list[_StatementSubscription]] = defaultdict(list)
        self._buffer_size = buffer_size
        self._terminal: dict[uuid.UUID, StatementEvent] = {}

    def subscribe(self, statement_id: uuid.UUID) -> _StatementSubscription:
        sub = _StatementSubscription(statement_id, self._buffer_size)
        terminal = self._terminal.get(statement_id)
        if terminal is not None:
            sub.put_nowait(terminal)
            sub.close()
            logger.debug(
                "statement_event_late_subscribe",
                statement_id=str(statement_id),
                terminal_type=terminal.event_type,
            )
            return sub
        self._subs[statement_id].append(sub)
        logger.debug(
            "statement_event_subscribed",
            statement_id=str(statement_id),
            subscribers=len(self._subs[statement_id]),
        )
        return sub

    def unsubscribe(self, sub: _StatementSubscription) -> None:
        subs = self._subs.get(sub.statement_id)
        if subs is not None:
            with contextlib.suppress(ValueError):
                subs.remove(sub)
            if not subs:
                del self._subs[sub.statement_id]
        logger.debug("statement_event_unsubscribed", statement_id=str(sub.statement_id))

    def emit(self, event: StatementEvent) -> int:
        subs = self._subs.get(event.statement_id, [])
        for sub in subs:
            sub.put_nowait(event)
        return len(subs)

    def close_statement(self, statement_id: uuid.UUID) -> None:
        subs = self._subs.pop(statement_id, [])
        for sub in subs:
            sub.close()

    def store_terminal(self, event: StatementEvent) -> None:
        if event.event_type not in _TERMINAL_EVENT_TYPES:
            return
        if len(self._terminal) >= _MAX_TERMINAL_SNAPSHOTS:
            oldest_key = next(iter(self._terminal))
            del self._terminal[oldest_key]
        self._terminal[event.statement_id] = event

    def clear_terminal(self, statement_id: uuid.UUID) -> None:
        self._terminal.pop(statement_id, None)


def _default_buffer_size() -> int:
    try:
        from app.config import settings

        return settings.scan_event_buffer_size
    except Exception:
        return 32


statement_dispatcher = StatementEventDispatcher(buffer_size=_default_buffer_size())
