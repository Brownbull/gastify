"""Scan extraction worker — idempotent, retry-aware, cost-logging.

Processes a single scan: reads image from disk, runs PydanticAI vision
extraction, handles transient/permanent errors, logs metrics.

Status machine: SUBMITTED → PROCESSING → EXTRACTED | FAILED
"""

from __future__ import annotations

import asyncio
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select, update

from app.agents.extraction import ExtractionResult, extract_receipt
from app.config import settings
from app.db import async_session
from app.models.scan import Scan, ScanStatus
from app.observability import metrics
from app.services.scan_errors import (
    PermanentScanError,
    TransientScanError,
    classify_error,
)

if TYPE_CHECKING:
    import uuid

logger = structlog.get_logger()

GEMINI_INPUT_COST_PER_M = 0.15
GEMINI_OUTPUT_COST_PER_M = 0.60
PROCESSING_TIMEOUT_S = 600


def _estimate_cost_usd(input_tokens: int, output_tokens: int) -> float:
    cost = (
        input_tokens * GEMINI_INPUT_COST_PER_M
        + output_tokens * GEMINI_OUTPUT_COST_PER_M
    )
    return cost / 1_000_000


async def process_scan(scan_id: uuid.UUID) -> ExtractionResult | None:
    """Process a single scan through Stage 1 extraction.

    Returns the ExtractionResult on success, None if skipped or failed.
    Idempotent: only processes scans in SUBMITTED status.
    """
    log = logger.bind(scan_id=str(scan_id))
    start = time.monotonic()

    async with async_session() as db:
        row = await db.execute(select(Scan).where(Scan.id == scan_id))
        scan = row.scalar_one_or_none()

        if scan is None:
            log.warning("scan_not_found")
            return None

        if scan.status == ScanStatus.PROCESSING:
            age_s = (datetime.now(UTC) - scan.submitted_at).total_seconds()
            if age_s < PROCESSING_TIMEOUT_S:
                log.info("scan_skipped", status=scan.status.value)
                return None
            log.warning("scan_processing_stuck_recovered", age_s=round(age_s))
        elif scan.status != ScanStatus.SUBMITTED:
            log.info("scan_skipped", status=scan.status.value)
            return None

        await db.execute(
            update(Scan)
            .where(Scan.id == scan_id)
            .values(status=ScanStatus.PROCESSING)
        )
        await db.commit()

    log.info("scan_processing_started")
    metrics.inc("scans_total")

    image_path = Path(scan.image_path)
    if not image_path.exists():
        await _fail_scan(scan_id, "INVALID_IMAGE", "Image file not found on disk")
        metrics.inc("scans_failed")
        return None

    image_bytes = await asyncio.to_thread(image_path.read_bytes)
    content_type = scan.content_type

    last_error: Exception | None = None
    max_retries = settings.gemini_max_retries
    retry_delay = settings.gemini_retry_delay_seconds

    for attempt in range(1, max_retries + 1):
        try:
            result = await extract_receipt(
                image_bytes=image_bytes,
                content_type=content_type,
                scan_date=scan.submitted_at.date() if scan.submitted_at else None,
            )

            _log_extraction_metrics(result, time.monotonic() - start)

            await _succeed_scan(scan_id, result)
            log.info(
                "scan_extraction_succeeded",
                attempt=attempt,
                merchant=result.extraction.merchant_name,
                total=str(result.extraction.total_amount),
                items=len(result.extraction.line_items),
            )
            return result

        except Exception as exc:
            classified = classify_error(exc)
            last_error = classified
            log.warning(
                "scan_extraction_error",
                attempt=attempt,
                error_code=classified.code.value,
                error_message=str(classified),
                transient=isinstance(classified, TransientScanError),
            )

            if isinstance(classified, PermanentScanError):
                break

            if attempt < max_retries:
                delay = retry_delay * (2 ** (attempt - 1))
                await asyncio.sleep(delay)

    error = last_error or Exception("Unknown extraction failure")
    if isinstance(error, (TransientScanError, PermanentScanError)):
        classified_final = error
    else:
        classified_final = classify_error(error)

    await _fail_scan(scan_id, classified_final.code.value, str(classified_final))
    metrics.inc("scans_failed")

    elapsed_ms = (time.monotonic() - start) * 1000
    log.error(
        "scan_extraction_failed",
        error_code=classified_final.code.value,
        elapsed_ms=round(elapsed_ms, 1),
    )
    return None


def _log_extraction_metrics(result: ExtractionResult, elapsed_s: float) -> None:
    usage = result.usage
    cost = _estimate_cost_usd(usage.input_tokens, usage.output_tokens)

    metrics.inc("scans_success")
    metrics.observe("scan_duration_ms", elapsed_s * 1000)
    metrics.observe("llm_latency_ms", usage.latency_ms)
    metrics.observe("llm_tokens_in", usage.input_tokens)
    metrics.observe("llm_tokens_out", usage.output_tokens)
    metrics.observe("llm_cost_usd", cost)

    logger.info(
        "scan_cost_logged",
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        latency_ms=usage.latency_ms,
        estimated_cost_usd=round(cost, 6),
    )


async def _succeed_scan(scan_id: uuid.UUID, result: ExtractionResult) -> None:
    from sqlalchemy import func

    async with async_session() as db:
        await db.execute(
            update(Scan)
            .where(Scan.id == scan_id)
            .values(
                status=ScanStatus.EXTRACTED,
                processed_at=func.now(),
                error_code=None,
                error_message=None,
            )
        )
        await db.commit()


async def _fail_scan(scan_id: uuid.UUID, error_code: str, error_message: str) -> None:
    from sqlalchemy import func

    async with async_session() as db:
        await db.execute(
            update(Scan)
            .where(Scan.id == scan_id)
            .values(
                status=ScanStatus.FAILED,
                processed_at=func.now(),
                error_code=error_code,
                error_message=error_message[:500],
            )
        )
        await db.commit()
