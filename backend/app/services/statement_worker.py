"""Statement extraction worker."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import delete, select, update

from app.config import settings
from app.db import async_session, set_session_ownership_scope
from app.models.statement import (
    Statement,
    StatementLine,
    StatementLineType,
    StatementReconciliationRun,
    StatementStatus,
)
from app.schemas.statement import StatementEvent, StatementExtractionOutput
from app.services.statement_events import statement_dispatcher
from app.services.statement_extraction import extract_statement_pdf
from app.services.statement_reconciliation import run_statement_reconciliation

if TYPE_CHECKING:
    import uuid

logger = structlog.get_logger()


async def _emit(
    statement_id: uuid.UUID,
    event_type: str,
    step: str,
    progress_pct: int,
    *,
    data: dict[str, object] | None = None,
    error: dict[str, object] | None = None,
) -> None:
    event = StatementEvent(
        event_type=event_type,
        statement_id=statement_id,
        step=step,
        progress_pct=progress_pct,
        data=data,
        error=error,
    )
    statement_dispatcher.emit(event)
    statement_dispatcher.store_terminal(event)
    await _sleep_after_e2e_event()


async def _sleep_after_e2e_event() -> None:
    if settings.statement_provider != "fixture":
        return
    delay_ms = getattr(settings, "e2e_scan_event_delay_ms", 0)
    if not isinstance(delay_ms, int | float) or delay_ms <= 0:
        return
    await asyncio.sleep(delay_ms / 1000)


async def process_statement(
    statement_id: uuid.UUID,
    *,
    password: str | None = None,
    ownership_scope_id: uuid.UUID | None = None,
) -> bool:
    """Extract a statement PDF and persist normalized statement lines.

    ``ownership_scope_id`` is threaded from the dispatching request so the worker
    can set the RLS GUC for reading/writing scope-bound tables (P43). Required for
    the least-privilege runtime role.
    """
    log = logger.bind(statement_id=str(statement_id))
    if ownership_scope_id is None:
        log.warning(
            "statement_worker_no_scope", hint="process_statement called without ownership_scope_id"
        )
    statement = await _acquire_statement(statement_id, log, ownership_scope_id=ownership_scope_id)
    if statement is None:
        return False
    if ownership_scope_id is None:
        ownership_scope_id = statement.ownership_scope_id

    await _emit(statement_id, "statement_llm_start", "llm_start", 20)
    try:
        extraction = await asyncio.to_thread(
            extract_statement_pdf,
            Path(statement.file_path),
            provider=settings.statement_provider,
            password=password,
            issuer_hint=statement.issuer,
        )
    except Exception as exc:
        log.exception("statement_extraction_provider_failed", error=str(exc))
        await _finish_extraction_exception(statement_id, ownership_scope_id=ownership_scope_id)
        return True

    if extraction.pdf_status != "readable":
        await _finish_pdf_status(statement_id, extraction, ownership_scope_id=ownership_scope_id)
        return True

    await _emit(
        statement_id,
        "statement_llm_end",
        "llm_end",
        70,
        data={
            "provider": extraction.processing.provider,
            "line_count": len(extraction.lines),
            "page_count": extraction.processing.page_count,
        },
    )

    await _persist_extraction(statement_id, extraction, ownership_scope_id=ownership_scope_id)
    await _emit(
        statement_id,
        "statement_reconciling",
        "reconciling",
        85,
        data={"line_count": len(extraction.lines)},
    )
    reconciliation = await _reconcile_statement(statement_id, ownership_scope_id=ownership_scope_id)
    await _emit(
        statement_id,
        "statement_completed",
        "completed",
        100,
        data={
            "status": StatementStatus.COMPLETED.value,
            "line_count": len(extraction.lines),
            "matched_count": reconciliation.matched_count,
            "statement_only_count": reconciliation.statement_only_count,
            "receipt_only_count": reconciliation.receipt_only_count,
            "ambiguous_count": reconciliation.ambiguous_count,
            "coverage_ratio": (
                float(reconciliation.coverage_ratio)
                if reconciliation.coverage_ratio is not None
                else None
            ),
        },
    )
    statement_dispatcher.close_statement(statement_id)
    log.info(
        "statement_extraction_complete",
        provider=extraction.processing.provider,
        line_count=len(extraction.lines),
    )
    return True


async def _acquire_statement(
    statement_id: uuid.UUID,
    log: structlog.stdlib.BoundLogger,
    *,
    ownership_scope_id: uuid.UUID | None = None,
) -> Statement | None:
    async with async_session() as db:
        if ownership_scope_id is not None:
            await set_session_ownership_scope(db, ownership_scope_id)
        row = await db.execute(select(Statement).where(Statement.id == statement_id))
        statement = row.scalar_one_or_none()
        if statement is None:
            log.warning("statement_not_found")
            return None
        if statement.status not in {
            StatementStatus.UPLOADED,
            StatementStatus.QUEUED,
            StatementStatus.PASSWORD_REQUIRED,
            StatementStatus.PASSWORD_INVALID,
            StatementStatus.FAILED,
        }:
            log.info("statement_skipped", status=statement.status.value)
            return None
        await db.execute(
            update(Statement)
            .where(Statement.id == statement_id)
            .values(
                status=StatementStatus.EXTRACTING,
                error_code=None,
                error_message=None,
                updated_at=datetime.now(UTC),
            )
        )
        await db.commit()

    statement_dispatcher.clear_terminal(statement_id)
    await _emit(
        statement_id,
        "statement_picked_up",
        "picked_up",
        5,
        data={"provider": settings.statement_provider},
    )
    log.info("statement_extraction_started", provider=settings.statement_provider)
    return statement


async def _finish_pdf_status(
    statement_id: uuid.UUID,
    extraction: StatementExtractionOutput,
    *,
    ownership_scope_id: uuid.UUID | None = None,
) -> None:
    if extraction.pdf_status == "password_required":
        status = StatementStatus.PASSWORD_REQUIRED
        event_type = "statement_password_required"
        error_code = "PASSWORD_REQUIRED"
        message = "Statement PDF requires a password"
    elif extraction.pdf_status == "password_invalid":
        status = StatementStatus.PASSWORD_INVALID
        event_type = "statement_password_invalid"
        error_code = "PASSWORD_INVALID"
        message = "Statement PDF password is invalid"
    else:
        status = StatementStatus.FAILED
        event_type = "statement_failed"
        error_code = "EXTRACTION_FAILED"
        message = "Statement PDF could not be extracted"

    async with async_session() as db:
        if ownership_scope_id is not None:
            await set_session_ownership_scope(db, ownership_scope_id)
        await db.execute(
            update(Statement)
            .where(Statement.id == statement_id)
            .values(
                status=status,
                pdf_status=extraction.pdf_status,
                page_count=extraction.processing.page_count,
                warnings=extraction.processing.warnings,
                error_code=error_code,
                error_message=message,
                updated_at=datetime.now(UTC),
            )
        )
        await db.commit()
    await _emit(
        statement_id,
        event_type,
        "failed" if status == StatementStatus.FAILED else extraction.pdf_status,
        100,
        error={"code": error_code, "message": message},
    )
    statement_dispatcher.close_statement(statement_id)


async def _finish_extraction_exception(
    statement_id: uuid.UUID,
    *,
    ownership_scope_id: uuid.UUID | None = None,
) -> None:
    message = "Statement PDF could not be extracted"
    async with async_session() as db:
        if ownership_scope_id is not None:
            await set_session_ownership_scope(db, ownership_scope_id)
        await db.execute(
            update(Statement)
            .where(Statement.id == statement_id)
            .values(
                status=StatementStatus.FAILED,
                pdf_status="extraction_failed",
                warnings=["provider_error"],
                error_code="EXTRACTION_FAILED",
                error_message=message,
                updated_at=datetime.now(UTC),
            )
        )
        await db.commit()
    await _emit(
        statement_id,
        "statement_failed",
        "failed",
        100,
        error={"code": "EXTRACTION_FAILED", "message": message},
    )
    statement_dispatcher.close_statement(statement_id)


async def _persist_extraction(
    statement_id: uuid.UUID,
    extraction: StatementExtractionOutput,
    *,
    ownership_scope_id: uuid.UUID | None = None,
) -> None:
    statement_info = extraction.statement
    processing = extraction.processing
    async with async_session() as db:
        if ownership_scope_id is not None:
            await set_session_ownership_scope(db, ownership_scope_id)
        await db.execute(delete(StatementLine).where(StatementLine.statement_id == statement_id))
        row = await db.execute(select(Statement).where(Statement.id == statement_id))
        statement = row.scalar_one()
        statement.status = StatementStatus.EXTRACTED
        statement.pdf_status = extraction.pdf_status
        statement.issuer = statement_info.issuer
        statement.period_start = statement_info.period_start
        statement.period_end = statement_info.period_end
        statement.closing_date = statement_info.closing_date
        statement.due_date = statement_info.due_date
        statement.currency = statement_info.currency
        statement.total_debit_minor = statement_info.total_debit_minor
        statement.total_credit_minor = statement_info.total_credit_minor
        statement.payment_due_minor = statement_info.payment_due_minor
        statement.page_count = processing.page_count
        statement.extraction_provider = processing.provider
        statement.extraction_prompt_id = processing.prompt_id
        statement.extraction_model_name = processing.model_name
        statement.extraction_input_mode = processing.input_mode
        statement.extraction_llm_input_tokens = processing.llm_input_tokens
        statement.extraction_llm_output_tokens = processing.llm_output_tokens
        statement.extraction_llm_cost_usd = processing.llm_cost_usd
        statement.extraction_fallback_reason = processing.fallback_reason
        statement.extraction_cache_status = processing.cache_status
        statement.extraction_routing_reasons = processing.deterministic_routing_reasons
        statement.extraction_evidence_row_count = processing.evidence_row_count
        statement.extraction_evidence_candidate_row_count = processing.evidence_candidate_row_count
        statement.confidence = (
            Decimal(str(processing.confidence)) if processing.confidence is not None else None
        )
        statement.warnings = processing.warnings
        statement.error_code = None
        statement.error_message = None
        statement.extracted_at = datetime.now(UTC)
        statement.updated_at = datetime.now(UTC)

        for line in extraction.lines:
            db.add(
                StatementLine(
                    statement_id=statement_id,
                    source_order=line.source_order,
                    row_type=line.row_type,
                    line_date=line.date,
                    description=line.description,
                    amount_minor=line.amount_minor,
                    currency=line.currency,
                    line_type=StatementLineType(line.line_type),
                    installment=line.installment,
                    original_currency=line.original_currency,
                    original_amount_minor=line.original_amount_minor,
                    card_alias_candidate=line.card_alias_candidate,
                    category_key=line.category_key,
                    amount_selection_reason=line.amount_selection_reason,
                    amount_candidates=[
                        candidate.model_dump(mode="json") for candidate in line.amount_candidates
                    ],
                    ledger_ready=line.ledger_ready,
                    confidence=(
                        Decimal(str(line.confidence)) if line.confidence is not None else None
                    ),
                    warnings=line.warnings,
                    source_row_index=line.source_row_index,
                    source_page=line.source_page,
                    field_provenance=line.field_provenance,
                )
            )
        await db.commit()


async def _reconcile_statement(
    statement_id: uuid.UUID,
    *,
    ownership_scope_id: uuid.UUID | None = None,
) -> StatementReconciliationRun:
    async with async_session() as db:
        if ownership_scope_id is not None:
            await set_session_ownership_scope(db, ownership_scope_id)
        return await run_statement_reconciliation(db, statement_id=statement_id)
