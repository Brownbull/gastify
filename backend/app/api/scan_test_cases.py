"""Guarded non-production scan test-case endpoints."""

from __future__ import annotations

import shutil
import time
import uuid
from pathlib import Path
from typing import Annotated

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from PIL import UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth  # noqa: TC001 - FastAPI needs Annotated dependency at runtime.
from app.config import settings
from app.db import get_db
from app.models.scan import Scan, ScanStatus
from app.schemas.scan_test_cases import ScanTestCaseList, ScanTestRunSubmission
from app.services.image import compress_receipt_image
from app.services.scan_e2e_fixtures import write_upload_hash_marker
from app.services.scan_test_cases import (
    get_scan_test_case,
    list_scan_test_cases,
    read_scan_test_case_image,
)
from app.services.scan_worker import process_scan

logger = structlog.get_logger()

router = APIRouter(prefix="/scan-test-cases", tags=["scan-test-cases"])

DB = Annotated[AsyncSession, Depends(get_db)]
TEST_CONTROL_ENVIRONMENTS = {"local", "staging", "staging-e2e"}


@router.get("", response_model=ScanTestCaseList)
async def get_test_cases(auth: Auth) -> ScanTestCaseList:
    _require_test_controls(auth)
    return ScanTestCaseList(
        environment=settings.environment,
        provider=settings.scan_provider,
        cases=[case.summary() for case in list_scan_test_cases(settings.scan_provider)],
    )


@router.post(
    "/{case_id}/runs",
    status_code=status.HTTP_201_CREATED,
    response_model=ScanTestRunSubmission,
)
async def run_test_case(
    case_id: str,
    auth: Auth,
    db: DB,
    background_tasks: BackgroundTasks,
) -> ScanTestRunSubmission:
    _require_test_controls(auth)
    case = get_scan_test_case(case_id)
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scan test case not found"
        )
    if settings.scan_provider not in case.provider_modes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(f"Scan test case {case.id} does not support provider {settings.scan_provider}"),
        )

    raw_bytes, filename, content_type = read_scan_test_case_image(case)

    start_ms = time.monotonic()
    try:
        result = compress_receipt_image(raw_bytes)
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Scan test case image could not be processed",
        ) from exc
    elapsed_ms = int((time.monotonic() - start_ms) * 1000)

    scan_id = uuid.uuid4()
    scan_dir = Path(settings.scan_storage_dir) / str(auth.ownership_scope_id) / str(scan_id)
    scan_dir.mkdir(parents=True, exist_ok=True)

    main_path = scan_dir / "receipt.jpg"
    thumb_path = scan_dir / "thumb.jpg"
    write_upload_hash_marker(scan_dir, raw_bytes)
    main_path.write_bytes(result.main.data)
    thumb_path.write_bytes(result.thumbnail.data)

    scan = Scan(
        id=scan_id,
        ownership_scope_id=auth.ownership_scope_id,
        status=ScanStatus.SUBMITTED,
        image_path=str(main_path),
        thumbnail_path=str(thumb_path),
        original_filename=f"gastify-test-case-{case.id}-{filename}",
        content_type=result.main.content_type,
        file_size_bytes=len(raw_bytes),
    )
    db.add(scan)
    try:
        await db.commit()
    except Exception:
        shutil.rmtree(scan_dir, ignore_errors=True)
        raise
    await db.refresh(scan)

    logger.info(
        "scan_test_case_submitted",
        scan_id=str(scan_id),
        test_case_id=case.id,
        provider=settings.scan_provider,
        original_size=len(raw_bytes),
        compressed_size=len(result.main.data),
        thumbnail_size=len(result.thumbnail.data),
        compression_ms=elapsed_ms,
    )

    background_tasks.add_task(process_scan, scan_id, ownership_scope_id=scan.ownership_scope_id)

    return ScanTestRunSubmission(
        id=scan.id,
        ownership_scope_id=scan.ownership_scope_id,
        status=scan.status.value,
        original_filename=scan.original_filename,
        content_type=scan.content_type,
        file_size_bytes=scan.file_size_bytes,
        image_path=scan.image_path,
        thumbnail_path=scan.thumbnail_path,
        submitted_at=scan.submitted_at,
        test_case_id=case.id,
        provider=settings.scan_provider,
        convenience_only=case.convenience_only,
    )


def _require_test_controls(auth: Auth) -> None:
    if settings.environment not in TEST_CONTROL_ENVIRONMENTS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if not settings.scan_test_controls_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Scan test controls are disabled",
        )
    if settings.environment in {"staging", "staging-e2e"}:
        email = (auth.user.email or "").strip().lower()
        allowed = {allowed.strip().lower() for allowed in settings.scan_test_allowed_emails}
        if email not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not allowed to run staging scan test cases",
            )
