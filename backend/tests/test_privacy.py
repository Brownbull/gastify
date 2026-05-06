"""Tests for DSR (Data Subject Request) privacy endpoints."""

import pytest

from tests.conftest import TEST_USER_ID


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
async def test_erasure_revokes_consents_and_anonymizes(client):
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
    assert data["transactions_anonymized"] == 0
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
