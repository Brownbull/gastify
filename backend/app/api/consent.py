"""Consent management endpoints — per-purpose grant/revoke + audit trail."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth
from app.db import get_db
from app.schemas.consent import (
    AuditEventResponse,
    AuditListResponse,
    ConsentGrant,
    ConsentListResponse,
    ConsentResponse,
    ProcessingRegisterResponse,
)
from app.services.consent import (
    get_processing_purpose,
    grant_consent,
    list_audit_events,
    list_consents,
    revoke_consent,
)

router = APIRouter(prefix="/consent", tags=["consent"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=ConsentListResponse)
async def get_consents(auth: Auth, db: DB) -> ConsentListResponse:
    records = await list_consents(
        db,
        user_id=auth.user_id,
        ownership_scope_id=auth.ownership_scope_id,
    )
    return ConsentListResponse(
        consents=[ConsentResponse.model_validate(r) for r in records],
    )


@router.post(
    "/{purpose}/grant",
    status_code=status.HTTP_201_CREATED,
    response_model=ConsentResponse,
)
async def grant(
    purpose: str,
    body: ConsentGrant,
    request: Request,
    auth: Auth,
    db: DB,
) -> ConsentResponse:
    register = await get_processing_purpose(db, purpose)
    if register is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Processing purpose not active: {purpose}",
        )

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")

    record = await grant_consent(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        purpose=purpose,
        jurisdiction=body.jurisdiction,
        legal_basis=register.legal_basis,
        consent_version=body.consent_version,
        ip_address=ip,
        user_agent=ua,
    )
    await db.commit()
    return ConsentResponse.model_validate(record)


@router.post(
    "/{purpose}/revoke",
    response_model=ConsentResponse,
)
async def revoke(
    purpose: str,
    request: Request,
    auth: Auth,
    db: DB,
) -> ConsentResponse:
    ip = request.client.host if request.client else None

    record = await revoke_consent(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        user_id=auth.user_id,
        purpose=purpose,
        ip_address=ip,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active consent for purpose: {purpose}",
        )
    await db.commit()
    return ConsentResponse.model_validate(record)


@router.get("/audit", response_model=AuditListResponse)
async def get_audit_trail(
    auth: Auth,
    db: DB,
    limit: int = Query(default=100, ge=1, le=500),
) -> AuditListResponse:
    events = await list_audit_events(
        db,
        ownership_scope_id=auth.ownership_scope_id,
        limit=limit,
    )
    return AuditListResponse(
        events=[AuditEventResponse.model_validate(e) for e in events],
    )


@router.get(
    "/processing-register",
    response_model=list[ProcessingRegisterResponse],
)
async def get_processing_register(
    db: DB,
) -> list[ProcessingRegisterResponse]:
    from sqlalchemy import select

    from app.models.consent import ProcessingRegister

    result = await db.execute(
        select(ProcessingRegister)
        .where(ProcessingRegister.is_active.is_(True))
        .order_by(ProcessingRegister.purpose)
    )
    return [ProcessingRegisterResponse.model_validate(r) for r in result.scalars().all()]
