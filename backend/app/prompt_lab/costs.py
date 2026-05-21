"""Prompt-lab token and cost reporting."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.services.llm_costs import (
    LEGACY_ESTIMATED_COST_PER_SCAN_USD,
    MODEL_PRICING_USD_PER_1M,
    PRICING_SOURCE_URL,
    PRICING_VERIFIED_ON,
    estimate_llm_cost_usd,
    money,
    normalize_model_name,
    pricing_for_model,
    pricing_metadata,
)

PROMPT_LAB_COST_SCHEMA_VERSION = "prompt-lab-cost.v1"

__all__ = [
    "LEGACY_ESTIMATED_COST_PER_SCAN_USD",
    "MODEL_PRICING_USD_PER_1M",
    "PRICING_SOURCE_URL",
    "PRICING_VERIFIED_ON",
    "PROMPT_LAB_COST_SCHEMA_VERSION",
    "build_cost_summary",
    "estimate_cost_usd",
    "normalize_model_name",
    "pricing_for_model",
]


def build_cost_summary(
    *,
    model_name: str,
    usage: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Build a per-stage token and estimated-cost summary."""
    normalized_model = normalize_model_name(model_name)
    stages: dict[str, dict[str, Any]] = {}
    total_input = 0
    total_output = 0
    total_cost = Decimal("0")

    for stage, stage_usage in usage.items():
        input_tokens = int(stage_usage.get("input_tokens") or 0)
        output_tokens = int(stage_usage.get("output_tokens") or 0)
        cost = estimate_cost_usd(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model_name=normalized_model,
        )
        total_input += input_tokens
        total_output += output_tokens
        total_cost += cost
        stages[stage] = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "latency_ms": stage_usage.get("latency_ms", 0),
            "cost_usd": money(cost),
        }

    return {
        "schema_version": PROMPT_LAB_COST_SCHEMA_VERSION,
        "model_name": model_name,
        "normalized_model_name": normalized_model,
        "pricing": pricing_metadata(normalized_model),
        "stages": stages,
        "totals": {
            "input_tokens": total_input,
            "output_tokens": total_output,
            "total_tokens": total_input + total_output,
            "cost_usd": money(total_cost),
        },
        "legacy_comparison": {
            "legacy_cost_kind": "legacy_flat_estimate",
            "legacy_flat_estimate_cost_per_scan_usd": money(LEGACY_ESTIMATED_COST_PER_SCAN_USD),
            "legacy_token_kind": "legacy_rough_token_estimate",
            "notes": (
                "Legacy Boletapp prompt-testing used flat estimated scan costs and rough "
                "token estimates; Gastify uses provider-reported tokens and current model "
                "pricing for this prompt-lab run."
            ),
        },
    }


def estimate_cost_usd(*, input_tokens: int, output_tokens: int, model_name: str) -> Decimal:
    return estimate_llm_cost_usd(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        model_name=normalize_model_name(model_name),
    )
