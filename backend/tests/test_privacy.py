"""Tests for DSR (Data Subject Request) privacy endpoints."""

import uuid
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.conftest import TEST_SCOPE_ID, TEST_USER_ID


@pytest.mark.asyncio
async def test_data_access_returns_user_and_counts(client):
    resp = await client.get("/api/v1/privacy/data-access")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["id"] == str(TEST_USER_ID)
    assert data["user"]["email"] == "test@example.com"
    assert data["transactions_count"] == 0
    assert data["consents"] == []
    assert data["exported_at"] is not None


@pytest.mark.asyncio
async def test_data_access_logs_audit_event(client):
    await client.get("/api/v1/privacy/data-access")

    resp = await client.get("/api/v1/consent/audit")
    data = resp.json()
    event_types = [e["event_type"] for e in data["events"]]
    assert "dsr_access" in event_types


@pytest.mark.asyncio
async def test_rectification_updates_user(client):
    resp = await client.post(
        "/api/v1/privacy/rectification",
        json={"display_name": "New Name", "locale": "en"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "display_name" in data["updated_fields"]
    assert "locale" in data["updated_fields"]
    assert data["updated_at"] is not None


@pytest.mark.asyncio
async def test_rectification_empty_body_updates_nothing(client):
    resp = await client.post(
        "/api/v1/privacy/rectification",
        json={},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["updated_fields"] == []


@pytest.mark.asyncio
async def test_rectification_logs_audit_event(client):
    await client.post(
        "/api/v1/privacy/rectification",
        json={"display_name": "Audited Name"},
    )

    resp = await client.get("/api/v1/consent/audit")
    data = resp.json()
    event_types = [e["event_type"] for e in data["events"]]
    assert "dsr_rectification" in event_types


@pytest.mark.asyncio
async def test_erasure_revokes_consents_and_hard_deletes(client):
    await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "CL"},
    )
    await client.post(
        "/api/v1/consent/marketing/grant",
        json={"jurisdiction": "EU"},
    )

    resp = await client.post("/api/v1/privacy/erasure")
    assert resp.status_code == 200
    data = resp.json()
    assert data["consents_revoked"] == 2
    assert data["transactions_deleted"] == 0
    assert data["audit_event_id"] is not None
    assert data["erased_at"] is not None


@pytest.mark.asyncio
async def test_erasure_logs_audit_event(client):
    await client.post("/api/v1/privacy/erasure")

    resp = await client.get("/api/v1/consent/audit")
    data = resp.json()
    event_types = [e["event_type"] for e in data["events"]]
    assert "dsr_erasure" in event_types


@pytest.mark.asyncio
async def test_portability_returns_full_export(client):
    resp = await client.get("/api/v1/privacy/portability")
    assert resp.status_code == 200
    data = resp.json()
    assert data["format"] == "application/json"
    assert data["version"] == "1.0"
    assert data["user"]["id"] == str(TEST_USER_ID)
    assert data["transactions"] == []
    assert data["exported_at"] is not None


@pytest.mark.asyncio
async def test_portability_logs_audit_event(client):
    await client.get("/api/v1/privacy/portability")

    resp = await client.get("/api/v1/consent/audit")
    data = resp.json()
    event_types = [e["event_type"] for e in data["events"]]
    assert "dsr_portability" in event_types


@pytest.mark.asyncio
async def test_erasure_then_access_shows_empty_consents(client):
    await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "CL"},
    )
    await client.post("/api/v1/privacy/erasure")

    resp = await client.get("/api/v1/consent")
    data = resp.json()
    for consent in data["consents"]:
        assert consent["status"] == "revoked"


@pytest.mark.asyncio
async def test_erasure_hard_deletes_all_data(client, engine):
    """Verify erasure HARD-DELETES the user's transactions/items/images/flags (D89,
    amends D4) and leaves only a scrubbed User shell (the audit-event FK anchor)."""
    from app.models.transaction import (
        Transaction,
        TransactionImage,
        TransactionItem,
        TransactionItemFlag,
    )

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    txn_id = uuid.uuid4()
    async with session_factory() as session:
        txn = Transaction(
            id=txn_id,
            ownership_scope_id=TEST_SCOPE_ID,
            transaction_date=date(2026, 1, 15),
            merchant="Farmacias Cruz Verde",
            total_minor=15000,
            currency="CLP",
            country="CL",
            city="Santiago",
            thumbnail_url="https://storage.example.com/receipt.jpg",
        )
        session.add(txn)
        await session.flush()

        item = TransactionItem(
            transaction_id=txn_id,
            name="Prescription Medication",
            total_price_minor=15000,
            subcategory="pharmacy",
        )
        session.add(item)
        await session.flush()

        session.add(
            TransactionItemFlag(
                ownership_scope_id=TEST_SCOPE_ID,
                transaction_item_id=item.id,
                user_id=TEST_USER_ID,
                flag_kind="special_case",
            )
        )
        session.add(
            TransactionItem(
                transaction_id=txn_id,
                name="Over-the-counter item",
                total_price_minor=0,
                subcategory="pharmacy",
            )
        )
        session.add(
            TransactionImage(
                transaction_id=txn_id,
                image_url="https://storage.example.com/receipt-full.jpg",
            )
        )
        await session.commit()

    await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "CL"},
    )

    resp = await client.post("/api/v1/privacy/erasure")
    assert resp.status_code == 200
    data = resp.json()
    assert data["transactions_deleted"] == 1
    assert data["user_anonymized"] is True

    async with session_factory() as session:
        from app.models.user import User

        # Transaction (+ its items, images, flags) are GONE — not redacted in place.
        txn_row = (
            await session.execute(select(Transaction).where(Transaction.id == txn_id))
        ).scalar_one_or_none()
        assert txn_row is None

        items = (
            (
                await session.execute(
                    select(TransactionItem).where(TransactionItem.transaction_id == txn_id)
                )
            )
            .scalars()
            .all()
        )
        assert items == []

        flags = (
            (
                await session.execute(
                    select(TransactionItemFlag).where(
                        TransactionItemFlag.ownership_scope_id == TEST_SCOPE_ID
                    )
                )
            )
            .scalars()
            .all()
        )
        assert flags == []

        images = (
            (
                await session.execute(
                    select(TransactionImage).where(TransactionImage.transaction_id == txn_id)
                )
            )
            .scalars()
            .all()
        )
        assert images == []

        # The User row survives as a scrubbed shell — the dsr_erasure audit event
        # FKs to user_id, so the row stays but its PII is anonymized.
        user_row = (await session.execute(select(User).where(User.id == TEST_USER_ID))).scalar_one()
        assert user_row.display_name == "[REDACTED]"
        assert user_row.email is None


@pytest.mark.asyncio
async def test_rectification_invalid_currency_returns_422(client):
    resp = await client.post(
        "/api/v1/privacy/rectification",
        json={"default_currency": "ZZZ"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_portability_includes_total_and_truncated(client):
    resp = await client.get("/api/v1/privacy/portability")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_transactions"] == 0
    assert data["truncated"] is False


@pytest.mark.asyncio
async def test_default_currency_switch_round_trip(client):
    """The user currency switch (functionality plan, Phase 3): CLP→USD and back,
    each change visible on the lightweight profile read the settings screen uses."""
    before = await client.get("/api/v1/privacy/profile")
    assert before.status_code == 200
    assert before.json()["default_currency"] == "CLP"

    to_usd = await client.post("/api/v1/privacy/rectification", json={"default_currency": "USD"})
    assert to_usd.status_code == 200
    assert "default_currency" in to_usd.json()["updated_fields"]
    assert (await client.get("/api/v1/privacy/profile")).json()["default_currency"] == "USD"

    back = await client.post("/api/v1/privacy/rectification", json={"default_currency": "CLP"})
    assert back.status_code == 200
    assert (await client.get("/api/v1/privacy/profile")).json()["default_currency"] == "CLP"


@pytest.mark.asyncio
async def test_date_format_preference_round_trip(client):
    """Phase-2 (manual-entry hardening): the date-format display preference persists
    and rejects unknown formats."""
    assert (await client.get("/api/v1/privacy/profile")).json()["date_format"] == "dd/MM/yyyy"
    ok = await client.post(
        "/api/v1/privacy/rectification", json={"date_format": "MM/dd/yyyy"}
    )
    assert ok.status_code == 200
    assert (await client.get("/api/v1/privacy/profile")).json()["date_format"] == "MM/dd/yyyy"
    bad = await client.post(
        "/api/v1/privacy/rectification", json={"date_format": "yyyy/dd/mm"}
    )
    assert bad.status_code == 422
    back = await client.post(
        "/api/v1/privacy/rectification", json={"date_format": "dd/MM/yyyy"}
    )
    assert back.status_code == 200
