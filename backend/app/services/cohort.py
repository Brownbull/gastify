"""Differential-privacy cohort benchmarking (REQ-27).

Lets a consenting user compare their spend in a category against an anonymized
cohort baseline, engineered so no individual is re-identifiable:

- **k-anonymity floor** — a baseline is suppressed unless ≥ K_ANONYMITY_FLOOR
  members contribute.
- **ε-differential privacy** — the cohort sum is released through the Laplace
  mechanism with ε ≤ MAX_EPSILON; per-user contributions are clamped to bound
  the sensitivity.
- **sensitive-category suppression** — sensitive categories are never
  aggregated.
- **revocation-aware membership** — the cohort is the set of users *currently*
  consenting to data sharing (derived live from ConsentRecord), so a revocation
  drops a user immediately with no cached-cohort leak.

Money is integer minor units throughout. The deployed multi-scope run + the
client bar chart are runtime-deferred; this module is the privacy core.
"""

import math
import random
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import ConsentRecord
from app.services.consent_propagation import COHORT_CONSENT_PURPOSE

# A cohort baseline is suppressed below this many contributing members.
K_ANONYMITY_FLOOR = 20
# Differential-privacy budget ceiling (smaller ε = more noise = more privacy).
MAX_EPSILON = 1.0


@dataclass(frozen=True)
class CohortStat:
    # NOTE on the DP guarantee: `dp_mean_minor` is ε-differentially-private (the
    # cohort SUM is released via the Laplace mechanism). `member_count` is the
    # EXACT eligible-member count — it is protected by the k≥20 anonymity floor
    # (never released below 20) but is NOT itself DP-noised. Releasing the exact
    # count is safe for a one-shot baseline; under frequent/repeated queries an
    # adversary could observe ±1 count changes (a join/leave). Noising the count
    # with a separate ε budget is tracked as a Scale-tier hardening (PENDING).
    member_count: int
    dp_mean_minor: int
    epsilon: float


@dataclass(frozen=True)
class CohortComparison:
    suppressed: bool
    reason: str | None
    user_spend_minor: int
    cohort: CohortStat | None


def _laplace_noise(scale: float, rng: random.Random) -> float:
    """Sample Laplace(0, scale) via inverse CDF using the injected RNG (so tests
    are deterministic). rng.random() == 0.5 yields exactly 0 noise."""
    u = rng.random() - 0.5
    if u == 0.0:
        return 0.0
    # rng.random() ∈ [0, 1) → |u| ∈ [0, 0.5); clamp the edge so ln stays finite.
    frac = min(abs(u), 0.5 - 1e-12)
    sign = 1.0 if u > 0 else -1.0
    return -scale * sign * math.log(1.0 - 2.0 * frac)


def cohort_baseline(
    contributions: list[int],
    *,
    epsilon: float,
    cap: int,
    rng: random.Random,
    k_floor: int = K_ANONYMITY_FLOOR,
) -> CohortStat | None:
    """ε-DP cohort mean over per-user contributions, or None if suppressed by the
    k-anonymity floor. Contributions are clamped to [0, cap] to bound the
    sensitivity; the SUM is released via the Laplace mechanism (scale = cap/ε),
    making the mean ε-DP. The mean is divided by the true member count `n`;
    `n` itself is anonymity-protected by the k≥20 floor but is not DP-noised
    (see CohortStat — count-DP is a Scale-tier follow-up)."""
    if not 0 < epsilon <= MAX_EPSILON:
        raise ValueError(f"epsilon must be in (0, {MAX_EPSILON}]; got {epsilon}")
    if cap <= 0:
        raise ValueError(f"cap must be positive; got {cap}")

    n = len(contributions)
    if n < k_floor:
        return None  # k-anonymity suppression — too few members to anonymize

    clamped = [min(max(c, 0), cap) for c in contributions]
    true_sum = sum(clamped)
    # L1 sensitivity of the sum is `cap` (one member changes it by ≤ cap).
    noisy_sum = true_sum + _laplace_noise(cap / epsilon, rng)
    dp_mean = max(0.0, noisy_sum) / n
    return CohortStat(member_count=n, dp_mean_minor=round(dp_mean), epsilon=epsilon)


def compare_to_cohort(
    *,
    user_spend_minor: int,
    contributions: list[int],
    epsilon: float,
    cap: int,
    category_is_sensitive: bool,
    rng: random.Random,
) -> CohortComparison:
    """Compare a user's spend to the DP cohort baseline, suppressing sensitive
    categories and cohorts below the k-anonymity floor."""
    if category_is_sensitive:
        return CohortComparison(
            suppressed=True,
            reason="sensitive_category",
            user_spend_minor=user_spend_minor,
            cohort=None,
        )
    stat = cohort_baseline(contributions, epsilon=epsilon, cap=cap, rng=rng)
    if stat is None:
        return CohortComparison(
            suppressed=True,
            reason="insufficient_cohort",
            user_spend_minor=user_spend_minor,
            cohort=None,
        )
    return CohortComparison(
        suppressed=False,
        reason=None,
        user_spend_minor=user_spend_minor,
        cohort=stat,
    )


async def eligible_cohort_member_ids(db: AsyncSession) -> list[uuid.UUID]:
    """User ids currently consenting to cohort data sharing — derived LIVE from
    granted ConsentRecords, so a revocation drops the user immediately (no
    cached membership, no stale-cohort leak). Spans ownership scopes by design
    (cohorts compare across households); the DP + k-floor + suppression are what
    keep cross-scope aggregation safe."""
    result = await db.execute(
        select(ConsentRecord.user_id)
        .where(
            ConsentRecord.purpose == COHORT_CONSENT_PURPOSE,
            ConsentRecord.status == "granted",
        )
        .distinct()
    )
    return [row[0] for row in result.all()]
