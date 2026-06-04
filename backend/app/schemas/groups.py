"""Group (shared ownership scope) schemas — Phase 5b."""

import re
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Accent color for a group avatar: a #RGB or #RRGGBB hex string (D75).
_HEX_COLOR = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})")

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


class GroupIconUpdate(BaseModel):
    """Set the group avatar (D75): emoji icon + accent color. Owner/admin only.

    Both fields are optional and independent; an explicit null clears that field
    back to the client default, and clearing both (icon=null, color=null) is valid.
    Color is a #RGB / #RRGGBB hex string.
    """

    model_config = ConfigDict(extra="forbid")

    icon: str | None = Field(default=None, max_length=16)
    color: str | None = Field(default=None, max_length=9)

    @field_validator("icon")
    @classmethod
    def _strip_icon(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("color")
    @classmethod
    def _check_color(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        if not _HEX_COLOR.fullmatch(normalized):
            raise ValueError("color must be a hex code like #4F46E5")
        return normalized.lower()


class GroupSummary(BaseModel):
    """One row of GET /groups — the caller's groups + their role + size."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    role: GroupRole
    member_count: int
    # D75: group avatar (emoji + accent hex). NULL → client renders the default.
    icon: str | None = None
    color: str | None = None


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
    # D75: group avatar (emoji + accent hex). NULL → client renders the default.
    icon: str | None = None
    color: str | None = None


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
