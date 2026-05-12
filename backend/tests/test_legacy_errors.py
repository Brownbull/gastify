"""Legacy error case tests — port of BoletApp errorHandler.ts 7 error types.

Proves each legacy error type is handled by the scan pipeline:
  NETWORK_ERROR   → transient, retried, fails after exhaustion
  TIMEOUT_ERROR   → transient, retried, fails after exhaustion
  PERMISSION_DENIED → maps to auth-layer rejection (scan not accessible)
  STORAGE_QUOTA   → permanent, immediate dead-letter
  NOT_FOUND       → scan row missing → pipeline skips gracefully
  VALIDATION_ERROR → permanent (bad extraction output), dead-letter
  UNKNOWN_ERROR   → permanent fallback, dead-letter
"""

import uuid
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.scan import ScanStatus
from app.services.scan_errors import (
    PermanentScanError,
    ScanErrorCode,
    TransientScanError,
    classify_error,
)
from app.services.scan_worker import process_scan

_W = "app.services.scan_worker"
_SETTINGS = {"gemini_max_retries": 3, "gemini_retry_delay_seconds": 0.001}


def _mock_scan(scan_id=None, status=ScanStatus.SUBMITTED):
    scan = MagicMock()
    scan.id = scan_id or uuid.uuid4()
    scan.status = status
    scan.image_path = "/tmp/test/receipt.jpg"
    scan.thumbnail_path = "/tmp/test/receipt_thumb.jpg"
    scan.content_type = "image/jpeg"
    scan.ownership_scope_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    scan.submitted_at = datetime(2026, 5, 12, tzinfo=UTC)
    return scan


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


class TestNetworkError:
    """NETWORK_ERROR — transient, retried up to max_retries, then fails."""

    @pytest.mark.asyncio
    async def test_network_error_retried_then_fails(self):
        scan = _mock_scan()
        err = TransientScanError(ScanErrorCode.NETWORK_ERROR, "ECONNRESET")
        mock_extract = AsyncMock(side_effect=err)

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            result = await process_scan(scan.id)

        assert result is False
        assert mock_extract.call_count == 3

    def test_classify_econnreset(self):
        err = classify_error(Exception("ECONNRESET: connection reset by peer"))
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.NETWORK_ERROR

    def test_classify_connection_refused(self):
        err = classify_error(Exception("connection refused to api.google.com"))
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.NETWORK_ERROR


class TestTimeoutError:
    """TIMEOUT_ERROR — transient, retried, then fails."""

    @pytest.mark.asyncio
    async def test_timeout_retried_then_fails(self):
        scan = _mock_scan()
        err = TransientScanError(ScanErrorCode.TIMEOUT_ERROR, "Timed out")
        mock_extract = AsyncMock(side_effect=err)

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            result = await process_scan(scan.id)

        assert result is False
        assert mock_extract.call_count == 3

    def test_classify_deadline_exceeded(self):
        err = classify_error(Exception("deadline exceeded for Gemini API call"))
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.TIMEOUT_ERROR


class TestPermissionDenied:
    """PERMISSION_DENIED — scan owned by different scope → pipeline skips.

    In gastify, permission is enforced at the endpoint layer (auth + ownership
    check). The pipeline itself handles the case where a scan's ownership
    doesn't match by not finding the scan row via scoped queries. This maps to
    the BoletApp PERMISSION_DENIED error type.
    """

    @pytest.mark.asyncio
    async def test_nonexistent_scan_returns_false(self):
        ctx = AsyncMock()
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result_mock)
        ctx.__aenter__ = AsyncMock(return_value=db)
        ctx.__aexit__ = AsyncMock(return_value=False)

        with patch(f"{_W}.async_session", return_value=ctx):
            result = await process_scan(uuid.uuid4())

        assert result is False


class TestStorageQuota:
    """STORAGE_QUOTA (QUOTA_EXCEEDED) — permanent, no retry."""

    @pytest.mark.asyncio
    async def test_quota_exceeded_no_retry(self):
        scan = _mock_scan()
        perm = PermanentScanError(ScanErrorCode.QUOTA_EXCEEDED, "Quota exhausted")
        mock_extract = AsyncMock(side_effect=perm)

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            result = await process_scan(scan.id)

        assert result is False
        assert mock_extract.call_count == 1

    def test_classify_resource_exhausted(self):
        err = classify_error(Exception("resource exhausted: quota exceeded for project"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.QUOTA_EXCEEDED


class TestNotFound:
    """NOT_FOUND — scan not in DB or image file missing."""

    @pytest.mark.asyncio
    async def test_scan_row_not_found(self):
        ctx = AsyncMock()
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result_mock)
        ctx.__aenter__ = AsyncMock(return_value=db)
        ctx.__aexit__ = AsyncMock(return_value=False)

        with patch(f"{_W}.async_session", return_value=ctx):
            result = await process_scan(uuid.uuid4())
        assert result is False

    @pytest.mark.asyncio
    async def test_image_file_not_found(self):
        scan = _mock_scan()
        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch.object(Path, "exists", return_value=False),
        ):
            result = await process_scan(scan.id)
        assert result is False


class TestValidationError:
    """VALIDATION_ERROR — extraction output fails Pydantic parsing → permanent."""

    @pytest.mark.asyncio
    async def test_extraction_parse_error_no_retry(self):
        scan = _mock_scan()
        perm = PermanentScanError(
            ScanErrorCode.EXTRACTION_PARSE_ERROR, "Output validation failed"
        )
        mock_extract = AsyncMock(side_effect=perm)

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            result = await process_scan(scan.id)

        assert result is False
        assert mock_extract.call_count == 1

    def test_classify_pydantic_validation_error(self):
        class OutputValidationError(Exception):
            pass

        err = classify_error(OutputValidationError("field required: total_amount"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.CATEGORIZATION_PARSE_ERROR

    def test_classify_invalid_image_input(self):
        err = classify_error(Exception("invalid image format in request"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.INVALID_IMAGE


class TestUnknownError:
    """UNKNOWN_ERROR — fallback for unrecognized exceptions → permanent."""

    @pytest.mark.asyncio
    async def test_unknown_error_no_retry(self):
        scan = _mock_scan()
        perm = PermanentScanError(ScanErrorCode.UNKNOWN_ERROR, "Unexpected failure")
        mock_extract = AsyncMock(side_effect=perm)

        with (
            patch(f"{_W}.async_session", side_effect=_session_factory(scan)),
            patch(f"{_W}.extract_receipt", mock_extract),
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
            patch(f"{_W}.settings", **_SETTINGS),
        ):
            result = await process_scan(scan.id)

        assert result is False
        assert mock_extract.call_count == 1

    def test_classify_generic_exception(self):
        err = classify_error(Exception("something completely unexpected"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.UNKNOWN_ERROR

    def test_classify_runtime_error(self):
        err = classify_error(RuntimeError("internal state corrupted"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.UNKNOWN_ERROR
