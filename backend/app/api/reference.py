"""Reference data endpoints: store categories, item categories."""

from __future__ import annotations

import uuid  # noqa: TC003 - Pydantic needs runtime access for OpenAPI generation.
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.reference import ItemCategory, StoreCategory
from app.services.locations import known_countries, location_dataset

router = APIRouter(prefix="/reference", tags=["reference"])

DB = Annotated[AsyncSession, Depends(get_db)]


class StoreCategoryItem(BaseModel):
    id: uuid.UUID
    key: str
    level: int
    parent_id: uuid.UUID | None = None
    display_labels: dict[str, Any]
    is_sensitive: bool
    sort_order: int

    model_config = {"from_attributes": True}


@router.get("/store-categories", response_model=list[StoreCategoryItem])
async def list_store_categories(db: DB) -> list[StoreCategoryItem]:
    result = await db.execute(
        select(StoreCategory).order_by(
            StoreCategory.level, StoreCategory.sort_order, StoreCategory.key
        )
    )
    rows = result.scalars().all()
    return [StoreCategoryItem.model_validate(r) for r in rows]


class ItemCategoryItem(BaseModel):
    id: uuid.UUID
    key: str
    level: int
    parent_id: uuid.UUID | None = None
    display_labels: dict[str, Any]
    is_sensitive: bool
    sort_order: int

    model_config = {"from_attributes": True}


@router.get("/item-categories", response_model=list[ItemCategoryItem])
async def list_item_categories(db: DB) -> list[ItemCategoryItem]:
    result = await db.execute(
        select(ItemCategory).order_by(ItemCategory.level, ItemCategory.sort_order, ItemCategory.key)
    )
    rows = result.scalars().all()
    return [ItemCategoryItem.model_validate(r) for r in rows]


class LocationsResponse(BaseModel):
    """Static country + city reference data for the settings location pickers.

    `countries` is [{code, name}] sorted by name; `cities` maps each ISO alpha-2
    code to its city list (Chile = cities, not comunas — see D103). Sourced from
    app/reference/locations.json; the same data backs scan-location reconciliation.
    """

    countries: list[dict[str, str]]
    cities: dict[str, list[str]]


@router.get("/locations", response_model=LocationsResponse)
async def get_locations() -> LocationsResponse:
    data = location_dataset()
    return LocationsResponse(
        countries=known_countries(),
        cities={code: list(entry["cities"]) for code, entry in data.items()},
    )
