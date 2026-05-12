"""Tests for scan progress streaming — SSE + WebSocket endpoints."""

import asyncio
import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.scan import ScanEvent
from app.services.scan_events import dispatcher

TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

_STREAM = "app.api.scan_stream"


@pytest.fixture
def scan_id():
    return uuid.uuid4()


@pytest.fixture
def mock_authorize():
    """Bypass auth + scan ownership check for streaming endpoints."""
    with patch(f"{_STREAM}._authorize_scan", new_callable=AsyncMock) as m:
        yield m


@pytest.fixture
def mock_ws_auth():
    """Bypass all WS auth: token verify + ownership resolve + scan check."""
    from app.auth.firebase import FirebaseUser

    async def _verify(token: str):
        return FirebaseUser(uid="test-firebase-uid", email="test@example.com", name="Test")

    with (
        patch(f"{_STREAM}._verify_token", side_effect=_verify),
        patch(f"{_STREAM}._resolve_ownership", new_callable=AsyncMock, return_value=TEST_SCOPE_ID),
        patch(f"{_STREAM}._check_scan_ownership", new_callable=AsyncMock, return_value=True),
    ):
        yield


def _event(scan_id: uuid.UUID, event_type: str = "scan_started", pct: int = 0) -> ScanEvent:
    return ScanEvent(
        event_type=event_type,
        scan_id=scan_id,
        step="test",
        progress_pct=pct,
    )


class TestSSEEndpoint:
    @pytest.mark.asyncio
    async def test_sse_streams_events(self, scan_id, mock_authorize) -> None:
        transport = ASGITransport(app=app)

        async def emit_events():
            await asyncio.sleep(0.05)
            dispatcher.emit(_event(scan_id, "scan_started", 0))
            dispatcher.emit(_event(scan_id, "extraction_complete", 40))
            dispatcher.emit(_event(scan_id, "scan_complete", 100))
            dispatcher.close_scan(scan_id)

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            task = asyncio.create_task(emit_events())
            events = []
            async with client.stream(
                "GET",
                f"/api/v1/scans/{scan_id}/events?token=fake-token",
            ) as response:
                assert response.status_code == 200
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data = json.loads(line[5:].strip())
                        events.append(data)
                        if data["event_type"] == "scan_complete":
                            break
            await task

        assert len(events) == 3
        assert events[0]["event_type"] == "scan_started"
        assert events[1]["event_type"] == "extraction_complete"
        assert events[2]["event_type"] == "scan_complete"
        assert events[2]["progress_pct"] == 100

    @pytest.mark.asyncio
    async def test_sse_requires_token(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/v1/scans/{uuid.uuid4()}/events")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_sse_auth_failure_returns_401(self) -> None:
        from fastapi import HTTPException

        with patch(
            f"{_STREAM}._authorize_scan",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=401, detail="Bad token"),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get(f"/api/v1/scans/{uuid.uuid4()}/events?token=bad-token")
            assert resp.status_code == 401


class TestWebSocketEndpoint:
    def test_ws_streams_events(self, scan_id, mock_ws_auth) -> None:
        import threading

        from starlette.testclient import TestClient

        def emit_in_background():
            import time

            time.sleep(0.1)
            dispatcher.emit(_event(scan_id, "scan_started", 0))
            dispatcher.emit(_event(scan_id, "scan_complete", 100))
            dispatcher.close_scan(scan_id)

        t = threading.Thread(target=emit_in_background, daemon=True)

        with TestClient(app) as tc:
            t.start()
            with tc.websocket_connect(f"/ws/scans/{scan_id}?token=fake-token") as ws:
                events = []
                for _ in range(2):
                    data = json.loads(ws.receive_text())
                    events.append(data)
            t.join(timeout=2)

        assert len(events) == 2
        assert events[0]["event_type"] == "scan_started"
        assert events[1]["event_type"] == "scan_complete"

    def test_ws_auth_failure_closes_connection(self) -> None:
        from fastapi import HTTPException
        from starlette.testclient import TestClient
        from starlette.websockets import WebSocketDisconnect

        async def _bad_verify(token: str):
            raise HTTPException(status_code=401, detail="bad")

        with (
            patch(f"{_STREAM}._verify_token", side_effect=_bad_verify),
            TestClient(app) as tc,
            pytest.raises(WebSocketDisconnect),
            tc.websocket_connect(f"/ws/scans/{uuid.uuid4()}?token=bad"),
        ):
            pass

    def test_ws_scan_not_found_closes_connection(self) -> None:
        from starlette.testclient import TestClient
        from starlette.websockets import WebSocketDisconnect

        from app.auth.firebase import FirebaseUser

        async def _verify(token: str):
            return FirebaseUser(uid="test-uid", email="t@t.com", name="T")

        with (
            patch(f"{_STREAM}._verify_token", side_effect=_verify),
            patch(
                f"{_STREAM}._resolve_ownership",
                new_callable=AsyncMock,
                return_value=TEST_SCOPE_ID,
            ),
            patch(f"{_STREAM}._check_scan_ownership", new_callable=AsyncMock, return_value=False),
            TestClient(app) as tc,
            pytest.raises(WebSocketDisconnect),
            tc.websocket_connect(f"/ws/scans/{uuid.uuid4()}?token=fake"),
        ):
            pass


class TestPipelineEventIntegration:
    @pytest.mark.asyncio
    async def test_emit_helper_dispatches_to_subscribers(self) -> None:
        from app.services.scan_worker import _emit

        scan_id = uuid.uuid4()
        sub = dispatcher.subscribe(scan_id)

        _emit(scan_id, "scan_started", "acquire", 0)
        _emit(scan_id, "extraction_complete", "stage1", 40, data={"items": 3})

        assert sub.queue.qsize() == 2
        e1 = sub.queue.get_nowait()
        assert e1.event_type == "scan_started"
        assert e1.progress_pct == 0

        e2 = sub.queue.get_nowait()
        assert e2.event_type == "extraction_complete"
        assert e2.data == {"items": 3}

        dispatcher.unsubscribe(sub)

    @pytest.mark.asyncio
    async def test_emit_with_error_data(self) -> None:
        from app.services.scan_worker import _emit

        scan_id = uuid.uuid4()
        sub = dispatcher.subscribe(scan_id)

        _emit(
            scan_id,
            "scan_failed",
            "stage1",
            0,
            error={"code": "INVALID_IMAGE", "message": "not found"},
        )

        e = sub.queue.get_nowait()
        assert e.event_type == "scan_failed"
        assert e.error["code"] == "INVALID_IMAGE"

        dispatcher.unsubscribe(sub)

    @pytest.mark.asyncio
    async def test_all_event_types_valid(self) -> None:
        """Verify all event types from the PLAN spec are representable."""
        scan_id = uuid.uuid4()
        event_types = [
            ("scan_started", "acquire", 0),
            ("image_processed", "load_image", 5),
            ("extraction_complete", "stage1", 40),
            ("categorized", "stage2", 70),
            ("math_verified", "math_gate", 80),
            ("scan_complete", "done", 100),
            ("scan_failed", "stage1", 0),
        ]
        for etype, step, pct in event_types:
            e = ScanEvent(event_type=etype, scan_id=scan_id, step=step, progress_pct=pct)
            assert e.event_type == etype
            assert e.progress_pct == pct
