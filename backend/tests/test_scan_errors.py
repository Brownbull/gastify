"""Tests for scan error classification (port of BoletApp retryHelper.ts)."""

from app.services.scan_errors import (
    PermanentScanError,
    ScanErrorCode,
    TransientScanError,
    classify_error,
)


class TestClassifyError:
    def test_timeout_is_transient(self):
        err = classify_error(Exception("Request timed out after 30s"))
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.TIMEOUT_ERROR

    def test_connection_reset_is_transient(self):
        err = classify_error(Exception("ECONNRESET: connection reset by peer"))
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.NETWORK_ERROR

    def test_socket_hang_up_is_transient(self):
        err = classify_error(Exception("socket hang up during request"))
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.NETWORK_ERROR

    def test_5xx_status_is_transient(self):
        exc = Exception("Internal server error")
        exc.status_code = 500  # type: ignore[attr-defined]
        err = classify_error(exc)
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.SERVER_ERROR

    def test_503_in_message_is_transient(self):
        err = classify_error(Exception("503 Service Temporarily Unavailable"))
        assert isinstance(err, TransientScanError)

    def test_overloaded_is_transient(self):
        err = classify_error(Exception("Model is overloaded, try again later"))
        assert isinstance(err, TransientScanError)
        assert err.code == ScanErrorCode.OVERLOADED

    def test_429_rate_limit_is_permanent(self):
        exc = Exception("Too many requests")
        exc.status_code = 429  # type: ignore[attr-defined]
        err = classify_error(exc)
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.RATE_LIMIT

    def test_rate_limit_keyword_is_permanent(self):
        err = classify_error(Exception("rate limit exceeded for this API key"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.RATE_LIMIT

    def test_safety_block_is_permanent(self):
        err = classify_error(Exception("Content blocked by safety filters"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.SAFETY_BLOCK

    def test_invalid_image_is_permanent(self):
        err = classify_error(Exception("invalid image format in request"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.INVALID_IMAGE

    def test_unknown_error_is_permanent(self):
        err = classify_error(Exception("something completely unexpected"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.UNKNOWN_ERROR

    def test_message_truncated_at_500_chars(self):
        long_msg = "x" * 1000
        err = classify_error(Exception(long_msg))
        assert len(err.message) == 500

    def test_error_string_includes_code(self):
        err = classify_error(Exception("timed out"))
        assert "TIMEOUT_ERROR" in str(err)

    def test_unavailable_is_transient(self):
        err = classify_error(Exception("service unavailable"))
        assert isinstance(err, TransientScanError)

    def test_quota_in_message_is_rate_limit(self):
        err = classify_error(Exception("resource exhausted: quota exceeded"))
        assert isinstance(err, PermanentScanError)
        assert err.code == ScanErrorCode.RATE_LIMIT
