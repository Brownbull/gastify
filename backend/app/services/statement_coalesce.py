"""Shared normalization for Gemini credit-card statement extraction."""

from __future__ import annotations

import re

from app.schemas.statement import (
    StatementAmountCandidate,
    StatementExtractionOutput,
    StatementInfo,
    StatementLine,
    StatementProcessingMetadata,
)

_CURRENT_AMOUNT_ROLES = {"current_statement_amount", "current_installment"}
_SUSPICIOUS_INSTALLMENT_AMOUNT_ROLES = {
    "purchase_total",
    "plan_total",
    "pending_balance",
}
_TOTAL_AMOUNT_TOKENS = {
    "balance",
    "operacion",
    "operación",
    "pending",
    "plan total",
    "purchase total",
    "saldo",
    "total",
    "total a pagar",
    "total cuotas",
}
_TERM_EVIDENCE_TOKENS = {
    "cuota",
    "cuotas",
    "installment",
    "instalment",
    "plazo",
}
_CURRENT_AMOUNT_TOKENS = {
    "amount billed",
    "billed amount",
    "current amount",
    "current installment",
    "current statement",
    "cuota actual",
    "cuota mensual",
    "monto cuota",
    "valor cuota",
}


def coalesce_statement_output(
    raw: StatementExtractionOutput,
    *,
    issuer_hint: str | None,
    prompt_id: str,
    model_name: str,
    page_count: int | None,
    extra_warnings: list[str] | None = None,
) -> StatementExtractionOutput:
    """Normalize provider output into the statement contract without creating transactions."""
    warnings = list(dict.fromkeys([*(extra_warnings or []), *raw.processing.warnings]))
    statement = StatementInfo.model_validate(raw.statement.model_dump())
    if not statement.issuer and issuer_hint:
        statement.issuer = issuer_hint
        warnings.append("statement_issuer_filled_from_case")
    statement.currency = statement.currency.upper()

    normalized_lines: list[StatementLine] = []
    sorted_lines = sorted(enumerate(raw.lines, start=1), key=lambda item: item[1].source_order)
    for index, (_original_index, line) in enumerate(sorted_lines, start=1):
        normalized = StatementLine.model_validate(line.model_dump())
        if normalized.source_order != index:
            warnings.append("statement_line_source_order_normalized")
            normalized.source_order = index
        if not normalized.currency:
            normalized.currency = statement.currency
            warnings.append("statement_line_currency_defaulted")
        else:
            normalized.currency = normalized.currency.upper()
        if normalized.original_currency:
            normalized.original_currency = normalized.original_currency.upper()
        for candidate in normalized.amount_candidates:
            candidate.currency = candidate.currency.upper()
        if normalized.original_currency and _description_has_currency_marker(
            normalized.description,
            normalized.original_currency,
        ):
            warnings.append("statement_line_foreign_currency_marker_in_description")
        if normalized.amount_minor < 0 and normalized.line_type == "charge":
            warnings.append("statement_line_negative_charge_type")
        if normalized.original_amount_minor is not None and normalized.original_amount_minor < 0:
            warnings.append("statement_line_negative_original_amount")
        if normalized.line_type == "other":
            warnings.append("statement_line_type_other")
        if normalized.date is None:
            warnings.append("statement_line_missing_date")
        correction = _correct_installment_amount_from_evidence(normalized)
        if correction is not None:
            amount_minor, correction_warnings = correction
            normalized.amount_minor = amount_minor
            warnings.extend(correction_warnings)
        warnings.extend(_installment_amount_evidence_warnings(normalized))
        normalized_lines.append(normalized)

    if statement.period_start is None or statement.period_end is None:
        warnings.append("statement_period_incomplete")
    if raw.pdf_status != "readable":
        warnings.append(f"provider_pdf_status_{raw.pdf_status}")

    processing = StatementProcessingMetadata(
        provider="gemini",
        prompt_id=prompt_id,
        model_name=model_name,
        confidence=raw.processing.confidence,
        page_count=page_count if page_count is not None else raw.processing.page_count,
        raw_text_sha256=raw.processing.raw_text_sha256,
        text_char_count=raw.processing.text_char_count,
        text_line_count=raw.processing.text_line_count,
        input_mode=raw.processing.input_mode,
        llm_input_tokens=raw.processing.llm_input_tokens,
        llm_output_tokens=raw.processing.llm_output_tokens,
        llm_cost_usd=raw.processing.llm_cost_usd,
        fallback_reason=raw.processing.fallback_reason,
        cache_status=raw.processing.cache_status,
        deterministic_routing_reasons=list(raw.processing.deterministic_routing_reasons),
        evidence_row_count=raw.processing.evidence_row_count,
        evidence_candidate_row_count=raw.processing.evidence_candidate_row_count,
        warnings=sorted(set(warnings)),
    )
    return StatementExtractionOutput(
        document_type="credit_card_statement",
        pdf_status=raw.pdf_status,
        statement=statement,
        lines=normalized_lines,
        processing=processing,
    )


def _description_has_currency_marker(description: str, original_currency: str) -> bool:
    currency = re.escape(original_currency.upper())
    return bool(re.search(rf"(^|\s)(CL\s+)?{currency}(\s|$)", description.upper()))


def _installment_amount_evidence_warnings(line: StatementLine) -> list[str]:
    if not _has_fixed_term_evidence(line):
        return []
    warnings: list[str] = []
    if not line.amount_candidates:
        warnings.append("statement_line_installment_missing_amount_candidates")
    if not line.amount_selection_reason:
        warnings.append("statement_line_installment_missing_amount_selection_reason")

    selected_suspicious_role = any(
        candidate.amount_minor == line.amount_minor
        and candidate.role in _SUSPICIOUS_INSTALLMENT_AMOUNT_ROLES
        for candidate in line.amount_candidates
    )
    if selected_suspicious_role:
        warnings.append("statement_line_installment_selected_suspicious_amount_role")

    current_amounts = {
        candidate.amount_minor
        for candidate in line.amount_candidates
        if _candidate_is_current_amount(candidate)
    }
    if line.amount_candidates and not current_amounts:
        warnings.append("statement_line_installment_missing_current_amount_candidate")
    if current_amounts and line.amount_minor not in current_amounts:
        warnings.append("statement_line_installment_selected_non_current_amount")
    parts = _fixed_term_parts(_fixed_term_evidence_text(line))
    if parts is not None:
        _current, total = parts
        if any(
            _looks_like_term_total(line.amount_minor, amount, total)
            for amount in current_amounts
        ):
            warnings.append("statement_line_installment_selected_amount_matches_term_total_multiple")
    if (
        line.amount_candidates
        and _selected_amount_has_total_evidence(line)
        and _safe_current_amount_candidate(line) is None
    ):
        warnings.append("statement_line_installment_amount_correction_skipped_ambiguous_or_missing")
    return warnings


def _correct_installment_amount_from_evidence(
    line: StatementLine,
) -> tuple[int, list[str]] | None:
    if line.amount_minor <= 0 or not _has_fixed_term_evidence(line):
        return None
    current_amount = _safe_current_amount_candidate(line)
    if current_amount is None or current_amount == line.amount_minor:
        return None
    if not _selected_amount_has_total_evidence(line):
        return None
    return (
        current_amount,
        [
            "statement_line_installment_amount_corrected_from_candidate",
            "statement_line_installment_amount_corrected_from_current_candidate",
            "statement_line_installment_selected_non_current_amount",
        ],
    )


def _safe_current_amount_candidate(line: StatementLine) -> int | None:
    candidates = _positive_same_currency_candidates(line)
    distinct_amounts = sorted({candidate.amount_minor for candidate in candidates})
    if len(distinct_amounts) < 2:
        return None
    selected_amount = line.amount_minor
    smaller_amounts = [amount for amount in distinct_amounts if amount < selected_amount]
    if len(smaller_amounts) != 1:
        return None
    smaller_amount = smaller_amounts[0]
    if _candidate_has_current_evidence(line, smaller_amount):
        return smaller_amount
    if _selected_amount_has_total_evidence(line):
        return smaller_amount
    parts = _fixed_term_parts(_fixed_term_evidence_text(line))
    if parts is None:
        return None
    _current, total = parts
    if _looks_like_term_total(selected_amount, smaller_amount, total):
        return smaller_amount
    return None


def _positive_same_currency_candidates(line: StatementLine) -> list[StatementAmountCandidate]:
    return [
        candidate
        for candidate in line.amount_candidates
        if candidate.currency.upper() == line.currency.upper() and candidate.amount_minor > 0
    ]


def _candidate_has_current_evidence(line: StatementLine, amount_minor: int) -> bool:
    return any(
        candidate.amount_minor == amount_minor and _candidate_is_current_amount(candidate)
        for candidate in line.amount_candidates
    )


def _candidate_is_current_amount(candidate: StatementAmountCandidate) -> bool:
    if candidate.role in _CURRENT_AMOUNT_ROLES:
        return True
    text = _normalize_text(candidate.column_label, candidate.visible_text)
    if any(token in text for token in _CURRENT_AMOUNT_TOKENS):
        return True
    return "cuota" in text and not any(token in text for token in _TOTAL_AMOUNT_TOKENS)


def _selected_amount_has_total_evidence(line: StatementLine) -> bool:
    parts = _fixed_term_parts(_fixed_term_evidence_text(line))
    selected_candidates = [
        candidate
        for candidate in line.amount_candidates
        if candidate.amount_minor == line.amount_minor
    ]
    if any(
        candidate.role in _SUSPICIOUS_INSTALLMENT_AMOUNT_ROLES
        for candidate in selected_candidates
    ):
        return True
    selected_text = _normalize_text(
        line.amount_selection_reason,
        *[
            " ".join(
                part
                for part in (candidate.column_label, candidate.visible_text)
                if part
            )
            for candidate in selected_candidates
        ],
    )
    if any(token in selected_text for token in _TOTAL_AMOUNT_TOKENS):
        return True
    if parts is not None:
        _current, total = parts
        smaller_amount = _safe_smaller_amount_without_total_check(line)
        if smaller_amount is not None and _looks_like_term_total(
            line.amount_minor,
            smaller_amount,
            total,
        ):
            return True
    return False


def _safe_smaller_amount_without_total_check(line: StatementLine) -> int | None:
    distinct_amounts = sorted(
        {candidate.amount_minor for candidate in _positive_same_currency_candidates(line)}
    )
    smaller_amounts = [amount for amount in distinct_amounts if amount < line.amount_minor]
    return smaller_amounts[0] if len(smaller_amounts) == 1 else None


def _has_fixed_term_evidence(line: StatementLine) -> bool:
    text = _fixed_term_evidence_text(line)
    return _fixed_term_parts(text) is not None or any(
        token in text for token in _TERM_EVIDENCE_TOKENS
    )


def _fixed_term_evidence_text(line: StatementLine) -> str:
    candidate_text = " ".join(
        " ".join(part for part in (candidate.column_label, candidate.visible_text) if part)
        for candidate in line.amount_candidates
    )
    return _normalize_text(line.installment, line.amount_selection_reason, candidate_text)


def _fixed_term_parts(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    match = re.search(r"\b(\d{1,3})\s*/\s*(\d{1,3})\b", value)
    if match is None:
        return None
    current = int(match.group(1))
    total = int(match.group(2))
    if current <= 0 or total <= 1:
        return None
    return current, total


def _looks_like_term_total(selected_amount: int, current_amount: int, total: int) -> bool:
    if current_amount == 0:
        return False
    expected_total = abs(current_amount * total)
    return abs(abs(selected_amount) - expected_total) <= max(total, 2)


def _normalize_text(*values: str | None) -> str:
    text = " ".join(value for value in values if value)
    return " ".join(text.casefold().split())
