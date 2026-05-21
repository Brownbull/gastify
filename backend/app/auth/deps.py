"""Auth dependencies — resolve ownership scope from Firebase user."""

import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.firebase import CurrentUser
from app.db import get_db
from app.models.credit import CreditBalance
from app.models.user import OwnershipScope, OwnershipScopeMember, User


class AuthContext:
    """Resolved auth context with user record and ownership scope."""

    def __init__(self, user: User, ownership_scope_id: uuid.UUID) -> None:
        self.user = user
        self.ownership_scope_id = ownership_scope_id
        self.user_id = user.id


async def _set_postgres_ownership_scope(db: AsyncSession, scope_id: uuid.UUID) -> None:
    """Set the transaction-local RLS scope for PostgreSQL-backed requests."""
    if db.bind and db.bind.dialect.name == "postgresql":
        await db.execute(
            text("SELECT set_config('app.ownership_scope_id', :sid, true)"),
            {"sid": str(scope_id)},
        )


async def get_auth_context(
    firebase_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthContext:
    result = await db.execute(select(User).where(User.firebase_uid == firebase_user.uid))
    user = result.scalar_one_or_none()

    if user is None:
        try:
            scope = OwnershipScope(scope_type="individual")
            db.add(scope)
            await db.flush()

            await _set_postgres_ownership_scope(db, scope.id)

            user = User(
                firebase_uid=firebase_user.uid,
                email=firebase_user.email,
                display_name=firebase_user.name,
                ownership_scope_id=scope.id,
            )
            db.add(user)
            await db.flush()

            member = OwnershipScopeMember(
                ownership_scope_id=scope.id,
                user_id=user.id,
                role="owner",
            )
            db.add(member)

            credit = CreditBalance(ownership_scope_id=scope.id)
            db.add(credit)

            await db.commit()
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(User).where(User.firebase_uid == firebase_user.uid))
            user = result.scalar_one()

    scope_id = user.ownership_scope_id

    await _set_postgres_ownership_scope(db, scope_id)

    return AuthContext(user=user, ownership_scope_id=scope_id)


Auth = Annotated[AuthContext, Depends(get_auth_context)]
