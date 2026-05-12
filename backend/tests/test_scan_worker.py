"""Tests for scan extraction worker — idempotency, retries, error handling, metrics."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.extraction import ExtractionResult, ExtractionUsage
from app.models.scan import ScanStatus
from app.schemas.scan import GeminiExtractionResult, LineItemExtraction
from app.services.scan_errors import (
    PermanentScanError,
    ScanErrorCode,
    TransientScanError,
)
from app.services.scan_worker import _estimate_cost_usd, process_scan


def _mock_scan(status=ScanStatus.SUBMITTED, scan_id=None):
    scan = MagicMock()
    scan.id = scan_id or uuid.uuid4()
    scan.status = status
    scan.image_path = "/tmp/test/receipt.jpg"
    scan.content_type = "image/jpeg"
    scan.submitted_at = datetime(2026, 5, 12, tzinfo=UTC)
    return scan


def _mock_extraction_result():
    extraction = GeminiExtractionResult(
        merchant_name="Jumbo",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("15990"),
        line_items=[
            LineItemExtraction(name="Leche", total_price=Decimal("2990")),
        ],
        confidence_score=0.92,
    )
    usage = ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=820.5)
    return ExtractionResult(extraction=extraction, usage=usage)


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


class TestEstimateCost:
    def test_gemini_flash_pricing(self):
        cost = _estimate_cost_usd(1_000_000, 0)
        assert cost == pytest.approx(0.15)

    def test_output_pricing(self):
        cost = _estimate_cost_usd(0, 1_000_000)
        assert cost == pytest.approx(0.60)

    def test_combined(self):
        cost = _estimate_cost_usd(1500, 250)
        assert cost == pytest.approx(0.000375)


class TestProcessScanIdempotency:
    @pytest.mark.asyncio
    async def test_scan_not_found_returns_none(self):
        ctx, db = _mock_db_session(scan=None)
        with patch("app.services.scan_worker.async_session", return_value=ctx):
            result = await process_scan(uuid.uuid4())
        assert result is None

    @pytest.mark.asyncio
    async def test_already_processing_skipped(self):
        scan = _mock_scan(status=ScanStatus.PROCESSING)
        ctx, db = _mock_db_session(scan=scan)
        with patch("app.services.scan_worker.async_session", return_value=ctx):
            result = await process_scan(scan.id)
        assert result is None

    @pytest.mark.asyncio
    async def test_already_extracted_skipped(self):
        scan = _mock_scan(status=ScanStatus.EXTRACTED)
        ctx, db = _mock_db_session(scan=scan)
        with patch("app.services.scan_worker.async_session", return_value=ctx):
            result = await process_scan(scan.id)
        assert result is None

    @pytest.mark.asyncio
    async def test_failed_scan_skipped(self):
        scan = _mock_scan(status=ScanStatus.FAILED)
        ctx, db = _mock_db_session(scan=scan)
        with patch("app.services.scan_worker.async_session", return_value=ctx):
            result = await process_scan(scan.id)
        assert result is None


class TestProcessScanSuccess:
    @pytest.mark.asyncio
    async def test_extracts_and_returns_result(self):
        scan = _mock_scan()
        extraction_result = _mock_extraction_result()

        call_count = 0

        def session_factory():
            nonlocal call_count
            call_count += 1
            ctx, _ = _mock_db_session(scan if call_count == 1 else None)
            return ctx

        with (
            patch("app.services.scan_worker.async_session", side_effect=session_factory),
            patch(
                "app.services.scan_worker.extract_receipt",
                new_callable=AsyncMock,
                return_value=extraction_result,
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch("app.services.scan_worker.settings") as mock_settings,
        ):
            mock_settings.gemini_max_retries = 3
            mock_settings.gemini_retry_delay_seconds = 0.01
            result = await process_scan(scan.id)

        assert result is not None
        assert result.extraction.merchant_name == "Jumbo"
        assert result.usage.input_tokens == 1500


class TestProcessScanImageMissing:
    @pytest.mark.asyncio
    async def test_missing_image_fails(self):
        scan = _mock_scan()

        call_count = 0

        def session_factory():
            nonlocal call_count
            call_count += 1
            ctx, _ = _mock_db_session(scan if call_count == 1 else None)
            return ctx

        with (
            patch("app.services.scan_worker.async_session", side_effect=session_factory),
            patch.object(Path, "exists", return_value=False),
        ):
            result = await process_scan(scan.id)

        assert result is None


class TestProcessScanRetries:
    @pytest.mark.asyncio
    async def test_retries_on_transient_error(self):
        scan = _mock_scan()
        extraction_result = _mock_extraction_result()
        transient = TransientScanError(ScanErrorCode.SERVER_ERROR, "503 Service Unavailable")

        call_count = 0

        def session_factory():
            nonlocal call_count
            call_count += 1
            ctx, _ = _mock_db_session(scan if call_count == 1 else None)
            return ctx

        mock_extract = AsyncMock(side_effect=[transient, extraction_result])

        with (
            patch("app.services.scan_worker.async_session", side_effect=session_factory),
            patch("app.services.scan_worker.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch("app.services.scan_worker.settings") as mock_settings,
        ):
            mock_settings.gemini_max_retries = 3
            mock_settings.gemini_retry_delay_seconds = 0.001
            result = await process_scan(scan.id)

        assert result is not None
        assert mock_extract.call_count == 2

    @pytest.mark.asyncio
    async def test_permanent_error_no_retry(self):
        scan = _mock_scan()
        permanent = PermanentScanError(
            ScanErrorCode.SAFETY_BLOCK, "Content blocked by safety filters",
        )

        call_count = 0

        def session_factory():
            nonlocal call_count
            call_count += 1
            ctx, _ = _mock_db_session(scan if call_count == 1 else None)
            return ctx

        mock_extract = AsyncMock(side_effect=permanent)

        with (
            patch("app.services.scan_worker.async_session", side_effect=session_factory),
            patch("app.services.scan_worker.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch("app.services.scan_worker.settings") as mock_settings,
        ):
            mock_settings.gemini_max_retries = 3
            mock_settings.gemini_retry_delay_seconds = 0.001
            result = await process_scan(scan.id)

        assert result is None
        assert mock_extract.call_count == 1

    @pytest.mark.asyncio
    async def test_exhausted_retries_fails(self):
        scan = _mock_scan()
        transient = TransientScanError(ScanErrorCode.TIMEOUT_ERROR, "Request timed out")

        call_count = 0

        def session_factory():
            nonlocal call_count
            call_count += 1
            ctx, _ = _mock_db_session(scan if call_count == 1 else None)
            return ctx

        mock_extract = AsyncMock(side_effect=transient)

        with (
            patch("app.services.scan_worker.async_session", side_effect=session_factory),
            patch("app.services.scan_worker.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch("app.services.scan_worker.settings") as mock_settings,
        ):
            mock_settings.gemini_max_retries = 2
            mock_settings.gemini_retry_delay_seconds = 0.001
            result = await process_scan(scan.id)

        assert result is None
        assert mock_extract.call_count == 2


class TestMetricsLogging:
    @pytest.mark.asyncio
    async def test_success_logs_metrics(self):
        scan = _mock_scan()
        extraction_result = _mock_extraction_result()

        call_count = 0

        def session_factory():
            nonlocal call_count
            call_count += 1
            ctx, _ = _mock_db_session(scan if call_count == 1 else None)
            return ctx

        with (
            patch("app.services.scan_worker.async_session", side_effect=session_factory),
            patch(
                "app.services.scan_worker.extract_receipt",
                new_callable=AsyncMock,
                return_value=extraction_result,
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch("app.services.scan_worker.settings") as mock_settings,
            patch("app.services.scan_worker.metrics") as mock_metrics,
        ):
            mock_settings.gemini_max_retries = 3
            mock_settings.gemini_retry_delay_seconds = 0.01
            await process_scan(scan.id)

        inc_calls = {c[0][0] for c in mock_metrics.inc.call_args_list}
        assert "scans_total" in inc_calls
        assert "scans_success" in inc_calls

        observe_names = {c[0][0] for c in mock_metrics.observe.call_args_list}
        assert "llm_latency_ms" in observe_names
        assert "llm_tokens_in" in observe_names
        assert "llm_tokens_out" in observe_names
        assert "llm_cost_usd" in observe_names
        assert "scan_duration_ms" in observe_names

    @pytest.mark.asyncio
    async def test_failure_increments_failed_counter(self):
        scan = _mock_scan()
        permanent = PermanentScanError(ScanErrorCode.SAFETY_BLOCK, "Blocked")

        call_count = 0

        def session_factory():
            nonlocal call_count
            call_count += 1
            ctx, _ = _mock_db_session(scan if call_count == 1 else None)
            return ctx

        with (
            patch("app.services.scan_worker.async_session", side_effect=session_factory),
            patch(
                "app.services.scan_worker.extract_receipt",
                new_callable=AsyncMock,
                side_effect=permanent,
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch("app.services.scan_worker.settings") as mock_settings,
            patch("app.services.scan_worker.metrics") as mock_metrics,
        ):
            mock_settings.gemini_max_retries = 1
            mock_settings.gemini_retry_delay_seconds = 0.001
            await process_scan(scan.id)

        inc_calls = {c[0][0] for c in mock_metrics.inc.call_args_list}
        assert "scans_total" in inc_calls
        assert "scans_failed" in inc_calls
