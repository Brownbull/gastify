"""Shared schema utilities."""

from typing import Any

from pydantic import BaseModel, ConfigDict


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class PaginatedResponse[T](BaseModel):
    data: list[T]
    cursor: str | None = None
    has_more: bool = False


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None
