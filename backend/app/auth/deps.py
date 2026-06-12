"""Auth dependencies — resolve ownership scope from Firebase user."""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.firebase import CurrentUser
from app.db import SCOPE_INFO_KEY, get_db
from app.models.credit import CreditBalance
from app.models.user import OwnershipScope, OwnershipScopeMember, User


class AuthContext:
    """Resolved auth context with user record and ownership scope."""

    def __init__(self, user: User, ownership_scope_id: uuid.UUID) -> None:
        self.user = user
        self.ownership_scope_id = ownership_scope_id
        self.user_id = user.id


async def _set_postgres_ownership_scope(db: AsyncSession, scope_id: uuid.UUID) -> None:
    """Set the transaction-local RLS scope for PostgreSQL-backed requests.

    Also stashes the scope on session.info so the `after_begin` event in app.db
    re-establishes the GUC at the start of every subsequent transaction — the
    transaction-local set_config below is lost across any mid-request commit (P43).
    """
    db.info[SCOPE_INFO_KEY] = scope_id
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        await db.execute(
            text("SELECT set_config('app.ownership_scope_id', :sid, true)"),
            {"sid": str(scope_id)},
        )


async def _is_scope_member(db: AsyncSession, user_id: uuid.UUID, scope_id: uuid.UUID) -> bool:
    """True iff `user_id` is a member of `scope_id` — the validate half of D69's
    validate-then-swap gate. Dialect-branched:

    - PostgreSQL: the `app_is_scope_member` SECURITY DEFINER oracle (migration 028).
      The members table is RLS-gated on the SAME GUC, so under the caller's PERSONAL
      scope a plain SELECT can't see the group's member row (chicken-and-egg); the
      oracle reads it under the target scope and restores the GUC, returning one
      boolean without widening any policy (D3-safe).
    - SQLite / local: no RLS, so a plain membership query is both correct and safe —
      there is no chicken-and-egg to resolve.
    """
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        found = await db.scalar(
            text("SELECT app_is_scope_member(:uid, :sid)"),
            {"uid": str(user_id), "sid": str(scope_id)},
        )
        return bool(found)
    found = await db.scalar(
        select(func.count())
        .select_from(OwnershipScopeMember)
        .where(
            OwnershipScopeMember.user_id == user_id,
            OwnershipScopeMember.ownership_scope_id == scope_id,
        )
    )
    return bool(found)


async def resolve_analytics_scope(
    db: AsyncSession, auth: AuthContext, group_id: uuid.UUID | None
) -> uuid.UUID:
    """Resolve the ownership scope a read should run under (D69/D70 scope-swap).

    No `group_id` (or the caller's own personal scope) → the personal scope already
    set by the auth dependency, unchanged. Otherwise: VALIDATE membership FIRST,
    and ONLY on success swap the RLS GUC to the group scope. The swap
    (`_set_postgres_ownership_scope`) is unreachable until the boolean is True, so
    a non-member never causes the GUC to point at the group (validate-then-swap,
    never swap-then-check). A non-member OR non-existent group both yield 404 — the
    membership check can't distinguish them, which is the desired anti-enumeration
    behavior (don't reveal that a group the caller can't access exists).

    Note (D70): only the SCOPE swaps — the caller's `user_id` is intentionally NOT
    rebound. Callers keep passing `auth.user_id` into the insights service, so D58
    personal item-flags stay per-viewer. In a group scope this is moot: personal
    flags live in the caller's PERSONAL scope and are RLS-invisible under the group
    GUC, so group aggregates are unflagged (never diverge between members).
    """
    if group_id is None or group_id == auth.ownership_scope_id:
        return auth.ownership_scope_id

    if not await _is_scope_member(db, auth.user_id, group_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    await _set_postgres_ownership_scope(db, group_id)
    return group_id


async def get_auth_context(
    request: Request,
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

    # User-keyed rate limiting (RATE-LIMIT-PLAN): slowapi key_funcs evaluate inside
    # the route wrapper, AFTER dependencies — so this stash is visible to them.
    request.state.user_id = str(user.id)

    return AuthContext(user=user, ownership_scope_id=scope_id)


Auth = Annotated[AuthContext, Depends(get_auth_context)]
