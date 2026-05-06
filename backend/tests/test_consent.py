"""Tests for consent management endpoints."""

import pytest


@pytest.mark.asyncio
async def test_list_consents_empty(client):
    resp = await client.get("/api/v1/consent")
    assert resp.status_code == 200
    data = resp.json()
    assert data["consents"] == []


@pytest.mark.asyncio
async def test_grant_consent(client):
    resp = await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "CL", "consent_version": "1.0"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["purpose"] == "analytics"
    assert data["status"] == "granted"
    assert data["jurisdiction"] == "CL"
    assert data["legal_basis"] == "legitimate_interest"


@pytest.mark.asyncio
async def test_grant_consent_unknown_purpose(client):
    resp = await client.post(
        "/api/v1/consent/unknown_purpose/grant",
        json={"jurisdiction": "CL"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_revoke_consent(client):
    await client.post(
        "/api/v1/consent/marketing/grant",
        json={"jurisdiction": "EU"},
    )

    resp = await client.post("/api/v1/consent/marketing/revoke")
    assert resp.status_code == 200
    data = resp.json()
    assert data["purpose"] == "marketing"
    assert data["status"] == "revoked"
    assert data["revoked_at"] is not None


@pytest.mark.asyncio
async def test_revoke_consent_not_found(client):
    resp = await client.post("/api/v1/consent/marketing/revoke")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_revoke_already_revoked(client):
    await client.post(
        "/api/v1/consent/marketing/grant",
        json={"jurisdiction": "CL"},
    )
    await client.post("/api/v1/consent/marketing/revoke")
    resp = await client.post("/api/v1/consent/marketing/revoke")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_grant_after_revoke_re_grants(client):
    await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "CL"},
    )
    await client.post("/api/v1/consent/analytics/revoke")

    resp = await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "EU", "consent_version": "2.0"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "granted"
    assert data["jurisdiction"] == "EU"
    assert data["revoked_at"] is None


@pytest.mark.asyncio
async def test_list_consents_after_grant(client):
    await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "CL"},
    )
    await client.post(
        "/api/v1/consent/marketing/grant",
        json={"jurisdiction": "EU"},
    )

    resp = await client.get("/api/v1/consent")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["consents"]) == 2
    purposes = {c["purpose"] for c in data["consents"]}
    assert purposes == {"analytics", "marketing"}


@pytest.mark.asyncio
async def test_audit_trail_records_grant_and_revoke(client):
    await client.post(
        "/api/v1/consent/analytics/grant",
        json={"jurisdiction": "CL"},
    )
    await client.post("/api/v1/consent/analytics/revoke")

    resp = await client.get("/api/v1/consent/audit")
    assert resp.status_code == 200
    data = resp.json()
    event_types = [e["event_type"] for e in data["events"]]
    assert "consent_granted" in event_types
    assert "consent_revoked" in event_types


@pytest.mark.asyncio
async def test_processing_register_returns_seeded_purposes(client):
    resp = await client.get("/api/v1/consent/processing-register")
    assert resp.status_code == 200
    data = resp.json()
    purposes = {r["purpose"] for r in data}
    assert "receipt_scanning" in purposes
    assert "analytics" in purposes
    assert "marketing" in purposes
    assert "data_sharing" in purposes
    assert "ai_training" in purposes
