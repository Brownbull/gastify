"""Downstream propagation of consent changes (revocation-aware seams).

Cohort benchmarking (P9) and AI-training pipelines must honor *live* consent.
Eligibility is derived from the current ConsentRecord status rather than a
cached membership flag, so a revocation immediately excludes the user
("cohort-unflag") with no stale cohort leak. P9's revocation-aware recompute
consumes `is_cohort_eligible`.

This module imports only the ConsentRecord model (no dependency on
`services.consent`) to keep the propagation seam free of import cycles.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import ConsentRecord

# Cohort benchmarking shares aggregated data with third parties (SC-11).
COHORT_CONSENT_PURPOSE = "data_sharing"
# AI-training reuse of anonymized data.
AI_TRAINING_CONSENT_PURPOSE = "ai_training"

# Purposes whose grant/revoke must propagate to a downstream surface.
PROPAGATING_PURPOSES = frozenset({COHORT_CONSENT_PURPOSE, AI_TRAINING_CONSENT_PURPOSE})


async def _has_granted_consent(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    ownership_scope_id: uuid.UUID,
    purpose: str,
) -> bool:
    result = await db.execute(
        select(ConsentRecord.id)
        .where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.ownership_scope_id == ownership_scope_id,
            ConsentRecord.purpose == purpose,
            ConsentRecord.status == "granted",
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def is_cohort_eligible(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    ownership_scope_id: uuid.UUID,
) -> bool:
    """True iff the user currently grants cohort data-sharing consent.

    Revocation-aware recompute seam for P9: cohort aggregation filters by this,
    so revoking `data_sharing` immediately drops the user from the cohort.
    """
    return await _has_granted_consent(
        db,
        user_id=user_id,
        ownership_scope_id=ownership_scope_id,
        purpose=COHORT_CONSENT_PURPOSE,
    )


async def is_ai_training_eligible(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    ownership_scope_id: uuid.UUID,
) -> bool:
    """True iff the user currently grants AI-training reuse of their data."""
    return await _has_granted_consent(
        db,
        user_id=user_id,
        ownership_scope_id=ownership_scope_id,
        purpose=AI_TRAINING_CONSENT_PURPOSE,
    )
