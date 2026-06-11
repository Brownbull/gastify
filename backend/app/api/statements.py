"""Statement upload and processing endpoints."""

from __future__ import annotations

import hashlib
import shutil
import uuid
from pathlib import Path
from typing import Annotated

import structlog
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth  # noqa: TC001 - FastAPI needs Annotated dependency at runtime.
from app.config import settings
from app.db import get_db
from app.models.statement import CardAlias, Statement, StatementLine, StatementStatus
from app.schemas.statement import (
    StatementLineRecordResponse,
    StatementProcessRequest,
    StatementReconciliationResponse,
    StatementRecordResponse,
    StatementUploadResponse,
)
from app.services.statement_extraction import inspect_statement_pdf
from app.services.statement_reconciliation import (
    StatementNotReadyForReconciliationError,
    get_statement_reconciliation_response,
    run_statement_reconciliation,
)
from app.services.statement_worker import process_statement

logger = structlog.get_logger()

router = APIRouter(prefix="/statements", tags=["statements"])

DB = Annotated[AsyncSession, Depends(get_db)]
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}
MAX_FILE_SIZE = 25 * 1024 * 1024


@router.post("", status_code=status.HTTP_201_CREATED, response_model=StatementUploadResponse)
async def upload_statement(
    file: UploadFile,
    auth: Auth,
    db: DB,
    background_tasks: BackgroundTasks,
    response: Response,
    card_alias_id: Annotated[uuid.UUID | None, Form()] = None,
    password: Annotated[str | None, Form()] = None,
    ai_processing_consent: Annotated[bool, Form()] = False,
) -> StatementUploadResponse:
    if not ai_processing_consent:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI processing consent required",
        )
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported statement type: application/pdf required",
        )
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Empty file")
    if len(raw_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )

    if card_alias_id is not None:
        await _assert_card_alias(db, auth=auth, card_alias_id=card_alias_id)

    sha256 = hashlib.sha256(raw_bytes).hexdigest()
    duplicate = await _find_statement_by_sha(db, auth.ownership_scope_id, sha256)
    if duplicate is not None:
        queued = False
        should_queue = False
        metadata_changed = False
        if not duplicate.ai_processing_consent:
            duplicate.ai_processing_consent = True
            metadata_changed = True
        if card_alias_id is not None and duplicate.card_alias_id != card_alias_id:
            duplicate.card_alias_id = card_alias_id
            metadata_changed = True
        if password and duplicate.status in {
            StatementStatus.PASSWORD_REQUIRED,
            StatementStatus.PASSWORD_INVALID,
            StatementStatus.FAILED,
        }:
            duplicate.status = StatementStatus.QUEUED
            duplicate.error_code = None
            duplicate.error_message = None
            metadata_changed = True
            should_queue = True
        elif duplicate.status in {
            StatementStatus.UPLOADED,
            StatementStatus.QUEUED,
            StatementStatus.FAILED,
        }:
            # A dup hit on a statement PARKED pre-processing (its worker dispatch died —
            # e.g. a deploy restart dropped the BackgroundTask; statements have no
            # requeue sweep) or FAILED would otherwise return 200 and never recover. A
            # re-upload is the user's explicit retry: refresh the stored PDF from the
            # fresh bytes (same sha == identical content; heals a lost/corrupt file)
            # and re-dispatch — _acquire_statement is idempotent (eligible statuses only).
            dup_pdf = Path(duplicate.file_path)
            dup_pdf.parent.mkdir(parents=True, exist_ok=True)
            dup_pdf.write_bytes(raw_bytes)
            if duplicate.status == StatementStatus.FAILED:
                duplicate.status = StatementStatus.QUEUED
                duplicate.error_code = None
                duplicate.error_message = None
                metadata_changed = True
            should_queue = True
        if metadata_changed:
            await db.commit()
            await db.refresh(duplicate)
        if should_queue:
            background_tasks.add_task(
                process_statement,
                duplicate.id,
                password=password,
                ownership_scope_id=auth.ownership_scope_id,
            )
            queued = True
        response.status_code = status.HTTP_200_OK
        return StatementUploadResponse(
            statement=StatementRecordResponse.model_validate(duplicate),
            duplicate=True,
            queued=queued,
            password_required=not queued and duplicate.status == StatementStatus.PASSWORD_REQUIRED,
        )

    statement_id = uuid.uuid4()
    statement_dir = (
        Path(settings.statement_storage_dir) / str(auth.ownership_scope_id) / str(statement_id)
    )
    statement_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = statement_dir / "statement.pdf"
    pdf_path.write_bytes(raw_bytes)

    inspection = inspect_statement_pdf(pdf_path, password=password)
    if inspection.status == "extraction_failed" and "invalid_pdf" in inspection.warnings:
        shutil.rmtree(statement_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File could not be processed as a PDF",
        )

    statement_status = _initial_status_for_pdf(inspection.status)
    statement = Statement(
        id=statement_id,
        ownership_scope_id=auth.ownership_scope_id,
        card_alias_id=card_alias_id,
        status=statement_status,
        original_filename=Path(file.filename or "statement.pdf").name,
        file_path=str(pdf_path),
        file_sha256=sha256,
        content_type="application/pdf",
        file_size_bytes=len(raw_bytes),
        ai_processing_consent=ai_processing_consent,
        currency="CLP",
        pdf_status=inspection.status,
        is_encrypted=inspection.is_encrypted,
        page_count=inspection.page_count,
        warnings=list(inspection.warnings),
        error_code=_initial_error_code(inspection.status),
        error_message=_initial_error_message(inspection.status),
    )
    db.add(statement)
    try:
        await db.commit()
    except Exception:
        shutil.rmtree(statement_dir, ignore_errors=True)
        raise
    await db.refresh(statement)

    queued = statement.status == StatementStatus.QUEUED
    if queued:
        background_tasks.add_task(
            process_statement,
            statement.id,
            password=password,
            ownership_scope_id=auth.ownership_scope_id,
        )

    logger.info(
        "statement_uploaded",
        statement_id=str(statement.id),
        size_bytes=len(raw_bytes),
        status=statement.status.value,
        encrypted=statement.is_encrypted,
    )

    return StatementUploadResponse(
        statement=StatementRecordResponse.model_validate(statement),
        duplicate=False,
        queued=queued,
        password_required=statement.status == StatementStatus.PASSWORD_REQUIRED,
    )


@router.get("", response_model=list[StatementRecordResponse])
async def list_statements(auth: Auth, db: DB) -> list[StatementRecordResponse]:
    rows = await db.execute(
        select(Statement)
        .where(Statement.ownership_scope_id == auth.ownership_scope_id)
        .order_by(Statement.uploaded_at.desc())
    )
    return [StatementRecordResponse.model_validate(statement) for statement in rows.scalars()]


@router.get("/{statement_id}", response_model=StatementRecordResponse)
async def get_statement(statement_id: uuid.UUID, auth: Auth, db: DB) -> StatementRecordResponse:
    statement = await _get_statement(db, auth, statement_id)
    return StatementRecordResponse.model_validate(statement)


@router.get("/{statement_id}/lines", response_model=list[StatementLineRecordResponse])
async def get_statement_lines(
    statement_id: uuid.UUID, auth: Auth, db: DB
) -> list[StatementLineRecordResponse]:
    await _get_statement(db, auth, statement_id)
    rows = await db.execute(
        select(StatementLine)
        .where(StatementLine.statement_id == statement_id)
        .order_by(StatementLine.source_order)
    )
    return [StatementLineRecordResponse.model_validate(line) for line in rows.scalars()]


@router.delete("/{statement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_statement(
    statement_id: uuid.UUID,
    auth: Auth,
    db: DB,
) -> None:
    """Remove a statement: its lines, reconciliation runs and VERDICTS go with it
    (FK CASCADE) — which also UNLOCKS any transactions that were matched against it
    (the lock-on-match escape hatch). The stored PDF is removed best-effort."""
    statement = (
        await db.execute(
            select(Statement).where(
                Statement.id == statement_id,
                Statement.ownership_scope_id == auth.ownership_scope_id,
            )
        )
    ).scalar_one_or_none()
    if statement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    pdf_path = Path(statement.file_path)
    await db.delete(statement)
    await db.commit()
    # Remove the stored PDF. The per-statement DIRECTORY is only removed when it
    # really is the upload layout ({storage_root}/{scope}/{statement_id}/) — a
    # blind rmtree(parent) on a DB-sourced path is an arbitrary-directory delete.
    storage_root = Path(settings.statement_storage_dir).resolve()
    parent = pdf_path.parent.resolve()
    if storage_root in parent.parents:
        shutil.rmtree(parent, ignore_errors=True)
    else:
        pdf_path.unlink(missing_ok=True)


@router.post("/{statement_id}/reconcile", response_model=StatementReconciliationResponse)
async def reconcile_statement(
    statement_id: uuid.UUID,
    auth: Auth,
    db: DB,
) -> StatementReconciliationResponse:
    await _get_statement(db, auth, statement_id)
    try:
        await run_statement_reconciliation(
            db,
            statement_id=statement_id,
            ownership_scope_id=auth.ownership_scope_id,
        )
    except StatementNotReadyForReconciliationError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Statement is {exc.status.value}, cannot reconcile",
        ) from exc
    response = await get_statement_reconciliation_response(
        db,
        statement_id=statement_id,
        ownership_scope_id=auth.ownership_scope_id,
    )
    if response is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Statement reconciliation did not produce a run",
        )
    return response


@router.get("/{statement_id}/reconciliation", response_model=StatementReconciliationResponse)
async def get_statement_reconciliation(
    statement_id: uuid.UUID,
    auth: Auth,
    db: DB,
) -> StatementReconciliationResponse:
    await _get_statement(db, auth, statement_id)
    response = await get_statement_reconciliation_response(
        db,
        statement_id=statement_id,
        ownership_scope_id=auth.ownership_scope_id,
    )
    if response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement reconciliation not found",
        )
    return response


@router.post(
    "/{statement_id}/process",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=StatementRecordResponse,
)
async def trigger_process_statement(
    statement_id: uuid.UUID,
    body: StatementProcessRequest,
    auth: Auth,
    db: DB,
    background_tasks: BackgroundTasks,
) -> StatementRecordResponse:
    statement = await _get_statement(db, auth, statement_id)
    if statement.status not in {
        StatementStatus.UPLOADED,
        StatementStatus.QUEUED,
        StatementStatus.PASSWORD_REQUIRED,
        StatementStatus.PASSWORD_INVALID,
        StatementStatus.FAILED,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Statement is {statement.status.value}, cannot reprocess",
        )
    statement.status = StatementStatus.QUEUED
    statement.error_code = None
    statement.error_message = None
    await db.commit()
    await db.refresh(statement)
    background_tasks.add_task(
        process_statement,
        statement.id,
        password=body.password,
        ownership_scope_id=auth.ownership_scope_id,
    )
    return StatementRecordResponse.model_validate(statement)


async def _assert_card_alias(db: AsyncSession, *, auth: Auth, card_alias_id: uuid.UUID) -> None:
    row = await db.execute(
        select(CardAlias.id).where(
            CardAlias.id == card_alias_id,
            CardAlias.ownership_scope_id == auth.ownership_scope_id,
            CardAlias.archived_at.is_(None),
        )
    )
    if row.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card alias not found")


async def _find_statement_by_sha(
    db: AsyncSession, scope_id: uuid.UUID, sha256: str
) -> Statement | None:
    row = await db.execute(
        select(Statement).where(
            Statement.ownership_scope_id == scope_id,
            Statement.file_sha256 == sha256,
        )
    )
    return row.scalar_one_or_none()


async def _get_statement(db: AsyncSession, auth: Auth, statement_id: uuid.UUID) -> Statement:
    row = await db.execute(
        select(Statement).where(
            Statement.id == statement_id,
            Statement.ownership_scope_id == auth.ownership_scope_id,
        )
    )
    statement = row.scalar_one_or_none()
    if statement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    return statement


def _initial_status_for_pdf(pdf_status: str) -> StatementStatus:
    if pdf_status == "readable":
        return StatementStatus.QUEUED
    if pdf_status == "password_required":
        return StatementStatus.PASSWORD_REQUIRED
    if pdf_status == "password_invalid":
        return StatementStatus.PASSWORD_INVALID
    return StatementStatus.FAILED


def _initial_error_code(pdf_status: str) -> str | None:
    if pdf_status == "password_required":
        return "PASSWORD_REQUIRED"
    if pdf_status == "password_invalid":
        return "PASSWORD_INVALID"
    if pdf_status == "extraction_failed":
        return "EXTRACTION_FAILED"
    return None


def _initial_error_message(pdf_status: str) -> str | None:
    if pdf_status == "password_required":
        return "Statement PDF requires a password"
    if pdf_status == "password_invalid":
        return "Statement PDF password is invalid"
    if pdf_status == "extraction_failed":
        return "Statement PDF could not be extracted"
    return None
