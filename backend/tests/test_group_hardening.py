"""Comprehensive group-hardening edge-case tests (D74 lock + D75 avatar) — SQLite app layer.

This is the deliberate, thorough pass over the trickiest surface in the app: the
shared-transaction lifecycle and the group membership/permission matrix. It pins the
DECIDED behaviour for every case the user enumerated:

  • a source becomes content-LOCKED once shared (merchant/category/items/amounts/
    currency/date immutable) but tangential ops stay open (card pairing, recurrence,
    personal item flags) and delete is still allowed — D74;
  • add → edit → share → (locked) → delete → re-add → re-share yields a NEW copy,
    never a false dedup, and the dedup only blocks re-sharing the SAME source;
  • remove a member then re-add them does NOT duplicate their already-shared copy,
    and a re-share after rejoin still dedups (the "no duplicate transactions" rule);
  • owner/admin role promote + demote;
  • member-visibility on → off → on round-trips the consent-gated list;
  • group rename + avatar (icon/color) propagate to every member — D75;
  • deleting the personal source leaves the group copy intact (orphan survives).

Two real users (the fixture user + a seeded peer) exercise the cross-member render.
SQLite has no RLS; cross-tenant ISOLATION is proven separately (test_rls_postgres.py).
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.statement import CardAlias
from app.models.transaction import Transaction, TransactionItem
from tests.conftest import TEST_SCOPE_ID
from tests.test_group_share import _make_group, _seed_personal_txn
from tests.test_groups import _acting_as, _add_member, _make_auth, _seed_user


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _group_copy_count(engine, group_id: str) -> int:
    async with _sf(engine)() as s:
        return int(
            await s.scalar(
                select(func.count())
                .select_from(Transaction)
                .where(Transaction.ownership_scope_id == uuid.UUID(group_id))
            )
            or 0
        )


async def _first_item_id(engine, txn_id: uuid.UUID) -> uuid.UUID:
    async with _sf(engine)() as s:
        return await s.scalar(
            select(TransactionItem.id).where(TransactionItem.transaction_id == txn_id)
        )


async def _seed_card_alias(engine, *, scope_id=TEST_SCOPE_ID, name="Visa") -> uuid.UUID:
    async with _sf(engine)() as s:
        alias = CardAlias(ownership_scope_id=scope_id, name=name)
        s.add(alias)
        await s.flush()
        alias_id = alias.id
        await s.commit()
        return alias_id


# --- D74: sharing locks the source's content ---------------------------------


@pytest.mark.asyncio
async def test_sharing_marks_source_is_shared(client, engine):
    """Before share: is_shared False (detail + list). After share: True on both."""
    group_id = await _make_group(client)
    txn_id = await _seed_personal_txn(engine)

    before = await client.get(f"/api/v1/transactions/{txn_id}")
    assert before.json()["is_shared"] is False

    assert (
        await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)})
    ).status_code == 201

    after = await client.get(f"/api/v1/transactions/{txn_id}")
    assert after.json()["is_shared"] is True
    listing = await client.get("/api/v1/transactions")
    row = next(r for r in listing.json()["data"] if r["id"] == str(txn_id))
    assert row["is_shared"] is True


@pytest.mark.asyncio
async def test_locked_source_blocks_content_edits(client, engine):
    """Content fields + item edits are 409 once the source is shared."""
    group_id = await _make_group(client)
    txn_id = await _seed_personal_txn(engine, merchant="Lider")
    item_id = await _first_item_id(engine, txn_id)
    await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)})

    for payload in (
        {"merchant": "Jumbo"},
        {"total_minor": 99_999},
        {"currency": "USD"},
        {"transaction_date": "2026-04-01"},
    ):
        resp = await client.patch(f"/api/v1/transactions/{txn_id}", json=payload)
        assert resp.status_code == 409, payload
        assert "locked" in resp.json()["detail"].lower()

    items_edit = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={"items": [{"id": str(item_id), "name": "Tampered"}]},
    )
    assert items_edit.status_code == 409

    # Nothing leaked through: the merchant is still the original.
    assert (await client.get(f"/api/v1/transactions/{txn_id}")).json()["merchant"] == "Lider"


@pytest.mark.asyncio
async def test_locked_source_allows_tangential_edits(client, engine):
    """Card pairing, recurrence, and personal item flags stay editable when locked."""
    group_id = await _make_group(client)
    txn_id = await _seed_personal_txn(engine)
    item_id = await _first_item_id(engine, txn_id)
    alias_id = await _seed_card_alias(engine)
    await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)})

    # Pair against a card (the "credit-card statement scan" tangent).
    paired = await client.patch(
        f"/api/v1/transactions/{txn_id}", json={"card_alias_id": str(alias_id)}
    )
    assert paired.status_code == 200
    assert paired.json()["card_alias_id"] == str(alias_id)

    # Mark it a recurring charge.
    recurred = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={"recurrence_kind": "recurring", "recurrence_interval": "monthly"},
    )
    assert recurred.status_code == 200
    assert recurred.json()["recurrence_kind"] == "recurring"

    # Personal item flags use their own endpoint — never content, always allowed.
    flagged = await client.put(
        f"/api/v1/transactions/{txn_id}/items/{item_id}/flags", json={"flags": ["urgency"]}
    )
    assert flagged.status_code == 200


@pytest.mark.asyncio
async def test_locked_source_blocks_batch_update(client, engine):
    """The batch-update endpoint honours the D74 lock too — a shared source in the
    batch rejects the WHOLE request (409) so its content cannot change via bulk ops.
    Without this the single-PATCH lock would be trivially bypassable."""
    group_id = await _make_group(client)
    shared = await _seed_personal_txn(engine, merchant="Lider")
    unshared = await _seed_personal_txn(engine, merchant="Jumbo")
    await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(shared)})

    resp = await client.post(
        "/api/v1/transactions/batch-update",
        json={
            "transaction_ids": [str(shared), str(unshared)],
            "updates": {"merchant": "Tampered"},
        },
    )
    assert resp.status_code == 409
    # The batch is rejected atomically — neither row changed.
    assert (await client.get(f"/api/v1/transactions/{shared}")).json()["merchant"] == "Lider"
    assert (await client.get(f"/api/v1/transactions/{unshared}")).json()["merchant"] == "Jumbo"


@pytest.mark.asyncio
async def test_unshared_batch_update_still_works(client, engine):
    """Control: batch-update on only-unshared transactions is unaffected by the lock."""
    await _make_group(client)
    t1 = await _seed_personal_txn(engine, merchant="Lider")
    t2 = await _seed_personal_txn(engine, merchant="Jumbo")
    resp = await client.post(
        "/api/v1/transactions/batch-update",
        json={"transaction_ids": [str(t1), str(t2)], "updates": {"merchant": "Unimarc"}},
    )
    assert resp.status_code == 200 and resp.json()["count"] == 2
    assert (await client.get(f"/api/v1/transactions/{t1}")).json()["merchant"] == "Unimarc"


@pytest.mark.asyncio
async def test_unshared_source_remains_fully_editable(client, engine):
    """Control: a source that was never shared still accepts content edits."""
    await _make_group(client)
    txn_id = await _seed_personal_txn(engine, merchant="Lider")
    resp = await client.patch(f"/api/v1/transactions/{txn_id}", json={"merchant": "Unimarc"})
    assert resp.status_code == 200
    assert resp.json()["merchant"] == "Unimarc"
    assert resp.json()["is_shared"] is False


# --- Lifecycle: add → edit → share → lock → delete → re-add → re-share --------


@pytest.mark.asyncio
async def test_full_lifecycle_delete_then_readd_makes_a_new_copy(client, engine):
    """Edit-before-share works; share locks; delete is allowed and the group copy
    survives; sharing a FRESH source makes a second copy (no false dedup)."""
    group_id = await _make_group(client)
    t1 = await _seed_personal_txn(engine, merchant="Lider", total_minor=50_000)

    # Editable before sharing.
    assert (
        await client.patch(f"/api/v1/transactions/{t1}", json={"merchant": "Lider Express"})
    ).status_code == 200

    await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(t1)})
    assert await _group_copy_count(engine, group_id) == 1

    # Locked now.
    assert (
        await client.patch(f"/api/v1/transactions/{t1}", json={"merchant": "X"})
    ).status_code == 409

    # Delete the personal source — allowed; the group copy is untouched (orphan).
    assert (await client.delete(f"/api/v1/transactions/{t1}")).status_code == 204
    assert await _group_copy_count(engine, group_id) == 1

    # A brand-new transaction shared in is a SECOND copy — the dedup only guards the
    # same source id, so re-adding after a delete legitimately adds (not duplicates).
    t2 = await _seed_personal_txn(engine, merchant="Jumbo", total_minor=12_000)
    assert (
        await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(t2)})
    ).status_code == 201
    assert await _group_copy_count(engine, group_id) == 2


@pytest.mark.asyncio
async def test_reshare_same_source_dedups(client, engine):
    """Re-sharing the SAME source is a 409 and never creates a second copy."""
    group_id = await _make_group(client)
    txn_id = await _seed_personal_txn(engine)
    assert (
        await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)})
    ).status_code == 201
    assert (
        await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)})
    ).status_code == 409
    assert await _group_copy_count(engine, group_id) == 1


# --- Membership: remove + re-add never duplicates the shared copy -------------


@pytest.mark.asyncio
async def test_remove_and_readd_member_does_not_duplicate_shared_txn(client, engine):
    """The headline invariant: a contributor leaves (copy stays — D72), is re-added
    (no copy is made), and a re-share after rejoin still dedups. Count stays 1."""
    group_id = await _make_group(client, name="Casa")
    sharer_uid, sharer_scope = await _seed_user(engine, "sharer")
    await _add_member(engine, uuid.UUID(group_id), sharer_uid, "member")
    txn_id = await _seed_personal_txn(engine, scope_id=sharer_scope, total_minor=42_000)
    sharer_auth = _make_auth(sharer_uid, sharer_scope, "Sh")

    with _acting_as(sharer_auth):
        assert (
            await client.post(
                f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
            )
        ).status_code == 201
    assert await _group_copy_count(engine, group_id) == 1

    # Owner removes the contributor — their shared copy stays (D72).
    assert (
        await client.delete(f"/api/v1/groups/{group_id}/members/{sharer_uid}")
    ).status_code == 204
    assert await _group_copy_count(engine, group_id) == 1

    # Re-add the same person — rejoining does NOT re-copy anything.
    await _add_member(engine, uuid.UUID(group_id), sharer_uid, "member")
    assert await _group_copy_count(engine, group_id) == 1

    # And a re-share of the same source after rejoin still dedups.
    with _acting_as(sharer_auth):
        again = await client.post(
            f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)}
        )
        assert again.status_code == 409
    assert await _group_copy_count(engine, group_id) == 1


# --- Roles: promote + demote -------------------------------------------------


@pytest.mark.asyncio
async def test_owner_promotes_then_demotes_admin(client, engine):
    group_id = await _make_group(client)
    member_uid, _ = await _seed_user(engine, "mem")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    promoted = await client.patch(
        f"/api/v1/groups/{group_id}/members/{member_uid}", json={"role": "admin"}
    )
    assert promoted.status_code == 200 and promoted.json()["role"] == "admin"

    demoted = await client.patch(
        f"/api/v1/groups/{group_id}/members/{member_uid}", json={"role": "member"}
    )
    assert demoted.status_code == 200 and demoted.json()["role"] == "member"


@pytest.mark.asyncio
async def test_admin_may_promote_a_member(client, engine):
    """An admin (not just the owner) can promote a plain member to admin."""
    group_id = await _make_group(client)
    admin_uid, admin_scope = await _seed_user(engine, "adm")
    member_uid, _ = await _seed_user(engine, "mem")
    await _add_member(engine, uuid.UUID(group_id), admin_uid, "admin")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    with _acting_as(_make_auth(admin_uid, admin_scope, "Adm")):
        resp = await client.patch(
            f"/api/v1/groups/{group_id}/members/{member_uid}", json={"role": "admin"}
        )
    assert resp.status_code == 200 and resp.json()["role"] == "admin"


# --- Visibility round-trips: on → off → on -----------------------------------


@pytest.mark.asyncio
async def test_member_visibility_toggle_round_trips_the_list(client, engine):
    """A peer's shared row appears only while visibility is ON and they consent;
    toggling visibility off hides it again, and back on re-reveals it."""
    group_id = await _make_group(client)
    sharer_uid, sharer_scope = await _seed_user(engine, "viz")
    await _add_member(engine, uuid.UUID(group_id), sharer_uid, "member")
    txn_id = await _seed_personal_txn(engine, scope_id=sharer_scope, total_minor=30_000)
    sharer_auth = _make_auth(sharer_uid, sharer_scope, "Vz")

    with _acting_as(sharer_auth):
        await client.post(f"/api/v1/groups/{group_id}/share", json={"transaction_id": str(txn_id)})
        await client.post(f"/api/v1/groups/{group_id}/consent", json={"shares_detail": True})

    async def owner_sees_peer_row() -> bool:
        rows = (await client.get(f"/api/v1/groups/{group_id}/transactions")).json()
        return any(r["shared_by_user_id"] == str(sharer_uid) for r in rows)

    # Visibility OFF (default): the peer's row is hidden from the owner.
    assert not await owner_sees_peer_row()
    # ON: now visible (peer has consented).
    await client.patch(f"/api/v1/groups/{group_id}/visibility", json={"enabled": True})
    assert await owner_sees_peer_row()
    # OFF again: hidden.
    await client.patch(f"/api/v1/groups/{group_id}/visibility", json={"enabled": False})
    assert not await owner_sees_peer_row()
    # ON again: re-revealed (consent persisted across the toggle).
    await client.patch(f"/api/v1/groups/{group_id}/visibility", json={"enabled": True})
    assert await owner_sees_peer_row()


# --- D75: rename + avatar propagate to members -------------------------------


@pytest.mark.asyncio
async def test_rename_propagates_to_members(client, engine):
    group_id = await _make_group(client, name="Casa")
    member_uid, member_scope = await _seed_user(engine, "rn")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    assert (
        await client.patch(f"/api/v1/groups/{group_id}", json={"name": "Casa Nueva"})
    ).status_code == 200

    with _acting_as(_make_auth(member_uid, member_scope, "Rn")):
        listing = await client.get("/api/v1/groups")
    names = {g["id"]: g["name"] for g in listing.json()}
    assert names[group_id] == "Casa Nueva"


@pytest.mark.asyncio
async def test_set_icon_propagates_to_members(client, engine):
    group_id = await _make_group(client)
    member_uid, member_scope = await _seed_user(engine, "ic")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    resp = await client.patch(
        f"/api/v1/groups/{group_id}/icon", json={"icon": "🏖️", "color": "#4F46E5"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["icon"] == "🏖️" and body["color"] == "#4f46e5"

    with _acting_as(_make_auth(member_uid, member_scope, "Ic")):
        listing = await client.get("/api/v1/groups")
        detail = await client.get(f"/api/v1/groups/{group_id}")
    summary = next(g for g in listing.json() if g["id"] == group_id)
    assert summary["icon"] == "🏖️" and summary["color"] == "#4f46e5"
    assert detail.json()["icon"] == "🏖️" and detail.json()["color"] == "#4f46e5"


@pytest.mark.asyncio
async def test_set_icon_requires_admin(client, engine):
    group_id = await _make_group(client)
    member_uid, member_scope = await _seed_user(engine, "noadm")
    await _add_member(engine, uuid.UUID(group_id), member_uid, "member")

    with _acting_as(_make_auth(member_uid, member_scope, "Na")):
        resp = await client.patch(f"/api/v1/groups/{group_id}/icon", json={"icon": "🎯"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_set_icon_rejects_bad_color(client, engine):
    group_id = await _make_group(client)
    resp = await client.patch(
        f"/api/v1/groups/{group_id}/icon", json={"icon": "🎯", "color": "not-a-color"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_set_icon_can_clear_to_default(client, engine):
    group_id = await _make_group(client)
    await client.patch(f"/api/v1/groups/{group_id}/icon", json={"icon": "🎯", "color": "#abcdef"})
    cleared = await client.patch(
        f"/api/v1/groups/{group_id}/icon", json={"icon": None, "color": None}
    )
    assert cleared.status_code == 200
    assert cleared.json()["icon"] is None and cleared.json()["color"] is None
