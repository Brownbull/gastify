"""Reference data endpoints: store categories, item categories."""

from __future__ import annotations

import uuid  # noqa: TC003 - Pydantic needs runtime access for OpenAPI generation.
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.reference import StoreCategory

router = APIRouter(prefix="/reference", tags=["reference"])

DB = Annotated[AsyncSession, Depends(get_db)]


class StoreCategoryItem(BaseModel):
    id: uuid.UUID
    key: str
    display_labels: dict
    is_sensitive: bool
    sort_order: int

    model_config = {"from_attributes": True}


@router.get("/store-categories", response_model=list[StoreCategoryItem])
async def list_store_categories(db: DB) -> list[StoreCategoryItem]:
    result = await db.execute(
        select(StoreCategory).order_by(StoreCategory.sort_order, StoreCategory.key)
    )
    rows = result.scalars().all()
    return [StoreCategoryItem.model_validate(r) for r in rows]
