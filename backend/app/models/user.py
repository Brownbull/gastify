"""User & Auth tables: ownership_scopes, users, ownership_scope_members."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class OwnershipScope(Base):
    __tablename__ = "ownership_scopes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=func.gen_random_uuid()
    )
    scope_type: Mapped[str] = mapped_column(String, nullable=False, server_default="individual")
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
        Uuid, primary_key=True, server_default=func.gen_random_uuid()
    )
    firebase_uid: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_currency: Mapped[str] = mapped_column(
        String(3), ForeignKey("currencies.code"), nullable=False, server_default="CLP"
    )
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
        Uuid, primary_key=True, server_default=func.gen_random_uuid()
    )
    ownership_scope_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ownership_scopes.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, server_default="owner")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    scope: Mapped[OwnershipScope] = relationship(back_populates="members")
    user: Mapped[User] = relationship()
