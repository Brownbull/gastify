"""Learned-mappings behavior contract (feature-correctness plan, Phase 1).

The promise: per user (scope), editing EXACTLY these four fields teaches the app —
merchant name, merchant (store) category, item name, item category — and the NEXT scan
of the same merchant/items auto-applies what was learned. These contracts must survive
any UI overhaul; they pin the API + persist behavior, not rendering.

The machinery exists (remember_* on PATCH; lookup_* in persist_scan) but had ZERO loop
tests before this file.
"""

import uuid
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.mapping import CategoryMapping, MerchantMapping
from app.models.reference import ItemCategory, StoreCategory
from app.models.scan import Scan, ScanStatus
from app.models.transaction import Transaction, TransactionItem
from app.services.math_gate import reconcile
from app.services.persist_scan import persist_scan_result
from app.services.scan_e2e_fixtures import fixture_case_by_key
from tests.conftest import TEST_SCOPE_ID

FIXTURE_MERCHANT = "Supermercado Jumbo"  # the happy fixture's extraction merchant
FIXTURE_ITEM = "Leche Entera Colun 1L"  # its first line item


def _factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_reference(db) -> tuple[uuid.UUID, uuid.UUID]:
    """One store category + one L4 item category for the FK targets."""
    store = StoreCategory(key="supermarkets", level=1, display_labels={"es": "Supermercados"})
    item = ItemCategory(key="lacteos", level=4, display_labels={"es": "Lácteos"})
    db.add(store)
    db.add(item)
    await db.flush()
    return store.id, item.id


async def _seed_txn(db, *, merchant: str, item_name: str) -> tuple[uuid.UUID, uuid.UUID]:
    txn = Transaction(
        ownership_scope_id=TEST_SCOPE_ID,
        transaction_date=date(2026, 6, 1),
        merchant=merchant,
        total_minor=5000,
        currency="CLP",
    )
    db.add(txn)
    await db.flush()
    item = TransactionItem(transaction_id=txn.id, name=item_name, total_price_minor=5000)
    db.add(item)
    await db.commit()
    return txn.id, item.id


@pytest.mark.asyncio
async def test_merchant_edit_learns_name_and_category(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        store_id, _ = await _seed_reference(db)
        txn_id, _ = await _seed_txn(db, merchant=FIXTURE_MERCHANT, item_name="x")
        await db.commit()

    resp = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={"merchant": "Jumbo Maipú", "store_category_id": str(store_id)},
    )
    assert resp.status_code == 200

    async with factory() as db:
        m = (await db.execute(select(MerchantMapping))).scalars().one()
    assert m.original_merchant == FIXTURE_MERCHANT.lower()
    assert m.target_merchant == "Jumbo Maipú"
    assert m.store_category_id == store_id
    assert m.source == "user"


@pytest.mark.asyncio
async def test_item_edit_learns_name_and_category(client, engine):
    factory = _factory(engine)
    async with factory() as db:
        _, itemcat_id = await _seed_reference(db)
        txn_id, item_id = await _seed_txn(db, merchant=FIXTURE_MERCHANT, item_name=FIXTURE_ITEM)
        await db.commit()

    resp = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={
            "items": [
                {"id": str(item_id), "name": "Leche Colun", "item_category_id": str(itemcat_id)}
            ]
        },
    )
    assert resp.status_code == 200

    async with factory() as db:
        m = (await db.execute(select(CategoryMapping))).scalars().one()
    assert m.original_item == FIXTURE_ITEM.lower()
    assert m.target_item == "Leche Colun"
    assert m.target_category_id == itemcat_id
    assert m.merchant_pattern == FIXTURE_MERCHANT.lower()


@pytest.mark.asyncio
async def test_reedit_updates_the_same_mapping(client, engine):
    """Upsert semantics: re-correcting the same original merchant UPDATES the mapping
    (no duplicate rows), so the latest correction wins on the next scan."""
    factory = _factory(engine)
    async with factory() as db:
        store_id, _ = await _seed_reference(db)
        t1, _ = await _seed_txn(db, merchant=FIXTURE_MERCHANT, item_name="x")
        t2, _ = await _seed_txn(db, merchant=FIXTURE_MERCHANT, item_name="y")
        await db.commit()

    await client.patch(f"/api/v1/transactions/{t1}", json={"merchant": "Jumbo Centro"})
    await client.patch(f"/api/v1/transactions/{t2}", json={"merchant": "Jumbo Maipú"})

    async with factory() as db:
        rows = (await db.execute(select(MerchantMapping))).scalars().all()
    assert len(rows) == 1  # upsert, not append
    assert rows[0].target_merchant == "Jumbo Maipú"  # latest correction wins


@pytest.mark.asyncio
async def test_next_scan_applies_learned_merchant_and_item(client, engine, monkeypatch):
    """THE LOOP: after the user corrects merchant+category and item name+category once,
    a brand-new scan of the same receipt auto-applies all four — observable on the
    persisted transaction (names, categories, source='mapping', usage_count)."""
    factory = _factory(engine)
    async with factory() as db:
        store_id, itemcat_id = await _seed_reference(db)
        txn_id, item_id = await _seed_txn(db, merchant=FIXTURE_MERCHANT, item_name=FIXTURE_ITEM)
        await db.commit()

    # Teach it (the two edits a real user would make).
    r1 = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={"merchant": "Jumbo Maipú", "store_category_id": str(store_id)},
    )
    r2 = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={
            "items": [
                {"id": str(item_id), "name": "Leche Colun", "item_category_id": str(itemcat_id)}
            ]
        },
    )
    assert r1.status_code == 200 and r2.status_code == 200

    # A NEW scan of the same receipt (the happy fixture: same merchant + item) through
    # the REAL persist path.
    fixture = fixture_case_by_key("happy")
    async with factory() as db:
        scan = Scan(
            ownership_scope_id=TEST_SCOPE_ID,
            status=ScanStatus.PROCESSING,
            image_path="/tmp/loop.jpg",
            original_filename="loop.jpg",
            content_type="image/jpeg",
            file_size_bytes=10,
        )
        db.add(scan)
        await db.flush()
        verdict = reconcile(fixture.extraction.extraction)
        new_txn = await persist_scan_result(
            db, scan, fixture.extraction, fixture.categorization, verdict
        )
        await db.commit()
        new_txn_id = new_txn.id

    async with factory() as db:
        txn = (
            await db.execute(select(Transaction).where(Transaction.id == new_txn_id))
        ).scalar_one()
        items = (
            (
                await db.execute(
                    select(TransactionItem).where(TransactionItem.transaction_id == new_txn_id)
                )
            )
            .scalars()
            .all()
        )
        merchant_map = (await db.execute(select(MerchantMapping))).scalars().one()
        item_map = (await db.execute(select(CategoryMapping))).scalars().one()

    assert txn.merchant == "Jumbo Maipú"  # learned merchant name applied
    assert txn.store_category_id == store_id  # learned merchant category applied
    assert txn.merchant_source == "mapping"
    learned = {i.name: i for i in items}
    assert "Leche Colun" in learned  # learned item NAME applied
    assert learned["Leche Colun"].item_category_id == itemcat_id  # learned item category
    assert merchant_map.usage_count == 1
    assert item_map.usage_count == 1


@pytest.mark.asyncio
async def test_batch_category_reassign_learns_per_merchant(client, engine):
    """Batch-update consistency: reassigning the category of N selected transactions
    teaches a merchant→category mapping for EACH distinct original merchant (it
    previously skipped learning entirely, unlike the single edit)."""
    factory = _factory(engine)
    async with factory() as db:
        store_id, _ = await _seed_reference(db)
        t1, _ = await _seed_txn(db, merchant="Jumbo Centro", item_name="a")
        t2, _ = await _seed_txn(db, merchant="Lider Express", item_name="b")
        await db.commit()

    resp = await client.post(
        "/api/v1/transactions/batch-update",
        json={
            "transaction_ids": [str(t1), str(t2)],
            "updates": {"store_category_id": str(store_id)},
        },
    )
    assert resp.status_code == 200
    assert resp.json()["count"] == 2

    async with factory() as db:
        rows = (await db.execute(select(MerchantMapping))).scalars().all()
    learned = {m.original_merchant: m for m in rows}
    assert set(learned) == {"jumbo centro", "lider express"}  # one mapping per merchant
    for m in learned.values():
        assert m.store_category_id == store_id
        assert m.target_merchant in ("Jumbo Centro", "Lider Express")  # name unchanged
