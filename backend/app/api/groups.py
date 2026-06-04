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
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

# Auth is a runtime Annotated FastAPI dep (TC001); the two helpers are called at
# runtime — the line-level noqa keeps Auth importable for FastAPI's resolution.
from app.auth.deps import Auth, _is_scope_member, _set_postgres_ownership_scope  # noqa: TC001
from app.db import get_db
from app.models.transaction import Transaction, TransactionItem
from app.models.user import OwnershipScope, OwnershipScopeMember, User
from app.schemas.groups import (
    ConsentUpdate,
    GroupCreate,
    GroupDetail,
    GroupRename,
    GroupRole,
    GroupSummary,
    GroupTransactionRow,
    InvitePreview,
    InviteResponse,
    JoinResponse,
    MemberSummary,
    RoleUpdate,
    SharedTransactionResponse,
    ShareRequest,
    VisibilityUpdate,
)

# Spend fields a share copies verbatim; telemetry (llm_*/scan_*), personal
# provenance (mapping ids, user-edit timestamps, card alias, thumbnail), and
# per-user flags are intentionally NOT carried into the group copy (D70).
_TXN_COPY_FIELDS = (
    "transaction_date",
    "transaction_time",
    "merchant",
    # `alias` is intentionally NOT copied — it's the sharer's private label and
    # would leak a personal annotation to all members (data minimization, D70).
    "store_category_id",
    "store_category_source",
    "store_category_confidence",
    "total_minor",
    "discount_total_minor",
    "gross_total_minor",
    "reconstructed_total_minor",
    "currency",
    "amount_usd_minor",
    "fx_rate_to_usd",
    "fx_captured_at",
    "receipt_type",
    "country",
    "city",
    "recurrence_kind",
    "recurrence_interval",
    "term_current",
    "term_total",
    "recurrence_label",
    "recurrence_source",
    "recurrence_confidence",
)
_ITEM_COPY_FIELDS = (
    "name",
    "qty",
    "unit_price_minor",
    "total_price_minor",
    "discount_minor",
    "discount_label",
    "item_category_id",
    "subcategory",
    "category_source",
    "sort_order",
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


async def _restore_personal_scope(db: AsyncSession, auth: Auth) -> None:
    """Re-point the session GUC at the caller's personal scope after a deliberate
    write-swap (create/join/share), so nothing later in the request runs grouped."""
    await _set_postgres_ownership_scope(db, auth.ownership_scope_id)


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
    # The swap above was only to satisfy the member INSERT's WITH CHECK; don't
    # leave the session pointing at the new group.
    await _restore_personal_scope(db, auth)
    return GroupSummary(id=scope.id, name=body.name, role="owner", member_count=1)


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group(group_id: UUID, auth: Auth, db: DB) -> GroupDetail:
    role = await _resolve_membership(db, auth, group_id)
    scope_row = (
        await db.execute(
            select(OwnershipScope.name, OwnershipScope.member_visibility_enabled).where(
                OwnershipScope.id == group_id
            )
        )
    ).first()
    scope_name = scope_row[0] if scope_row else ""
    visibility_enabled = bool(scope_row[1]) if scope_row else False
    result = await db.execute(
        select(
            OwnershipScopeMember.user_id,
            User.display_name,
            OwnershipScopeMember.role,
            OwnershipScopeMember.shares_detail,
        )
        .join(User, User.id == OwnershipScopeMember.user_id)
        .where(OwnershipScopeMember.ownership_scope_id == group_id)
        .order_by(OwnershipScopeMember.created_at)
    )
    members: list[MemberSummary] = []
    viewer_shares_detail = False
    for uid, name, member_role, shares_detail in result:
        members.append(
            MemberSummary(
                user_id=uid,
                display_name=name,
                role=cast("GroupRole", member_role),
                shares_detail=bool(shares_detail),
            )
        )
        if uid == auth.user_id:
            viewer_shares_detail = bool(shares_detail)
    return GroupDetail(
        id=group_id,
        name=scope_name or "",
        role=role,
        member_count=len(members),
        members=members,
        member_visibility_enabled=visibility_enabled,
        viewer_shares_detail=viewer_shares_detail,
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


@router.patch("/{group_id}/visibility", response_model=GroupDetail)
async def set_member_visibility(
    group_id: UUID, body: VisibilityUpdate, auth: Auth, db: DB
) -> GroupDetail:
    """Admin toggles whether members may expose individual transactions (5e/D73)."""
    role = await _resolve_membership(db, auth, group_id)
    _require_role(role, _MUTATE_ROLES)
    scope = await db.get(OwnershipScope, group_id)
    if scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    scope.member_visibility_enabled = body.enabled
    await db.commit()
    return await get_group(group_id, auth, db)


@router.post("/{group_id}/consent", response_model=GroupDetail)
async def set_member_consent(
    group_id: UUID, body: ConsentUpdate, auth: Auth, db: DB
) -> GroupDetail:
    """A member opts their own shared transactions in/out of the group list (5e/D73)."""
    await _resolve_membership(db, auth, group_id)  # any member; validates + swaps GUC
    member = await db.scalar(
        select(OwnershipScopeMember).where(
            OwnershipScopeMember.ownership_scope_id == group_id,
            OwnershipScopeMember.user_id == auth.user_id,
        )
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    member.shares_detail = body.shares_detail
    await db.commit()
    return await get_group(group_id, auth, db)


@router.get("/{group_id}/transactions", response_model=list[GroupTransactionRow])
async def list_group_transactions(
    group_id: UUID, auth: Auth, db: DB
) -> list[GroupTransactionRow]:
    """Consent-gated list of the group's shared transactions (5e/D73 + D72).

    A row shows iff it is the viewer's OWN share, OR the group enabled member
    visibility AND the contributor is a CURRENT member who opted in (shares_detail).
    The INNER JOIN on the sharer's current membership drops departed contributors'
    rows (D72) — they stay in the aggregates (/insights/*) but not in this list.
    """
    await _resolve_membership(db, auth, group_id)
    visibility_enabled = await db.scalar(
        select(OwnershipScope.member_visibility_enabled).where(OwnershipScope.id == group_id)
    )
    sharer = aliased(OwnershipScopeMember)
    if visibility_enabled:
        consent_visible = or_(
            Transaction.shared_by_user_id == auth.user_id,
            sharer.shares_detail.is_(True),
        )
    else:
        consent_visible = Transaction.shared_by_user_id == auth.user_id
    rows = await db.execute(
        select(
            Transaction.id,
            Transaction.transaction_date,
            Transaction.merchant,
            Transaction.total_minor,
            Transaction.currency,
            Transaction.shared_by_user_id,
            User.display_name,
        )
        .join(sharer, sharer.user_id == Transaction.shared_by_user_id)
        .join(User, User.id == Transaction.shared_by_user_id)
        .where(
            Transaction.ownership_scope_id == group_id,
            sharer.ownership_scope_id == group_id,
            consent_visible,
        )
        .order_by(Transaction.transaction_date.desc(), Transaction.id)
    )
    return [
        GroupTransactionRow(
            id=row[0],
            transaction_date=row[1],
            merchant=row[2] or "",
            total_minor=row[3],
            currency=row[4],
            shared_by_user_id=row[5],
            shared_by_name=row[6],
            is_own=(row[5] == auth.user_id),
        )
        for row in rows
    ]


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: UUID, auth: Auth, db: DB) -> None:
    role = await _resolve_membership(db, auth, group_id)
    _require_role(role, ("owner",))
    # NOTE: this is DELETE-the-whole-group — distinct from a member LEAVING. When a
    # member leaves, their shared transactions remain in the group's statistics
    # (D70); but deleting the group removes the group entirely, so its shared
    # transactions go with it (and would otherwise FK-block the scope delete). Items
    # /images/flags cascade via their ON DELETE CASCADE FKs to transactions.
    group_txns = (
        (await db.execute(select(Transaction).where(Transaction.ownership_scope_id == group_id)))
        .scalars()
        .all()
    )
    for txn in group_txns:
        await db.delete(txn)
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
    await _restore_personal_scope(db, auth)


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
    await _restore_personal_scope(db, auth)


@router.post("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_group(group_id: UUID, auth: Auth, db: DB) -> None:
    """Leave a group as the authenticated caller (no member id needed client-side).

    The last owner/admin cannot leave — it would strand the group with no
    management surface; promote another admin first.
    """
    role = await _resolve_membership(db, auth, group_id)
    if role in _MUTATE_ROLES and not await _has_other_admin(db, group_id, auth.user_id):
        await _restore_personal_scope(db, auth)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Promote another admin before leaving",
        )
    target = await db.scalar(
        select(OwnershipScopeMember).where(
            OwnershipScopeMember.ownership_scope_id == group_id,
            OwnershipScopeMember.user_id == auth.user_id,
        )
    )
    if target is not None:
        await db.delete(target)
        await db.commit()
    await _restore_personal_scope(db, auth)


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


def _copy_transaction(source: Transaction, *, group_id: UUID, user_id: UUID) -> Transaction:
    """Build a group-scoped copy of a personal transaction (spend fields + items)."""
    copy = Transaction(
        ownership_scope_id=group_id,
        shared_by_user_id=user_id,
        shared_from_transaction_id=source.id,
        **{field: getattr(source, field) for field in _TXN_COPY_FIELDS},
    )
    copy.items = [
        # is_flagged is reset (NOT copied): a group copy starts unflagged — the
        # source's personal flags do not cross into the shared scope (D70).
        TransactionItem(
            is_flagged=False, **{field: getattr(item, field) for field in _ITEM_COPY_FIELDS}
        )
        for item in source.items
    ]
    return copy


@router.post(
    "/{group_id}/share",
    status_code=status.HTTP_201_CREATED,
    response_model=SharedTransactionResponse,
)
async def share_transaction(
    group_id: UUID, body: ShareRequest, auth: Auth, db: DB
) -> SharedTransactionResponse:
    """Copy one of the caller's PERSONAL transactions into a group they belong to.

    Read the source under the caller's personal GUC (RLS shows only their own),
    validate group membership, THEN swap to the group scope and insert the copy
    (WITH CHECK passes because the GUC now equals the group). The original stays
    personal; scanning remains personal-only (D70).
    """
    source = (
        await db.execute(
            select(Transaction)
            .where(Transaction.id == body.transaction_id)
            .options(selectinload(Transaction.items))
        )
    ).scalar_one_or_none()
    if source is None or source.ownership_scope_id != auth.ownership_scope_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    if not await _is_scope_member(db, auth.user_id, group_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    await _set_postgres_ownership_scope(db, group_id)
    already = await db.scalar(
        select(Transaction.id).where(
            Transaction.ownership_scope_id == group_id,
            Transaction.shared_from_transaction_id == source.id,
        )
    )
    if already is not None:
        await _restore_personal_scope(db, auth)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transaction already shared to this group",
        )
    copy = _copy_transaction(source, group_id=group_id, user_id=auth.user_id)
    db.add(copy)
    try:
        await db.commit()
    except IntegrityError:
        # Raced a concurrent share (the unique (scope, shared_from) constraint).
        await db.rollback()
        await _restore_personal_scope(db, auth)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transaction already shared to this group",
        ) from None
    # Response fields are read from the in-memory copy (no DB I/O), so the personal
    # scope can be restored immediately after commit before any further work.
    response = SharedTransactionResponse(
        id=copy.id,
        group_id=group_id,
        merchant=copy.merchant,
        total_minor=copy.total_minor,
        currency=copy.currency,
        shared_from_transaction_id=source.id,
    )
    await _restore_personal_scope(db, auth)
    return response


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
        await _restore_personal_scope(db, auth)
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
    await _restore_personal_scope(db, auth)
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
