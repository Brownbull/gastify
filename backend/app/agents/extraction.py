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
from pydantic_ai.messages import BinaryContent

from app.config import settings
from app.schemas.scan import GeminiExtractionResult
from app.services.coalesce import coalesce_extraction

logger = structlog.get_logger()

EXTRACTION_SYSTEM_PROMPT = """\
You are a receipt data extraction system. \
Analyze the receipt image and extract structured data.

CURRENCY DETECTION:
- Detect the currency from the receipt (symbols like $, €, £, ¥, or text like "USD", "EUR", "GBP")
- Look at country/location clues if currency symbol is ambiguous ($ could be USD, CLP, MXN, etc.)
- Return the ISO 4217 currency code (e.g., "USD", "EUR", "GBP", "CLP", "JPY")
- Default to "CLP" if you cannot confidently determine the currency

AMOUNT FORMAT:
- Return all monetary amounts as decimal numbers matching the receipt display
- For CLP/JPY/KRW (no-decimal currencies): return integer values (e.g., 15990)
- For USD/EUR/GBP (decimal currencies): return with cents (e.g., 48.50)
- Do NOT multiply by 100 or convert to minor units

DATE FORMAT:
- Return dates in YYYY-MM-DD format
- If the receipt has no date, use today's date
- If year is ambiguous, assume the current year

EXTRACTION RULES:
1. Extract ALL visible line items (max 100)
2. For each item: name (max 50 chars), quantity (default 1), unit_price, total_price
3. total_amount = the transaction grand total on the receipt
4. tax_amount = tax/IVA if separately listed, null otherwise
5. discount_amount = discount if separately listed, null otherwise
6. confidence_score = your confidence in the overall extraction (0.0 to 1.0)
7. If qty > 1, unit_price = total_price / qty
8. If only one price is visible per line, set both unit_price and total_price to that value
9. MUST have at least one item: if no line items visible, create one using a keyword \
from the receipt
10. Validation: total should roughly equal sum of items' total_price + tax - discount"""


@dataclass(frozen=True)
class ExtractionUsage:
    input_tokens: int
    output_tokens: int
    latency_ms: float


@dataclass(frozen=True)
class ExtractionResult:
    extraction: GeminiExtractionResult
    usage: ExtractionUsage


def _build_agent(model: str | None = None) -> Agent[None, GeminiExtractionResult]:
    model_name = model or f"google-gla:{settings.gemini_model}"
    return Agent(
        model_name,
        output_type=GeminiExtractionResult,
        system_prompt=EXTRACTION_SYSTEM_PROMPT,
        retries=2,
    )


async def extract_receipt(
    image_bytes: bytes,
    content_type: str,
    scan_date: date | None = None,
    model: str | None = None,
) -> ExtractionResult:
    """Run vision extraction on a receipt image.

    Returns the coalesced extraction result and usage metrics.
    """
    agent = _build_agent(model)
    log = logger.bind(content_type=content_type, image_size=len(image_bytes))

    start = time.monotonic()
    result = await agent.run(
        [
            BinaryContent(data=image_bytes, media_type=content_type),
            "Extract all data from this receipt image.",
        ],
    )
    elapsed_ms = (time.monotonic() - start) * 1000

    raw_extraction = result.output
    coalesced = coalesce_extraction(raw_extraction, scan_date=scan_date)

    usage = ExtractionUsage(
        input_tokens=result.usage.input_tokens,
        output_tokens=result.usage.output_tokens,
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
    )

    return ExtractionResult(extraction=coalesced, usage=usage)
