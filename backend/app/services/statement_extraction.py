"""Statement PDF inspection and extraction providers."""

from __future__ import annotations

import asyncio
import hashlib
import io
from dataclasses import dataclass
from datetime import date
from typing import TYPE_CHECKING

from pypdf import PdfReader, PdfWriter
from pypdf.errors import FileNotDecryptedError, PdfReadError

from app.agents.statement_extraction import (
    extract_statement_with_gemini,
    extract_statement_with_gemini_evidence,
    infer_statement_layout_profile_with_gemini,
)
from app.config import settings
from app.schemas.statement import (
    StatementExtractionOutput,
    StatementInfo,
    StatementLine,
    StatementPdfStatus,
    StatementProcessingMetadata,
)
from app.services.llm_costs import estimate_llm_cost_usd
from app.services.statement_coalesce import coalesce_statement_output
from app.services.statement_pdf_evidence import extract_statement_pdf_evidence
from app.services.statement_profile_fallback import (
    apply_statement_layout_profile,
    build_statement_compact_evidence,
)
from app.services.statement_routing import (
    DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD,
    deterministic_quality_passed,
    extract_statement_with_pymupdf,
)

if TYPE_CHECKING:
    from pathlib import Path


@dataclass(frozen=True)
class StatementPdfInspection:
    status: StatementPdfStatus
    is_encrypted: bool
    page_count: int | None
    warnings: tuple[str, ...] = ()


def inspect_statement_pdf(path: Path, *, password: str | None = None) -> StatementPdfInspection:
    try:
        reader = PdfReader(str(path))
    except (PdfReadError, OSError, ValueError):
        return StatementPdfInspection(
            status="extraction_failed",
            is_encrypted=False,
            page_count=None,
            warnings=("invalid_pdf",),
        )

    is_encrypted = bool(reader.is_encrypted)
    if is_encrypted:
        if not password:
            return StatementPdfInspection(
                status="password_required",
                is_encrypted=True,
                page_count=None,
                warnings=("password_required",),
            )
        try:
            decrypt_ok = bool(reader.decrypt(password))
        except Exception:
            decrypt_ok = False
        if not decrypt_ok:
            return StatementPdfInspection(
                status="password_invalid",
                is_encrypted=True,
                page_count=None,
                warnings=("password_invalid",),
            )

    try:
        page_count = len(reader.pages)
    except (FileNotDecryptedError, PdfReadError, OSError, ValueError):
        return StatementPdfInspection(
            status="extraction_failed",
            is_encrypted=is_encrypted,
            page_count=None,
            warnings=("pdf_page_read_failed",),
        )

    return StatementPdfInspection(
        status="readable",
        is_encrypted=is_encrypted,
        page_count=page_count,
    )


def extract_statement_pdf(
    path: Path,
    *,
    provider: str | None = None,
    password: str | None = None,
    issuer_hint: str | None = None,
) -> StatementExtractionOutput:
    provider_name = provider or settings.statement_provider
    inspection = inspect_statement_pdf(path, password=password)
    if inspection.status != "readable":
        return StatementExtractionOutput(
            pdf_status=inspection.status,
            statement=StatementInfo(issuer=issuer_hint),
            lines=[],
            processing=StatementProcessingMetadata(
                provider="fixture" if provider_name == "fixture" else "codex-pdf-text",
                prompt_id=settings.statement_extraction_prompt_id,
                model_name=None,
                page_count=inspection.page_count,
                warnings=list(inspection.warnings),
            ),
        )

    if provider_name == "auto":
        deterministic = extract_statement_with_pymupdf(
            path,
            password=password,
            issuer_hint=issuer_hint,
            threshold=DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD,
        )
        extraction = deterministic.extraction
        if deterministic_quality_passed(
            extraction,
            deterministic.routing,
            threshold=DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD,
        ):
            return extraction
        return _gemini_output(
            path,
            password=password,
            issuer_hint=issuer_hint,
            inspection=inspection,
            fallback_warnings=[
                "deterministic_fallback_to_gemini",
                *extraction.processing.warnings,
                *[f"routing:{reason}" for reason in deterministic.routing.reasons],
            ],
        )

    if provider_name == "gemini":
        return _gemini_output(
            path,
            password=password,
            issuer_hint=issuer_hint,
            inspection=inspection,
            fallback_warnings=[],
        )

    reader = PdfReader(str(path))
    if reader.is_encrypted and password:
        reader.decrypt(password)
    pages = [page.extract_text() or "" for page in reader.pages]
    raw_text = "\n".join(pages)
    text_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    raw_text_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

    if provider_name == "fixture":
        return _fixture_output(
            page_count=len(reader.pages),
            raw_text=raw_text,
            raw_text_hash=raw_text_hash,
            text_line_count=len(text_lines),
            issuer_hint=issuer_hint,
        )

    if not text_lines:
        return StatementExtractionOutput(
            pdf_status="extraction_failed",
            statement=StatementInfo(issuer=issuer_hint),
            lines=[],
            processing=StatementProcessingMetadata(
                provider="codex-pdf-text",
                prompt_id=settings.statement_extraction_prompt_id,
                model_name=None,
                confidence=0.0,
                page_count=len(reader.pages),
                raw_text_sha256=raw_text_hash,
                text_char_count=len(raw_text),
                text_line_count=0,
                warnings=["empty_pdf_text"],
            ),
        )

    return StatementExtractionOutput(
        pdf_status="extraction_failed",
        statement=StatementInfo(issuer=issuer_hint),
        lines=[],
        processing=StatementProcessingMetadata(
            provider="codex-pdf-text",
            prompt_id=settings.statement_extraction_prompt_id,
            model_name=None,
            confidence=0.0,
            page_count=len(reader.pages),
            raw_text_sha256=raw_text_hash,
            text_char_count=len(raw_text),
            text_line_count=len(text_lines),
            warnings=["codex_text_only_no_line_normalization"],
        ),
    )


def _fixture_output(
    *,
    page_count: int,
    raw_text: str,
    raw_text_hash: str,
    text_line_count: int,
    issuer_hint: str | None,
) -> StatementExtractionOutput:
    issuer = issuer_hint or "fixture-bank"
    currency = "USD"
    return StatementExtractionOutput(
        pdf_status="readable",
        statement=StatementInfo(
            issuer=issuer,
            period_start=date(2026, 5, 1),
            period_end=date(2026, 5, 31),
            closing_date=date(2026, 5, 31),
            due_date=date(2026, 6, 15),
            currency=currency,
            total_debit_minor=29_990,
            total_credit_minor=10_000,
            payment_due_minor=19_990,
            card_alias_candidate="Fixture card",
        ),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 3),
                description="SUPERMERCADO FIXTURE",
                amount_minor=19_990,
                currency=currency,
                line_type="charge",
                card_alias_candidate="Fixture card",
                category_key="supermarket",
            ),
            StatementLine(
                source_order=2,
                date=date(2026, 5, 15),
                description="PAGO RECIBIDO",
                amount_minor=-10_000,
                currency=currency,
                line_type="payment",
                card_alias_candidate="Fixture card",
            ),
        ],
        processing=StatementProcessingMetadata(
            provider="fixture",
            prompt_id=settings.statement_extraction_prompt_id,
            model_name=None,
            confidence=1.0,
            page_count=page_count,
            raw_text_sha256=raw_text_hash,
            text_char_count=len(raw_text),
            text_line_count=text_line_count,
            warnings=["fixture_statement_extraction"],
        ),
    )


def _gemini_output(
    path: Path,
    *,
    password: str | None,
    issuer_hint: str | None,
    inspection: StatementPdfInspection,
    fallback_warnings: list[str],
    gemini_input: str = "profile-rows",
) -> StatementExtractionOutput:
    if gemini_input == "profile-rows":
        evidence = extract_statement_pdf_evidence(path, password=password)
        compact = build_statement_compact_evidence(evidence)
        if compact.status != "readable":
            return _evidence_status_output(
                issuer_hint=issuer_hint,
                inspection=inspection,
                status=f"profile_rows_evidence_status_{compact.status}",
                page_count=compact.page_count,
                raw_text_sha256=compact.raw_text_sha256,
                text_char_count=compact.text_char_count,
                text_line_count=compact.text_line_count,
                input_mode="profile-rows",
                fallback_warnings=fallback_warnings,
                evidence_row_count=compact.row_count,
                evidence_candidate_row_count=compact.candidate_row_count,
                warnings=[*fallback_warnings, *compact.warnings],
            )
        profile_result = asyncio.run(
            infer_statement_layout_profile_with_gemini(
                _legacy_profile_rows_provider_payload(compact.model_dump(mode="json"))
            )
        )
        application = apply_statement_layout_profile(
            compact_evidence=compact,
            layout_profile=profile_result.layout_profile,
            issuer_hint=issuer_hint,
            prompt_id=profile_result.prompt_id,
            model_name=profile_result.model_name,
            fallback_warnings=fallback_warnings,
        )
        raw = _with_usage_metadata(
            application.extraction,
            usage=profile_result.usage,
            model_name=profile_result.model_name,
            input_mode=profile_result.input_mode,
            cache_status="runtime_no_cache",
            fallback_warnings=fallback_warnings,
            evidence_row_count=compact.row_count,
            evidence_candidate_row_count=compact.candidate_row_count,
        )
        if raw.pdf_status != "readable":
            return raw
        return coalesce_statement_output(
            raw,
            issuer_hint=issuer_hint,
            prompt_id=profile_result.prompt_id,
            model_name=profile_result.model_name,
            page_count=raw.processing.page_count,
        )

    if gemini_input == "pymupdf-evidence":
        evidence = extract_statement_pdf_evidence(path, password=password)
        if evidence.status != "readable":
            return _evidence_status_output(
                issuer_hint=issuer_hint,
                inspection=inspection,
                status=f"gemini_evidence_status_{evidence.status}",
                page_count=evidence.page_count,
                raw_text_sha256=evidence.raw_text_sha256,
                text_char_count=evidence.text_char_count,
                text_line_count=evidence.text_line_count,
                input_mode="pymupdf-evidence",
                fallback_warnings=fallback_warnings,
                evidence_row_count=evidence.row_count,
                evidence_candidate_row_count=None,
                warnings=[*fallback_warnings, *evidence.warnings],
            )
        result = asyncio.run(
            extract_statement_with_gemini_evidence(evidence.provider_payload())
        )
        evidence_warnings = [
            "gemini_input_mode_pymupdf_evidence",
            *evidence.warnings,
        ]
    else:
        pdf_bytes = _provider_pdf_bytes(path, password=password)
        result = asyncio.run(extract_statement_with_gemini(pdf_bytes))
        evidence = None
        evidence_warnings = ["gemini_input_mode_pdf"]
    extraction = result.extraction
    warnings = list(
        dict.fromkeys(
            [*fallback_warnings, *evidence_warnings, *extraction.processing.warnings]
        )
    )
    raw_text_sha256 = (
        evidence.raw_text_sha256 if evidence is not None else extraction.processing.raw_text_sha256
    )
    text_char_count = (
        evidence.text_char_count if evidence is not None else extraction.processing.text_char_count
    )
    text_line_count = (
        evidence.text_line_count if evidence is not None else extraction.processing.text_line_count
    )
    statement = extraction.statement.model_copy(
        update={
            "issuer": extraction.statement.issuer or issuer_hint,
        }
    )
    processing = extraction.processing.model_copy(
        update={
            "provider": "gemini",
            "prompt_id": result.prompt_id,
            "model_name": result.model_name,
            "page_count": extraction.processing.page_count or inspection.page_count,
            "raw_text_sha256": raw_text_sha256,
            "text_char_count": text_char_count,
            "text_line_count": text_line_count,
            "input_mode": result.input_mode,
            "llm_input_tokens": result.usage.input_tokens,
            "llm_output_tokens": result.usage.output_tokens,
            "llm_cost_usd": estimate_llm_cost_usd(
                input_tokens=result.usage.input_tokens,
                output_tokens=result.usage.output_tokens,
                model_name=result.model_name,
            ),
            "fallback_reason": _fallback_reason(fallback_warnings),
            "cache_status": "runtime_no_cache",
            "deterministic_routing_reasons": _routing_reasons(fallback_warnings),
            "evidence_row_count": evidence.row_count if evidence is not None else None,
            "evidence_candidate_row_count": None,
            "warnings": warnings,
        }
    )
    raw = extraction.model_copy(update={"statement": statement, "processing": processing})
    return coalesce_statement_output(
        raw,
        issuer_hint=issuer_hint,
        prompt_id=result.prompt_id,
        model_name=result.model_name,
        page_count=processing.page_count,
    )


def _evidence_status_output(
    *,
    issuer_hint: str | None,
    inspection: StatementPdfInspection,
    status: str,
    page_count: int | None,
    raw_text_sha256: str | None,
    text_char_count: int,
    text_line_count: int,
    input_mode: str,
    fallback_warnings: list[str],
    evidence_row_count: int | None,
    evidence_candidate_row_count: int | None,
    warnings: list[str],
) -> StatementExtractionOutput:
    return StatementExtractionOutput(
        pdf_status="extraction_failed",
        statement=StatementInfo(issuer=issuer_hint),
        lines=[],
        processing=StatementProcessingMetadata(
            provider="gemini",
            prompt_id=settings.statement_layout_profile_prompt_id,
            model_name=None,
            confidence=0.0,
            page_count=page_count or inspection.page_count,
            raw_text_sha256=raw_text_sha256,
            text_char_count=text_char_count,
            text_line_count=text_line_count,
            input_mode=input_mode,
            fallback_reason=_fallback_reason(fallback_warnings),
            cache_status="runtime_no_cache",
            deterministic_routing_reasons=_routing_reasons(fallback_warnings),
            evidence_row_count=evidence_row_count,
            evidence_candidate_row_count=evidence_candidate_row_count,
            warnings=sorted({*warnings, status}),
        ),
    )


def _with_usage_metadata(
    extraction: StatementExtractionOutput,
    *,
    usage: object,
    model_name: str,
    input_mode: str,
    cache_status: str,
    fallback_warnings: list[str],
    evidence_row_count: int | None,
    evidence_candidate_row_count: int | None,
) -> StatementExtractionOutput:
    input_tokens = int(getattr(usage, "input_tokens", 0) or 0)
    output_tokens = int(getattr(usage, "output_tokens", 0) or 0)
    processing = extraction.processing.model_copy(
        update={
            "provider": "gemini",
            "model_name": model_name,
            "input_mode": input_mode,
            "llm_input_tokens": input_tokens,
            "llm_output_tokens": output_tokens,
            "llm_cost_usd": estimate_llm_cost_usd(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                model_name=model_name,
            ),
            "fallback_reason": _fallback_reason(fallback_warnings),
            "cache_status": cache_status,
            "deterministic_routing_reasons": _routing_reasons(fallback_warnings),
            "evidence_row_count": evidence_row_count,
            "evidence_candidate_row_count": evidence_candidate_row_count,
        }
    )
    return extraction.model_copy(update={"processing": processing})


def _fallback_reason(fallback_warnings: list[str]) -> str:
    if "deterministic_fallback_to_gemini" in fallback_warnings:
        return "deterministic_quality_or_routing_failed"
    return "provider_forced"


def _routing_reasons(fallback_warnings: list[str]) -> list[str]:
    return [
        warning.removeprefix("routing:")
        for warning in fallback_warnings
        if warning.startswith("routing:")
    ]


def _legacy_profile_rows_provider_payload(payload: dict[str, object]) -> dict[str, object]:
    provider_payload = dict(payload)
    provider_payload["schema_version"] = "statement-compact-evidence.v1"
    return provider_payload


def _provider_pdf_bytes(path: Path, *, password: str | None) -> bytes:
    raw_bytes = path.read_bytes()
    reader = PdfReader(io.BytesIO(raw_bytes))
    if not reader.is_encrypted:
        return raw_bytes
    if not password or not reader.decrypt(password):
        return raw_bytes
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()
