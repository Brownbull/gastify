"""Mobile push-token registration schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

PushPlatform = Literal["android", "ios"]
PushProvider = Literal["expo", "fcm", "apns"]
PushPermissionStatus = Literal["granted", "denied", "undetermined"]


class PushTokenRegistration(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    platform: PushPlatform
    provider: PushProvider = "expo"
    permission_status: PushPermissionStatus = "granted"
    device_id: str | None = Field(default=None, max_length=256)
    app_environment: str = Field(default="local", max_length=32)
    app_version: str | None = Field(default=None, max_length=64)


class PushTokenUnregister(BaseModel):
    token: str | None = Field(default=None, min_length=1, max_length=512)


class PushTokenResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    token: str
    platform: str
    provider: str
    permission_status: str
    device_id: str | None = None
    app_environment: str
    app_version: str | None = None
    enabled: bool
    registered_at: datetime
    last_seen_at: datetime
    revoked_at: datetime | None = None


class PushTokenUnregisterResponse(BaseModel):
    revoked_count: int
