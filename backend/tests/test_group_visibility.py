"""5e consent-gated member detail (D73) — SQLite app layer.

A group's transactions list shows aggregates-only by default. An admin can enable
member visibility; each member must then opt in (shares_detail) before their
shared rows appear individually to others. Your own rows always show. Departed
contributors drop from the list (D72) but stay in the aggregates. SQLite has no
RLS; cross-scope isolation is proven generically in test_rls_postgres.py.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select

from app.models.transaction import Transaction
from tests.test_group_share import _make_group, _seed_personal_txn, _sf
from tests.test_groups import _acting_as, _add_member, _make_auth, _seed_user


async def _share(client, group_id, txn_id):
    resp = await client.post(
        f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
    )
    assert resp.status_code == 201, resp.text


@pytest.mark.asyncio
async def test_group_detail_exposes_visibility_and_consent(client, engine):
    group_id = await _make_group(client)
    detail = (await client.get(f"/api/v1/groups/{group_id}")).json()
    assert detail["member_visibility_enabled"] is False
    assert detail["viewer_shares_detail"] is False

    assert (
        await client.patch(f"/api/v1/groups/{group_id}/visibility", json={"enabled": True})
    ).status_code == 200
    assert (
        await client.post(f"/api/v1/groups/{group_id}/consent", json={"shares_detail": True})
    ).status_code == 200

    detail2 = (await client.get(f"/api/v1/groups/{group_id}")).json()
    assert detail2["member_visibility_enabled"] is True
    assert detail2["viewer_shares_detail"] is True
    assert detail2["members"][0]["shares_detail"] is True


@pytest.mark.asyncio
async def test_non_admin_cannot_toggle_visibility(client, engine):
    group_id = await _make_group(client)
    member_uid, member_scope = await _seed_user(engine, "plain")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    with _acting_as(_make_auth(member_uid, member_scope, "Pl")):
        resp = await client.patch(
            f"/api/v1/groups/{group_id}/visibility", json={"enabled": True}
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_transactions_list_consent_gating(client, engine):
    """Default = own only; visibility on + member consent = both; own flagged is_own."""
    group_id = await _make_group(client)  # owner = default test user
    member_uid, member_scope = await _seed_user(engine, "member")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    owner_txn = await _seed_personal_txn(engine, total_minor=10_000, merchant="OwnerShop")
    await _share(client, group_id, owner_txn)
    member_txn = await _seed_personal_txn(
        engine, scope_id=member_scope, total_minor=20_000, merchant="MemberShop"
    )
    with _acting_as(_make_auth(member_uid, member_scope, "Mem")):
        await _share(client, group_id, member_txn)

    # 1. Visibility OFF (default): owner sees only their own row.
    rows = (await client.get(f"/api/v1/groups/{group_id}/transactions")).json()
    assert {r["merchant"] for r in rows} == {"OwnerShop"}
    assert all(r["is_own"] for r in rows)

    # 2. Visibility ON but member has NOT consented → still only own.
    await client.patch(f"/api/v1/groups/{group_id}/visibility", json={"enabled": True})
    rows = (await client.get(f"/api/v1/groups/{group_id}/transactions")).json()
    assert {r["merchant"] for r in rows} == {"OwnerShop"}

    # 3. Member consents → owner now sees both, attributed, is_own correct.
    with _acting_as(_make_auth(member_uid, member_scope, "Mem")):
        await client.post(f"/api/v1/groups/{group_id}/consent", json={"shares_detail": True})
    rows = (await client.get(f"/api/v1/groups/{group_id}/transactions")).json()
    by_merchant = {r["merchant"]: r for r in rows}
    assert set(by_merchant) == {"OwnerShop", "MemberShop"}
    assert by_merchant["OwnerShop"]["is_own"] is True
    assert by_merchant["MemberShop"]["is_own"] is False
    assert by_merchant["MemberShop"]["shared_by_name"] == "User member"


@pytest.mark.asyncio
async def test_transactions_list_hides_departed_contributor(client, engine):
    """D72: a departed contributor's row leaves the LIST but stays in aggregates."""
    group_id = await _make_group(client)
    member_uid, member_scope = await _seed_user(engine, "leaver")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")
    await client.patch(f"/api/v1/groups/{group_id}/visibility", json={"enabled": True})

    member_txn = await _seed_personal_txn(
        engine, scope_id=member_scope, total_minor=30_000, merchant="LeaverShop"
    )
    with _acting_as(_make_auth(member_uid, member_scope, "Lv")):
        await client.post(f"/api/v1/groups/{group_id}/consent", json={"shares_detail": True})
        await _share(client, group_id, member_txn)

    # Present + consented → visible in the list.
    rows = (await client.get(f"/api/v1/groups/{group_id}/transactions")).json()
    assert any(r["merchant"] == "LeaverShop" for r in rows)

    # Leaves → row drops from the list…
    with _acting_as(_make_auth(member_uid, member_scope, "Lv")):
        assert (await client.post(f"/api/v1/groups/{group_id}/leave")).status_code == 204
    rows_after = (await client.get(f"/api/v1/groups/{group_id}/transactions")).json()
    assert all(r["merchant"] != "LeaverShop" for r in rows_after)

    # …but the spend stays in the group's aggregates, and the copy still exists.
    monthly = await client.get(
        "/api/v1/insights/monthly", params={"period": "2026-03", "group_id": group_id}
    )
    assert monthly.json()["total_spend_minor"] == 30_000
    async with _sf(engine)() as s:
        count = await s.scalar(
            select(func.count())
            .select_from(Transaction)
            .where(Transaction.ownership_scope_id == uuid.UUID(group_id))
        )
        assert count == 1
