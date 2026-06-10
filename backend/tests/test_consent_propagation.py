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


# --- D90 output-level proof: revocation excludes the user from the cohort AGGREGATE,
# --- not merely the eligibility boolean (the observable consumer of the live roster). ---


from sqlalchemy import select  # noqa: E402

from app.models.consent import ConsentRecord  # noqa: E402
from app.services.cohort import cohort_baseline, eligible_cohort_member_ids  # noqa: E402
from app.services.consent_propagation import COHORT_CONSENT_PURPOSE  # noqa: E402
from tests.test_groups import _seed_user  # noqa: E402


class _ZeroNoise:
    """rng.random()==0.5 -> exactly 0 Laplace noise, so the DP mean is deterministic."""

    def random(self) -> float:
        return 0.5


async def _grant_data_sharing(engine, *, user_id, scope_id) -> None:
    from datetime import UTC, datetime

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        db.add(
            ConsentRecord(
                ownership_scope_id=scope_id,
                user_id=user_id,
                purpose=COHORT_CONSENT_PURPOSE,
                status="granted",
                jurisdiction="CL",
                granted_at=datetime.now(UTC),
            )
        )
        await db.commit()


async def _cohort_stat(engine, *, spend_by_user, k_floor):
    """Build the DP cohort stat from the LIVE eligible roster — the observable output a
    P9 consumer releases. member_count + dp_mean exclude anyone not currently eligible."""
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        ids = await eligible_cohort_member_ids(db)
    contributions = [spend_by_user[uid] for uid in ids]
    return cohort_baseline(
        contributions, epsilon=1.0, cap=10_000_000, rng=_ZeroNoise(), k_floor=k_floor
    )


@pytest.mark.asyncio
async def test_revoked_user_contribution_absent_from_cohort_output(client, engine):
    # 3 seeded eligible members + TEST_USER = 4 (>= k_floor 3, not suppressed).
    spend = {}
    for i in range(3):
        uid, scope = await _seed_user(engine, f"cohort{i}")
        await _grant_data_sharing(engine, user_id=uid, scope_id=scope)
        spend[uid] = 1_000 * (i + 1)  # 1000, 2000, 3000
    await client.post("/api/v1/consent/data_sharing/grant", json={"jurisdiction": "CL"})
    spend[TEST_USER_ID] = 90_000  # TEST_USER's large spend skews the mean while present

    before = await _cohort_stat(engine, spend_by_user=spend, k_floor=3)
    assert before is not None
    assert before.member_count == 4
    assert before.dp_mean_minor == round((1000 + 2000 + 3000 + 90_000) / 4)

    # Revoke → the released DP statistic must drop TEST_USER's contribution entirely.
    await client.post("/api/v1/consent/data_sharing/revoke")
    after = await _cohort_stat(engine, spend_by_user=spend, k_floor=3)
    assert after is not None
    assert after.member_count == 3
    assert after.dp_mean_minor == round((1000 + 2000 + 3000) / 3)


@pytest.mark.asyncio
async def test_erasure_excludes_user_from_cohort_output(client, engine):
    """Erasure (revoke_all_consents) likewise drops the user from the cohort aggregate;
    the consent row is left status=revoked with withdrawn_at NULL (system, not user)."""
    spend = {}
    for i in range(3):
        uid, scope = await _seed_user(engine, f"erase-cohort{i}")
        await _grant_data_sharing(engine, user_id=uid, scope_id=scope)
        spend[uid] = 5_000
    await client.post("/api/v1/consent/data_sharing/grant", json={"jurisdiction": "CL"})
    spend[TEST_USER_ID] = 50_000

    before = await _cohort_stat(engine, spend_by_user=spend, k_floor=3)
    assert before.member_count == 4

    await client.post("/api/v1/privacy/erasure")
    after = await _cohort_stat(engine, spend_by_user=spend, k_floor=3)
    assert after.member_count == 3  # TEST_USER gone from the aggregate

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        row = (
            await db.execute(
                select(ConsentRecord).where(
                    ConsentRecord.user_id == TEST_USER_ID,
                    ConsentRecord.purpose == COHORT_CONSENT_PURPOSE,
                )
            )
        ).scalar_one()
    assert row.status == "revoked"
    assert row.withdrawn_at is None  # system revocation (erasure), not user withdrawal
