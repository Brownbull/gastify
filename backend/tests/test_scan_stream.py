"""Tests for scan progress streaming — SSE + WebSocket endpoints."""

import asyncio
import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

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


_W = "app.services.scan_worker"

EXPECTED_SUCCESS_ORDER = [
    "scan_started",
    "image_processed",
    "extraction_complete",
    "categorized",
    "math_verified",
    "scan_complete",
]

EXPECTED_FAIL_ORDER = [
    "scan_started",
    "image_processed",
    "scan_failed",
]


def _mock_scan(scan_id):
    scan = MagicMock()
    scan.id = scan_id
    scan.status = "submitted"
    scan.image_path = "/tmp/test/receipt.jpg"
    scan.thumbnail_path = "/tmp/test/receipt_thumb.jpg"
    scan.content_type = "image/jpeg"
    scan.ownership_scope_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    scan.submitted_at = datetime(2026, 5, 12, tzinfo=UTC)
    return scan


def _mock_extraction():
    from app.agents.extraction import ExtractionResult, ExtractionUsage
    from app.schemas.scan import GeminiExtractionResult, LineItemExtraction

    extraction = GeminiExtractionResult(
        merchant_name="TestStore",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("5000"),
        line_items=[
            LineItemExtraction(name="Item A", total_price=Decimal("3000")),
            LineItemExtraction(name="Item B", total_price=Decimal("2000")),
        ],
        confidence_score=0.92,
    )
    usage = ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=800.0)
    return ExtractionResult(extraction=extraction, usage=usage)


def _mock_categorization():
    from app.agents.categorization import CategorizationOutput, CategorizationUsage
    from app.schemas.scan import CategorizationResult, CategoryAssignment

    result = CategorizationResult(
        assignments=[
            CategoryAssignment(line_item_index=0, category_key="Supermercado", confidence=0.95),
            CategoryAssignment(line_item_index=1, category_key="Supermercado", confidence=0.90),
        ]
    )
    usage = CategorizationUsage(input_tokens=400, output_tokens=80, latency_ms=350.0)
    return CategorizationOutput(result=result, usage=usage)


def _session_factory(scan):
    call_count = 0

    def factory():
        nonlocal call_count
        call_count += 1
        ctx = AsyncMock()
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = scan if call_count == 1 else None
        db.execute = AsyncMock(return_value=result_mock)
        db.commit = AsyncMock()
        ctx.__aenter__ = AsyncMock(return_value=db)
        ctx.__aexit__ = AsyncMock(return_value=False)
        return ctx

    return factory


class TestPipelineEventOrder:
    """Verify full pipeline emits events in correct order (REQ-04)."""

    @pytest.mark.asyncio
    async def test_success_event_order(self) -> None:
        """Successful scan emits 6 events in pipeline order with monotonic progress."""
        from app.services.scan_worker import process_scan

        scan_id = uuid.uuid4()
        scan = _mock_scan(scan_id)
        sub = dispatcher.subscribe(scan_id)

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(
                f"{_W}.extract_receipt",
                new_callable=AsyncMock,
                return_value=_mock_extraction(),
            ),
            patch(
                f"{_W}.categorize_items",
                new_callable=AsyncMock,
                return_value=_mock_categorization(),
            ),
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=MagicMock(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", gemini_max_retries=3, gemini_retry_delay_seconds=0.001),
        ):
            result = await process_scan(scan_id)

        assert result is True

        events = _drain_events(sub)

        event_types = [e.event_type for e in events]
        assert event_types == EXPECTED_SUCCESS_ORDER, (
            f"Expected {EXPECTED_SUCCESS_ORDER}, got {event_types}"
        )

        progress_values = [e.progress_pct for e in events]
        assert progress_values == sorted(progress_values), (
            f"Progress not monotonically increasing: {progress_values}"
        )
        assert progress_values[-1] == 100

    @pytest.mark.asyncio
    async def test_failed_scan_event_order(self) -> None:
        """Failed scan (permanent extraction error) emits events then scan_failed."""
        from app.services.scan_errors import PermanentScanError, ScanErrorCode
        from app.services.scan_worker import process_scan

        scan_id = uuid.uuid4()
        scan = _mock_scan(scan_id)
        sub = dispatcher.subscribe(scan_id)

        perm = PermanentScanError(ScanErrorCode.SAFETY_BLOCK, "Blocked by safety filter")

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(
                f"{_W}.extract_receipt",
                new_callable=AsyncMock,
                side_effect=perm,
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", gemini_max_retries=3, gemini_retry_delay_seconds=0.001),
        ):
            result = await process_scan(scan_id)

        assert result is False

        events = _drain_events(sub)

        event_types = [e.event_type for e in events]
        assert event_types == EXPECTED_FAIL_ORDER, (
            f"Expected {EXPECTED_FAIL_ORDER}, got {event_types}"
        )

        fail_event = events[-1]
        assert fail_event.error is not None
        assert fail_event.error["code"] == "SAFETY_BLOCK"

    @pytest.mark.asyncio
    async def test_needs_review_emits_scan_complete_not_failed(self) -> None:
        """Math-inconsistent receipt emits scan_complete (not scan_failed)."""
        from app.agents.extraction import ExtractionResult, ExtractionUsage
        from app.schemas.scan import GeminiExtractionResult, LineItemExtraction
        from app.services.scan_worker import process_scan

        scan_id = uuid.uuid4()
        scan = _mock_scan(scan_id)
        sub = dispatcher.subscribe(scan_id)

        mismatch_ext = GeminiExtractionResult(
            merchant_name="Test",
            transaction_date="2026-05-12",
            currency_code="CLP",
            total_amount=Decimal("20000"),
            line_items=[
                LineItemExtraction(name="Item", total_price=Decimal("5000")),
            ],
            confidence_score=0.80,
        )
        ext = ExtractionResult(
            extraction=mismatch_ext,
            usage=ExtractionUsage(input_tokens=1000, output_tokens=200, latency_ms=500.0),
        )

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.extract_receipt", new_callable=AsyncMock, return_value=ext),
            patch(
                f"{_W}.categorize_items",
                new_callable=AsyncMock,
                return_value=_mock_categorization(),
            ),
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=MagicMock(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", gemini_max_retries=3, gemini_retry_delay_seconds=0.001),
        ):
            result = await process_scan(scan_id)

        assert result is True

        events = _drain_events(sub)

        event_types = [e.event_type for e in events]
        assert event_types == EXPECTED_SUCCESS_ORDER

        complete_event = events[-1]
        assert complete_event.data["status"] == "needs_review"
        assert complete_event.data["discrepancy"] > 0


def _drain_events(sub) -> list[ScanEvent]:
    """Drain subscriber queue, filtering out None sentinels from close_scan."""
    dispatcher.unsubscribe(sub)
    events = []
    while not sub.queue.empty():
        e = sub.queue.get_nowait()
        if e is not None:
            events.append(e)
    return events
