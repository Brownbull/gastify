"""Scan pipeline worker — two-stage extraction + categorization + math gate + persist.

Processes a single scan through the full pipeline:
  Stage 1: Vision extraction (Gemini image → GeminiExtractionResult)
  Stage 2: Categorization (text-only → CategorizationResult) + math gate + persist

Status machine: SUBMITTED → PROCESSING → EXTRACTED → CATEGORIZED → COMPLETED | NEEDS_REVIEW | FAILED
"""

from __future__ import annotations

import asyncio
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select, update

from app.agents.categorization import categorize_items
from app.agents.extraction import ExtractionResult, extract_receipt
from app.config import settings
from app.db import async_session
from app.models.scan import Scan, ScanStatus
from app.observability import metrics
from app.services.math_gate import reconcile
from app.services.persist_scan import (
    GEMINI_INPUT_COST_PER_M,
    GEMINI_OUTPUT_COST_PER_M,
    persist_scan_result,
)
from app.services.scan_errors import (
    PermanentScanError,
    ScanErrorCode,
    TransientScanError,
    classify_error,
)
from app.services.scan_events import dispatcher

if TYPE_CHECKING:
    import uuid

    from app.agents.categorization import CategorizationOutput

logger = structlog.get_logger()

PROCESSING_TIMEOUT_S = 600


def _emit(
    scan_id: uuid.UUID,
    event_type: str,
    step: str,
    progress_pct: int,
    *,
    data: dict[str, object] | None = None,
    error: dict[str, object] | None = None,
) -> None:
    from app.schemas.scan import ScanEvent

    event = ScanEvent(
        event_type=event_type,
        scan_id=scan_id,
        step=step,
        progress_pct=progress_pct,
        data=data,
        error=error,
    )
    dispatcher.emit(event)
    dispatcher.store_terminal(event)


def _estimate_cost_usd(input_tokens: int, output_tokens: int) -> float:
    cost = input_tokens * GEMINI_INPUT_COST_PER_M + output_tokens * GEMINI_OUTPUT_COST_PER_M
    return cost / 1_000_000


async def process_scan(scan_id: uuid.UUID) -> bool:
    """Process a single scan through the full two-stage pipeline.

    Returns True on success (COMPLETED or NEEDS_REVIEW), False on skip/failure.
    Idempotent: SUBMITTED starts from Stage 1, EXTRACTED resumes from Stage 2.
    """
    log = logger.bind(scan_id=str(scan_id))
    start = time.monotonic()

    scan, _ = await _acquire_scan(scan_id, log)
    if scan is None:
        return False

    extraction = await _run_stage1(scan, scan_id, log, start)
    if extraction is None:
        return False

    return await _run_stage2(scan, scan_id, extraction, log, start)


async def _acquire_scan(
    scan_id: uuid.UUID, log: structlog.stdlib.BoundLogger
) -> tuple[Scan | None, bool]:
    """Load scan and transition to PROCESSING. Returns (scan, resume_from_stage2)."""
    async with async_session() as db:
        row = await db.execute(select(Scan).where(Scan.id == scan_id))
        scan = row.scalar_one_or_none()

        if scan is None:
            log.warning("scan_not_found")
            return None, False

        if scan.status == ScanStatus.EXTRACTED:
            log.info("scan_resuming_stage2")
            return scan, True

        if scan.status == ScanStatus.PROCESSING:
            age_s = (datetime.now(UTC) - scan.submitted_at).total_seconds()
            if age_s < PROCESSING_TIMEOUT_S:
                log.info("scan_skipped", status=scan.status.value)
                return None, False
            log.warning("scan_processing_stuck_recovered", age_s=round(age_s))
        elif scan.status != ScanStatus.SUBMITTED:
            log.info("scan_skipped", status=scan.status.value)
            return None, False

        await db.execute(
            update(Scan).where(Scan.id == scan_id).values(status=ScanStatus.PROCESSING)
        )
        await db.commit()

    log.info("scan_processing_started")
    metrics.inc("scans_total")
    _emit(scan_id, "scan_started", "acquire", 0)
    return scan, False


async def _run_stage1(
    scan: Scan,
    scan_id: uuid.UUID,
    log: structlog.stdlib.BoundLogger,
    start: float,
) -> ExtractionResult | None:
    """Stage 1: Vision extraction with retry."""
    image_path = Path(scan.image_path)
    if not image_path.exists():
        await _fail_scan(scan_id, "INVALID_IMAGE", "Image file not found on disk")
        _emit(
            scan_id,
            "scan_failed",
            "load_image",
            0,
            error={"code": "INVALID_IMAGE", "message": "Image file not found on disk"},
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return None

    image_bytes = await asyncio.to_thread(image_path.read_bytes)
    _emit(scan_id, "image_processed", "load_image", 5, data={"size_bytes": len(image_bytes)})

    last_error: Exception | None = None
    max_retries = settings.gemini_max_retries
    retry_delay = settings.gemini_retry_delay_seconds

    for attempt in range(1, max_retries + 1):
        try:
            result = await extract_receipt(
                image_bytes=image_bytes,
                content_type=scan.content_type,
                scan_date=scan.submitted_at.date() if scan.submitted_at else None,
            )

            _log_extraction_metrics(result, time.monotonic() - start)
            await _transition_scan(scan_id, ScanStatus.EXTRACTED)

            log.info(
                "scan_extraction_succeeded",
                attempt=attempt,
                merchant=result.extraction.merchant_name,
                total=str(result.extraction.total_amount),
                items=len(result.extraction.line_items),
            )
            _emit(
                scan_id,
                "extraction_complete",
                "stage1",
                40,
                data={
                    "merchant": result.extraction.merchant_name,
                    "items": len(result.extraction.line_items),
                    "confidence": result.extraction.confidence_score,
                },
            )
            return result

        except Exception as exc:
            classified = classify_error(exc)
            last_error = classified
            log.warning(
                "scan_extraction_error",
                attempt=attempt,
                error_code=classified.code.value,
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
    _emit(
        scan_id,
        "scan_failed",
        "stage1",
        0,
        error={"code": classified_final.code.value, "message": str(classified_final)},
    )
    dispatcher.close_scan(scan_id)
    metrics.inc("scans_failed")
    return None


async def _run_stage2(
    scan: Scan,
    scan_id: uuid.UUID,
    extraction: ExtractionResult | None,
    log: structlog.stdlib.BoundLogger,
    start: float,
) -> bool:
    """Stage 2: Categorization → math gate → persist."""
    ext = extraction.extraction

    cat_result: CategorizationOutput | None = None
    max_retries = settings.gemini_max_retries
    retry_delay = settings.gemini_retry_delay_seconds

    for attempt in range(1, max_retries + 1):
        try:
            cat_result = await categorize_items(
                items=ext.line_items,
                merchant_name=ext.merchant_name,
                currency_code=ext.currency_code,
            )
            log.info(
                "scan_categorization_succeeded",
                attempt=attempt,
                assignments=len(cat_result.result.assignments),
            )
            break

        except Exception as exc:
            classified = classify_error(exc)
            log.warning(
                "scan_categorization_error",
                attempt=attempt,
                error_code=classified.code.value,
                transient=isinstance(classified, TransientScanError),
            )

            if isinstance(classified, PermanentScanError):
                await _fail_scan(scan_id, classified.code.value, str(classified))
                _emit(
                    scan_id,
                    "scan_failed",
                    "stage2",
                    40,
                    error={"code": classified.code.value, "message": str(classified)},
                )
                dispatcher.close_scan(scan_id)
                metrics.inc("scans_failed")
                return False

            if attempt < max_retries:
                delay = retry_delay * (2 ** (attempt - 1))
                await asyncio.sleep(delay)

    if cat_result is None:
        await _fail_scan(
            scan_id,
            ScanErrorCode.CATEGORIZATION_TIMEOUT.value,
            "Categorization failed after all retries",
        )
        _emit(
            scan_id,
            "scan_failed",
            "stage2",
            40,
            error={
                "code": ScanErrorCode.CATEGORIZATION_TIMEOUT.value,
                "message": "Categorization failed after all retries",
            },
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return False

    await _transition_scan(scan_id, ScanStatus.CATEGORIZED)
    _emit(
        scan_id,
        "categorized",
        "stage2",
        70,
        data={"assignments": len(cat_result.result.assignments)},
    )

    verdict = reconcile(ext)

    _emit(
        scan_id,
        "math_verified",
        "math_gate",
        80,
        data={
            "passed": verdict.passed,
            "discrepancy": verdict.discrepancy_minor_units,
        },
    )

    async with async_session() as db:
        try:
            await persist_scan_result(
                db=db,
                scan=scan,
                extraction=extraction,
                categorization=cat_result,
                verdict=verdict,
            )
            await db.commit()
        except Exception as exc:
            log.error("scan_persist_failed", error=str(exc))
            msg = f"Persist failed: {exc!s}"[:500]
            await _fail_scan(scan_id, ScanErrorCode.UNKNOWN_ERROR.value, msg)
            _emit(
                scan_id,
                "scan_failed",
                "persist",
                80,
                error={"code": ScanErrorCode.UNKNOWN_ERROR.value, "message": msg},
            )
            dispatcher.close_scan(scan_id)
            metrics.inc("scans_failed")
            return False

    if verdict.passed:
        await _complete_scan(scan_id)
        _emit(scan_id, "scan_complete", "done", 100, data={"status": "completed"})
        metrics.inc("scans_success")
    else:
        await _needs_review_scan(scan_id, verdict.discrepancy_minor_units)
        _emit(
            scan_id,
            "scan_complete",
            "done",
            100,
            data={"status": "needs_review", "discrepancy": verdict.discrepancy_minor_units},
        )
        metrics.inc("scans_needs_review")

    dispatcher.close_scan(scan_id)

    elapsed_ms = (time.monotonic() - start) * 1000
    log.info(
        "scan_pipeline_complete",
        status="completed" if verdict.passed else "needs_review",
        discrepancy=verdict.discrepancy_minor_units,
        elapsed_ms=round(elapsed_ms, 1),
    )
    return True


def _log_extraction_metrics(result: ExtractionResult, elapsed_s: float) -> None:
    usage = result.usage
    cost = _estimate_cost_usd(usage.input_tokens, usage.output_tokens)

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


async def _transition_scan(scan_id: uuid.UUID, status: ScanStatus) -> None:
    from sqlalchemy import func

    async with async_session() as db:
        await db.execute(
            update(Scan)
            .where(Scan.id == scan_id)
            .values(status=status, processed_at=func.now(), error_code=None, error_message=None)
        )
        await db.commit()


async def _complete_scan(scan_id: uuid.UUID) -> None:
    await _transition_scan(scan_id, ScanStatus.COMPLETED)


async def _needs_review_scan(scan_id: uuid.UUID, discrepancy: int) -> None:
    from sqlalchemy import func

    async with async_session() as db:
        await db.execute(
            update(Scan)
            .where(Scan.id == scan_id)
            .values(
                status=ScanStatus.NEEDS_REVIEW,
                processed_at=func.now(),
                error_code=ScanErrorCode.RECONCILIATION_MISMATCH.value,
                error_message=f"Math gate failed: discrepancy={discrepancy} minor units",
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
