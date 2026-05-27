"""Gemini PDF extraction agent for credit-card statements."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

import structlog
from pydantic_ai import Agent
from pydantic_ai.messages import BinaryContent

from app.agents.usage import result_usage
from app.config import settings
from app.prompts import get_prompt
from app.schemas.statement import StatementExtractionOutput
from app.schemas.statement_profile import StatementLayoutProfile
from app.services.provider_retry import retry_provider_call

logger = structlog.get_logger()


@dataclass(frozen=True)
class StatementExtractionUsage:
    input_tokens: int
    output_tokens: int
    latency_ms: float


@dataclass(frozen=True)
class StatementAgentResult:
    extraction: StatementExtractionOutput
    usage: StatementExtractionUsage
    raw_extraction: StatementExtractionOutput
    prompt_id: str
    prompt_version: str
    model_name: str
    input_mode: str = "pdf"


@dataclass(frozen=True)
class StatementLayoutProfileAgentResult:
    layout_profile: StatementLayoutProfile
    usage: StatementExtractionUsage
    prompt_id: str
    prompt_version: str
    model_name: str
    input_mode: str = "profile-rows"


def _configured_prompt_id() -> str:
    configured = getattr(settings, "statement_extraction_prompt_id", "")
    return (
        configured if isinstance(configured, str) and configured else "statement-extraction-current"
    )


def _build_agent(
    *,
    model: str | None = None,
    prompt_id: str | None = None,
) -> Agent[None, StatementExtractionOutput]:
    prompt = get_prompt(prompt_id or _configured_prompt_id(), kind="statement-extraction")
    model_name = model or f"google-gla:{settings.gemini_model}"
    return Agent(
        model_name,
        output_type=StatementExtractionOutput,
        system_prompt=prompt.system_prompt,
        retries=2,
    )


def _build_profile_agent(
    *,
    model: str | None = None,
    prompt_id: str | None = None,
) -> Agent[None, StatementLayoutProfile]:
    prompt = get_prompt(
        prompt_id or settings.statement_layout_profile_prompt_id,
        kind="statement-layout-profile",
    )
    model_name = model or f"google-gla:{settings.gemini_model}"
    return Agent(
        model_name,
        output_type=StatementLayoutProfile,
        system_prompt=prompt.system_prompt,
        retries=2,
    )


async def extract_statement_with_gemini(
    pdf_bytes: bytes,
    *,
    model: str | None = None,
    prompt_id: str | None = None,
) -> StatementAgentResult:
    """Run Gemini extraction on an in-memory statement PDF."""
    prompt = get_prompt(prompt_id or _configured_prompt_id(), kind="statement-extraction")
    model_name = model or f"google-gla:{settings.gemini_model}"
    agent = _build_agent(model=model_name, prompt_id=prompt.id)
    log = logger.bind(
        content_type="application/pdf",
        pdf_size=len(pdf_bytes),
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
    )

    start = time.monotonic()
    result = await retry_provider_call(
        lambda: agent.run(
            [
                BinaryContent(data=pdf_bytes, media_type="application/pdf"),
                prompt.user_prompt
                or "Extract all statement lines from this credit-card statement.",
            ]
        ),
        operation_name="statement_extraction",
    )
    elapsed_ms = (time.monotonic() - start) * 1000

    raw_output = StatementExtractionOutput.model_validate(result.output.model_dump())
    run_usage = result_usage(result)
    usage = StatementExtractionUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        latency_ms=round(elapsed_ms, 1),
    )

    log.info(
        "statement_extraction_complete",
        issuer=raw_output.statement.issuer,
        currency=raw_output.statement.currency,
        line_count=len(raw_output.lines),
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        latency_ms=usage.latency_ms,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
    )

    return StatementAgentResult(
        extraction=raw_output,
        raw_extraction=raw_output,
        usage=usage,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
        input_mode="pdf",
    )


async def extract_statement_with_gemini_evidence(
    evidence: dict[str, Any],
    *,
    model: str | None = None,
    prompt_id: str | None = None,
) -> StatementAgentResult:
    """Run Gemini extraction on generic PyMuPDF statement evidence."""
    prompt = get_prompt(prompt_id or _configured_prompt_id(), kind="statement-extraction")
    model_name = model or f"google-gla:{settings.gemini_model}"
    agent = _build_agent(model=model_name, prompt_id=prompt.id)
    evidence_text = _evidence_prompt_text(evidence)
    log = logger.bind(
        content_type="application/json",
        input_mode="pymupdf-evidence",
        evidence_sha256=evidence.get("evidence_sha256")
        or evidence.get("summary", {}).get("evidence_sha256"),
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
    )

    start = time.monotonic()
    result = await retry_provider_call(
        lambda: agent.run(
            [
                evidence_text,
                prompt.user_prompt or "Normalize this statement evidence.",
            ]
        ),
        operation_name="statement_extraction",
    )
    elapsed_ms = (time.monotonic() - start) * 1000

    raw_output = StatementExtractionOutput.model_validate(result.output.model_dump())
    run_usage = result_usage(result)
    usage = StatementExtractionUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        latency_ms=round(elapsed_ms, 1),
    )

    log.info(
        "statement_extraction_complete",
        issuer=raw_output.statement.issuer,
        currency=raw_output.statement.currency,
        line_count=len(raw_output.lines),
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        latency_ms=usage.latency_ms,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
        input_mode="pymupdf-evidence",
    )

    return StatementAgentResult(
        extraction=raw_output,
        raw_extraction=raw_output,
        usage=usage,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
        input_mode="pymupdf-evidence",
    )


async def infer_statement_layout_profile_with_gemini(
    compact_evidence: dict[str, Any],
    *,
    model: str | None = None,
    prompt_id: str | None = None,
) -> StatementLayoutProfileAgentResult:
    """Infer a generic unknown-statement layout profile from compact row evidence."""
    prompt = get_prompt(
        prompt_id or settings.statement_layout_profile_prompt_id,
        kind="statement-layout-profile",
    )
    model_name = model or f"google-gla:{settings.gemini_model}"
    agent = _build_profile_agent(model=model_name, prompt_id=prompt.id)
    evidence_text = _compact_evidence_prompt_text(compact_evidence)
    log = logger.bind(
        content_type="application/json",
        input_mode="profile-rows",
        evidence_sha256=compact_evidence.get("compact_evidence_sha256"),
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
    )

    start = time.monotonic()
    result = await retry_provider_call(
        lambda: agent.run(
            [
                evidence_text,
                prompt.user_prompt or "Infer this statement layout profile.",
            ]
        ),
        operation_name="statement_layout_profile",
    )
    elapsed_ms = (time.monotonic() - start) * 1000

    profile = StatementLayoutProfile.model_validate(result.output.model_dump())
    run_usage = result_usage(result)
    usage = StatementExtractionUsage(
        input_tokens=run_usage.input_tokens,
        output_tokens=run_usage.output_tokens,
        latency_ms=round(elapsed_ms, 1),
    )

    log.info(
        "statement_layout_profile_complete",
        transaction_row_range_count=len(profile.transaction_row_ranges),
        excluded_row_range_count=len(profile.excluded_row_ranges),
        confidence=profile.confidence,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        latency_ms=usage.latency_ms,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
        input_mode="profile-rows",
    )

    return StatementLayoutProfileAgentResult(
        layout_profile=profile,
        usage=usage,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        model_name=model_name,
        input_mode="profile-rows",
    )


def _evidence_prompt_text(evidence: dict[str, Any]) -> str:
    return (
        "Normalize the following extracted PDF text/layout evidence into the "
        "credit-card statement JSON contract. Use only this evidence; do not "
        "infer from issuer-specific layout knowledge.\n\n"
        "EVIDENCE_JSON:\n" + json.dumps(evidence, ensure_ascii=False, sort_keys=True)
    )


def _compact_evidence_prompt_text(compact_evidence: dict[str, Any]) -> str:
    return (
        "Infer a layout profile for the following compact credit-card statement "
        "row evidence. Use only row text, detected tokens, row order, and "
        "coordinates supplied here. Return only the layout profile JSON.\n\n"
        "COMPACT_EVIDENCE_JSON:\n"
        + json.dumps(compact_evidence, ensure_ascii=False, sort_keys=True)
    )
