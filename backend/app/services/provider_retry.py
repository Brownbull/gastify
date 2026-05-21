"""Shared retry policy for transient AI provider failures."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

import structlog

from app.config import settings
from app.services.scan_errors import PermanentScanError, classify_error

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

logger = structlog.get_logger()


async def retry_provider_call[T](
    operation: Callable[[], Awaitable[T]],
    *,
    operation_name: str,
    max_attempts: int | None = None,
    base_delay_seconds: float | None = None,
    sleep: Callable[[float], Awaitable[object]] | None = None,
) -> T:
    """Retry transient provider errors with exponential backoff.

    Permanent client/configuration errors are raised immediately. Transient
    errors are retried, but the original provider exception is re-raised after
    attempts are exhausted so callers can still record provider-specific
    details such as HTTP status and response body.
    """

    attempts = max_attempts or settings.gemini_max_retries
    delay_seconds = (
        settings.gemini_retry_delay_seconds if base_delay_seconds is None else base_delay_seconds
    )
    sleep_fn = sleep or asyncio.sleep

    for attempt in range(1, attempts + 1):
        try:
            return await operation()
        except Exception as exc:
            classified = classify_error(exc)
            retryable = not isinstance(classified, PermanentScanError)
            logger.warning(
                "provider_call_error",
                operation=operation_name,
                attempt=attempt,
                max_attempts=attempts,
                retryable=retryable,
                error_code=classified.code.value,
            )
            if not retryable or attempt >= attempts:
                raise

            delay = delay_seconds * (2 ** (attempt - 1))
            logger.info(
                "provider_call_retry_scheduled",
                operation=operation_name,
                attempt=attempt,
                next_attempt=attempt + 1,
                delay_seconds=delay,
                error_code=classified.code.value,
            )
            await sleep_fn(delay)

    raise RuntimeError("unreachable provider retry state")
