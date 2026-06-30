"""Tests for scan pipeline worker — Stage 1 + Stage 2 integration."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.categorization import CategorizationOutput, CategorizationUsage
from app.agents.extraction import ExtractionResult, ExtractionUsage
from app.models.scan import ScanStatus
from app.schemas.scan import (
    CategorizationResult,
    CategoryAssignment,
    GeminiExtractionResult,
    LineItemExtraction,
)
from app.services.scan_e2e_fixtures import E2EScanFixtureCase
from app.services.scan_errors import (
    PermanentScanError,
    ScanErrorCode,
    TransientScanError,
)
from app.services.scan_worker import _estimate_cost_usd, process_scan

_W = "app.services.scan_worker"
_SETTINGS = {"gemini_max_retries": 3, "gemini_retry_delay_seconds": 0.001}
_E2E_SETTINGS = {
    **_SETTINGS,
    "e2e_scan_fixtures_enabled": True,
    "e2e_scan_event_delay_ms": 0,
}


def _mock_scan(status=ScanStatus.SUBMITTED, scan_id=None):
    scan = MagicMock()
    scan.id = scan_id or uuid.uuid4()
    scan.status = status
    scan.image_path = "/tmp/test/receipt.jpg"
    scan.thumbnail_path = "/tmp/test/receipt_thumb.jpg"
    scan.original_filename = "receipt.jpg"
    scan.content_type = "image/jpeg"
    scan.ownership_scope_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    scan.submitted_at = datetime(2026, 5, 12, tzinfo=UTC)
    return scan


def _mock_extraction():
    extraction = GeminiExtractionResult(
        merchant_name="Jumbo",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("15990"),
        line_items=[
            LineItemExtraction(name="Leche", total_price=Decimal("2990")),
            LineItemExtraction(name="Pan", total_price=Decimal("13000")),
        ],
        confidence_score=0.92,
    )
    usage = ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=820.5)
    return ExtractionResult(extraction=extraction, usage=usage)


def _mock_categorization():
    result = CategorizationResult(
        assignments=[
            CategoryAssignment(
                line_item_index=0,
                category_key="DairyEggs",
                confidence=0.95,
            ),
            CategoryAssignment(
                line_item_index=1,
                category_key="BreadPastry",
                confidence=0.88,
            ),
        ]
    )
    usage = CategorizationUsage(input_tokens=400, output_tokens=80, latency_ms=350.0)
    return CategorizationOutput(result=result, usage=usage)


def _mock_transaction():
    tx = MagicMock()
    tx.id = uuid.UUID("00000000-0000-0000-0000-000000000099")
    return tx


def _mock_db_session(scan=None):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = scan
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()

    ctx = AsyncMock()
    ctx.__aenter__ = AsyncMock(return_value=db)
    ctx.__aexit__ = AsyncMock(return_value=False)
    return ctx, db


def _session_factory(scan):
    call_count = 0

    def factory():
        nonlocal call_count
        call_count += 1
        ctx, _ = _mock_db_session(scan if call_count == 1 else None)
        return ctx

    return factory


def _pipeline_ctx(scan, ext, cat, extract_side=None, cat_side=None, persist_side=None):
    """Context manager stack for full pipeline tests."""
    extract_kw = {"side_effect": extract_side} if extract_side else {"return_value": ext}
    cat_kw = {"side_effect": cat_side} if cat_side else {"return_value": cat}
    persist_kw = (
        {"side_effect": persist_side} if persist_side else {"return_value": _mock_transaction()}
    )

    return (
        patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
        patch(f"{_W}.extract_receipt", new_callable=AsyncMock, **extract_kw),
        patch(f"{_W}.categorize_items", new_callable=AsyncMock, **cat_kw),
        patch(
            f"{_W}.persist_scan_result",
            new_callable=AsyncMock,
            **persist_kw,
        ),
        patch.object(Path, "exists", return_value=True),
        patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
        patch(f"{_W}.settings", **_SETTINGS),
    )


class TestEstimateCost:
    def test_gemini_flash_pricing(self):
        assert _estimate_cost_usd(1_000_000, 0) == pytest.approx(0.10)

    def test_output_pricing(self):
        assert _estimate_cost_usd(0, 1_000_000) == pytest.approx(0.40)

    def test_combined(self):
        assert _estimate_cost_usd(1500, 250) == pytest.approx(0.00025)

    def test_gemini_3_5_flash_pricing(self):
        with patch(f"{_W}.settings", gemini_model="gemini-3.5-flash"):
            assert _estimate_cost_usd(1_000_000, 1_000_000) == pytest.approx(10.5)


class TestIdempotency:
    @pytest.mark.asyncio
    async def test_scan_not_found(self):
        ctx, _ = _mock_db_session(scan=None)
        with patch(f"{_W}.async_session", return_value=ctx):
            assert await process_scan(uuid.uuid4()) is False

    @pytest.mark.asyncio
    async def test_recent_processing_skipped(self):
        scan = _mock_scan(status=ScanStatus.PROCESSING)
        ctx, _ = _mock_db_session(scan=scan)
        with patch(f"{_W}.async_session", return_value=ctx):
            assert await process_scan(scan.id) is False

    @pytest.mark.asyncio
    async def test_failed_scan_skipped(self):
        scan = _mock_scan(status=ScanStatus.FAILED)
        ctx, _ = _mock_db_session(scan=scan)
        with patch(f"{_W}.async_session", return_value=ctx):
            assert await process_scan(scan.id) is False

    @pytest.mark.asyncio
    async def test_completed_scan_skipped(self):
        scan = _mock_scan(status=ScanStatus.COMPLETED)
        ctx, _ = _mock_db_session(scan=scan)
        with patch(f"{_W}.async_session", return_value=ctx):
            assert await process_scan(scan.id) is False


class TestFullPipeline:
    @pytest.mark.asyncio
    async def test_success_returns_true(self):
        p = _pipeline_ctx(_mock_scan(), _mock_extraction(), _mock_categorization())
        with p[0], p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(_mock_scan().id) is True

    @pytest.mark.asyncio
    async def test_persists_transaction_link_atomically(self):
        """A successful scan stamps scans.transaction_id in the SAME commit as the
        transaction (atomic; one site covers both the completed + needs_review terminal
        branches) so GET /scans/{id} can expose it to the poll fallback (D66)."""
        scan = _mock_scan()
        sessions: list[object] = []

        def factory():
            ctx, db = _mock_db_session(scan if not sessions else None)
            sessions.append(db)
            return ctx

        p = _pipeline_ctx(scan, _mock_extraction(), _mock_categorization())
        with patch(f"{_W}.async_session", side_effect=factory), p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(scan.id) is True

        # Exactly one UPDATE across all sessions sets scans.transaction_id — emitted by
        # _run_stage2 right after persist_scan_result, before the persist commit.
        stamping = [
            str(call.args[0])
            for db in sessions
            for call in db.execute.await_args_list  # type: ignore[attr-defined]
            if call.args and "transaction_id" in str(call.args[0])
        ]
        assert stamping, "expected an UPDATE stamping scans.transaction_id on the persist session"


class TestQuotaGracefulDegradation:
    @pytest.mark.asyncio
    async def test_stage1_quota_throttle_queues_not_fails(self):
        scan = _mock_scan()
        quota_err = Exception("Resource exhausted: quota exceeded for gemini-flash")
        p = _pipeline_ctx(scan, _mock_extraction(), _mock_categorization(), extract_side=quota_err)
        with (
            p[0],
            p[1],
            p[2],
            p[3],
            p[4],
            p[5],
            p[6],
            patch(f"{_W}._queue_scan", new_callable=AsyncMock) as queue,
            patch(f"{_W}._fail_scan", new_callable=AsyncMock) as fail,
            patch(f"{_W}._emit") as mock_emit,
        ):
            result = await process_scan(scan.id)

        # Graceful: no exception propagates (no 5xx), scan parked in QUEUED.
        assert result is False
        queue.assert_awaited_once()
        fail.assert_not_awaited()
        assert queue.await_args.args[1] == ScanErrorCode.QUOTA_EXCEEDED.value
        event_types = [call.args[1] for call in mock_emit.call_args_list]
        assert "scan_queued" in event_types
        assert "scan_failed" not in event_types

    @pytest.mark.asyncio
    async def test_stage2_quota_throttle_queues_not_fails(self):
        scan = _mock_scan()
        quota_err = Exception("RESOURCE_EXHAUSTED: quota exceeded")
        p = _pipeline_ctx(scan, _mock_extraction(), _mock_categorization(), cat_side=quota_err)
        with (
            p[0],
            p[1],
            p[2],
            p[3],
            p[4],
            p[5],
            p[6],
            patch(f"{_W}._queue_scan", new_callable=AsyncMock) as queue,
            patch(f"{_W}._fail_scan", new_callable=AsyncMock) as fail,
            patch(f"{_W}._emit") as mock_emit,
        ):
            result = await process_scan(scan.id)

        assert result is False
        queue.assert_awaited_once()
        fail.assert_not_awaited()
        event_types = [call.args[1] for call in mock_emit.call_args_list]
        assert "scan_queued" in event_types

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("err_text", "expected_code"),
        [
            ("429 Too Many Requests: rate limit exceeded", ScanErrorCode.RATE_LIMIT),
            ("the model is overloaded, please try again later", ScanErrorCode.OVERLOADED),
        ],
    )
    async def test_throttle_class_429_503_queues_not_fails(self, err_text, expected_code):
        """A 429 rate-limit or 503 overloaded throttle (no 'quota' token in the body)
        degrades to QUEUED, not terminal FAILED — closes the classification-ordering gap
        where only the literal 'quota' wording reached the recovery path (P16 Phase 3)."""
        scan = _mock_scan()
        p = _pipeline_ctx(
            scan, _mock_extraction(), _mock_categorization(), extract_side=Exception(err_text)
        )
        with (
            p[0],
            p[1],
            p[2],
            p[3],
            p[4],
            p[5],
            p[6],
            patch(f"{_W}._queue_scan", new_callable=AsyncMock) as queue,
            patch(f"{_W}._fail_scan", new_callable=AsyncMock) as fail,
            patch(f"{_W}._emit") as mock_emit,
        ):
            result = await process_scan(scan.id)

        assert result is False
        queue.assert_awaited_once()
        fail.assert_not_awaited()
        assert queue.await_args.args[1] == expected_code.value
        assert "scan_queued" in [c.args[1] for c in mock_emit.call_args_list]

    @pytest.mark.asyncio
    async def test_non_quota_error_still_fails(self):
        scan = _mock_scan()
        bad = Exception("invalid image: corrupt input request")
        p = _pipeline_ctx(scan, _mock_extraction(), _mock_categorization(), extract_side=bad)
        with (
            p[0],
            p[1],
            p[2],
            p[3],
            p[4],
            p[5],
            p[6],
            patch(f"{_W}._queue_scan", new_callable=AsyncMock) as queue,
            patch(f"{_W}._fail_scan", new_callable=AsyncMock) as fail,
            patch(f"{_W}._emit") as mock_emit,
        ):
            result = await process_scan(scan.id)

        assert result is False
        fail.assert_awaited_once()
        queue.assert_not_awaited()
        event_types = [call.args[1] for call in mock_emit.call_args_list]
        assert "scan_failed" in event_types
        assert "scan_queued" not in event_types

    @pytest.mark.asyncio
    async def test_queued_scan_is_reprocessable(self):
        # Re-entry path: a quota-queued scan reprocesses from stage 1 when
        # re-dispatched (graceful degradation must be retriable, not a dead end).
        scan = _mock_scan(status=ScanStatus.QUEUED)
        p = _pipeline_ctx(scan, _mock_extraction(), _mock_categorization())
        with p[0], p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(scan.id) is True

    @pytest.mark.asyncio
    async def test_stage1_home_currency_load_failure_does_not_strand_scan(self):
        # P104 hardening: a transient DB fault while loading the owner's home currency
        # must NOT strand the scan in SUBMITTED — it falls back to CLP and extraction
        # proceeds. scope_owner_settings is called in stage1 (fails here) and stage2
        # (succeeds), so the side_effect fails only the first call.
        scan = _mock_scan()
        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(
                f"{_W}.scope_owner_settings",
                new_callable=AsyncMock,
                side_effect=[
                    RuntimeError("transient db fault"),
                    (None, None, "CLP", "dd/MM/yyyy"),
                ],
            ),
            patch(
                f"{_W}.extract_receipt",
                new_callable=AsyncMock,
                return_value=_mock_extraction(),
            ) as mock_extract,
            patch(
                f"{_W}.categorize_items",
                new_callable=AsyncMock,
                return_value=_mock_categorization(),
            ),
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=_mock_transaction(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"img"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            result = await process_scan(scan.id, ownership_scope_id=uuid.uuid4())

        assert result is True  # completed, not stranded
        assert mock_extract.await_count == 1
        assert mock_extract.await_args.kwargs["home_currency"] == "CLP"


class TestBoletaShortcut:
    _PAYLOAD = (
        '<TED version="1.0"><DD>'
        "<RE>76192083-9</RE><TD>39</TD><F>1234</F>"
        "<FE>2026-05-15</FE><MNT>15990</MNT><IT1>Almuerzo</IT1>"
        "</DD><FRMT>x</FRMT></TED>"
    )

    @pytest.mark.asyncio
    async def test_boleta_shortcut_bypasses_llm(self):
        scan = _mock_scan()
        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.decode_boleta_barcode", return_value=self._PAYLOAD),
            patch(f"{_W}.extract_receipt", new_callable=AsyncMock) as mock_extract,
            patch(f"{_W}.categorize_items", new_callable=AsyncMock) as mock_categorize,
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=_mock_transaction(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"img"),
            patch(f"{_W}.settings", **_SETTINGS),
            patch(f"{_W}._emit") as mock_emit,
        ):
            result = await process_scan(scan.id)

        assert result is True
        # 0 extraction-LLM and 0 categorization-LLM tokens (REQ-26)
        assert mock_extract.await_count == 0
        assert mock_categorize.await_count == 0
        event_types = [c.args[1] for c in mock_emit.call_args_list]
        assert "extraction_complete" in event_types
        assert "scan_complete" in event_types

    @pytest.mark.asyncio
    async def test_unparseable_timbre_falls_through_to_vision(self):
        scan = _mock_scan()
        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            # TD 33 = factura, not a boleta -> parse rejects -> vision path
            patch(f"{_W}.decode_boleta_barcode", return_value="<DD><TD>33</TD></DD>"),
            patch(
                f"{_W}.extract_receipt",
                new_callable=AsyncMock,
                return_value=_mock_extraction(),
            ) as mock_extract,
            patch(
                f"{_W}.categorize_items",
                new_callable=AsyncMock,
                return_value=_mock_categorization(),
            ),
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=_mock_transaction(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"img"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            result = await process_scan(scan.id)

        assert result is True
        # fell through to the vision pipeline
        assert mock_extract.await_count == 1

    @pytest.mark.asyncio
    async def test_boleta_shortcut_no_it1_synthesizes_reconciling_item(self):
        # A boleta with no IT1 still reconciles: a synthetic item summing to MNT
        # is injected so the math gate passes and the scan completes.
        scan = _mock_scan()
        payload = (
            "<DD><RE>76192083-9</RE><TD>39</TD><F>7</F><FE>2026-05-15</FE><MNT>15990</MNT></DD>"
        )
        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.decode_boleta_barcode", return_value=payload),
            patch(f"{_W}.extract_receipt", new_callable=AsyncMock) as mock_extract,
            patch(f"{_W}.categorize_items", new_callable=AsyncMock),
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=_mock_transaction(),
            ) as mock_persist,
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"img"),
            patch(f"{_W}.settings", **_SETTINGS),
            patch(f"{_W}._emit") as mock_emit,
        ):
            result = await process_scan(scan.id)

        assert result is True
        assert mock_extract.await_count == 0
        persisted = mock_persist.await_args.kwargs["extraction"].extraction
        assert len(persisted.line_items) == 1
        assert persisted.line_items[0].name == "Boleta electrónica"
        assert persisted.line_items[0].total_price == persisted.total_amount
        complete = next(c for c in mock_emit.call_args_list if c.args[1] == "scan_complete")
        assert complete.kwargs["data"]["status"] == "completed"


class TestE2EScanFixturePipeline:
    @pytest.mark.asyncio
    async def test_success_fixture_bypasses_ai_and_emits_normal_sequence(self):
        scan = _mock_scan()
        fixture = E2EScanFixtureCase(
            key="happy",
            outcome="success",
            extraction=_mock_extraction(),
            categorization=_mock_categorization(),
        )

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.fixture_case_for_scan_image", return_value=fixture),
            patch(f"{_W}.extract_receipt", new_callable=AsyncMock) as mock_extract,
            patch(f"{_W}.categorize_items", new_callable=AsyncMock) as mock_categorize,
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=_mock_transaction(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_E2E_SETTINGS),
            patch(f"{_W}._emit") as mock_emit,
        ):
            assert await process_scan(scan.id) is True

        assert mock_extract.await_count == 0
        assert mock_categorize.await_count == 0
        event_types = [call.args[1] for call in mock_emit.call_args_list]
        assert event_types == [
            "scan_started",
            "image_processed",
            "extraction_complete",
            "categorized",
            "math_verified",
            "scan_complete",
        ]

    @pytest.mark.asyncio
    async def test_failure_fixture_emits_scan_failed_without_persisting(self):
        scan = _mock_scan()
        fixture = E2EScanFixtureCase(
            key="failure",
            outcome="failure",
            failure_code=ScanErrorCode.INVALID_IMAGE.value,
            failure_message="fixture failure",
        )

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.fixture_case_for_scan_image", return_value=fixture),
            patch(f"{_W}.persist_scan_result", new_callable=AsyncMock) as mock_persist,
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_E2E_SETTINGS),
            patch(f"{_W}._emit") as mock_emit,
        ):
            assert await process_scan(scan.id) is False

        assert mock_persist.await_count == 0
        event_types = [call.args[1] for call in mock_emit.call_args_list]
        assert event_types == ["scan_started", "image_processed", "scan_failed"]


class TestMockScanProviderPipeline:
    @pytest.mark.asyncio
    async def test_mock_provider_bypasses_ai_and_uses_schema_fixture(self):
        scan = _mock_scan()

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.extract_receipt", new_callable=AsyncMock) as mock_extract,
            patch(f"{_W}.categorize_items", new_callable=AsyncMock) as mock_categorize,
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=_mock_transaction(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(
                f"{_W}.settings",
                **{**_SETTINGS, "scan_provider": "mock", "e2e_scan_fixtures_enabled": False},
            ),
            patch(f"{_W}._emit") as mock_emit,
        ):
            assert await process_scan(scan.id) is True

        assert mock_extract.await_count == 0
        assert mock_categorize.await_count == 0
        event_types = [call.args[1] for call in mock_emit.call_args_list]
        assert event_types == [
            "scan_started",
            "image_processed",
            "extraction_complete",
            "categorized",
            "math_verified",
            "scan_complete",
        ]

    @pytest.mark.asyncio
    async def test_math_mismatch_returns_true(self):
        ext_data = GeminiExtractionResult(
            merchant_name="Jumbo",
            transaction_date="2026-05-12",
            currency_code="CLP",
            total_amount=Decimal("20000"),
            line_items=[
                LineItemExtraction(name="Leche", total_price=Decimal("2990")),
                LineItemExtraction(name="Pan", total_price=Decimal("13000")),
            ],
            confidence_score=0.92,
        )
        ext = ExtractionResult(
            extraction=ext_data,
            usage=ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=820.5),
        )
        p = _pipeline_ctx(_mock_scan(), ext, _mock_categorization())
        with p[0], p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(_mock_scan().id) is True


class TestStage1Failures:
    @pytest.mark.asyncio
    async def test_missing_image(self):
        scan = _mock_scan()
        with (
            patch(
                f"{_W}.async_session",
                side_effect=_session_factory(scan),
            ),
            patch.object(Path, "exists", return_value=False),
        ):
            assert await process_scan(scan.id) is False

    @pytest.mark.asyncio
    async def test_permanent_error_no_retry(self):
        scan = _mock_scan()
        perm = PermanentScanError(ScanErrorCode.SAFETY_BLOCK, "Blocked")
        mock_extract = AsyncMock(side_effect=perm)

        with (
            patch(
                f"{_W}.async_session",
                side_effect=_session_factory(scan),
            ),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            assert await process_scan(scan.id) is False

        assert mock_extract.call_count == 1

    @pytest.mark.asyncio
    async def test_transient_error_is_not_retried_by_worker(self):
        scan = _mock_scan()
        err = TransientScanError(ScanErrorCode.SERVER_ERROR, "503")
        mock_extract = AsyncMock(side_effect=err)

        with (
            patch(
                f"{_W}.async_session",
                side_effect=_session_factory(scan),
            ),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            assert await process_scan(scan.id) is False

        assert mock_extract.call_count == 1


class TestStage2Failures:
    @pytest.mark.asyncio
    async def test_categorization_permanent_error(self):
        perm = PermanentScanError(ScanErrorCode.CATEGORIZATION_PARSE_ERROR, "Bad output")
        p = _pipeline_ctx(_mock_scan(), _mock_extraction(), None, cat_side=perm)
        with p[0], p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(_mock_scan().id) is False

    @pytest.mark.asyncio
    async def test_categorization_transient_error_is_not_retried_by_worker(self):
        err = TransientScanError(ScanErrorCode.CATEGORIZATION_TIMEOUT, "Timeout")
        scan = _mock_scan()
        mock_categorize = AsyncMock(side_effect=err)
        with (
            patch(
                f"{_W}.async_session",
                side_effect=_session_factory(scan),
            ),
            patch(
                f"{_W}.extract_receipt",
                new_callable=AsyncMock,
                return_value=_mock_extraction(),
            ),
            patch(
                f"{_W}.categorize_items",
                mock_categorize,
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(
                f"{_W}.settings",
                gemini_max_retries=2,
                gemini_retry_delay_seconds=0.001,
            ),
        ):
            assert await process_scan(scan.id) is False

        assert mock_categorize.call_count == 1

    @pytest.mark.asyncio
    async def test_persist_failure(self):
        p = _pipeline_ctx(
            _mock_scan(),
            _mock_extraction(),
            _mock_categorization(),
            persist_side=Exception("DB error"),
        )
        with p[0], p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(_mock_scan().id) is False


class TestStuckRecovery:
    @pytest.mark.asyncio
    async def test_stuck_processing_recovered(self):
        scan = _mock_scan(status=ScanStatus.PROCESSING)
        scan.submitted_at = datetime(2020, 1, 1, tzinfo=UTC)
        p = _pipeline_ctx(scan, _mock_extraction(), _mock_categorization())
        with p[0], p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(scan.id) is True


class TestMetrics:
    @pytest.mark.asyncio
    async def test_success_logs_metrics(self):
        scan = _mock_scan()
        with (
            patch(
                f"{_W}.async_session",
                side_effect=_session_factory(scan),
            ),
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
                return_value=_mock_transaction(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
            patch(f"{_W}.metrics") as mock_metrics,
        ):
            await process_scan(scan.id)

        inc_calls = {c[0][0] for c in mock_metrics.inc.call_args_list}
        assert "scans_total" in inc_calls
        assert "scans_success" in inc_calls
