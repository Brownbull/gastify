"""Scope-resolution (validate-then-swap) wiring tests — SQLite app layer (5a).

These exercise `resolve_analytics_scope` + the optional `group_id` on the insights
endpoints at the application layer: a member resolves to the group scope, a
non-member (or unknown group) gets 404, and no `group_id` stays personal. They do
NOT prove RLS isolation — SQLite has no row-level security, so a leak would pass
here. The RLS-enforced isolation proof lives in `test_group_isolation.py`
(Postgres-gated). Together: this proves the gate FIRES; that one proves the gate
HOLDS under real RLS.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth.deps import AuthContext, resolve_analytics_scope
from app.models.user import OwnershipScope, OwnershipScopeMember
from tests.conftest import TEST_SCOPE_ID, TEST_USER_ID


async def _seed_group(session: AsyncSession, *, member_user_id: uuid.UUID | None) -> uuid.UUID:
    """Create a group scope, optionally with `member_user_id` as a member; return its id."""
    group = OwnershipScope(scope_type="group", name="Casa Temuco")
    session.add(group)
    await session.flush()
    if member_user_id is not None:
        session.add(
            OwnershipScopeMember(ownership_scope_id=group.id, user_id=member_user_id, role="owner")
        )
    await session.commit()
    return group.id


@pytest.mark.asyncio
async def test_resolve_returns_personal_when_no_group(engine, mock_auth_context: AuthContext):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        scope = await resolve_analytics_scope(session, mock_auth_context, None)
    assert scope == TEST_SCOPE_ID


@pytest.mark.asyncio
async def test_resolve_returns_personal_for_own_scope(engine, mock_auth_context: AuthContext):
    """Passing your own personal scope as group_id is idempotent, not a swap."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        scope = await resolve_analytics_scope(session, mock_auth_context, TEST_SCOPE_ID)
    assert scope == TEST_SCOPE_ID


@pytest.mark.asyncio
async def test_resolve_swaps_to_group_for_member(engine, mock_auth_context: AuthContext):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        group_id = await _seed_group(session, member_user_id=TEST_USER_ID)
        scope = await resolve_analytics_scope(session, mock_auth_context, group_id)
    assert scope == group_id


@pytest.mark.asyncio
async def test_resolve_404_for_non_member(engine, mock_auth_context: AuthContext):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        group_id = await _seed_group(session, member_user_id=None)  # caller is NOT a member
        with pytest.raises(HTTPException) as exc:
            await resolve_analytics_scope(session, mock_auth_context, group_id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_resolve_404_for_unknown_group(engine, mock_auth_context: AuthContext):
    """A non-existent group is indistinguishable from a non-member group (anti-enumeration)."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        with pytest.raises(HTTPException) as exc:
            await resolve_analytics_scope(session, mock_auth_context, uuid.uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_tree_endpoint_404_for_non_member_group(client, engine):
    """End-to-end: GET /insights/tree?group_id=<not-mine> returns 404, never group data."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        group_id = await _seed_group(session, member_user_id=None)
    resp = await client.get(
        "/api/v1/insights/tree", params={"period": "2026-03", "group_id": str(group_id)}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_tree_endpoint_200_for_member_group(client, engine):
    """A member can read the group's tree (empty here — the point is the gate opens)."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        group_id = await _seed_group(session, member_user_id=TEST_USER_ID)
    resp = await client.get(
        "/api/v1/insights/tree", params={"period": "2026-03", "group_id": str(group_id)}
    )
    assert resp.status_code == 200
    assert resp.json()["dimension"] == "transaction_category"


# /monthly and /series wire group_id through the same resolver — prove the gate
# fires/opens there too, so a future refactor that drops resolve_analytics_scope
# from one handler is caught.


@pytest.mark.asyncio
async def test_monthly_endpoint_gate(client, engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        not_mine = await _seed_group(session, member_user_id=None)
        mine = await _seed_group(session, member_user_id=TEST_USER_ID)
    denied = await client.get(
        "/api/v1/insights/monthly", params={"period": "2026-03", "group_id": str(not_mine)}
    )
    assert denied.status_code == 404
    allowed = await client.get(
        "/api/v1/insights/monthly", params={"period": "2026-03", "group_id": str(mine)}
    )
    assert allowed.status_code == 200


@pytest.mark.asyncio
async def test_series_endpoint_gate(client, engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        not_mine = await _seed_group(session, member_user_id=None)
        mine = await _seed_group(session, member_user_id=TEST_USER_ID)
    params = {"from": "2026-01", "to": "2026-03"}
    denied = await client.get(
        "/api/v1/insights/series", params={**params, "group_id": str(not_mine)}
    )
    assert denied.status_code == 404
    allowed = await client.get("/api/v1/insights/series", params={**params, "group_id": str(mine)})
    assert allowed.status_code == 200
