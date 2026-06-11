"""Learned-mappings management (UX-4): list + delete the user's remembered corrections.

The app learns merchant/category and item/category corrections on edit and auto-applies
them to future scans (see services/mappings.py). This router gives the user visibility
and control: list what's been learned, delete a mapping to UNLEARN it (the next scan
stops applying it). Delete + re-learn on the next edit is the management model — no
in-place editing (UX-4).
"""

import uuid  # noqa: TC003 - FastAPI evaluates path param annotations at runtime.
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth  # noqa: TC001 - runtime Annotated dep
from app.db import get_db
from app.models.mapping import CategoryMapping, MerchantMapping
from app.schemas.mappings import (
    ItemMappingResponse,
    LearnedMappingsResponse,
    MerchantMappingResponse,
)

router = APIRouter(prefix="/mappings", tags=["mappings"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=LearnedMappingsResponse)
async def list_mappings(auth: Auth, db: DB) -> LearnedMappingsResponse:
    merchants = (
        (
            await db.execute(
                select(MerchantMapping)
                .where(MerchantMapping.ownership_scope_id == auth.ownership_scope_id)
                .order_by(MerchantMapping.updated_at.desc())
            )
        )
        .scalars()
        .all()
    )
    items = (
        (
            await db.execute(
                select(CategoryMapping)
                .where(CategoryMapping.ownership_scope_id == auth.ownership_scope_id)
                .order_by(CategoryMapping.updated_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return LearnedMappingsResponse(
        merchants=[MerchantMappingResponse.model_validate(m) for m in merchants],
        items=[ItemMappingResponse.model_validate(i) for i in items],
    )


@router.delete("/merchant/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_merchant_mapping(mapping_id: uuid.UUID, auth: Auth, db: DB) -> None:
    mapping = await db.scalar(
        select(MerchantMapping).where(
            MerchantMapping.id == mapping_id,
            MerchantMapping.ownership_scope_id == auth.ownership_scope_id,
        )
    )
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping not found")
    await db.delete(mapping)
    await db.commit()


@router.delete("/item/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item_mapping(mapping_id: uuid.UUID, auth: Auth, db: DB) -> None:
    mapping = await db.scalar(
        select(CategoryMapping).where(
            CategoryMapping.id == mapping_id,
            CategoryMapping.ownership_scope_id == auth.ownership_scope_id,
        )
    )
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping not found")
    await db.delete(mapping)
    await db.commit()
