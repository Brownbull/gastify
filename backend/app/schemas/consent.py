"""Consent + DSR request/response schemas."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

VALID_JURISDICTIONS = Literal["CL", "EU", "CA", "US-CA"]

# --- Consent schemas ---


class ConsentGrant(BaseModel):
    jurisdiction: VALID_JURISDICTIONS = Field(description="Jurisdiction code: CL, EU, CA, US-CA")
    consent_version: str = "1.0"


class ConsentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    purpose: str
    status: str
    legal_basis: str
    jurisdiction: str
    granted_at: datetime
    revoked_at: datetime | None = None
    withdrawn_at: datetime | None = None
    consent_version: str
    created_at: datetime
    updated_at: datetime


class ConsentListResponse(BaseModel):
    consents: list[ConsentResponse]


class AuditEventResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    event_type: str
    resource_type: str | None = None
    resource_id: UUID | None = None
    details: str | None = None
    ip_address: str | None = None
    created_at: datetime


class AuditListResponse(BaseModel):
    events: list[AuditEventResponse]


class ProcessingRegisterResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    purpose: str
    description: str
    legal_basis: str
    data_categories: str
    recipients: str
    retention_period: str
    jurisdictions: str
    is_active: bool


# --- DSR schemas ---


class DataAccessResponse(BaseModel):
    user: "UserDataExport"
    consents: list[ConsentResponse]
    transactions_count: int
    exported_at: datetime


class UserDataExport(BaseModel):
    id: UUID
    email: str | None = None
    display_name: str | None = None
    default_currency: str
    locale: str
    created_at: datetime


class ProfileResponse(BaseModel):
    """Lightweight profile read for settings surfaces (data-access is the FULL export)."""

    display_name: str | None
    email: str | None
    default_currency: str
    locale: str | None


class RectificationRequest(BaseModel):
    display_name: str | None = None
    email: str | None = None
    default_currency: str | None = Field(default=None, max_length=3)
    locale: str | None = None


class RectificationResponse(BaseModel):
    updated_fields: list[str]
    updated_at: datetime


class ErasureResponse(BaseModel):
    consents_revoked: int
    transactions_deleted: int
    # D82 group void: how many (group, month) stats were tombstoned and how many
    # group memberships were removed for the shared copies the user contributed.
    group_periods_voided: int = 0
    group_memberships_removed: int = 0
    user_anonymized: bool
    audit_event_id: UUID
    erased_at: datetime


class PortabilityTransaction(BaseModel):
    id: UUID
    transaction_date: date
    merchant: str
    total_minor: int
    currency: str
    amount_usd_minor: int | None = None
    receipt_type: str | None = None
    country: str | None = None
    city: str | None = None
    created_at: datetime


class PortabilityResponse(BaseModel):
    format: str = "application/json"
    version: str = "1.0"
    exported_at: datetime
    user: UserDataExport
    consents: list[ConsentResponse]
    transactions: list[PortabilityTransaction]
    total_transactions: int
    truncated: bool = False
