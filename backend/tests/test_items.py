"""Items API tests — cross-transaction line-item list (Phase 6, GET /api/v1/items).

Covers the flat list, every filter (search / item-category / store-category /
merchant / date range), the 3-part cursor pagination (incl. paging WITHIN a
multi-item transaction across a page boundary — the reason the cursor carries the
item id, not just date|txn_id), and group scoping (a member sees shared items;
a non-member/unknown group is 404). SQLite has no RLS; cross-tenant ISOLATION is
proven generically in test_rls_postgres.py — here the scope resolution runs as the
app-layer validate-then-swap (which is what produces the 404).
"""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.reference import ItemCategory
from app.models.transaction import Transaction, TransactionItem
from app.models.user import OwnershipScope
from tests.conftest import TEST_SCOPE_ID
from tests.test_groups import _acting_as, _add_member, _make_auth, _seed_user


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_txn_with_items(
    engine,
    *,
    scope_id=TEST_SCOPE_ID,
    txn_date=date(2026, 3, 15),
    merchant="Lider",
    items: list[dict] | None = None,
    store_category_id=None,
) -> uuid.UUID:
    """Create a transaction + its items; return the transaction id.

    Each item dict: {name, total_price_minor, qty?, item_category_id?, sort_order?}.
    """
    items = items or [{"name": "Pan", "total_price_minor": 1500}]
    async with _sf(engine)() as s:
        txn = Transaction(
            ownership_scope_id=scope_id,
            transaction_date=txn_date,
            merchant=merchant,
            total_minor=sum(i["total_price_minor"] for i in items),
            currency="CLP",
            store_category_id=store_category_id,
        )
        s.add(txn)
        await s.flush()
        for idx, it in enumerate(items):
            s.add(
                TransactionItem(
                    transaction_id=txn.id,
                    name=it["name"],
                    qty=it.get("qty"),
                    total_price_minor=it["total_price_minor"],
                    item_category_id=it.get("item_category_id"),
                    sort_order=it.get("sort_order", idx),
                    is_flagged=False,
                )
            )
        await s.commit()
        return txn.id


async def _seed_item_category(engine, key="snacks-test") -> uuid.UUID:
    async with _sf(engine)() as s:
        cat = ItemCategory(key=key, level=4)
        s.add(cat)
        await s.flush()
        cat_id = cat.id
        await s.commit()
        return cat_id


async def _items(client, **params) -> list[dict]:
    resp = await client.get("/api/v1/items", params=params)
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


@pytest.mark.asyncio
async def test_lists_items_across_transactions(client, engine):
    await _seed_txn_with_items(
        engine, merchant="Lider", items=[{"name": "Pan", "total_price_minor": 1500}]
    )
    await _seed_txn_with_items(
        engine,
        merchant="Jumbo",
        txn_date=date(2026, 3, 10),
        items=[{"name": "Leche", "total_price_minor": 1200}],
    )
    rows = await _items(client)
    names = {r["name"] for r in rows}
    assert names == {"Pan", "Leche"}
    # Row shape carries denormalized parent-transaction context.
    pan = next(r for r in rows if r["name"] == "Pan")
    assert pan["merchant"] == "Lider"
    assert pan["total_minor"] == 1500
    assert pan["currency"] == "CLP"
    assert pan["transaction_id"] and pan["transaction_date"] == "2026-03-15"
    # Newest transaction first.
    assert rows[0]["name"] == "Pan"


@pytest.mark.asyncio
async def test_search_filters_by_item_name(client, engine):
    await _seed_txn_with_items(
        engine,
        items=[
            {"name": "Pan integral", "total_price_minor": 1500},
            {"name": "Leche", "total_price_minor": 1200},
        ],
    )
    rows = await _items(client, search="pan")
    assert [r["name"] for r in rows] == ["Pan integral"]


@pytest.mark.asyncio
async def test_merchant_and_date_filters(client, engine):
    await _seed_txn_with_items(
        engine,
        merchant="Lider",
        txn_date=date(2026, 3, 15),
        items=[{"name": "A", "total_price_minor": 100}],
    )
    await _seed_txn_with_items(
        engine,
        merchant="Jumbo",
        txn_date=date(2026, 1, 5),
        items=[{"name": "B", "total_price_minor": 200}],
    )
    assert {r["name"] for r in await _items(client, merchant="lider")} == {"A"}
    assert {r["name"] for r in await _items(client, date_from="2026-03-01")} == {"A"}
    assert {r["name"] for r in await _items(client, date_to="2026-02-01")} == {"B"}


@pytest.mark.asyncio
async def test_item_category_filter(client, engine):
    cat = await _seed_item_category(engine)
    await _seed_txn_with_items(
        engine,
        items=[
            {"name": "Chips", "total_price_minor": 900, "item_category_id": cat},
            {"name": "Water", "total_price_minor": 500},
        ],
    )
    rows = await _items(client, item_category_id=str(cat))
    assert [r["name"] for r in rows] == ["Chips"]
    assert rows[0]["item_category_key"] == "snacks-test"


@pytest.mark.asyncio
async def test_cursor_pages_within_a_multi_item_transaction(client, engine):
    """The 3-part cursor must continue WITHIN a transaction across a page boundary —
    a 2-part (date|txn_id) cursor would skip a transaction's remaining items."""
    await _seed_txn_with_items(
        engine,
        txn_date=date(2026, 3, 15),
        items=[
            {"name": "A1", "total_price_minor": 100},
            {"name": "A2", "total_price_minor": 200},
        ],
    )
    await _seed_txn_with_items(
        engine, txn_date=date(2026, 3, 10), items=[{"name": "B1", "total_price_minor": 300}]
    )

    seen: list[str] = []
    cursor = None
    for _ in range(6):  # safety bound
        params = {"limit": 1}
        if cursor:
            params["cursor"] = cursor
        resp = await client.get("/api/v1/items", params=params)
        assert resp.status_code == 200
        body = resp.json()
        seen.extend(r["name"] for r in body["data"])
        if not body["has_more"]:
            break
        cursor = body["cursor"]

    # Every item surfaced exactly once — no skips, no duplicates.
    assert sorted(seen) == ["A1", "A2", "B1"]
    assert len(seen) == len(set(seen))


@pytest.mark.asyncio
async def test_group_member_sees_shared_items(client, engine):
    """A group member lists items across the group's shared transactions."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    # A group-scoped transaction (as if shared in) with its items.
    await _seed_txn_with_items(
        engine,
        scope_id=uuid.UUID(group_id),
        merchant="Unimarc",
        items=[{"name": "Shared Bread", "total_price_minor": 2000}],
    )
    rows = await _items(client, group_id=group_id)
    assert {r["name"] for r in rows} == {"Shared Bread"}
    # Personal scope does NOT see the group item.
    assert {r["name"] for r in await _items(client)} == set()


@pytest.mark.asyncio
async def test_group_non_member_is_404(client, engine):
    """Listing items for a group the caller does not belong to is 404 (anti-enum)."""
    async with _sf(engine)() as s:
        scope = OwnershipScope(scope_type="group", name="Strangers")
        s.add(scope)
        await s.commit()
        gid = scope.id
    resp = await client.get("/api/v1/items", params={"group_id": str(gid)})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_member_lists_items_acting_as_peer(client, engine):
    """A seeded peer who joins a group sees the group's items under their own auth."""
    group_id = (await client.post("/api/v1/groups", json={"name": "Casa"})).json()["id"]
    peer_uid, peer_scope = await _seed_user(engine, "peer")
    await _add_member(engine, uuid.UUID(group_id), peer_uid, "member")
    await _seed_txn_with_items(
        engine,
        scope_id=uuid.UUID(group_id),
        items=[{"name": "Group Milk", "total_price_minor": 1100}],
    )
    with _acting_as(_make_auth(peer_uid, peer_scope, "Peer")):
        rows = await _items(client, group_id=group_id)
    assert {r["name"] for r in rows} == {"Group Milk"}
