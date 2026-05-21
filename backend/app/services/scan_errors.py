"""Typed scan pipeline errors with transient/permanent classification.

Port of BoletApp retryHelper.ts error classification to Python.
Transient errors are retried (network failures, 5xx); permanent errors
go to dead-letter (bad input, safety blocks, 4xx).
"""

import enum
import json


class ScanErrorCode(enum.StrEnum):
    # Transient (retriable)
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    SERVER_ERROR = "SERVER_ERROR"
    OVERLOADED = "OVERLOADED"
    RATE_LIMIT = "RATE_LIMIT"

    # Permanent (dead-letter)
    INVALID_IMAGE = "INVALID_IMAGE"
    SAFETY_BLOCK = "SAFETY_BLOCK"
    EXTRACTION_PARSE_ERROR = "EXTRACTION_PARSE_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

    # Stage 2 — categorization + math gate
    CATEGORIZATION_TIMEOUT = "CATEGORIZATION_TIMEOUT"
    CATEGORIZATION_PARSE_ERROR = "CATEGORIZATION_PARSE_ERROR"
    CATEGORY_NOT_FOUND = "CATEGORY_NOT_FOUND"
    RECONCILIATION_MISMATCH = "RECONCILIATION_MISMATCH"


_TRANSIENT_CODES = frozenset(
    {
        ScanErrorCode.NETWORK_ERROR,
        ScanErrorCode.TIMEOUT_ERROR,
        ScanErrorCode.SERVER_ERROR,
        ScanErrorCode.OVERLOADED,
        ScanErrorCode.RATE_LIMIT,
        ScanErrorCode.CATEGORIZATION_TIMEOUT,
    }
)

_TRANSIENT_KEYWORDS = (
    "econnreset",
    "etimedout",
    "enotfound",
    "socket hang up",
    "overloaded",
    "unavailable",
    "connection reset",
    "connection refused",
    "temporary failure",
)


class ScanError(Exception):
    def __init__(self, code: ScanErrorCode, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(f"[{code}] {message}")


class TransientScanError(ScanError):
    pass


class PermanentScanError(ScanError):
    pass


def classify_error(error: Exception) -> ScanError:
    """Classify an exception as transient or permanent for retry decisions."""
    code = _extract_error_code(error)
    message = _message_with_provider_body(error)[:500]

    if code in _TRANSIENT_CODES:
        return TransientScanError(code, message)
    return PermanentScanError(code, message)


def _extract_error_code(error: Exception) -> ScanErrorCode:
    """Map exception types and messages to ScanErrorCode values."""
    msg = _message_with_provider_body(error).lower()

    if _is_timeout(msg):
        return ScanErrorCode.TIMEOUT_ERROR

    if _is_network(msg):
        return ScanErrorCode.NETWORK_ERROR

    if _is_server_error(error, msg):
        return ScanErrorCode.SERVER_ERROR

    if _is_overloaded(msg):
        return ScanErrorCode.OVERLOADED

    if _is_quota_exceeded(msg):
        return ScanErrorCode.QUOTA_EXCEEDED

    if _is_rate_limit(error, msg):
        return ScanErrorCode.RATE_LIMIT

    if _is_safety_block(msg):
        return ScanErrorCode.SAFETY_BLOCK

    if _is_invalid_input(msg):
        return ScanErrorCode.INVALID_IMAGE

    if _is_categorization_parse_error(error):
        return ScanErrorCode.CATEGORIZATION_PARSE_ERROR

    return ScanErrorCode.UNKNOWN_ERROR


def _is_timeout(msg: str) -> bool:
    return any(kw in msg for kw in ("timeout", "timed out", "deadline"))


def _is_network(msg: str) -> bool:
    return any(
        kw in msg
        for kw in (
            "econnreset",
            "enotfound",
            "socket hang up",
            "connection reset",
            "connection refused",
            "temporary failure",
        )
    )


def _is_server_error(error: Exception, msg: str) -> bool:
    status = getattr(error, "status_code", None) or getattr(error, "status", None)
    if isinstance(status, int) and 500 <= status < 600:
        return True
    return "internal server error" in msg or "502" in msg or "503" in msg


def _is_overloaded(msg: str) -> bool:
    return "overloaded" in msg or "unavailable" in msg


def _is_rate_limit(error: Exception, msg: str) -> bool:
    status = getattr(error, "status_code", None) or getattr(error, "status", None)
    if status == 429:
        return True
    return "rate limit" in msg


def _is_quota_exceeded(msg: str) -> bool:
    return "quota" in msg or "resource exhausted" in msg


def _is_safety_block(msg: str) -> bool:
    return "safety" in msg or "blocked" in msg or "harm" in msg


def _is_invalid_input(msg: str) -> bool:
    return "invalid" in msg and ("image" in msg or "input" in msg or "request" in msg)


def _is_categorization_parse_error(error: Exception) -> bool:
    type_name = type(error).__name__.lower()
    return "validation" in type_name or "output" in type_name


def _message_with_provider_body(error: Exception) -> str:
    message = str(error)
    body = getattr(error, "body", None)
    if body:
        try:
            message = f"{message} {json.dumps(body, sort_keys=True)}"
        except TypeError:
            message = f"{message} {body}"
    return message
