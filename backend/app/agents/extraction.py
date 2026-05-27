"""PydanticAI vision extraction agent — Stage 1 of the scan pipeline.

Sends a receipt image to Gemini vision model and gets structured extraction
via PydanticAI output_type=GeminiExtractionResult. Post-processes the result
through JSON repair (if needed) and output coalescing.

Port of BoletApp analyzeReceipt.ts + V4 prompt (extraction portion only;
categorization is Stage 2 / Phase 3).
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from datetime import date

import structlog
from pydantic_ai import Agent
from pydantic_ai.messages import BinaryContent, UserContent

from app.agents.usage import result_usage
from app.config import settings
from app.prompts import get_prompt
from app.prompts.receipt.extraction import RECEIPT_EXTRACTION_CURRENT
from app.schemas.scan import GeminiExtractionResult, RawGeminiExtractionResult
from app.services.coalesce import coalesce_extraction
from app.services.provider_retry import retry_provider_call

logger = structlog.get_logger()

EXTRACTION_SYSTEM_PROMPT = RECEIPT_EXTRACTION_CURRENT


@dataclass(frozen=True)
class ExtractionUsage:
    input_tokens: int
    output_tokens: int
    latency_ms: float


@dataclass(frozen=True)
class ExtractionResult:
    extraction: GeminiExtractionResult
    usage: ExtractionUsage
    raw_extraction: RawGeminiExtractionResult | GeminiExtractionResult | None = None
    prompt_id: str = "receipt-extraction-current"
    prompt_version: str = "2026-05-18.1"
    model_name: str = ""


def _configured_prompt_id() -> str:
    configured = getattr(settings, "receipt_extraction_prompt_id", "receipt-extraction-current")
    return configured if isinstance(configured, str) else "receipt-extraction-current"


def _build_agent(
    model: str | None = None,
    prompt_id: str | None = None,
) -> Agent[None, RawGeminiExtractionResult]:
    prompt = get_prompt(prompt_id or _configured_prompt_id(), kind="receipt-extraction")
    model_name = model or f"google-gla:{settings.gemini_model}"
    return Agent(
        model_name,
        output_type=RawGeminiExtractionResult,
        system_prompt=prompt.system_prompt,
        retries=2,
    )


async def extract_receipt(
    image_bytes: bytes,
    content_type: str,
    scan_date: date | None = None,
    model: str | None = None,
    prompt_id: str | None = None,
) -> ExtractionResult:
    """Run vision extraction on a receipt image.

    Returns the coalesced extraction result and usage metrics.
    """
    prompt = get_prompt(prompt_id or _configured_prompt_id(), kind="receipt-extraction")
    model_name = model or f"google-gla:{settings.gemini_model}"
    agent = _build_agent(model, prompt_id=prompt.id)
    log = logger.bind(
        content_type=content_type,
        image_size=len(image_bytes),
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
    )

    start = time.monotonic()
    user_prompt: list[UserContent] = [
        BinaryContent(data=image_bytes, media_type=content_type),
        prompt.user_prompt or "Extract all data from this receipt image.",
    ]
    result = await retry_provider_call(
        lambda: agent.run(user_prompt),
        operation_name="receipt_extraction",
    )
    elapsed_ms = (time.monotonic() - start) * 1000

    raw_extraction = _as_raw_extraction(result.output)
    coalesced = coalesce_extraction(raw_extraction, scan_date=scan_date)

    run_usage = result_usage(result)
    usage = ExtractionUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        latency_ms=round(elapsed_ms, 1),
    )

    log.info(
        "extraction_complete",
        merchant=coalesced.merchant_name,
        currency=coalesced.currency_code,
        total=str(coalesced.total_amount),
        items=len(coalesced.line_items),
        confidence=coalesced.confidence_score,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        latency_ms=usage.latency_ms,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
    )

    return ExtractionResult(
        extraction=coalesced,
        usage=usage,
        raw_extraction=raw_extraction,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
    )


def _as_raw_extraction(
    output: RawGeminiExtractionResult | GeminiExtractionResult,
) -> RawGeminiExtractionResult:
    if isinstance(output, RawGeminiExtractionResult):
        return output
    return RawGeminiExtractionResult.model_validate(output.model_dump())
