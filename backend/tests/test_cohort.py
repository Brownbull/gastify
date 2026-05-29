"""Tests for DP cohort benchmarking (k-anonymity + Laplace DP + suppression)."""

import math
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.services.cohort import (
    K_ANONYMITY_FLOOR,
    cohort_baseline,
    compare_to_cohort,
    eligible_cohort_member_ids,
)

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


class _FixedRNG:
    """Duck-typed RNG returning a constant from random() for deterministic DP."""

    def __init__(self, value: float) -> None:
        self._value = value

    def random(self) -> float:
        return self._value


# --- DP engine -----------------------------------------------------------


def test_k_floor_suppresses_small_cohort():
    assert cohort_baseline([1000] * 19, epsilon=1.0, cap=100_000, rng=_FixedRNG(0.5)) is None
    stat = cohort_baseline([1000] * 20, epsilon=1.0, cap=100_000, rng=_FixedRNG(0.5))
    assert stat is not None
    assert stat.member_count == 20


def test_zero_noise_path_gives_true_mean():
    # random()==0.5 -> 0 Laplace noise -> dp mean equals the true clamped mean
    stat = cohort_baseline([1000] * 20, epsilon=1.0, cap=100_000, rng=_FixedRNG(0.5))
    assert stat is not None
    assert stat.dp_mean_minor == 1000


def test_clamping_bounds_outlier_influence():
    # one huge contribution is clamped to cap, so it cannot dominate the mean
    contributions = [1000] * 19 + [999_999_999]
    stat = cohort_baseline(contributions, epsilon=1.0, cap=2000, rng=_FixedRNG(0.5))
    assert stat is not None
    # (1000*19 + 2000) / 20 = 1050, not pulled up by the outlier
    assert stat.dp_mean_minor == 1050


def test_laplace_noise_is_applied_deterministically():
    # random()==0.75 -> u=0.25 -> noise = scale * -ln(0.5), scale = cap/eps = 2000
    stat = cohort_baseline([1000] * 20, epsilon=1.0, cap=2000, rng=_FixedRNG(0.75))
    assert stat is not None
    expected_noise = 2000.0 * -math.log(0.5)  # ≈ 1386.29
    expected_mean = round((20_000 + expected_noise) / 20)
    assert stat.dp_mean_minor == expected_mean
    assert stat.dp_mean_minor != 1000  # noise actually moved it


def test_epsilon_must_be_within_budget():
    with pytest.raises(ValueError):
        cohort_baseline([1] * 20, epsilon=1.5, cap=100, rng=_FixedRNG(0.5))
    with pytest.raises(ValueError):
        cohort_baseline([1] * 20, epsilon=0.0, cap=100, rng=_FixedRNG(0.5))


def test_cap_must_be_positive():
    with pytest.raises(ValueError):
        cohort_baseline([1] * 20, epsilon=1.0, cap=0, rng=_FixedRNG(0.5))


def test_k_floor_constant_is_20():
    assert K_ANONYMITY_FLOOR == 20


# --- comparison + suppression -------------------------------------------


def test_compare_suppresses_sensitive_category():
    result = compare_to_cohort(
        user_spend_minor=5000,
        contributions=[1000] * 50,
        epsilon=1.0,
        cap=100_000,
        category_is_sensitive=True,
        rng=_FixedRNG(0.5),
    )
    assert result.suppressed is True
    assert result.reason == "sensitive_category"
    assert result.cohort is None
    assert result.user_spend_minor == 5000


def test_compare_suppresses_insufficient_cohort():
    result = compare_to_cohort(
        user_spend_minor=5000,
        contributions=[1000] * 5,  # < 20
        epsilon=1.0,
        cap=100_000,
        category_is_sensitive=False,
        rng=_FixedRNG(0.5),
    )
    assert result.suppressed is True
    assert result.reason == "insufficient_cohort"


def test_compare_returns_baseline_for_valid_cohort():
    result = compare_to_cohort(
        user_spend_minor=5000,
        contributions=[1000] * 30,
        epsilon=1.0,
        cap=100_000,
        category_is_sensitive=False,
        rng=_FixedRNG(0.5),
    )
    assert result.suppressed is False
    assert result.user_spend_minor == 5000
    assert result.cohort is not None
    assert result.cohort.member_count == 30
    assert result.cohort.dp_mean_minor == 1000


# --- revocation-aware membership ----------------------------------------


@pytest.mark.asyncio
async def test_cohort_membership_tracks_live_consent(client, engine):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def members() -> list[uuid.UUID]:
        async with factory() as db:
            return await eligible_cohort_member_ids(db)

    assert TEST_USER_ID not in await members()

    await client.post("/api/v1/consent/data_sharing/grant", json={"jurisdiction": "CL"})
    assert TEST_USER_ID in await members()

    # Revocation-aware: revoking data_sharing drops the user from the cohort.
    await client.post("/api/v1/consent/data_sharing/revoke")
    assert TEST_USER_ID not in await members()


@pytest.mark.asyncio
async def test_unrelated_consent_does_not_join_cohort(client, engine):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    await client.post("/api/v1/consent/analytics/grant", json={"jurisdiction": "CL"})
    async with factory() as db:
        assert TEST_USER_ID not in await eligible_cohort_member_ids(db)
