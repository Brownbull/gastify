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
from app.services.scan_errors import (
    PermanentScanError,
    ScanErrorCode,
    TransientScanError,
)
from app.services.scan_worker import _estimate_cost_usd, process_scan

_W = "app.services.scan_worker"
_SETTINGS = {"gemini_max_retries": 3, "gemini_retry_delay_seconds": 0.001}


def _mock_scan(status=ScanStatus.SUBMITTED, scan_id=None):
    scan = MagicMock()
    scan.id = scan_id or uuid.uuid4()
    scan.status = status
    scan.image_path = "/tmp/test/receipt.jpg"
    scan.thumbnail_path = "/tmp/test/receipt_thumb.jpg"
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
                category_key="Supermercado",
                confidence=0.95,
            ),
            CategoryAssignment(
                line_item_index=1,
                category_key="Panaderia",
                confidence=0.88,
            ),
        ]
    )
    usage = CategorizationUsage(input_tokens=400, output_tokens=80, latency_ms=350.0)
    return CategorizationOutput(result=result, usage=usage)


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
    persist_kw = {"side_effect": persist_side} if persist_side else {"return_value": MagicMock()}

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
        assert _estimate_cost_usd(1_000_000, 0) == pytest.approx(0.15)

    def test_output_pricing(self):
        assert _estimate_cost_usd(0, 1_000_000) == pytest.approx(0.60)

    def test_combined(self):
        assert _estimate_cost_usd(1500, 250) == pytest.approx(0.000375)


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
    async def test_transient_retry_then_success(self):
        scan = _mock_scan()
        ext = _mock_extraction()
        cat = _mock_categorization()
        err = TransientScanError(ScanErrorCode.SERVER_ERROR, "503")
        mock_extract = AsyncMock(side_effect=[err, ext])

        with (
            patch(
                f"{_W}.async_session",
                side_effect=_session_factory(scan),
            ),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch(
                f"{_W}.categorize_items",
                new_callable=AsyncMock,
                return_value=cat,
            ),
            patch(
                f"{_W}.persist_scan_result",
                new_callable=AsyncMock,
                return_value=MagicMock(),
            ),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            assert await process_scan(scan.id) is True

        assert mock_extract.call_count == 2


class TestStage2Failures:
    @pytest.mark.asyncio
    async def test_categorization_permanent_error(self):
        perm = PermanentScanError(ScanErrorCode.CATEGORIZATION_PARSE_ERROR, "Bad output")
        p = _pipeline_ctx(_mock_scan(), _mock_extraction(), None, cat_side=perm)
        with p[0], p[1], p[2], p[3], p[4], p[5], p[6]:
            assert await process_scan(_mock_scan().id) is False

    @pytest.mark.asyncio
    async def test_categorization_exhausted_retries(self):
        err = TransientScanError(ScanErrorCode.CATEGORIZATION_TIMEOUT, "Timeout")
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
                side_effect=err,
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
                return_value=MagicMock(),
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
