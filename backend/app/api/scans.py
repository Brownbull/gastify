"""Scan endpoints — submission + processing trigger."""

import shutil
import time
import uuid
from pathlib import Path
from typing import Annotated

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from PIL import UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth
from app.config import settings
from app.db import get_db
from app.models.scan import Scan, ScanStatus
from app.schemas.scan import ScanResult, ScanSubmission
from app.services.image import compress_receipt_image
from app.services.scan_e2e_fixtures import write_upload_hash_marker
from app.services.scan_worker import process_scan

logger = structlog.get_logger()

router = APIRouter(prefix="/scans", tags=["scans"])

DB = Annotated[AsyncSession, Depends(get_db)]

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ScanSubmission)
async def submit_scan(
    file: UploadFile,
    auth: Auth,
    db: DB,
    background_tasks: BackgroundTasks,
) -> ScanSubmission:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported image type: {file.content_type}. "
            f"Accepted: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )
    if len(raw_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Empty file",
        )

    start_ms = time.monotonic()
    try:
        result = compress_receipt_image(raw_bytes)
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File could not be processed as an image",
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
        original_filename=file.filename or "unknown",
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
        "scan_submitted",
        scan_id=str(scan_id),
        original_size=len(raw_bytes),
        compressed_size=len(result.main.data),
        thumbnail_size=len(result.thumbnail.data),
        compression_ms=elapsed_ms,
    )

    background_tasks.add_task(process_scan, scan_id)

    return ScanSubmission.model_validate(scan)


@router.post(
    "/{scan_id}/process",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ScanResult,
)
async def trigger_process_scan(
    scan_id: uuid.UUID,
    auth: Auth,
    db: DB,
    background_tasks: BackgroundTasks,
) -> ScanResult:
    """Manually trigger extraction for a scan (retry or reprocess)."""
    row = await db.execute(
        select(Scan).where(
            Scan.id == scan_id,
            Scan.ownership_scope_id == auth.ownership_scope_id,
        )
    )
    scan = row.scalar_one_or_none()
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found",
        )

    if scan.status not in (ScanStatus.SUBMITTED, ScanStatus.FAILED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Scan is {scan.status.value}, cannot reprocess",
        )

    if scan.status == ScanStatus.FAILED:
        scan.status = ScanStatus.SUBMITTED
        scan.error_code = None
        scan.error_message = None
        await db.commit()
        await db.refresh(scan)

    background_tasks.add_task(process_scan, scan_id)

    return ScanResult.model_validate(scan)
