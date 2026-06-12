"""Billing/quota endpoints (D96) — the client-facing quota snapshot."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth  # noqa: TC001 - FastAPI needs Annotated dependency at runtime.
from app.config import settings
from app.db import get_db
from app.schemas.billing import QuotaResponse
from app.services.billing import quota_snapshot

router = APIRouter(prefix="/billing", tags=["billing"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/quota", response_model=QuotaResponse)
async def get_quota(auth: Auth, db: DB) -> QuotaResponse:
    """The caller's tier + per-feature used/limit for the current quota month.

    Quotas are personal-scope (D70: capture features are personal-only), so this
    reads the caller's personal scope regardless of any active group."""
    snapshot = await quota_snapshot(db, ownership_scope_id=auth.ownership_scope_id)
    return QuotaResponse(enforced=settings.billing_enforcement_enabled, **snapshot)
