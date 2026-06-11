"""Learned-mappings management schemas (UX-4)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MerchantMappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_merchant: str
    target_merchant: str
    store_category_id: uuid.UUID | None
    usage_count: int
    updated_at: datetime


class ItemMappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_item: str
    target_item: str | None
    target_category_id: uuid.UUID
    merchant_pattern: str | None
    usage_count: int
    updated_at: datetime


class LearnedMappingsResponse(BaseModel):
    merchants: list[MerchantMappingResponse]
    items: list[ItemMappingResponse]
