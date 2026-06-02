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
from typing import TYPE_CHECKING, Literal

import structlog
from sqlalchemy import select, update

from app.agents.categorization import categorize_items
from app.agents.extraction import ExtractionResult, extract_receipt
from app.config import settings
from app.db import async_session, set_session_ownership_scope
from app.models.scan import Scan, ScanStatus
from app.observability import metrics
from app.schemas.scan import ScanCompleteData, ScanCompleteLineItem
from app.services.boleta import BoletaParseError, decode_boleta_barcode, parse_ted_payload
from app.services.llm_costs import estimate_llm_cost_usd
from app.services.math_gate import reconcile
from app.services.persist_scan import persist_scan_result
from app.services.scan_e2e_fixtures import E2EScanFixtureCase, fixture_case_for_scan_image
from app.services.scan_errors import (
    PermanentScanError,
    ScanError,
    ScanErrorCode,
    classify_error,
)
from app.services.scan_events import dispatcher
from app.services.scan_providers import active_scan_provider, mock_case_for_scan
from app.services.scan_review import (
    build_scan_review_signals,
)
from app.services.scan_review import (
    scan_review_level as review_level_for_signals,
)

if TYPE_CHECKING:
    import uuid

    from app.agents.categorization import CategorizationOutput
    from app.schemas.scan import (
        GeminiExtractionResult,
        MathReconciliationVerdict,
        ScanReviewLevel,
        ScanReviewSignal,
    )

logger = structlog.get_logger()

PROCESSING_TIMEOUT_S = 600


async def _emit(
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
    await _sleep_after_e2e_event()


async def _sleep_after_e2e_event() -> None:
    if getattr(settings, "e2e_scan_fixtures_enabled", False) is not True and active_scan_provider(
        settings
    ) not in {"fixture", "mock"}:
        return
    delay_ms = getattr(settings, "e2e_scan_event_delay_ms", 0)
    if not isinstance(delay_ms, int | float) or delay_ms <= 0:
        return
    await asyncio.sleep(delay_ms / 1000)


def _estimate_cost_usd(input_tokens: int, output_tokens: int) -> float:
    return float(
        estimate_llm_cost_usd(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model_name=settings.gemini_model,
        )
    )


def _scan_complete_data(
    *,
    status: Literal["completed", "needs_review"],
    transaction_id: object,
    extraction: GeminiExtractionResult,
    verdict: MathReconciliationVerdict,
    review_level: ScanReviewLevel,
    review_signals: list[ScanReviewSignal],
) -> dict[str, object]:
    payload = ScanCompleteData(
        status=status,
        transaction_id=str(transaction_id),
        merchant_name=extraction.merchant_name,
        transaction_date=extraction.transaction_date,
        currency_code=extraction.currency_code,
        total_amount=float(extraction.total_amount),
        discount_amount=(float(extraction.discount_amount) if extraction.discount_amount else None),
        gross_total_amount=(
            float(extraction.total_amount + extraction.discount_amount)
            if extraction.discount_amount
            else None
        ),
        reconstructed_total=verdict.reconstructed_total,
        reconciliation_severity=verdict.severity,
        line_items_count=len(extraction.line_items),
        line_items=[
            ScanCompleteLineItem(
                name=item.name,
                qty=float(item.qty) if item.qty is not None else None,
                unit_price=float(item.unit_price) if item.unit_price is not None else None,
                total_price=float(item.total_price),
            )
            for item in extraction.line_items
        ],
        confidence_score=extraction.confidence_score,
        is_unknown_merchant=extraction.merchant_name.strip().lower() == "unknown",
        review_level=review_level,
        review_signals=review_signals,
        discrepancy=verdict.discrepancy_minor_units if not verdict.passed else None,
        discrepancy_ratio=verdict.discrepancy_ratio if not verdict.passed else None,
    )
    data: dict[str, object] = payload.model_dump(mode="json")
    if not verdict.passed:
        return data
    data.pop("discrepancy", None)
    data.pop("discrepancy_ratio", None)
    return data


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

    scan_provider = active_scan_provider(settings)
    if scan_provider == "fixture":
        return await _run_e2e_fixture_pipeline(scan, scan_id, log, start)
    if scan_provider == "mock":
        return await _run_mock_provider_pipeline(scan, scan_id, log, start)

    # Structured-boleta shortcut: if the upload carries a parseable SII timbre
    # (TED), produce the transaction from it with 0 extraction-LLM tokens. Any
    # miss (no barcode / unparseable) falls through to the proven vision path.
    boleta_result = await _try_boleta_shortcut(scan, scan_id, log, start)
    if boleta_result is not None:
        return boleta_result

    extraction = await _run_stage1(scan, scan_id, log, start)
    if extraction is None:
        return False

    return await _run_stage2(scan, scan_id, extraction, log, start)


async def _try_boleta_shortcut(
    scan: Scan,
    scan_id: uuid.UUID,
    log: structlog.stdlib.BoundLogger,
    start: float,
) -> bool | None:
    """Attempt the structured-boleta shortcut. Returns the pipeline result when a
    boleta was handled, or None to fall through to the vision pipeline."""
    image_path = Path(scan.image_path)
    if not image_path.exists():
        return None  # let _run_stage1 own the missing-image failure path

    image_bytes = await asyncio.to_thread(image_path.read_bytes)
    payload = decode_boleta_barcode(image_bytes)
    if payload is None:
        return None  # no boleta barcode → vision path

    try:
        extraction_data = parse_ted_payload(payload)
    except BoletaParseError as exc:
        # Fail-safe: an unparseable/forged timbre falls through to vision.
        log.info("boleta_parse_failed_fallback_to_vision", error=str(exc))
        return None

    log.info("boleta_shortcut", merchant=extraction_data.merchant_name)
    return await _run_boleta_pipeline(scan, scan_id, log, start, extraction_data)


async def _run_boleta_pipeline(
    scan: Scan,
    scan_id: uuid.UUID,
    log: structlog.stdlib.BoundLogger,
    start: float,
    extraction_data: GeminiExtractionResult,
) -> bool:
    """Produce a transaction from a parsed boleta TED with 0 LLM tokens, reusing
    the proven persist/math/event path (`_run_stage2` with a prebuilt result)."""
    from app.agents.categorization import CategorizationOutput, CategorizationUsage
    from app.agents.extraction import ExtractionUsage
    from app.schemas.scan import CategorizationResult, LineItemExtraction

    # Reconciliation needs items summing to the total; synthesize one when the
    # timbre carried no IT1 so the math gate passes on the structured total.
    if not extraction_data.line_items:
        extraction_data = extraction_data.model_copy(
            update={
                "line_items": [
                    LineItemExtraction(
                        name="Boleta electrónica",
                        total_price=extraction_data.total_amount,
                    )
                ]
            }
        )

    extraction = ExtractionResult(
        extraction=extraction_data,
        usage=ExtractionUsage(input_tokens=0, output_tokens=0, latency_ms=0.0),
        # Audit signal: the persisted prompt_version cleanly identifies the boleta
        # shortcut (vs a vision-extracted transaction), not a gemini model name.
        model_name="boleta-structured",
    )
    metrics.inc("scans_boleta_shortcut")

    await _emit(scan_id, "image_processed", "load_image", 5, data={"boleta": True})
    await _transition_scan(scan_id, ScanStatus.EXTRACTED)
    await _emit(
        scan_id,
        "extraction_complete",
        "stage1",
        40,
        data={
            "merchant": extraction_data.merchant_name,
            "items": len(extraction_data.line_items),
            "confidence": extraction_data.confidence_score,
            "boleta": True,
        },
    )

    # Items keep no AI category (deterministic boleta path, 0 categorization
    # tokens); merchant→category mapping memory applies downstream.
    categorization = CategorizationOutput(
        result=CategorizationResult(assignments=[]),
        usage=CategorizationUsage(input_tokens=0, output_tokens=0, latency_ms=0.0),
    )
    return await _run_stage2(scan, scan_id, extraction, log, start, categorization=categorization)


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
        elif scan.status not in (ScanStatus.SUBMITTED, ScanStatus.QUEUED):
            log.info("scan_skipped", status=scan.status.value)
            return None, False

        await db.execute(
            update(Scan).where(Scan.id == scan_id).values(status=ScanStatus.PROCESSING)
        )
        await db.commit()

    log.info("scan_processing_started")
    metrics.inc("scans_total")
    await _emit(scan_id, "scan_started", "acquire", 0)
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
        await _emit(
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
    await _emit(scan_id, "image_processed", "load_image", 5, data={"size_bytes": len(image_bytes)})

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
            merchant=result.extraction.merchant_name,
            total=str(result.extraction.total_amount),
            items=len(result.extraction.line_items),
        )
        await _emit(
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
        classified_final = classify_error(exc)
        log.warning(
            "scan_extraction_error",
            error_code=classified_final.code.value,
            transient=not isinstance(classified_final, PermanentScanError),
        )

    await _settle_pipeline_error(scan_id, classified_final, stage="stage1", progress=0)
    return None


async def _run_stage2(
    scan: Scan,
    scan_id: uuid.UUID,
    extraction: ExtractionResult,
    log: structlog.stdlib.BoundLogger,
    start: float,
    categorization: CategorizationOutput | None = None,
) -> bool:
    """Stage 2: Categorization → math gate → persist."""
    ext = extraction.extraction

    cat_result: CategorizationOutput | None = categorization

    if cat_result is None:
        try:
            cat_result = await categorize_items(
                items=ext.line_items,
                merchant_name=ext.merchant_name,
                currency_code=ext.currency_code,
            )
            log.info(
                "scan_categorization_succeeded",
                assignments=len(cat_result.result.assignments),
            )
        except Exception as exc:
            classified = classify_error(exc)
            log.warning(
                "scan_categorization_error",
                error_code=classified.code.value,
                transient=not isinstance(classified, PermanentScanError),
            )
            await _settle_pipeline_error(scan_id, classified, stage="stage2", progress=40)
            return False
    else:
        log.info(
            "scan_categorization_fixture",
            assignments=len(cat_result.result.assignments),
        )

    await _transition_scan(scan_id, ScanStatus.CATEGORIZED)
    await _emit(
        scan_id,
        "categorized",
        "stage2",
        70,
        data={"assignments": len(cat_result.result.assignments)},
    )

    verdict = reconcile(ext)
    review_signals = build_scan_review_signals(
        raw_extraction=extraction.raw_extraction,
        extraction=ext,
        verdict=verdict,
    )
    review_level = review_level_for_signals(review_signals)

    await _emit(
        scan_id,
        "math_verified",
        "math_gate",
        80,
        data={
            "passed": verdict.passed,
            "discrepancy": verdict.discrepancy_minor_units,
            "discrepancy_ratio": verdict.discrepancy_ratio,
            "severity": verdict.severity,
            "reconstructed_total": verdict.reconstructed_total,
        },
    )

    async with async_session() as db:
        try:
            # Background-task session: establish the RLS scope GUC from the scan's
            # ownership scope, else the transaction/items INSERTs violate the
            # WITH CHECK policy under the least-privilege role (P43).
            await set_session_ownership_scope(db, scan.ownership_scope_id)
            transaction = await persist_scan_result(
                db=db,
                scan=scan,
                extraction=extraction,
                categorization=cat_result,
                verdict=verdict,
                review_level=review_level,
                review_signals=review_signals,
            )
            # Durably link the scan to its transaction in the SAME commit as the
            # transaction creation (atomic; covers both the completed and needs_review
            # terminal branches). Lets GET /scans/{id} expose the result to the poll
            # fallback without the in-process event snapshot (D66).
            await db.execute(
                update(Scan).where(Scan.id == scan_id).values(transaction_id=transaction.id)
            )
            await db.commit()
        except Exception as exc:
            log.error("scan_persist_failed", error=str(exc))
            msg = f"Persist failed: {exc!s}"[:500]
            await _fail_scan(scan_id, ScanErrorCode.UNKNOWN_ERROR.value, msg)
            await _emit(
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
        await _emit(
            scan_id,
            "scan_complete",
            "done",
            100,
            data=_scan_complete_data(
                status="completed",
                transaction_id=transaction.id,
                extraction=ext,
                verdict=verdict,
                review_level=review_level,
                review_signals=review_signals,
            ),
        )
        metrics.inc("scans_success")
    else:
        await _needs_review_scan(scan_id, verdict.discrepancy_minor_units)
        await _emit(
            scan_id,
            "scan_complete",
            "done",
            100,
            data=_scan_complete_data(
                status="needs_review",
                transaction_id=transaction.id,
                extraction=ext,
                verdict=verdict,
                review_level=review_level,
                review_signals=review_signals,
            ),
        )
        metrics.inc("scans_needs_review")

    dispatcher.close_scan(scan_id)

    elapsed_ms = (time.monotonic() - start) * 1000
    log.info(
        "scan_pipeline_complete",
        status="completed" if verdict.passed else "needs_review",
        discrepancy=verdict.discrepancy_minor_units,
        scan_review_level=review_level,
        scan_review_signal_count=len(review_signals),
        elapsed_ms=round(elapsed_ms, 1),
    )
    return True


async def _run_e2e_fixture_pipeline(
    scan: Scan,
    scan_id: uuid.UUID,
    log: structlog.stdlib.BoundLogger,
    start: float,
) -> bool:
    image_path = Path(scan.image_path)
    if not image_path.exists():
        await _fail_scan(scan_id, "INVALID_IMAGE", "Image file not found on disk")
        await _emit(
            scan_id,
            "scan_failed",
            "load_image",
            0,
            error={"code": "INVALID_IMAGE", "message": "Image file not found on disk"},
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return False

    fixture = fixture_case_for_scan_image(image_path)
    if (
        fixture is None
        and getattr(settings, "scan_test_controls_enabled", False) is True
        and (scan.original_filename or "").startswith("gastify-test-case-")
    ):
        fixture = mock_case_for_scan(scan.original_filename)
    if fixture is None:
        message = "No deterministic E2E scan fixture matched uploaded image hash"
        await _fail_scan(scan_id, ScanErrorCode.INVALID_IMAGE.value, message)
        await _emit(
            scan_id,
            "scan_failed",
            "fixture_lookup",
            0,
            error={"code": ScanErrorCode.INVALID_IMAGE.value, "message": message},
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return False

    image_bytes = await asyncio.to_thread(image_path.read_bytes)
    await _emit(scan_id, "image_processed", "load_image", 5, data={"size_bytes": len(image_bytes)})

    if fixture.outcome == "failure":
        return await _fail_e2e_fixture_scan(scan_id, fixture)

    if fixture.extraction is None or fixture.categorization is None:
        message = f"E2E scan fixture {fixture.key} is missing success payloads"
        await _fail_scan(scan_id, ScanErrorCode.UNKNOWN_ERROR.value, message)
        await _emit(
            scan_id,
            "scan_failed",
            "fixture_payload",
            0,
            error={"code": ScanErrorCode.UNKNOWN_ERROR.value, "message": message},
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return False

    _log_extraction_metrics(fixture.extraction, time.monotonic() - start)
    await _transition_scan(scan_id, ScanStatus.EXTRACTED)
    await _emit(
        scan_id,
        "extraction_complete",
        "stage1",
        40,
        data={
            "merchant": fixture.extraction.extraction.merchant_name,
            "items": len(fixture.extraction.extraction.line_items),
            "confidence": fixture.extraction.extraction.confidence_score,
            "fixture": fixture.key,
        },
    )

    log.info("scan_e2e_fixture_loaded", fixture=fixture.key)
    return await _run_stage2(
        scan,
        scan_id,
        fixture.extraction,
        log,
        start,
        categorization=fixture.categorization,
    )


async def _run_mock_provider_pipeline(
    scan: Scan,
    scan_id: uuid.UUID,
    log: structlog.stdlib.BoundLogger,
    start: float,
) -> bool:
    image_path = Path(scan.image_path)
    if not image_path.exists():
        await _fail_scan(scan_id, "INVALID_IMAGE", "Image file not found on disk")
        await _emit(
            scan_id,
            "scan_failed",
            "load_image",
            0,
            error={"code": "INVALID_IMAGE", "message": "Image file not found on disk"},
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return False

    image_bytes = await asyncio.to_thread(image_path.read_bytes)
    await _emit(scan_id, "image_processed", "load_image", 5, data={"size_bytes": len(image_bytes)})

    fixture = fixture_case_for_scan_image(image_path) or mock_case_for_scan(
        getattr(scan, "original_filename", None)
    )
    if fixture is None:
        message = "No mock scan fixture matched uploaded image or filename"
        await _fail_scan(scan_id, ScanErrorCode.INVALID_IMAGE.value, message)
        await _emit(
            scan_id,
            "scan_failed",
            "mock_lookup",
            0,
            error={"code": ScanErrorCode.INVALID_IMAGE.value, "message": message},
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return False
    if fixture.outcome == "failure":
        return await _fail_e2e_fixture_scan(scan_id, fixture)

    if fixture.extraction is None or fixture.categorization is None:
        message = f"Mock scan provider fixture {fixture.key} is missing success payloads"
        await _fail_scan(scan_id, ScanErrorCode.UNKNOWN_ERROR.value, message)
        await _emit(
            scan_id,
            "scan_failed",
            "mock_payload",
            0,
            error={"code": ScanErrorCode.UNKNOWN_ERROR.value, "message": message},
        )
        dispatcher.close_scan(scan_id)
        metrics.inc("scans_failed")
        return False

    _log_extraction_metrics(fixture.extraction, time.monotonic() - start)
    await _transition_scan(scan_id, ScanStatus.EXTRACTED)
    await _emit(
        scan_id,
        "extraction_complete",
        "stage1",
        40,
        data={
            "merchant": fixture.extraction.extraction.merchant_name,
            "items": len(fixture.extraction.extraction.line_items),
            "confidence": fixture.extraction.extraction.confidence_score,
            "provider": "mock",
            "fixture": fixture.key,
        },
    )

    log.info("scan_mock_provider_loaded", fixture=fixture.key)
    return await _run_stage2(
        scan,
        scan_id,
        fixture.extraction,
        log,
        start,
        categorization=fixture.categorization,
    )


async def _fail_e2e_fixture_scan(scan_id: uuid.UUID, fixture: E2EScanFixtureCase) -> bool:
    code = fixture.failure_code or ScanErrorCode.UNKNOWN_ERROR.value
    message = fixture.failure_message or "E2E fixture requested scan failure"
    await _fail_scan(scan_id, code, message)
    await _emit(
        scan_id,
        "scan_failed",
        "stage1",
        40,
        error={"code": code, "message": message, "fixture": fixture.key},
    )
    dispatcher.close_scan(scan_id)
    metrics.inc("scans_failed")
    return False


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


async def _queue_scan(scan_id: uuid.UUID, error_code: str, error_message: str) -> None:
    """Park a quota-throttled scan in QUEUED for a later retry sweep — NOT a
    terminal failure. processed_at stays null so the scan remains retriable."""
    async with async_session() as db:
        await db.execute(
            update(Scan)
            .where(Scan.id == scan_id)
            .values(
                status=ScanStatus.QUEUED,
                error_code=error_code,
                error_message=error_message[:500],
            )
        )
        await db.commit()


async def requeue_quota_throttled_scans() -> list[uuid.UUID]:
    """Retry sweep: flip quota-throttled QUEUED scans back to SUBMITTED so the
    worker reprocesses them once quota recovers, clearing the parked error.

    Returns the requeued scan ids for the caller (scheduler / ops entrypoint) to
    re-dispatch through ``process_scan``. The periodic invocation is operational
    (a scheduled job); this function is the testable primitive it calls.
    """
    async with async_session() as db:
        rows = await db.execute(select(Scan.id).where(Scan.status == ScanStatus.QUEUED))
        ids = [row[0] for row in rows.all()]
        if ids:
            await db.execute(
                update(Scan)
                .where(Scan.status == ScanStatus.QUEUED)
                .values(
                    status=ScanStatus.SUBMITTED,
                    error_code=None,
                    error_message=None,
                )
            )
            await db.commit()
        return ids


async def _settle_pipeline_error(
    scan_id: uuid.UUID,
    classified: ScanError,
    *,
    stage: str,
    progress: int,
) -> None:
    """Settle a classified LLM-pipeline error. QUOTA_EXCEEDED degrades gracefully
    to QUEUED (no 5xx, retriable); every other code fails. Emits the matching
    stream event, records a per-error-code metric, and closes the stream."""
    code = classified.code.value
    metrics.inc(f"scan_error_{code.lower()}")
    if classified.code == ScanErrorCode.QUOTA_EXCEEDED:
        await _queue_scan(scan_id, code, str(classified))
        await _emit(
            scan_id,
            "scan_queued",
            stage,
            progress,
            data={"code": code, "reason": "quota_throttled"},
        )
        metrics.inc("scans_queued")
    else:
        await _fail_scan(scan_id, code, str(classified))
        await _emit(
            scan_id,
            "scan_failed",
            stage,
            progress,
            error={"code": code, "message": str(classified)},
        )
        metrics.inc("scans_failed")
    dispatcher.close_scan(scan_id)
