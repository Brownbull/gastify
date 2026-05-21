"""PydanticAI store categorization agent.

Runs after item categorization and remembered item mappings so the store
fallback sees the same item categories that will be persisted.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import structlog
from pydantic_ai import Agent

from app.agents.usage import result_usage
from app.config import settings
from app.prompts import get_prompt
from app.prompts.store_categorization import STORE_CATEGORIZATION_CURRENT
from app.schemas.scan import StoreCategorizationResult
from app.services.provider_retry import retry_provider_call

logger = structlog.get_logger()

STORE_CATEGORIZATION_SYSTEM_PROMPT = STORE_CATEGORIZATION_CURRENT


@dataclass(frozen=True)
class StoreCategorizationUsage:
    input_tokens: int
    output_tokens: int
    latency_ms: float


@dataclass(frozen=True)
class StoreCategorizationOutput:
    result: StoreCategorizationResult
    usage: StoreCategorizationUsage
    prompt_id: str = "store-categorization-current"
    prompt_version: str = "2026-05-19.1"
    model_name: str = ""


def _configured_prompt_id() -> str:
    configured = getattr(settings, "store_categorization_prompt_id", "store-categorization-current")
    return configured if isinstance(configured, str) else "store-categorization-current"


def _build_agent(
    model: str | None = None,
    prompt_id: str | None = None,
) -> Agent[None, StoreCategorizationResult]:
    prompt = get_prompt(prompt_id or _configured_prompt_id(), kind="store-categorization")
    model_name = model or f"google-gla:{settings.gemini_model}"
    return Agent(
        model_name,
        output_type=StoreCategorizationResult,
        system_prompt=prompt.system_prompt,
        retries=2,
    )


async def categorize_store(
    *,
    merchant_name: str,
    currency_code: str,
    item_category_keys: list[str],
    item_names: list[str],
    country: str | None = None,
    city: str | None = None,
    model: str | None = None,
    prompt_id: str | None = None,
) -> StoreCategorizationOutput:
    """Categorize the store using text evidence and effective item categories."""
    prompt_definition = get_prompt(
        prompt_id or _configured_prompt_id(), kind="store-categorization"
    )
    model_name = model or f"google-gla:{settings.gemini_model}"
    agent = _build_agent(model, prompt_id=prompt_definition.id)
    category_summary = _summarize_categories(item_category_keys)
    top_items = ", ".join(item_names[:8]) if item_names else "(none)"
    prompt = (
        f"Merchant: {merchant_name}\n"
        f"Currency: {currency_code}\n"
        f"Country: {country or 'unknown'}\n"
        f"City: {city or 'unknown'}\n"
        f"Item count: {len(item_names)}\n"
        f"Effective item category distribution: {category_summary}\n"
        f"Top item names: {top_items}\n\n"
        "Choose the L2 Business Type for the store."
    )

    start = time.monotonic()
    result = await retry_provider_call(
        lambda: agent.run(prompt),
        operation_name="store_categorization",
    )
    elapsed_ms = (time.monotonic() - start) * 1000
    run_usage = result_usage(result)
    usage = StoreCategorizationUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        latency_ms=round(elapsed_ms, 1),
    )

    logger.info(
        "store_categorization_complete",
        merchant=merchant_name,
        category_key=result.output.category_key,
        confidence=result.output.confidence,
        needs_review=result.output.needs_review,
        prompt_id=prompt_definition.id,
        prompt_version=prompt_definition.version,
        model_name=model_name,
    )

    return StoreCategorizationOutput(
        result=result.output,
        usage=usage,
        prompt_id=prompt_definition.id,
        prompt_version=prompt_definition.version,
        model_name=model_name,
    )


def _summarize_categories(category_keys: list[str]) -> str:
    if not category_keys:
        return "(none)"
    counts: dict[str, int] = {}
    for key in category_keys:
        counts[key] = counts.get(key, 0) + 1
    return ", ".join(f"{key}={count}" for key, count in sorted(counts.items()))
