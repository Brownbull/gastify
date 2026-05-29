"""Tests for consent-revocation propagation (cohort/AI-training eligibility seams)."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.services.consent_propagation import (
    is_ai_training_eligible,
    is_cohort_eligible,
)

# Matches conftest mock_auth_context.
TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def _cohort_eligible(engine) -> bool:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        return await is_cohort_eligible(db, user_id=TEST_USER_ID, ownership_scope_id=TEST_SCOPE_ID)


async def _ai_eligible(engine) -> bool:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        return await is_ai_training_eligible(
            db, user_id=TEST_USER_ID, ownership_scope_id=TEST_SCOPE_ID
        )


@pytest.mark.asyncio
async def test_cohort_eligibility_tracks_live_data_sharing_consent(client, engine):
    assert await _cohort_eligible(engine) is False

    await client.post("/api/v1/consent/data_sharing/grant", json={"jurisdiction": "CL"})
    assert await _cohort_eligible(engine) is True

    # Revocation-aware: revoking immediately drops the user from the cohort.
    await client.post("/api/v1/consent/data_sharing/revoke")
    assert await _cohort_eligible(engine) is False


@pytest.mark.asyncio
async def test_unrelated_consent_does_not_grant_cohort_eligibility(client, engine):
    await client.post("/api/v1/consent/marketing/grant", json={"jurisdiction": "EU"})
    assert await _cohort_eligible(engine) is False


@pytest.mark.asyncio
async def test_propagation_audit_events_logged_on_grant_and_revoke(client):
    await client.post("/api/v1/consent/data_sharing/grant", json={"jurisdiction": "CL"})
    await client.post("/api/v1/consent/data_sharing/revoke")

    resp = await client.get("/api/v1/consent/audit")
    assert resp.status_code == 200
    event_types = [e["event_type"] for e in resp.json()["events"]]
    # one propagation on grant + one on revoke
    assert event_types.count("consent_propagation") >= 2


@pytest.mark.asyncio
async def test_erasure_excludes_user_from_cohort(client, engine):
    await client.post("/api/v1/consent/data_sharing/grant", json={"jurisdiction": "CL"})
    assert await _cohort_eligible(engine) is True

    erasure = await client.post("/api/v1/privacy/erasure")
    assert erasure.status_code == 200
    assert await _cohort_eligible(engine) is False


@pytest.mark.asyncio
async def test_ai_training_eligibility_tracks_consent(client, engine):
    assert await _ai_eligible(engine) is False
    await client.post("/api/v1/consent/ai_training/grant", json={"jurisdiction": "CL"})
    assert await _ai_eligible(engine) is True
    await client.post("/api/v1/consent/ai_training/revoke")
    assert await _ai_eligible(engine) is False
