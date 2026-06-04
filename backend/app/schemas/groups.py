"""Group (shared ownership scope) schemas — Phase 5b."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

GroupRole = Literal["owner", "admin", "member"]
# Roles a membership can be SET to via the role-update endpoint (you never
# promote to or demote from 'owner' through it — ownership transfer is separate).
AssignableRole = Literal["admin", "member"]


class _GroupNameBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=60)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Group name cannot be blank")
        return normalized


class GroupCreate(_GroupNameBody):
    pass


class GroupRename(_GroupNameBody):
    pass


class GroupSummary(BaseModel):
    """One row of GET /groups — the caller's groups + their role + size."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    role: GroupRole
    member_count: int


class MemberSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    display_name: str | None = None
    role: GroupRole
    # 5e (D73): this member's opt-in to show their shared transactions individually.
    shares_detail: bool = False


class GroupDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    role: GroupRole
    member_count: int
    members: list[MemberSummary]
    # 5e (D73): group-level visibility request (admin-set) + the viewer's own consent.
    member_visibility_enabled: bool = False
    viewer_shares_detail: bool = False


class RoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: AssignableRole


class VisibilityUpdate(BaseModel):
    """Admin toggles whether members may expose individual transactions (5e)."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool


class ConsentUpdate(BaseModel):
    """A member's opt-in/opt-out to show their own shared transactions (5e)."""

    model_config = ConfigDict(extra="forbid")

    shares_detail: bool


class GroupTransactionRow(BaseModel):
    """One row of GET /groups/{id}/transactions — a consent-visible shared txn."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    transaction_date: date
    merchant: str
    total_minor: int
    currency: str
    shared_by_user_id: UUID
    shared_by_name: str | None = None
    is_own: bool


class InviteResponse(BaseModel):
    token: str
    expires_at: datetime


class InvitePreview(BaseModel):
    group_id: UUID
    name: str
    member_count: int
    expired: bool
    already_member: bool


class JoinResponse(BaseModel):
    id: UUID
    name: str


class ShareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_id: UUID


class SharedTransactionResponse(BaseModel):
    """The new group-scoped copy created by a share."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    merchant: str
    total_minor: int
    currency: str
    shared_from_transaction_id: UUID
