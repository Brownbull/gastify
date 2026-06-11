"""Group CRUD + roles + caps + invite-link tests — SQLite app layer (5b).

These prove the endpoint behaviour (create/list/detail/rename/delete, role gating,
caps, membership management, and the invite generate → preview → join flow). SQLite
has no RLS, so cross-tenant ISOLATION is proven separately in test_group_isolation.py
(Postgres-gated); here the cross-scope readers run as plain queries.
"""

from __future__ import annotations

import contextlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api import groups as groups_api
from app.auth.deps import AuthContext, get_auth_context
from app.main import app
from app.models.user import OwnershipScope, OwnershipScopeMember, User
from tests.conftest import TEST_USER_ID


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_user(engine, suffix: str) -> tuple[uuid.UUID, uuid.UUID]:
    """Create a user with their own personal scope; return (user_id, scope_id)."""
    async with _sf(engine)() as s:
        scope = OwnershipScope(scope_type="individual")
        s.add(scope)
        await s.flush()
        user = User(
            firebase_uid=f"fb-{suffix}-{uuid.uuid4().hex[:8]}",
            email=f"{suffix}@example.com",
            display_name=f"User {suffix}",
            ownership_scope_id=scope.id,
            default_currency="CLP",
            locale="es",
        )
        s.add(user)
        await s.flush()
        s.add(OwnershipScopeMember(ownership_scope_id=scope.id, user_id=user.id, role="owner"))
        await s.commit()
        return user.id, scope.id


def _make_auth(user_id: uuid.UUID, scope_id: uuid.UUID, name: str = "X") -> AuthContext:
    now = datetime.now(UTC)
    user = User(
        id=user_id,
        firebase_uid=f"fb-auth-{user_id}",
        email=None,
        display_name=name,
        ownership_scope_id=scope_id,
        default_currency="CLP",
        locale="es",
        created_at=now,
        updated_at=now,
    )
    return AuthContext(user=user, ownership_scope_id=scope_id)


@contextlib.contextmanager
def _acting_as(auth_ctx: AuthContext):
    """Temporarily resolve auth as another user, then restore the fixture override."""
    prev = app.dependency_overrides.get(get_auth_context)
    app.dependency_overrides[get_auth_context] = lambda: auth_ctx
    try:
        yield
    finally:
        if prev is not None:
            app.dependency_overrides[get_auth_context] = prev
        else:
            app.dependency_overrides.pop(get_auth_context, None)


async def _add_member(engine, group_id: uuid.UUID, user_id: uuid.UUID, role: str) -> None:
    async with _sf(engine)() as s:
        s.add(OwnershipScopeMember(ownership_scope_id=group_id, user_id=user_id, role=role))
        await s.commit()


# --- CRUD + list ---


@pytest.mark.asyncio
async def test_create_lists_and_detail(client, engine):
    created = await client.post("/api/v1/groups", json={"name": "Casa Temuco"})
    assert created.status_code == 201
    body = created.json()
    assert body["role"] == "owner" and body["member_count"] == 1
    group_id = body["id"]

    listing = await client.get("/api/v1/groups")
    assert listing.status_code == 200
    assert [g["id"] for g in listing.json()] == [group_id]

    detail = await client.get(f"/api/v1/groups/{group_id}")
    assert detail.status_code == 200
    d = detail.json()
    assert d["name"] == "Casa Temuco"
    assert d["member_count"] == 1
    assert d["members"][0]["role"] == "owner"


@pytest.mark.asyncio
async def test_detail_404_for_non_member(client, engine):
    # A group TEST_USER doesn't belong to.
    async with _sf(engine)() as s:
        scope = OwnershipScope(scope_type="group", name="Strangers")
        s.add(scope)
        await s.commit()
        gid = scope.id
    resp = await client.get(f"/api/v1/groups/{gid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_group_cap(client, engine):
    for i in range(groups_api.MAX_GROUPS_PER_USER):
        ok = await client.post("/api/v1/groups", json={"name": f"G{i}"})
        assert ok.status_code == 201
    over = await client.post("/api/v1/groups", json={"name": "TooMany"})
    assert over.status_code == 409


# --- role gating ---


@pytest.mark.asyncio
async def test_rename_and_delete_role_gating(client, engine):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    member_uid, member_scope = await _seed_user(engine, "member")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    # A plain member cannot rename or delete.
    with _acting_as(_make_auth(member_uid, member_scope, "M")):
        denied_rename = await client.patch(f"/api/v1/groups/{group_id}", json={"name": "Nope"})
        denied_delete = await client.delete(f"/api/v1/groups/{group_id}")
    assert denied_rename.status_code == 403
    assert denied_delete.status_code == 403

    # The owner can rename, then delete.
    renamed = await client.patch(f"/api/v1/groups/{group_id}", json={"name": "Casa 2"})
    assert renamed.status_code == 200 and renamed.json()["name"] == "Casa 2"
    deleted = await client.delete(f"/api/v1/groups/{group_id}")
    assert deleted.status_code == 204
    assert (await client.get(f"/api/v1/groups/{group_id}")).status_code == 404


# --- membership management ---


@pytest.mark.asyncio
async def test_remove_member_and_owner_cannot_leave_last(client, engine):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    member_uid, member_scope = await _seed_user(engine, "m1")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    # Owner (last admin) cannot leave.
    cannot_leave = await client.delete(f"/api/v1/groups/{group_id}/members/{TEST_USER_ID}")
    assert cannot_leave.status_code == 409

    # Owner removes the member.
    removed = await client.delete(f"/api/v1/groups/{group_id}/members/{member_uid}")
    assert removed.status_code == 204
    assert (await client.get(f"/api/v1/groups/{group_id}")).json()["member_count"] == 1


@pytest.mark.asyncio
async def test_owner_leave_transfers_ownership_to_an_admin(client, engine):
    """D94: delete_group is owner-only and 'owner' is not assignable, so an owner
    leaving must hand ownership to the longest-standing other admin — otherwise the
    group is orphaned as permanently undeletable."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    gid = uuid.UUID(group_id)
    admin_uid, _ = await _seed_user(engine, "successor")
    later_admin_uid, _ = await _seed_user(engine, "later-admin")
    # SQLite's CURRENT_TIMESTAMP is second-granular, so set the join times explicitly
    # to make "longest-standing" unambiguous.
    async with _sf(engine)() as s:
        s.add(
            OwnershipScopeMember(
                ownership_scope_id=gid,
                user_id=admin_uid,
                role="admin",
                created_at=datetime(2026, 1, 1, tzinfo=UTC),
            )
        )
        s.add(
            OwnershipScopeMember(
                ownership_scope_id=gid,
                user_id=later_admin_uid,
                role="admin",
                created_at=datetime(2026, 2, 1, tzinfo=UTC),
            )
        )
        await s.commit()

    left = await client.post(f"/api/v1/groups/{group_id}/leave")
    assert left.status_code == 204

    async with _sf(engine)() as s:
        rows = (
            await s.execute(
                select(OwnershipScopeMember).where(OwnershipScopeMember.ownership_scope_id == gid)
            )
        ).scalars()
        roles = {m.user_id: m.role for m in rows}
    assert TEST_USER_ID not in roles  # the owner actually left
    assert roles[admin_uid] == "owner"  # longest-standing admin promoted
    assert roles[later_admin_uid] == "admin"  # the newer admin is untouched


@pytest.mark.asyncio
async def test_role_change_and_admin_cap(client, engine):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    gid = uuid.UUID(group_id)
    admins = []
    for i in range(groups_api.MAX_ADMINS_PER_GROUP):
        uid, _ = await _seed_user(engine, f"a{i}")
        await _add_member(engine, gid, uid, "admin")
        admins.append(uid)
    extra_uid, _ = await _seed_user(engine, "extra")
    await _add_member(engine, gid, extra_uid, "member")

    # Promoting a 4th admin exceeds the cap.
    over = await client.patch(
        f"/api/v1/groups/{group_id}/members/{extra_uid}", json={"role": "admin"}
    )
    assert over.status_code == 409

    # Demote an existing admin, then the promotion fits.
    demote = await client.patch(
        f"/api/v1/groups/{group_id}/members/{admins[0]}", json={"role": "member"}
    )
    assert demote.status_code == 200 and demote.json()["role"] == "member"
    promote = await client.patch(
        f"/api/v1/groups/{group_id}/members/{extra_uid}", json={"role": "admin"}
    )
    assert promote.status_code == 200

    # Cannot change the owner's role.
    owner_change = await client.patch(
        f"/api/v1/groups/{group_id}/members/{TEST_USER_ID}", json={"role": "member"}
    )
    assert owner_change.status_code == 403


# --- invite-link flow ---


@pytest.mark.asyncio
async def test_invite_generate_preview_join(client, engine):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    invite = await client.post(f"/api/v1/groups/{group_id}/invite")
    assert invite.status_code == 200
    token = invite.json()["token"]

    joiner_uid, joiner_scope = await _seed_user(engine, "joiner")
    with _acting_as(_make_auth(joiner_uid, joiner_scope, "J")):
        preview = await client.get(f"/api/v1/invites/{token}")
        assert preview.status_code == 200
        p = preview.json()
        assert p["name"] == "Casa" and p["already_member"] is False and p["expired"] is False

        joined = await client.post(f"/api/v1/invites/{token}/join")
        assert joined.status_code == 200 and joined.json()["id"] == group_id

        # Idempotent re-join + already_member now True.
        again = await client.post(f"/api/v1/invites/{token}/join")
        assert again.status_code == 200
        assert (await client.get(f"/api/v1/invites/{token}")).json()["already_member"] is True
        mine = await client.get("/api/v1/groups")
        assert group_id in [g["id"] for g in mine.json()]

    # Owner now sees 2 members.
    assert (await client.get(f"/api/v1/groups/{group_id}")).json()["member_count"] == 2


@pytest.mark.asyncio
async def test_join_expired_invite_410(client, engine):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    # Force an already-expired token directly.
    async with _sf(engine)() as s:
        scope = await s.get(OwnershipScope, uuid.UUID(group_id))
        scope.invite_token = "expired-token-xyz"
        scope.invite_token_expires_at = datetime.now(UTC) - timedelta(hours=1)
        await s.commit()

    joiner_uid, joiner_scope = await _seed_user(engine, "late")
    with _acting_as(_make_auth(joiner_uid, joiner_scope, "L")):
        resp = await client.post("/api/v1/invites/expired-token-xyz/join")
    assert resp.status_code == 410


@pytest.mark.asyncio
async def test_join_unknown_token_404(client):
    resp = await client.get("/api/v1/invites/does-not-exist")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_join_full_group_409(client, engine, monkeypatch):
    monkeypatch.setattr(groups_api, "MAX_MEMBERS_PER_GROUP", 1)
    group_id = (await client.post("/api/v1/groups", json={"name": "Tiny"})).json()["id"]
    token = (await client.post(f"/api/v1/groups/{group_id}/invite")).json()["token"]

    joiner_uid, joiner_scope = await _seed_user(engine, "overflow")
    with _acting_as(_make_auth(joiner_uid, joiner_scope, "O")):
        resp = await client.post(f"/api/v1/invites/{token}/join")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_admin_cannot_remove_another_admin(client, engine):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    gid = uuid.UUID(group_id)
    admin1_uid, admin1_scope = await _seed_user(engine, "adm1")
    admin2_uid, _ = await _seed_user(engine, "adm2")
    await _add_member(engine, gid, admin1_uid, "admin")
    await _add_member(engine, gid, admin2_uid, "admin")

    with _acting_as(_make_auth(admin1_uid, admin1_scope, "A1")):
        resp = await client.delete(f"/api/v1/groups/{group_id}/members/{admin2_uid}")
    assert resp.status_code == 403  # only the owner may remove an admin


@pytest.mark.asyncio
async def test_admin_cannot_change_another_admin_role(client, engine):
    """An admin cannot demote/alter a peer admin — only the owner manages admins."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    gid = uuid.UUID(group_id)
    admin1_uid, admin1_scope = await _seed_user(engine, "adm1")
    admin2_uid, _ = await _seed_user(engine, "adm2")
    member_uid, _ = await _seed_user(engine, "plain")
    await _add_member(engine, gid, admin1_uid, "admin")
    await _add_member(engine, gid, admin2_uid, "admin")
    await _add_member(engine, gid, member_uid, "member")

    with _acting_as(_make_auth(admin1_uid, admin1_scope, "A1")):
        # …cannot demote a peer admin
        demote = await client.patch(
            f"/api/v1/groups/{group_id}/members/{admin2_uid}", json={"role": "member"}
        )
        assert demote.status_code == 403
        # …but may still promote a plain member to admin (within the cap).
        promote = await client.patch(
            f"/api/v1/groups/{group_id}/members/{member_uid}", json={"role": "admin"}
        )
        assert promote.status_code == 200


@pytest.mark.asyncio
async def test_member_can_leave(client, engine):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    member_uid, member_scope = await _seed_user(engine, "leaver")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    with _acting_as(_make_auth(member_uid, member_scope, "L")):
        left = await client.delete(f"/api/v1/groups/{group_id}/members/{member_uid}")
    assert left.status_code == 204
    assert (await client.get(f"/api/v1/groups/{group_id}")).json()["member_count"] == 1


@pytest.mark.asyncio
async def test_join_when_at_group_cap_409(client, engine):
    # The caller (TEST_USER) already owns the max number of groups.
    for i in range(groups_api.MAX_GROUPS_PER_USER):
        await client.post("/api/v1/groups", json={"name": f"Mine{i}"})
    # A further group, owned by someone else, with a live invite.
    owner_uid, _ = await _seed_user(engine, "host")
    async with _sf(engine)() as s:
        scope = OwnershipScope(
            scope_type="group",
            name="Extra",
            invite_token="cap-token",
            invite_token_expires_at=datetime.now(UTC) + timedelta(days=1),
        )
        s.add(scope)
        await s.flush()
        s.add(OwnershipScopeMember(ownership_scope_id=scope.id, user_id=owner_uid, role="owner"))
        await s.commit()

    resp = await client.post("/api/v1/invites/cap-token/join")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_invite_rotation_invalidates_old_token(client):
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    first = (await client.post(f"/api/v1/groups/{group_id}/invite")).json()["token"]
    second = (await client.post(f"/api/v1/groups/{group_id}/invite")).json()["token"]
    assert first != second
    assert (await client.get(f"/api/v1/invites/{first}")).status_code == 404
    assert (await client.get(f"/api/v1/invites/{second}")).status_code == 200
