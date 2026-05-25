"""Tests for statement extraction progress SSE endpoint."""

import asyncio
import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.statement import StatementEvent
from app.services.statement_events import statement_dispatcher

_STREAM = "app.api.statement_stream"


@pytest.fixture
def statement_id():
    return uuid.uuid4()


@pytest.fixture
def mock_authorize():
    """Bypass auth + statement ownership check for streaming endpoint."""
    with patch(f"{_STREAM}._authorize_statement", new_callable=AsyncMock) as m:
        yield m


def _event(
    statement_id: uuid.UUID, event_type: str = "statement_picked_up", pct: int = 0
) -> StatementEvent:
    return StatementEvent(
        event_type=event_type,
        statement_id=statement_id,
        step="test",
        progress_pct=pct,
    )


class TestStatementSSEEndpoint:
    @pytest.mark.asyncio
    async def test_sse_streams_statement_events(self, statement_id, mock_authorize) -> None:
        transport = ASGITransport(app=app)

        async def emit_events():
            await asyncio.sleep(0.05)
            statement_dispatcher.emit(_event(statement_id, "statement_picked_up", 5))
            statement_dispatcher.emit(_event(statement_id, "statement_llm_start", 20))
            statement_dispatcher.emit(_event(statement_id, "statement_llm_end", 70))
            statement_dispatcher.emit(_event(statement_id, "statement_reconciling", 85))
            statement_dispatcher.emit(_event(statement_id, "statement_completed", 100))
            statement_dispatcher.close_statement(statement_id)

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            task = asyncio.create_task(emit_events())
            events = []
            async with client.stream(
                "GET",
                f"/api/v1/statements/{statement_id}/events?token=fake-token",
            ) as response:
                assert response.status_code == 200
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data = json.loads(line[5:].strip())
                        events.append(data)
                        if data["event_type"] == "statement_completed":
                            break
            await task

        assert len(events) == 5
        assert events[0]["event_type"] == "statement_picked_up"
        assert events[1]["event_type"] == "statement_llm_start"
        assert events[2]["event_type"] == "statement_llm_end"
        assert events[3]["event_type"] == "statement_reconciling"
        assert events[4]["event_type"] == "statement_completed"
        assert events[4]["progress_pct"] == 100

    @pytest.mark.asyncio
    async def test_sse_requires_token(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/v1/statements/{uuid.uuid4()}/events")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_sse_auth_failure_returns_401(self) -> None:
        from fastapi import HTTPException

        with patch(
            f"{_STREAM}._authorize_statement",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=401, detail="Bad token"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get(f"/api/v1/statements/{uuid.uuid4()}/events?token=bad-token")
            assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_late_subscriber_gets_terminal_event(self, statement_id, mock_authorize) -> None:
        terminal = _event(statement_id, "statement_completed", 100)
        statement_dispatcher.store_terminal(terminal)
        statement_dispatcher.close_statement(statement_id)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            events = []
            async with client.stream(
                "GET",
                f"/api/v1/statements/{statement_id}/events?token=fake-token",
            ) as response:
                assert response.status_code == 200
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data = json.loads(line[5:].strip())
                        events.append(data)
                        break

        assert len(events) == 1
        assert events[0]["event_type"] == "statement_completed"

        statement_dispatcher.clear_terminal(statement_id)
