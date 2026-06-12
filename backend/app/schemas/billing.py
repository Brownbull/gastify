"""Billing/quota schemas (D96)."""

from pydantic import BaseModel


class FeatureQuota(BaseModel):
    used: int
    limit: int


class QuotaResponse(BaseModel):
    """Tier + per-feature monthly quota state — clients render 'X of Y left' and
    gate premium-only UI (statements, batch) off `limit > 0`."""

    tier: str
    period: str
    # Whether quotas are ENFORCED (billing_enforcement_enabled) — clients only gate
    # premium-only UI (batch, statements) when this is true.
    enforced: bool
    features: dict[str, FeatureQuota]
