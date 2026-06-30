"""User & Auth tables: ownership_scopes, users, ownership_scope_members."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class OwnershipScope(Base):
    __tablename__ = "ownership_scopes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    scope_type: Mapped[str] = mapped_column(String, nullable=False, server_default="individual")
    # Human-readable name; populated for group scopes, NULL for personal
    # (individual/household) scopes.
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Rotatable invite-link token + expiry for group scopes (NULL for personal).
    invite_token: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
    invite_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # 5e (D73): when an admin enables this, members who opt in (shares_detail)
    # expose their individual shared transactions in the group list. Off = the
    # group shows aggregates only (the 5d default). Aggregates ignore this flag.
    member_visibility_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # D75: group avatar — an emoji icon + accent color (hex). NULL = use the
    # client default (🏠 + default accent). Set by owner/admin alongside rename.
    # Only meaningful for group scopes; personal scopes leave these NULL.
    icon: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    members: Mapped[list["OwnershipScopeMember"]] = relationship(back_populates="scope")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    firebase_uid: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Display preference for date fields (placeholders + rendering): day-first vs
    # month-first. The wire format stays ISO; this is presentation only.
    date_format: Mapped[str] = mapped_column(
        String, nullable=False, default="dd/MM/yyyy", server_default="dd/MM/yyyy"
    )
    default_currency: Mapped[str] = mapped_column(
        String(3), ForeignKey("currencies.code"), nullable=False, server_default="CLP"
    )
    # Default purchase location (settings). Used as the scan-location fallback when a
    # receipt has no determinable country/city (see services/locations.py). country is
    # an ISO 3166-1 alpha-2 code; both nullable (a user need not configure one).
    default_country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    default_city: Mapped[str | None] = mapped_column(Text, nullable=True)
    locale: Mapped[str] = mapped_column(String, nullable=False, server_default="es")
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    scope: Mapped[OwnershipScope] = relationship()


class OwnershipScopeMember(Base):
    __tablename__ = "ownership_scope_members"
    __table_args__ = (UniqueConstraint("ownership_scope_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, server_default="owner")
    # 5e (D73): this member's opt-in consent to expose their shared transactions
    # individually when the group's member_visibility_enabled is on. Default decline.
    shares_detail: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    scope: Mapped[OwnershipScope] = relationship(back_populates="members")
    user: Mapped[User] = relationship()


class MobilePushToken(Base):
    __tablename__ = "mobile_push_tokens"
    __table_args__ = (UniqueConstraint("user_id", "token", name="uq_mobile_push_user_token"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False, server_default="expo")
    platform: Mapped[str] = mapped_column(String, nullable=False)
    device_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    app_environment: Mapped[str] = mapped_column(String, nullable=False, server_default="local")
    app_version: Mapped[str | None] = mapped_column(String, nullable=True)
    permission_status: Mapped[str] = mapped_column(String, nullable=False, server_default="granted")
    enabled: Mapped[bool] = mapped_column(nullable=False, server_default="true")
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
