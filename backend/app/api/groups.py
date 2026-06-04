"""Group (shared ownership scope) CRUD + membership + invite-links — Phase 5b.

A group is an OwnershipScope(scope_type='group'). Membership lives in
ownership_scope_members; per-group reads/writes run under the RLS GUC swapped to
the group scope (validated by the 5a oracle first). User-centric cross-scope
reads — "my groups", "preview by invite token" — go through the migrator-owned
SECURITY DEFINER readers (D71); on SQLite (no RLS) the same queries run plainly.
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, cast
from uuid import UUID  # noqa: TC003 - FastAPI resolves UUID path/param annotations at runtime.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

# Auth is a runtime Annotated FastAPI dep (TC001); the two helpers are called at
# runtime — the line-level noqa keeps Auth importable for FastAPI's resolution.
from app.auth.deps import Auth, _is_scope_member, _set_postgres_ownership_scope  # noqa: TC001
from app.db import get_db
from app.models.user import OwnershipScope, OwnershipScopeMember, User
from app.schemas.groups import (
    GroupCreate,
    GroupDetail,
    GroupRename,
    GroupRole,
    GroupSummary,
    InvitePreview,
    InviteResponse,
    JoinResponse,
    MemberSummary,
    RoleUpdate,
)

router = APIRouter(prefix="/groups", tags=["groups"])
invites_router = APIRouter(prefix="/invites", tags=["groups"])

DB = Annotated[AsyncSession, Depends(get_db)]

MAX_GROUPS_PER_USER = 5
MAX_MEMBERS_PER_GROUP = 50
MAX_ADMINS_PER_GROUP = 3
INVITE_TTL = timedelta(days=7)
_MUTATE_ROLES = ("owner", "admin")


def _is_postgres(db: AsyncSession) -> bool:
    return db.bind is not None and db.bind.dialect.name == "postgresql"


async def _user_group_rows(db: AsyncSession, user_id: UUID) -> list[tuple[UUID, str, str, int]]:
    """Every group the user belongs to: (scope_id, name, role, member_count).

    Cross-scope read — RLS would hide it under any single GUC, so PostgreSQL uses
    the app_user_groups SECURITY DEFINER reader (D71); SQLite (no RLS) runs the
    same join+count directly.

    TRUST BOUNDARY: app_user_groups enumerates the groups of WHATEVER user_id is
    passed (it has no per-row RLS once the owner-run definer reads it). Callers MUST
    pass auth.user_id only — never a request-controlled id — or this leaks another
    user's group memberships. The DB-layer guard is EXECUTE-to-gastify_app-only +
    no raw SQL access; this is the application-layer half of that contract.
    """
    if _is_postgres(db):
        result = await db.execute(
            text(
                "SELECT scope_id, group_name, member_role, member_count FROM app_user_groups(:uid)"
            ),
            {"uid": str(user_id)},
        )
        return [(r.scope_id, r.group_name, r.member_role, r.member_count) for r in result]

    counted = aliased(OwnershipScopeMember)
    member_count = (
        select(func.count())
        .select_from(counted)
        .where(counted.ownership_scope_id == OwnershipScope.id)
        .scalar_subquery()
    )
    result = await db.execute(
        select(OwnershipScope.id, OwnershipScope.name, OwnershipScopeMember.role, member_count)
        .join(OwnershipScopeMember, OwnershipScopeMember.ownership_scope_id == OwnershipScope.id)
        .where(
            OwnershipScopeMember.user_id == user_id,
            OwnershipScope.scope_type == "group",
        )
        .order_by(OwnershipScope.created_at)
    )
    return [(row[0], row[1], row[2], row[3]) for row in result]


async def _invite_preview_row(
    db: AsyncSession, token: str
) -> tuple[UUID, str, int, datetime | None] | None:
    """(group_id, name, member_count, expires_at) for a token, or None if unknown."""
    if _is_postgres(db):
        result = await db.execute(
            text(
                "SELECT group_id, group_name, member_count, expires_at "
                "FROM app_group_invite_preview(:tok)"
            ),
            {"tok": token},
        )
        row = result.first()
        return (row.group_id, row.group_name, row.member_count, row.expires_at) if row else None

    scope = (
        await db.execute(
            select(OwnershipScope).where(
                OwnershipScope.invite_token == token,
                OwnershipScope.scope_type == "group",
            )
        )
    ).scalar_one_or_none()
    if scope is None:
        return None
    count = await db.scalar(
        select(func.count())
        .select_from(OwnershipScopeMember)
        .where(OwnershipScopeMember.ownership_scope_id == scope.id)
    )
    return (scope.id, scope.name or "", int(count or 0), scope.invite_token_expires_at)


async def _resolve_membership(db: AsyncSession, auth: Auth, group_id: UUID) -> GroupRole:
    """Validate caller ∈ group THEN swap the GUC to it; return the caller's role.

    404 (not 403) for a non-member or unknown group (anti-enumeration, D70). Reuses
    the 5a validate-then-swap gate; the swap is unreachable until membership holds.
    """
    if not await _is_scope_member(db, auth.user_id, group_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    await _set_postgres_ownership_scope(db, group_id)
    role = await db.scalar(
        select(OwnershipScopeMember.role).where(
            OwnershipScopeMember.ownership_scope_id == group_id,
            OwnershipScopeMember.user_id == auth.user_id,
        )
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return cast("GroupRole", role)


def _require_role(role: str, allowed: tuple[str, ...]) -> None:
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role for this action",
        )


@router.get("", response_model=list[GroupSummary])
async def list_groups(auth: Auth, db: DB) -> list[GroupSummary]:
    rows = await _user_group_rows(db, auth.user_id)
    return [
        GroupSummary(id=gid, name=name, role=cast("GroupRole", role), member_count=count)
        for gid, name, role, count in rows
    ]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=GroupSummary)
async def create_group(body: GroupCreate, auth: Auth, db: DB) -> GroupSummary:
    if len(await _user_group_rows(db, auth.user_id)) >= MAX_GROUPS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You can belong to at most {MAX_GROUPS_PER_USER} groups",
        )
    scope = OwnershipScope(scope_type="group", name=body.name)
    db.add(scope)
    await db.flush()  # ownership_scopes has no RLS; INSERT is fine under any GUC
    # Swap to the new group so the member INSERT's WITH CHECK (GUC == scope) passes.
    await _set_postgres_ownership_scope(db, scope.id)
    db.add(OwnershipScopeMember(ownership_scope_id=scope.id, user_id=auth.user_id, role="owner"))
    await db.commit()
    # Restore the caller's personal scope — the swap above was only to satisfy the
    # member INSERT's WITH CHECK; don't leave the session pointing at the new group.
    await _set_postgres_ownership_scope(db, auth.ownership_scope_id)
    return GroupSummary(id=scope.id, name=body.name, role="owner", member_count=1)


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group(group_id: UUID, auth: Auth, db: DB) -> GroupDetail:
    role = await _resolve_membership(db, auth, group_id)
    scope_name = await db.scalar(select(OwnershipScope.name).where(OwnershipScope.id == group_id))
    result = await db.execute(
        select(OwnershipScopeMember.user_id, User.display_name, OwnershipScopeMember.role)
        .join(User, User.id == OwnershipScopeMember.user_id)
        .where(OwnershipScopeMember.ownership_scope_id == group_id)
        .order_by(OwnershipScopeMember.created_at)
    )
    members = [
        MemberSummary(user_id=uid, display_name=name, role=cast("GroupRole", member_role))
        for uid, name, member_role in result
    ]
    return GroupDetail(
        id=group_id,
        name=scope_name or "",
        role=role,
        member_count=len(members),
        members=members,
    )


@router.patch("/{group_id}", response_model=GroupSummary)
async def rename_group(group_id: UUID, body: GroupRename, auth: Auth, db: DB) -> GroupSummary:
    role = await _resolve_membership(db, auth, group_id)
    _require_role(role, _MUTATE_ROLES)
    scope = await db.get(OwnershipScope, group_id)
    if scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    scope.name = body.name
    count = await db.scalar(
        select(func.count())
        .select_from(OwnershipScopeMember)
        .where(OwnershipScopeMember.ownership_scope_id == group_id)
    )
    await db.commit()
    return GroupSummary(id=group_id, name=body.name, role=role, member_count=int(count or 0))


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: UUID, auth: Auth, db: DB) -> None:
    role = await _resolve_membership(db, auth, group_id)
    _require_role(role, ("owner",))
    members = (
        (
            await db.execute(
                select(OwnershipScopeMember).where(
                    OwnershipScopeMember.ownership_scope_id == group_id
                )
            )
        )
        .scalars()
        .all()
    )
    for member in members:
        await db.delete(member)
    scope = await db.get(OwnershipScope, group_id)
    if scope is not None:
        await db.delete(scope)
    await db.commit()


@router.delete("/{group_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(group_id: UUID, member_user_id: UUID, auth: Auth, db: DB) -> None:
    role = await _resolve_membership(db, auth, group_id)
    target = await db.scalar(
        select(OwnershipScopeMember).where(
            OwnershipScopeMember.ownership_scope_id == group_id,
            OwnershipScopeMember.user_id == member_user_id,
        )
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    is_self = member_user_id == auth.user_id
    if is_self:
        # The last owner/admin cannot abandon the group — it would leave it with no
        # management surface. A plain member may always leave.
        if role in _MUTATE_ROLES and not await _has_other_admin(db, group_id, auth.user_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Promote another admin before leaving",
            )
    else:
        _require_role(role, _MUTATE_ROLES)
        # Only an owner may remove an owner or an admin; admins remove members only.
        if target.role in _MUTATE_ROLES and role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the owner can remove an admin or owner",
            )
    await db.delete(target)
    await db.commit()


@router.patch("/{group_id}/members/{member_user_id}", response_model=MemberSummary)
async def update_member_role(
    group_id: UUID, member_user_id: UUID, body: RoleUpdate, auth: Auth, db: DB
) -> MemberSummary:
    role = await _resolve_membership(db, auth, group_id)
    _require_role(role, _MUTATE_ROLES)
    target = await db.scalar(
        select(OwnershipScopeMember).where(
            OwnershipScopeMember.ownership_scope_id == group_id,
            OwnershipScopeMember.user_id == member_user_id,
        )
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if target.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change the owner's role"
        )
    if body.role == "admin" and target.role != "admin":
        admin_count = await db.scalar(
            select(func.count())
            .select_from(OwnershipScopeMember)
            .where(
                OwnershipScopeMember.ownership_scope_id == group_id,
                OwnershipScopeMember.role == "admin",
            )
        )
        if int(admin_count or 0) >= MAX_ADMINS_PER_GROUP:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A group can have at most {MAX_ADMINS_PER_GROUP} admins",
            )
    target.role = body.role
    display_name = await db.scalar(select(User.display_name).where(User.id == member_user_id))
    await db.commit()
    return MemberSummary(user_id=member_user_id, display_name=display_name, role=body.role)


@router.post("/{group_id}/invite", response_model=InviteResponse)
async def create_invite(group_id: UUID, auth: Auth, db: DB) -> InviteResponse:
    role = await _resolve_membership(db, auth, group_id)
    _require_role(role, _MUTATE_ROLES)
    scope = await db.get(OwnershipScope, group_id)
    if scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    token = secrets.token_urlsafe(24)
    expires_at = datetime.now(UTC) + INVITE_TTL
    scope.invite_token = token
    scope.invite_token_expires_at = expires_at
    await db.commit()
    return InviteResponse(token=token, expires_at=expires_at)


@invites_router.get("/{token}", response_model=InvitePreview)
async def preview_invite(token: str, auth: Auth, db: DB) -> InvitePreview:
    preview = await _invite_preview_row(db, token)
    if preview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    group_id, name, member_count, expires_at = preview
    return InvitePreview(
        group_id=group_id,
        name=name,
        member_count=member_count,
        expired=_is_expired(expires_at),
        already_member=await _is_scope_member(db, auth.user_id, group_id),
    )


@invites_router.post("/{token}/join", response_model=JoinResponse)
async def join_via_invite(token: str, auth: Auth, db: DB) -> JoinResponse:
    preview = await _invite_preview_row(db, token)
    if preview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    group_id, name, member_count, expires_at = preview
    if _is_expired(expires_at):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite has expired")
    if await _is_scope_member(db, auth.user_id, group_id):
        return JoinResponse(id=group_id, name=name)  # idempotent
    if member_count >= MAX_MEMBERS_PER_GROUP:  # cheap fast-fail (authoritative check below)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Group is full ({MAX_MEMBERS_PER_GROUP} members)",
        )
    if len(await _user_group_rows(db, auth.user_id)) >= MAX_GROUPS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You can belong to at most {MAX_GROUPS_PER_USER} groups",
        )
    await _set_postgres_ownership_scope(db, group_id)
    # Serialize concurrent joins for this group by locking the scope row, then
    # re-check the cap INSIDE the write transaction — the preview count is a stale
    # snapshot, so two joiners could otherwise both pass it and overshoot the cap.
    await db.execute(
        select(OwnershipScope.id).where(OwnershipScope.id == group_id).with_for_update()
    )
    live_count = await db.scalar(
        select(func.count())
        .select_from(OwnershipScopeMember)
        .where(OwnershipScopeMember.ownership_scope_id == group_id)
    )
    if int(live_count or 0) >= MAX_MEMBERS_PER_GROUP:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Group is full ({MAX_MEMBERS_PER_GROUP} members)",
        )
    db.add(OwnershipScopeMember(ownership_scope_id=group_id, user_id=auth.user_id, role="member"))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()  # raced another join → already a member, which is fine
    # Restore the caller's personal scope (the swap above was a deliberate,
    # token-authorized write; don't leave the session pointing at the group).
    await _set_postgres_ownership_scope(db, auth.ownership_scope_id)
    return JoinResponse(id=group_id, name=name)


async def _has_other_admin(db: AsyncSession, group_id: UUID, exclude_user_id: UUID) -> bool:
    """True if the group has another owner/admin besides exclude_user_id."""
    count = await db.scalar(
        select(func.count())
        .select_from(OwnershipScopeMember)
        .where(
            OwnershipScopeMember.ownership_scope_id == group_id,
            OwnershipScopeMember.role.in_(_MUTATE_ROLES),
            OwnershipScopeMember.user_id != exclude_user_id,
        )
    )
    return int(count or 0) > 0


def _is_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at < datetime.now(UTC)
