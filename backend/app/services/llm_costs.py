"""Shared LLM token pricing and cost estimates."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

PRICING_SOURCE_URL = "https://ai.google.dev/pricing"
PRICING_VERIFIED_ON = "2026-05-20"
LEGACY_ESTIMATED_COST_PER_SCAN_USD = Decimal("0.01")

MODEL_PRICING_USD_PER_1M: dict[str, dict[str, Decimal | str]] = {
    "gemini-3.5-flash": {
        "tier": "standard",
        "input": Decimal("1.50"),
        "output": Decimal("9.00"),
    },
    "gemini-3.1-flash-lite": {
        "tier": "standard",
        "input": Decimal("0.25"),
        "output": Decimal("1.50"),
    },
    "gemini-3.1-flash-lite-preview": {
        "tier": "standard",
        "input": Decimal("0.25"),
        "output": Decimal("1.50"),
    },
    "gemini-2.5-flash-lite": {
        "tier": "standard",
        "input": Decimal("0.10"),
        "output": Decimal("0.40"),
    },
    "gemini-2.5-flash-lite-preview-09-2025": {
        "tier": "standard",
        "input": Decimal("0.10"),
        "output": Decimal("0.40"),
    },
}


def normalize_model_name(model_name: str) -> str:
    model = model_name.split(":", maxsplit=1)[-1].strip()
    return model or model_name


def pricing_for_model(model_name: str) -> dict[str, Decimal | str]:
    normalized = normalize_model_name(model_name)
    if normalized in MODEL_PRICING_USD_PER_1M:
        return MODEL_PRICING_USD_PER_1M[normalized]
    return {
        "tier": "unknown",
        "input": Decimal("0"),
        "output": Decimal("0"),
    }


def estimate_llm_cost_usd(
    *,
    input_tokens: int,
    output_tokens: int,
    model_name: str,
    quantize: Decimal = Decimal("0.000000001"),
) -> Decimal:
    pricing = pricing_for_model(model_name)
    input_cost = Decimal(input_tokens) * _pricing_decimal(pricing["input"])
    output_cost = Decimal(output_tokens) * _pricing_decimal(pricing["output"])
    return ((input_cost + output_cost) / Decimal(1_000_000)).quantize(
        quantize,
        rounding=ROUND_HALF_UP,
    )


def pricing_metadata(model_name: str) -> dict[str, Any]:
    pricing = pricing_for_model(model_name)
    return {
        "source_url": PRICING_SOURCE_URL,
        "verified_on": PRICING_VERIFIED_ON,
        "tier": pricing["tier"],
        "input_per_1m_usd": money(_pricing_decimal(pricing["input"])),
        "output_per_1m_usd": money(_pricing_decimal(pricing["output"])),
        "cost_basis": "provider_reported_tokens_estimated_cost",
    }


def money(value: Decimal | str) -> str:
    if isinstance(value, str):
        return value
    return format(value.normalize(), "f")


def _pricing_decimal(value: Decimal | str) -> Decimal:
    return value if isinstance(value, Decimal) else Decimal(value)
