"""PydanticAI text-only categorization agent — Stage 2 of the scan pipeline.

Receives extracted line items as text (never the raw image — two-stage prompt
injection defense per D30). Maps each item to a V4 taxonomy category key.

Port of BoletApp categorization logic; text-only model is cheaper than vision
(V3 value: Route by Cost).
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import structlog
from pydantic_ai import Agent

from app.agents.usage import result_usage
from app.config import settings
from app.prompts import get_prompt
from app.prompts.receipt.item_categorization import ITEM_CATEGORIZATION_CURRENT
from app.schemas.scan import CategorizationResult, LineItemExtraction
from app.services.provider_retry import retry_provider_call

logger = structlog.get_logger()

CATEGORIZATION_SYSTEM_PROMPT = ITEM_CATEGORIZATION_CURRENT


@dataclass(frozen=True)
class CategorizationUsage:
    input_tokens: int
    output_tokens: int
    latency_ms: float


@dataclass(frozen=True)
class CategorizationOutput:
    result: CategorizationResult
    usage: CategorizationUsage
    prompt_id: str = "item-categorization-current"
    prompt_version: str = "2026-05-18.1"
    model_name: str = ""


def _configured_prompt_id() -> str:
    configured = getattr(settings, "item_categorization_prompt_id", "item-categorization-current")
    return configured if isinstance(configured, str) else "item-categorization-current"


def _build_agent(
    model: str | None = None,
    prompt_id: str | None = None,
) -> Agent[None, CategorizationResult]:
    prompt = get_prompt(prompt_id or _configured_prompt_id(), kind="item-categorization")
    model_name = model or f"google-gla:{settings.gemini_model}"
    return Agent(
        model_name,
        output_type=CategorizationResult,
        system_prompt=prompt.system_prompt,
        retries=2,
    )


def _format_items_for_prompt(items: list[LineItemExtraction]) -> str:
    lines = []
    for i, item in enumerate(items):
        qty_str = f" x{item.qty}" if item.qty and item.qty > 1 else ""
        lines.append(f"  [{i}] {item.name}{qty_str} — {item.total_price}")
    return "\n".join(lines)


async def categorize_items(
    items: list[LineItemExtraction],
    merchant_name: str,
    currency_code: str,
    model: str | None = None,
    prompt_id: str | None = None,
) -> CategorizationOutput:
    """Run text-only categorization on extracted line items.

    Takes text data only — never raw image bytes (two-stage defense).
    """
    prompt_definition = get_prompt(prompt_id or _configured_prompt_id(), kind="item-categorization")
    model_name = model or f"google-gla:{settings.gemini_model}"
    agent = _build_agent(model, prompt_id=prompt_definition.id)
    log = logger.bind(
        merchant=merchant_name,
        item_count=len(items),
        prompt_id=prompt_definition.id,
        prompt_version=prompt_definition.version,
        model_name=model_name,
    )

    prompt = (
        f"Merchant: {merchant_name}\n"
        f"Currency: {currency_code}\n"
        f"Items:\n{_format_items_for_prompt(items)}\n\n"
        "Categorize each item using the V4 taxonomy."
    )

    start = time.monotonic()
    result = await retry_provider_call(
        lambda: agent.run(prompt),
        operation_name="item_categorization",
    )
    elapsed_ms = (time.monotonic() - start) * 1000

    run_usage = result_usage(result)
    usage = CategorizationUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        latency_ms=round(elapsed_ms, 1),
    )

    log.info(
        "categorization_complete",
        assignments=len(result.output.assignments),
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        latency_ms=usage.latency_ms,
        prompt_id=prompt_definition.id,
        prompt_version=prompt_definition.version,
        model_name=model_name,
    )

    return CategorizationOutput(
        result=result.output,
        usage=usage,
        prompt_id=prompt_definition.id,
        prompt_version=prompt_definition.version,
        model_name=model_name,
    )
