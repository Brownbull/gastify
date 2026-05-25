"""Tests for alias-only card CRUD and transaction card alias validation."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.statement import CardAlias
from app.models.user import OwnershipScope

TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def _alias_rows(engine) -> list[CardAlias]:
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        rows = await session.execute(select(CardAlias).order_by(CardAlias.created_at))
        return list(rows.scalars().all())


async def test_create_card_alias_is_alias_only(client, engine):
    resp = await client.post("/api/v1/card-aliases", json={"name": "  CMR Mastercard  "})

    assert resp.status_code == 201
    data = resp.json()
    assert set(data) == {"id", "name", "created_at", "archived_at"}
    assert data["name"] == "CMR Mastercard"
    assert data["archived_at"] is None

    rows = await _alias_rows(engine)
    assert len(rows) == 1
    assert rows[0].ownership_scope_id == TEST_SCOPE_ID
    assert rows[0].name == "CMR Mastercard"


async def test_card_alias_rejects_pci_shaped_fields(client):
    resp = await client.post(
        "/api/v1/card-aliases",
        json={
            "name": "Personal card",
            "card_number": "4111111111111111",
            "cvv": "123",
            "expiry": "12/30",
        },
    )

    assert resp.status_code == 422


async def test_card_alias_crud_archive_and_reuse_name(client):
    create = await client.post("/api/v1/card-aliases", json={"name": "Visa Banco"})
    assert create.status_code == 201
    alias_id = create.json()["id"]

    duplicate = await client.post("/api/v1/card-aliases", json={"name": "visa banco"})
    assert duplicate.status_code == 409

    updated = await client.patch(f"/api/v1/card-aliases/{alias_id}", json={"name": "Visa Nova"})
    assert updated.status_code == 200
    assert updated.json()["name"] == "Visa Nova"

    archived = await client.delete(f"/api/v1/card-aliases/{alias_id}")
    assert archived.status_code == 204

    active_list = await client.get("/api/v1/card-aliases")
    assert active_list.status_code == 200
    assert active_list.json() == []

    archived_list = await client.get("/api/v1/card-aliases?include_archived=true")
    assert archived_list.status_code == 200
    assert archived_list.json()[0]["archived_at"] is not None

    reused = await client.post("/api/v1/card-aliases", json={"name": "Visa Nova"})
    assert reused.status_code == 201


async def test_card_aliases_are_scoped(client, engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    other_scope_id = uuid.uuid4()
    async with session_factory() as session:
        session.add(OwnershipScope(id=other_scope_id, scope_type="individual"))
        await session.flush()
        other = CardAlias(ownership_scope_id=other_scope_id, name="Other scope card")
        session.add(other)
        await session.commit()
        other_id = str(other.id)

    missing = await client.get(f"/api/v1/card-aliases/{other_id}")
    assert missing.status_code == 404

    listing = await client.get("/api/v1/card-aliases")
    assert listing.status_code == 200
    assert listing.json() == []


async def test_transactions_accept_only_current_scope_active_card_alias(client, engine):
    alias_resp = await client.post("/api/v1/card-aliases", json={"name": "Personal Visa"})
    assert alias_resp.status_code == 201
    alias_id = alias_resp.json()["id"]

    create_txn = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_date": "2026-05-25",
            "merchant": "Card merchant",
            "total_minor": 12000,
            "currency": "CLP",
            "card_alias_id": alias_id,
        },
    )
    assert create_txn.status_code == 201
    detail = await client.get(f"/api/v1/transactions/{create_txn.json()['id']}")
    assert detail.status_code == 200
    assert detail.json()["card_alias_id"] == alias_id

    await client.delete(f"/api/v1/card-aliases/{alias_id}")
    archived_txn = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_date": "2026-05-25",
            "merchant": "Archived card merchant",
            "total_minor": 12000,
            "currency": "CLP",
            "card_alias_id": alias_id,
        },
    )
    assert archived_txn.status_code == 422

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    other_scope_id = uuid.uuid4()
    async with session_factory() as session:
        session.add(OwnershipScope(id=other_scope_id, scope_type="individual"))
        await session.flush()
        other_alias = CardAlias(
            ownership_scope_id=other_scope_id,
            name="Other alias",
            created_at=datetime.now(UTC),
        )
        session.add(other_alias)
        await session.commit()
        other_alias_id = str(other_alias.id)

    other_scope_txn = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_date": "2026-05-25",
            "merchant": "Other scope alias merchant",
            "total_minor": 12000,
            "currency": "CLP",
            "card_alias_id": other_alias_id,
        },
    )
    assert other_scope_txn.status_code == 422
