"""Schemas for guarded non-production scan test cases."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ScanTestProviderMode = Literal["mock", "fixture", "gemini"]


class ScanTestCaseSummary(BaseModel):
    id: str
    label: str
    description: str
    source: str
    provider_modes: list[ScanTestProviderMode]
    convenience_only: bool
    has_image: bool


class ScanTestCaseList(BaseModel):
    environment: str
    provider: str
    cases: list[ScanTestCaseSummary]


class ScanTestRunSubmission(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ownership_scope_id: uuid.UUID
    status: str
    original_filename: str
    content_type: str
    file_size_bytes: int
    image_path: str
    thumbnail_path: str | None = None
    submitted_at: datetime
    test_case_id: str
    provider: str
    convenience_only: bool
