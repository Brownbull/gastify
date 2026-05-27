"""Unknown statement fallback using compact rows plus a Gemini layout profile."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import date
from typing import Any

from app.schemas.statement import (
    StatementAmountCandidate,
    StatementAmountRole,
    StatementExtractionOutput,
    StatementInfo,
    StatementLine,
    StatementLineType,
    StatementPdfStatus,
    StatementProcessingMetadata,
    as_statement_amount_role,
)
from app.schemas.statement_profile import (
    STATEMENT_COMPACT_EVIDENCE_SCHEMA_VERSION,
    StatementAmountColumnProfile,
    StatementAmountToken,
    StatementColumnProfile,
    StatementCompactEvidence,
    StatementDateToken,
    StatementInstallmentToken,
    StatementLayoutProfile,
    StatementProfileApplicationResult,
    StatementProfileEvidenceStatus,
    StatementRowCandidate,
    StatementWordToken,
)
from app.services.statement_pdf_evidence import StatementPdfEvidence

_DATE_RE = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b")
_INSTALLMENT_RE = re.compile(r"\b(\d{1,2})\s*/\s*(\d{1,2})\b")
_AMOUNT_RE = re.compile(r"(?<!\w)([-+]?\$?\s*(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?)(?!\w)")
_MONTH_YEAR_RE = re.compile(
    r"\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*[-/\s]\d{2,4}\b",
    re.IGNORECASE,
)
_CURRENCY_RE = re.compile(r"\b(CLP|USD|EUR|US\$|US|DOLAR(?:ES)?|PESOS?)\b", re.IGNORECASE)
_SUMMARY_TOKENS = {
    "balance",
    "saldo",
    "subtotal",
    "total",
    "vencimiento",
    "payment due",
    "monto facturado",
    "cupo",
}
_ALWAYS_SUMMARY_TOKENS = {
    "monto total",
    "monto mínimo",
    "monto minimo",
    "monto facturado",
    "costo monetario",
    "prepago",
    "gasto de cobranza",
    "interés por mora",
    "interes por mora",
    "total operaciones",
    "total operación",
    "total operacion",
    "total pagos",
    "total de pagos",
    "total compras",
    "total de compras",
    "total cargos",
    "total tarjeta",
    "comprobante de pago",
    "número de tarjeta",
    "numero de tarjeta",
    "tarjeta de crédito",
    "tarjeta de credito",
    "pagar hasta",
    "monto cancelado",
    "para realizar",
    "whatsapp",
    "timbre",
}
_IDENTITY_OR_CONTACT_TOKENS = {
    "titular",
    "adicional",
    "nombre número de tarjeta",
    "nombre numero de tarjeta",
    "emisor",
    "cliente",
}
_PAYMENT_TOKENS = {"abono", "pago", "payment", "tef", "transferencia"}
_CREDIT_TOKENS = {"credito", "crédito", "devolucion", "devolución", "refund", "reversal"}
_INSURANCE_TOKENS = {"seg ", "seg.", "seguro", "seguros", "desgravamen"}
_FEE_TOKENS = {"comision", "comisión", "administracion", "administración", "mantencion"}
_INTEREST_TOKENS = {"interes", "interés", "interest", "tasa int"}
_TAX_TOKENS = {"impuesto", "iva", "tax"}
_FOREIGN_SECTION_TOKENS = {
    "monto us$",
    "total de compras us$",
    "total compras us$",
    "total de pagos us$",
    "total pagos us$",
    "compras internacionales",
}


@dataclass(frozen=True)
class _ProfiledAmount:
    token: StatementAmountToken
    role: str
    column_label: str | None
    column_currency: str | None


@dataclass(frozen=True)
class _RowCurrencyContext:
    billing_currency: str
    original_currency: str | None = None
    explicit_foreign_section: bool = False
    local_billing_with_original: bool = False


def build_statement_compact_evidence(
    evidence: StatementPdfEvidence | dict[str, Any],
) -> StatementCompactEvidence:
    """Build compact provider evidence from generic PyMuPDF evidence."""
    payload = (
        evidence.provider_payload() if isinstance(evidence, StatementPdfEvidence) else evidence
    )
    status = str(payload.get("status") or "extraction_failed")
    rows_payload = list(payload.get("row_groups", {}).get("rows", []))
    rows: list[StatementRowCandidate] = []
    for row_payload in rows_payload:
        rows.append(_row_candidate(row_payload))
    rows = _with_context(rows)
    candidate_row_count = sum(1 for row in rows if row.likely_financial)
    return StatementCompactEvidence(
        status=_profile_status(status),
        is_encrypted=bool(payload.get("is_encrypted")),
        page_count=payload.get("page_count"),
        raw_text_sha256=payload.get("raw_text_sha256"),
        text_char_count=int(payload.get("text_char_count") or 0),
        text_line_count=int(payload.get("text_line_count") or 0),
        row_count=len(rows),
        candidate_row_count=candidate_row_count,
        rows=rows,
        warnings=sorted(
            {
                "statement_profile_compact_evidence",
                *[str(warning) for warning in payload.get("warnings", [])],
            }
        ),
    )


def compact_evidence_hash(compact_evidence: StatementCompactEvidence) -> str:
    """Return a stable hash of full local compact evidence."""
    return hashlib.sha256(
        json.dumps(
            compact_evidence.model_dump(mode="json"),
            sort_keys=True,
            ensure_ascii=False,
        ).encode("utf-8")
    ).hexdigest()


def compact_evidence_provider_payload(
    compact_evidence: StatementCompactEvidence,
) -> dict[str, Any]:
    """Return the compact v2 provider input without full word lists or raw pages."""
    rows = _provider_rows(compact_evidence.rows)
    payload = {
        "schema_version": STATEMENT_COMPACT_EVIDENCE_SCHEMA_VERSION,
        "provider_payload_version": "statement-compact-evidence-provider.v2",
        "input_mode": compact_evidence.input_mode,
        "status": compact_evidence.status,
        "is_encrypted": compact_evidence.is_encrypted,
        "page_count": compact_evidence.page_count,
        "raw_text_sha256": compact_evidence.raw_text_sha256,
        "text_char_count": compact_evidence.text_char_count,
        "text_line_count": compact_evidence.text_line_count,
        "row_count": compact_evidence.row_count,
        "candidate_row_count": compact_evidence.candidate_row_count,
        "provider_row_count": len(rows),
        "rows": rows,
        "warnings": sorted(
            {
                "statement_compact_evidence_v2_provider_payload",
                *compact_evidence.warnings,
            }
        ),
        "privacy": {
            **compact_evidence.privacy,
            "full_word_lists_included": False,
            "raw_page_text_included": False,
        },
    }
    payload["compact_evidence_sha256"] = hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()
    return payload


def compact_evidence_provider_hash(compact_evidence: StatementCompactEvidence) -> str:
    """Return a stable hash of the provider-facing compact v2 evidence."""
    return str(compact_evidence_provider_payload(compact_evidence)["compact_evidence_sha256"])


def apply_statement_layout_profile(
    *,
    compact_evidence: StatementCompactEvidence,
    layout_profile: StatementLayoutProfile,
    issuer_hint: str | None,
    prompt_id: str,
    model_name: str,
    fallback_warnings: list[str] | None = None,
) -> StatementProfileApplicationResult:
    """Apply a Gemini-inferred layout profile deterministically to compact rows."""
    selected, selection_warnings = _selected_rows(compact_evidence, layout_profile)
    lines: list[StatementLine] = []
    unresolved: list[StatementRowCandidate] = []
    warnings = [
        "gemini_input_mode_profile_rows",
        "statement_profile_layout_applied",
        *compact_evidence.warnings,
        *layout_profile.warnings,
        *selection_warnings,
        *(fallback_warnings or []),
    ]
    for row in selected:
        line = _line_from_row(row, layout_profile, source_order=len(lines) + 1)
        if line is None:
            unresolved.append(row)
            continue
        lines.append(line)
    if not lines and layout_profile.transaction_row_ranges:
        warnings.append("statement_profile_used_likely_financial_rows_after_empty_profile")
        for row in _likely_financial_rows(compact_evidence):
            line = _line_from_row(row, layout_profile, source_order=len(lines) + 1)
            if line is None:
                unresolved.append(row)
                continue
            lines.append(line)

    pdf_status: StatementPdfStatus = "readable" if lines else "extraction_failed"
    if not lines:
        warnings.append("statement_profile_no_usable_rows")
    if unresolved:
        warnings.append("statement_profile_unresolved_rows_present")
    if not layout_profile.transaction_row_ranges:
        warnings.append("statement_profile_used_likely_financial_rows")

    extraction = StatementExtractionOutput(
        pdf_status=pdf_status,
        statement=StatementInfo(
            issuer=issuer_hint,
            currency=layout_profile.default_currency,
        ),
        lines=lines,
        processing=StatementProcessingMetadata(
            provider="gemini",
            prompt_id=prompt_id,
            model_name=model_name,
            confidence=layout_profile.confidence,
            page_count=compact_evidence.page_count,
            raw_text_sha256=compact_evidence.raw_text_sha256,
            text_char_count=compact_evidence.text_char_count,
            text_line_count=compact_evidence.text_line_count,
            warnings=sorted(set(warnings)),
        ),
    )
    return StatementProfileApplicationResult(
        extraction=extraction,
        compact_evidence=compact_evidence,
        layout_profile=layout_profile,
        unresolved_rows=unresolved,
        warnings=sorted(set(warnings)),
    )


def compact_evidence_summary(
    compact_evidence: StatementCompactEvidence | None,
) -> dict[str, Any] | None:
    if compact_evidence is None:
        return None
    return {
        "schema_version": STATEMENT_COMPACT_EVIDENCE_SCHEMA_VERSION,
        "input_mode": compact_evidence.input_mode,
        "status": compact_evidence.status,
        "page_count": compact_evidence.page_count,
        "raw_text_sha256": compact_evidence.raw_text_sha256,
        "text_char_count": compact_evidence.text_char_count,
        "text_line_count": compact_evidence.text_line_count,
        "row_count": compact_evidence.row_count,
        "candidate_row_count": compact_evidence.candidate_row_count,
        "compact_evidence_sha256": compact_evidence_hash(compact_evidence),
        "provider_compact_evidence_sha256": compact_evidence_provider_hash(compact_evidence),
        "provider_row_count": compact_evidence_provider_payload(compact_evidence)[
            "provider_row_count"
        ],
        "warnings": compact_evidence.warnings,
    }


def _provider_rows(rows: list[StatementRowCandidate]) -> list[dict[str, Any]]:
    if not rows:
        return []
    likely_indexes = {index for index, row in enumerate(rows) if row.likely_financial}
    selected_indexes: set[int] = set()
    for index in likely_indexes:
        selected_indexes.update(range(max(0, index - 2), min(len(rows), index + 3)))
    selected_indexes.update(
        index for index, row in enumerate(rows) if _looks_like_provider_context_row(row.text)
    )
    if not selected_indexes:
        selected_indexes = set(range(len(rows)))
    return [
        _provider_row_payload(row) for index, row in enumerate(rows) if index in selected_indexes
    ]


def _provider_row_payload(row: StatementRowCandidate) -> dict[str, Any]:
    return {
        "row_index": row.row_index,
        "page": row.page,
        "y0": round(row.y0, 2),
        "y1": round(row.y1, 2),
        "visible_text": row.text,
        "date_candidates": [candidate.model_dump(mode="json") for candidate in row.date_candidates],
        "amount_tokens": [candidate.model_dump(mode="json") for candidate in row.amount_candidates],
        "currency_hints": row.currency_hints,
        "installment_markers": [
            candidate.model_dump(mode="json") for candidate in row.installment_candidates
        ],
        "section_context": _provider_context(row),
        "likely_financial": row.likely_financial,
    }


def _provider_context(row: StatementRowCandidate) -> dict[str, list[str]]:
    return {
        "before": [text for text in row.context_before if _looks_like_provider_context_row(text)],
        "after": [text for text in row.context_after if _looks_like_provider_context_row(text)],
    }


def _looks_like_provider_context_row(text: str) -> bool:
    lowered = text.casefold()
    return (
        _looks_like_summary(text)
        or any(token in lowered for token in _SUMMARY_TOKENS)
        or any(token in lowered for token in _FOREIGN_SECTION_TOKENS)
        or "fecha" in lowered
        or "date" in lowered
        or "monto" in lowered
        or "amount" in lowered
        or "descrip" in lowered
        or "detalle" in lowered
        or "merchant" in lowered
        or "cuota" in lowered
        or "installment" in lowered
        or bool(_CURRENCY_RE.search(text))
    )


def _row_candidate(row_payload: dict[str, Any]) -> StatementRowCandidate:
    text = str(row_payload.get("text") or "").strip()
    words = [
        StatementWordToken(
            text=str(word.get("text") or ""),
            x0=float(word.get("x0") or 0),
            x1=float(word.get("x1") or 0),
        )
        for word in row_payload.get("words", [])
    ]
    date_candidates = _date_candidates(text, words)
    amount_candidates = _amount_candidates(text, words)
    installment_candidates = _installment_candidates(text, words)
    currency_hints = sorted({hint for hint in _currency_hints(text) if hint})
    likely_financial = bool(
        amount_candidates
        and (
            date_candidates
            or installment_candidates
            or any(token in text.casefold() for token in _PAYMENT_TOKENS | _CREDIT_TOKENS)
        )
        and not _looks_like_summary(text)
    )
    return StatementRowCandidate(
        row_index=int(row_payload.get("row_index") or 1),
        page=int(row_payload.get("page") or 1),
        y0=float(row_payload.get("y0") or 0),
        y1=float(row_payload.get("y1") or 0),
        text=text,
        words=words,
        date_candidates=date_candidates,
        amount_candidates=amount_candidates,
        currency_hints=currency_hints,
        installment_candidates=installment_candidates,
        likely_financial=likely_financial,
    )


def _with_context(rows: list[StatementRowCandidate]) -> list[StatementRowCandidate]:
    updated: list[StatementRowCandidate] = []
    for index, row in enumerate(rows):
        updated.append(
            row.model_copy(
                update={
                    "context_before": [
                        candidate.text for candidate in rows[max(0, index - 2) : index]
                    ],
                    "context_after": [
                        candidate.text for candidate in rows[index + 1 : min(len(rows), index + 3)]
                    ],
                }
            )
        )
    return updated


def _date_candidates(text: str, words: list[StatementWordToken]) -> list[StatementDateToken]:
    candidates: list[StatementDateToken] = []
    for match in _DATE_RE.finditer(text):
        parsed = _parse_date(match.group(0))
        x0, x1 = _token_span(match.group(0), words)
        candidates.append(
            StatementDateToken(
                visible_text=match.group(0),
                parsed_date=parsed,
                x0=x0,
                x1=x1,
            )
        )
    return candidates


def _amount_candidates(text: str, words: list[StatementWordToken]) -> list[StatementAmountToken]:
    candidates: list[StatementAmountToken] = []
    row_currency = _row_currency_hint(text)
    consumed_word_indexes: set[int] = set()
    excluded_spans = [
        match.span()
        for pattern in (_DATE_RE, _INSTALLMENT_RE, _MONTH_YEAR_RE)
        for match in pattern.finditer(text)
    ]
    for match in _AMOUNT_RE.finditer(text):
        if any(_spans_overlap(match.span(), span) for span in excluded_spans):
            continue
        if _is_percent_token(text, match.span()):
            continue
        visible = match.group(0).strip()
        if _DATE_RE.fullmatch(visible) or _INSTALLMENT_RE.fullmatch(visible):
            continue
        amount_minor = _parse_amount_minor(visible, currency_hint=row_currency)
        if amount_minor is None:
            continue
        x0, x1 = _token_span(visible, words, consumed_word_indexes=consumed_word_indexes)
        candidates.append(
            StatementAmountToken(
                visible_text=visible,
                amount_minor=abs(amount_minor),
                currency_hint=row_currency,
                sign_hint="negative" if amount_minor < 0 or visible.startswith("-") else "unknown",
                x0=x0,
                x1=x1,
            )
        )
    return _filter_amount_candidates(candidates)


def _filter_amount_candidates(
    candidates: list[StatementAmountToken],
) -> list[StatementAmountToken]:
    if any(_has_money_like_evidence(candidate) for candidate in candidates):
        return [candidate for candidate in candidates if _has_money_like_evidence(candidate)]
    return [
        candidate for candidate in candidates if not _looks_like_reference_amount_token(candidate)
    ]


def _is_percent_token(text: str, span: tuple[int, int]) -> bool:
    end = span[1]
    return end < len(text) and text[end] == "%"


def _installment_candidates(
    text: str,
    words: list[StatementWordToken],
) -> list[StatementInstallmentToken]:
    candidates: list[StatementInstallmentToken] = []
    date_spans = [match.span() for match in _DATE_RE.finditer(text)]
    for match in _INSTALLMENT_RE.finditer(text):
        if any(_spans_overlap(match.span(), span) for span in date_spans):
            continue
        current = int(match.group(1))
        total = int(match.group(2))
        if total <= 0 or current > total:
            continue
        x0, x1 = _token_span(match.group(0), words)
        candidates.append(
            StatementInstallmentToken(
                visible_text=match.group(0).replace(" ", ""),
                term_current=current,
                term_total=total,
                x0=x0,
                x1=x1,
            )
        )
    return candidates


def _spans_overlap(left: tuple[int, int], right: tuple[int, int]) -> bool:
    left_start, left_end = left
    right_start, right_end = right
    return left_start < right_end and right_start < left_end


def _selected_rows(
    compact_evidence: StatementCompactEvidence,
    layout_profile: StatementLayoutProfile,
) -> tuple[list[StatementRowCandidate], list[str]]:
    selected_indexes: set[int] = set()
    for row_range in layout_profile.transaction_row_ranges:
        selected_indexes.update(range(row_range.start_row, row_range.end_row + 1))
    profile_selected_indexes = set(selected_indexes)
    likely_indexes = {
        row.row_index
        for row in compact_evidence.rows
        if row.likely_financial and not _looks_like_summary(row.text)
    }
    selected_indexes.update(likely_indexes)
    if not selected_indexes:
        selected_indexes.update(likely_indexes)

    excluded_indexes: set[int] = set()
    for row_range in layout_profile.excluded_row_ranges:
        excluded_indexes.update(range(row_range.start_row, row_range.end_row + 1))
    warnings: list[str] = []
    if likely_indexes - profile_selected_indexes:
        warnings.append("statement_profile_augmented_with_likely_financial_rows")
    if profile_selected_indexes and not (likely_indexes & profile_selected_indexes):
        warnings.append("statement_profile_used_likely_financial_rows_after_empty_profile")
    if likely_indexes & excluded_indexes:
        warnings.append("statement_profile_soft_ignored_exclusion_for_financial_rows")
    return [
        row
        for row in compact_evidence.rows
        if row.row_index in selected_indexes
        and (
            row.row_index not in excluded_indexes
            or (row.row_index in likely_indexes and not _looks_like_summary(row.text))
        )
    ], warnings


def _likely_financial_rows(
    compact_evidence: StatementCompactEvidence,
) -> list[StatementRowCandidate]:
    return [
        row
        for row in compact_evidence.rows
        if row.likely_financial and not _looks_like_summary(row.text)
    ]


def _line_from_row(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
    *,
    source_order: int,
) -> StatementLine | None:
    date_candidate = _selected_date(row, layout_profile.date_column)
    if _should_skip_output_row(row, date_candidate):
        return None
    amount = _selected_amount(row, layout_profile)
    if amount is None:
        return None
    selected = amount.token
    line_type = _line_type(row.text, amount)
    signed_amount = _signed_amount(row=row, amount=selected, line_type=line_type)
    installment = _selected_installment(row, layout_profile.installment_column)
    currency = _selected_statement_currency(
        selected=amount,
        row=row,
        layout_profile=layout_profile,
    )
    original = _selected_original_amount(
        row,
        layout_profile,
        selected=amount,
        selected_currency=currency,
    )
    description = _description_from_row(row, layout_profile)
    amount_candidates = _statement_amount_candidates(
        row=row,
        selected=amount,
        selected_amount=signed_amount,
        currency=currency,
        layout_profile=layout_profile,
    )
    line_warnings = _line_warnings(
        row=row,
        amount=amount,
        currency=currency,
        date_candidate=date_candidate,
        layout_profile=layout_profile,
    )
    ledger_ready = _ledger_ready(
        date_candidate=date_candidate,
        amount=amount,
        currency=currency,
        line_warnings=line_warnings,
    )
    return StatementLine(
        source_order=source_order,
        row_type=line_type,
        date=date_candidate.parsed_date if date_candidate else None,
        description=description or row.text,
        amount_minor=signed_amount,
        currency=currency,
        line_type=line_type,
        installment=installment.visible_text if installment else None,
        original_currency=original[0],
        original_amount_minor=original[1],
        amount_selection_reason=_amount_selection_reason(row, amount, layout_profile),
        amount_candidates=amount_candidates,
        ledger_ready=ledger_ready,
        confidence=_line_confidence(
            layout_profile=layout_profile,
            amount=amount,
            date_candidate=date_candidate,
            installment=installment,
        ),
        warnings=line_warnings,
        source_row_index=row.row_index,
        source_page=row.page,
        field_provenance=_field_provenance(
            row=row,
            amount=amount,
            date_candidate=date_candidate,
            installment=installment,
            original=original,
            ledger_ready=ledger_ready,
        ),
    )


def _selected_amount(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
) -> _ProfiledAmount | None:
    candidates = _profiled_amounts(row, layout_profile)
    if not candidates:
        return None
    currency_context = _row_currency_context(row, layout_profile)
    if currency_context.billing_currency == "CLP" and currency_context.original_currency:
        clp_like = [
            candidate
            for candidate in candidates
            if _looks_like_clp_statement_amount(candidate.token)
        ]
        if clp_like:
            return _rightmost_amount(clp_like)
    if currency_context.billing_currency == "USD" and currency_context.explicit_foreign_section:
        usd_like = [
            candidate for candidate in candidates if _looks_like_decimal_money(candidate.token)
        ]
        if usd_like:
            if not any(candidate.token.x0 is not None for candidate in usd_like):
                return min(usd_like, key=lambda candidate: candidate.token.amount_minor)
            return _rightmost_amount(usd_like)
    for role in ("current_statement_amount", "current_installment"):
        matching = [
            candidate
            for candidate in candidates
            if candidate.role == role and candidate.token.amount_minor > 0
        ]
        if matching:
            return _rightmost_amount(matching)
    if _has_multi_installment(row):
        current = [
            candidate
            for candidate in candidates
            if candidate.role
            not in {
                "purchase_total",
                "plan_total",
                "pending_balance",
                "foreign_original",
            }
            and candidate.token.amount_minor > 0
        ]
        current_with_money_evidence = [
            candidate for candidate in current if _has_money_like_evidence(candidate.token)
        ]
        if current_with_money_evidence:
            return min(
                current_with_money_evidence,
                key=lambda candidate: candidate.token.amount_minor,
            )
        if current:
            return min(current, key=lambda candidate: candidate.token.amount_minor)
    if (
        layout_profile.default_currency == "CLP"
        and not row.currency_hints
        and len(candidates) > 1
        and any(_looks_like_decimal_money(candidate.token) for candidate in candidates)
    ):
        clp_like = [
            candidate
            for candidate in candidates
            if _looks_like_clp_statement_amount(candidate.token)
        ]
        if clp_like:
            return _rightmost_amount(clp_like)
    money_like = [
        candidate
        for candidate in candidates
        if _has_money_like_evidence(candidate.token)
        and candidate.role not in {"purchase_total", "plan_total", "pending_balance"}
    ]
    if money_like:
        return _rightmost_amount(money_like)
    non_foreign = [candidate for candidate in candidates if candidate.role != "foreign_original"]
    if non_foreign:
        return _rightmost_amount(non_foreign)
    return _rightmost_amount(candidates)


def _profiled_amounts(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
) -> list[_ProfiledAmount]:
    amount_columns = _amount_columns(layout_profile)
    if not amount_columns:
        return [
            _ProfiledAmount(
                token=candidate,
                role=candidate.role_hint,
                column_label=None,
                column_currency=candidate.currency_hint,
            )
            for candidate in row.amount_candidates
        ]
    profiled: list[_ProfiledAmount] = []
    for candidate in row.amount_candidates:
        matches = [
            column
            for column in amount_columns
            if candidate.x0 is not None
            and candidate.x1 is not None
            and _x_overlaps_column(float(candidate.x0), float(candidate.x1), column)
        ]
        if matches:
            column = sorted(
                matches,
                key=lambda match: match.confidence if match.confidence is not None else 0,
                reverse=True,
            )[0]
            profiled.append(
                _ProfiledAmount(
                    token=candidate,
                    role=column.role,
                    column_label=column.label,
                    column_currency=column.currency or candidate.currency_hint,
                )
            )
        else:
            profiled.append(
                _ProfiledAmount(
                    token=candidate,
                    role=candidate.role_hint,
                    column_label=None,
                    column_currency=candidate.currency_hint,
                )
            )
    return profiled


def _amount_columns(layout_profile: StatementLayoutProfile) -> list[StatementAmountColumnProfile]:
    if layout_profile.amount_columns:
        return layout_profile.amount_columns
    if layout_profile.amount_column is None:
        return []
    return [
        StatementAmountColumnProfile(
            label=layout_profile.amount_column.label,
            x_min=layout_profile.amount_column.x_min,
            x_max=layout_profile.amount_column.x_max,
            confidence=layout_profile.amount_column.confidence,
            role="unknown",
        )
    ]


def _rightmost_amount(candidates: list[_ProfiledAmount]) -> _ProfiledAmount:
    return max(
        candidates,
        key=lambda candidate: (
            candidate.token.x0 if candidate.token.x0 is not None else -1,
            candidate.token.amount_minor,
        ),
    )


def _leftmost_matching_amount(
    candidates: list[_ProfiledAmount],
    *,
    predicate: Any,
) -> _ProfiledAmount | None:
    matching = [candidate for candidate in candidates if predicate(candidate)]
    if not matching:
        return None
    return min(
        matching,
        key=lambda candidate: (
            candidate.token.x0 if candidate.token.x0 is not None else 999_999,
            candidate.token.amount_minor,
        ),
    )


def _has_money_like_evidence(token: StatementAmountToken) -> bool:
    visible = token.visible_text.strip()
    if "$" in visible or "." in visible or "," in visible:
        return True
    return visible.startswith(("-", "+"))


def _looks_like_reference_amount_token(token: StatementAmountToken) -> bool:
    visible = token.visible_text.strip()
    if _has_money_like_evidence(token):
        return False
    digits = re.sub(r"\D", "", visible)
    if not digits:
        return True
    if visible.startswith("0"):
        return True
    return len(digits) >= 7


def _should_skip_output_row(
    row: StatementRowCandidate,
    date_candidate: StatementDateToken | None,
) -> bool:
    if _looks_like_summary(row.text):
        return True
    return date_candidate is None


def _selected_date(
    row: StatementRowCandidate,
    column: StatementColumnProfile | None,
) -> StatementDateToken | None:
    candidates = _tokens_in_column(row.date_candidates, column) or row.date_candidates
    return candidates[0] if candidates else None


def _selected_installment(
    row: StatementRowCandidate,
    column: StatementColumnProfile | None,
) -> StatementInstallmentToken | None:
    candidates = _tokens_in_column(row.installment_candidates, column) or row.installment_candidates
    return candidates[0] if candidates else None


def _selected_currency(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
) -> str | None:
    if row.currency_hints:
        return row.currency_hints[0]
    return layout_profile.default_currency


def _selected_statement_currency(
    *,
    selected: _ProfiledAmount,
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
) -> str:
    currency_context = _row_currency_context(row, layout_profile)
    if currency_context.local_billing_with_original:
        return currency_context.billing_currency
    if currency_context.explicit_foreign_section:
        return currency_context.billing_currency
    if selected.column_currency and selected.role in {
        "current_statement_amount",
        "current_installment",
        "foreign_original",
    }:
        return selected.column_currency
    if selected.token.currency_hint and _amount_text_has_explicit_currency(
        selected.token.visible_text
    ):
        return selected.token.currency_hint
    if (
        layout_profile.currency_policy == "mixed_billing_and_original"
        and layout_profile.default_currency == "USD"
        and "$" in selected.token.visible_text
    ):
        return "CLP"
    row_currency = _selected_currency(row, layout_profile)
    if row_currency:
        if (
            layout_profile.default_currency == "CLP"
            and row_currency != "CLP"
            and selected.role != "foreign_original"
            and not _amount_text_has_explicit_currency(selected.token.visible_text)
        ):
            return layout_profile.default_currency
        return row_currency
    if selected.role == "foreign_original":
        return selected.column_currency or layout_profile.default_currency
    if layout_profile.currency_policy in {"billing_currency_default", "mixed_billing_and_original"}:
        return layout_profile.default_currency
    return selected.column_currency or layout_profile.default_currency


def _selected_original_amount(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
    *,
    selected: _ProfiledAmount,
    selected_currency: str,
) -> tuple[str | None, int | None]:
    currency_context = _row_currency_context(row, layout_profile)
    candidates = _profiled_amounts(row, layout_profile)
    if currency_context.local_billing_with_original and currency_context.original_currency:
        original = _leftmost_matching_amount(
            candidates,
            predicate=lambda candidate: (
                candidate.token is not selected.token and _looks_like_decimal_money(candidate.token)
            ),
        )
        if original is not None:
            return currency_context.original_currency, original.token.amount_minor
    if currency_context.explicit_foreign_section and selected_currency == "USD":
        original = _leftmost_matching_amount(
            candidates,
            predicate=lambda candidate: (
                candidate.token is not selected.token
                and _looks_like_clp_statement_amount(candidate.token)
            ),
        )
        if original is not None:
            return "CLP", original.token.amount_minor
    foreign_candidates = [
        candidate
        for candidate in candidates
        if candidate.role == "foreign_original" and candidate.token is not selected.token
    ]
    if not foreign_candidates:
        return None, None
    original = _rightmost_amount(foreign_candidates)
    currency = _candidate_currency(original, selected_currency)
    original_currency = None if currency == layout_profile.default_currency else currency
    return original_currency, original.token.amount_minor


def _description_from_row(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
) -> str:
    words = _words_in_column(row.words, layout_profile.description_column)
    if not words:
        excluded_columns = [
            layout_profile.date_column,
            layout_profile.amount_column,
            layout_profile.currency_column,
            layout_profile.installment_column,
        ]
        words = [
            word
            for word in row.words
            if not any(_x_overlaps_column(word.x0, word.x1, column) for column in excluded_columns)
        ]
    visible = " ".join(word.text for word in words).strip()
    if visible:
        return _clean_description(visible)
    text = row.text
    for token in [
        *[candidate.visible_text for candidate in row.date_candidates],
        *[candidate.visible_text for candidate in row.amount_candidates],
        *[candidate.visible_text for candidate in row.installment_candidates],
        *row.currency_hints,
    ]:
        text = text.replace(token, " ")
    return _clean_description(text)


def _line_type(text: str, amount: _ProfiledAmount) -> StatementLineType:
    lowered = text.casefold()
    if any(token in lowered for token in _INSURANCE_TOKENS):
        return "insurance"
    if any(token in lowered for token in _FEE_TOKENS):
        return "fee"
    if any(token in lowered for token in _INTEREST_TOKENS):
        return "interest"
    if any(token in lowered for token in _TAX_TOKENS):
        return "tax"
    if amount.token.sign_hint == "negative" and any(token in lowered for token in _PAYMENT_TOKENS):
        return "payment"
    if any(token in lowered for token in _CREDIT_TOKENS) or amount.token.sign_hint == "negative":
        return "adjustment"
    return "charge"


def _signed_amount(
    *,
    row: StatementRowCandidate,
    amount: StatementAmountToken,
    line_type: StatementLineType,
) -> int:
    value = abs(amount.amount_minor)
    if line_type in {"payment", "adjustment"}:
        return -value
    if amount.sign_hint == "negative" and any(
        token in row.text.casefold() for token in _CREDIT_TOKENS
    ):
        return -value
    return value


def _statement_amount_candidates(
    *,
    row: StatementRowCandidate,
    selected: _ProfiledAmount,
    selected_amount: int,
    currency: str,
    layout_profile: StatementLayoutProfile,
) -> list[StatementAmountCandidate]:
    selected_abs = abs(selected_amount)
    result: list[StatementAmountCandidate] = []
    for candidate in _profiled_amounts(row, layout_profile):
        role: StatementAmountRole = as_statement_amount_role(candidate.role)
        if candidate.token is selected.token and role == "unknown":
            role = "selected"
        if candidate.token.amount_minor == selected_abs:
            role = "selected" if role == "unknown" else role
        result.append(
            StatementAmountCandidate(
                role=role,
                amount_minor=candidate.token.amount_minor,
                currency=_candidate_currency(candidate, currency),
                visible_text=candidate.token.visible_text,
                column_label=candidate.column_label,
            )
        )
    return result


def _amount_selection_reason(
    row: StatementRowCandidate,
    amount: _ProfiledAmount,
    layout_profile: StatementLayoutProfile,
) -> str:
    currency_context = _row_currency_context(row, layout_profile)
    if currency_context.local_billing_with_original:
        return "profile_rows_selected_billing_amount_from_local_foreign_row"
    if currency_context.explicit_foreign_section:
        return "profile_rows_selected_foreign_section_statement_amount"
    if amount.role in {"current_statement_amount", "current_installment"}:
        return f"profile_rows_selected_{amount.role}"
    if _has_multi_installment(row) and len(row.amount_candidates) > 1:
        return "profile_rows_selected_smallest_visible_installment_amount"
    if (
        layout_profile.default_currency == "CLP"
        and not row.currency_hints
        and len(row.amount_candidates) > 1
        and any(_looks_like_decimal_money(candidate) for candidate in row.amount_candidates)
        and _looks_like_clp_statement_amount(amount.token)
    ):
        return "profile_rows_selected_clp_like_amount_without_currency_hint"
    if layout_profile.amount_columns or layout_profile.amount_column is not None:
        return "profile_rows_selected_profile_amount_column"
    return "profile_rows_selected_rightmost_visible_amount"


def _candidate_currency(candidate: _ProfiledAmount, selected_currency: str) -> str:
    if candidate.role == "foreign_original":
        if candidate.column_currency and candidate.column_currency != selected_currency:
            return candidate.column_currency
        if candidate.token.currency_hint and candidate.token.currency_hint != selected_currency:
            return candidate.token.currency_hint
        return (
            _fallback_original_currency(selected_currency)
            or candidate.column_currency
            or candidate.token.currency_hint
            or selected_currency
        )
    return selected_currency


def _fallback_original_currency(selected_currency: str) -> str | None:
    if selected_currency == "USD":
        return "CLP"
    return None


def _amount_text_has_explicit_currency(value: str) -> bool:
    return bool(re.search(r"\b(?:CLP|USD|EUR|GBP|US\$|US)\b", value, re.IGNORECASE))


def _line_warnings(
    *,
    row: StatementRowCandidate,
    amount: _ProfiledAmount,
    currency: str,
    date_candidate: StatementDateToken | None,
    layout_profile: StatementLayoutProfile,
) -> list[str]:
    warnings: list[str] = []
    if date_candidate is None:
        warnings.append("statement_profile_line_missing_date")
    if amount.role in {"purchase_total", "plan_total", "pending_balance", "foreign_original"}:
        warnings.append(f"statement_profile_selected_{amount.role}")
    if (
        amount.role == "unknown"
        and _has_ambiguous_amount_values(row, layout_profile)
        and not _amount_context_resolved(row, layout_profile, amount)
    ):
        warnings.append("statement_profile_amount_role_unknown_with_multiple_amounts")
    if _amount_context_resolved(row, layout_profile, amount):
        warnings.append("statement_profile_row_currency_context_applied")
    if currency == "UNKNOWN":
        warnings.append("statement_profile_currency_unknown")
    if layout_profile.confidence < 0.5:
        warnings.append("statement_profile_low_confidence")
    if _looks_like_summary(row.text):
        warnings.append("statement_profile_summary_like_row")
    return warnings


def _ledger_ready(
    *,
    date_candidate: StatementDateToken | None,
    amount: _ProfiledAmount,
    currency: str,
    line_warnings: list[str],
) -> bool:
    if date_candidate is None or amount.token.amount_minor <= 0 or not currency:
        return False
    blocking = {
        "statement_profile_amount_role_unknown_with_multiple_amounts",
        "statement_profile_currency_unknown",
        "statement_profile_summary_like_row",
    }
    if any(warning in blocking for warning in line_warnings):
        return False
    return amount.role not in {
        "purchase_total",
        "plan_total",
        "pending_balance",
        "foreign_original",
    }


def _line_confidence(
    *,
    layout_profile: StatementLayoutProfile,
    amount: _ProfiledAmount,
    date_candidate: StatementDateToken | None,
    installment: StatementInstallmentToken | None,
) -> float:
    confidence = layout_profile.confidence
    if amount.role == "unknown":
        confidence = min(confidence, 0.6)
    if date_candidate is None:
        confidence = min(confidence, 0.4)
    if installment is not None and amount.role not in {
        "current_statement_amount",
        "current_installment",
    }:
        confidence = min(confidence, 0.7)
    return round(confidence, 3)


def _field_provenance(
    *,
    row: StatementRowCandidate,
    amount: _ProfiledAmount,
    date_candidate: StatementDateToken | None,
    installment: StatementInstallmentToken | None,
    original: tuple[str | None, int | None],
    ledger_ready: bool,
) -> dict[str, object]:
    return {
        "source_row_index": row.row_index,
        "source_page": row.page,
        "date_visible_text": date_candidate.visible_text if date_candidate else None,
        "amount_visible_text": amount.token.visible_text,
        "amount_role": amount.role,
        "amount_column_label": amount.column_label,
        "installment_visible_text": installment.visible_text if installment else None,
        "original_currency": original[0],
        "original_amount_minor": original[1],
        "ledger_ready": ledger_ready,
    }


def _has_multi_installment(row: StatementRowCandidate) -> bool:
    return any(
        candidate.term_total is not None and candidate.term_total > 1
        for candidate in row.installment_candidates
    )


def _row_currency_context(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
) -> _RowCurrencyContext:
    default_currency = layout_profile.default_currency or "CLP"
    local_original = _local_billing_original_currency(row.text)
    if local_original:
        return _RowCurrencyContext(
            billing_currency="CLP",
            original_currency=local_original,
            local_billing_with_original=True,
        )
    if _has_explicit_foreign_section(row):
        return _RowCurrencyContext(
            billing_currency="USD",
            original_currency="CLP",
            explicit_foreign_section=True,
        )
    return _RowCurrencyContext(billing_currency=default_currency)


def _local_billing_original_currency(text: str) -> str | None:
    match = re.search(
        r"\bCL\s+(USD|US\$|US|EUR|GBP|BRL|ARS|MXN|PEN|COP)\b",
        text,
        re.IGNORECASE,
    )
    if match is None:
        return None
    return _normalize_currency(match.group(1))


def _has_explicit_foreign_section(row: StatementRowCandidate) -> bool:
    if re.search(r"\bUS\$?\b", row.text, re.IGNORECASE):
        return True
    context = " ".join([*row.context_before, row.text, *row.context_after]).casefold()
    return any(token in context for token in _FOREIGN_SECTION_TOKENS) and any(
        _looks_like_decimal_money(candidate) for candidate in row.amount_candidates
    )


def _looks_like_decimal_money(token: StatementAmountToken) -> bool:
    visible = token.visible_text.strip().replace("$", "").replace(" ", "").lstrip("+-")
    if re.fullmatch(r"\d+[.,]\d{1,2}", visible):
        return True
    return bool(re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+[.,]\d{1,2}", visible))


def _looks_like_clp_statement_amount(token: StatementAmountToken) -> bool:
    visible = token.visible_text.strip().replace("$", "").replace(" ", "").lstrip("+-")
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", visible):
        return True
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+,\d{2}", visible):
        return token.amount_minor >= 100_000
    if re.fullmatch(r"\d+", visible):
        return token.amount_minor >= 1_000 or "$" in token.visible_text
    return False


def _amount_context_resolved(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
    amount: _ProfiledAmount,
) -> bool:
    currency_context = _row_currency_context(row, layout_profile)
    if currency_context.local_billing_with_original and _looks_like_clp_statement_amount(
        amount.token
    ):
        return True
    if currency_context.explicit_foreign_section and _looks_like_decimal_money(amount.token):
        return True
    return (
        layout_profile.default_currency == "CLP"
        and not row.currency_hints
        and len(row.amount_candidates) > 1
        and any(_looks_like_decimal_money(candidate) for candidate in row.amount_candidates)
        and _looks_like_clp_statement_amount(amount.token)
    )


def _tokens_in_column(tokens: list[Any], column: StatementColumnProfile | None) -> list[Any]:
    if column is None or column.x_min is None or column.x_max is None:
        return []
    return [
        token
        for token in tokens
        if token.x0 is not None
        and token.x1 is not None
        and _x_overlaps_column(float(token.x0), float(token.x1), column)
    ]


def _words_in_column(
    words: list[StatementWordToken],
    column: StatementColumnProfile | None,
) -> list[StatementWordToken]:
    if column is None or column.x_min is None or column.x_max is None:
        return []
    return [word for word in words if _x_overlaps_column(word.x0, word.x1, column)]


def _x_overlaps_column(x0: float, x1: float, column: StatementColumnProfile | None) -> bool:
    if column is None or column.x_min is None or column.x_max is None:
        return False
    midpoint = (x0 + x1) / 2
    return float(column.x_min) <= midpoint <= float(column.x_max)


def _parse_date(value: str) -> date | None:
    match = _DATE_RE.fullmatch(value.strip())
    if match is None:
        return None
    day = int(match.group(1))
    month = int(match.group(2))
    year = int(match.group(3))
    if year < 100:
        year += 2000
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _parse_amount_minor(value: str, *, currency_hint: str | None) -> int | None:
    cleaned = value.strip().replace("$", "").replace(" ", "")
    sign = -1 if cleaned.startswith("-") else 1
    cleaned = cleaned.lstrip("+-")
    if not cleaned:
        return None
    decimal_minor = _looks_like_decimal_minor(cleaned, currency_hint=currency_hint)
    if decimal_minor is not None:
        return sign * decimal_minor
    digits = re.sub(r"\D", "", cleaned)
    if not digits:
        return None
    return sign * int(digits)


def _looks_like_decimal_minor(value: str, *, currency_hint: str | None) -> int | None:
    if currency_hint == "CLP":
        return None
    if re.fullmatch(r"\d+[.,]\d{1,2}", value):
        whole, fraction = re.split(r"[.,]", value)
        return int(whole) * 100 + int(fraction.ljust(2, "0"))
    return None


def _token_span(
    value: str,
    words: list[StatementWordToken],
    *,
    consumed_word_indexes: set[int] | None = None,
) -> tuple[float | None, float | None]:
    normalized = value.replace(" ", "")
    for index, word in enumerate(words):
        if consumed_word_indexes is not None and index in consumed_word_indexes:
            continue
        if word.text.replace(" ", "") == normalized:
            if consumed_word_indexes is not None:
                consumed_word_indexes.add(index)
            return word.x0, word.x1
        two_words = "".join(candidate.text for candidate in words[index : index + 2])
        if (
            len(words[index : index + 2]) == 2
            and two_words.replace(" ", "") == normalized
            and (
                consumed_word_indexes is None
                or {index, index + 1}.isdisjoint(consumed_word_indexes)
            )
        ):
            if consumed_word_indexes is not None:
                consumed_word_indexes.update({index, index + 1})
            return words[index].x0, words[index + 1].x1
    return None, None


def _currency_hints(text: str) -> list[str]:
    return [_normalize_currency(match.group(0)) for match in _CURRENCY_RE.finditer(text)]


def _row_currency_hint(text: str) -> str | None:
    hints = _currency_hints(text)
    return hints[0] if hints else None


def _normalize_currency(value: str) -> str:
    normalized = value.upper()
    if normalized in {"US$", "US", "DOLAR", "DOLARES"}:
        return "USD"
    if normalized == "PESOS":
        return "CLP"
    return normalized


def _looks_like_summary(text: str) -> bool:
    lowered = text.casefold()
    if any(token in lowered for token in _ALWAYS_SUMMARY_TOKENS):
        return True
    if any(token in lowered for token in _IDENTITY_OR_CONTACT_TOKENS) and not _DATE_RE.search(text):
        return True
    if re.search(r"\*{2,}|\bx{3,}\b", lowered):
        return True
    if any(token in lowered for token in _SUMMARY_TOKENS):
        return not bool(_DATE_RE.search(text))
    return False


def _has_ambiguous_amount_values(
    row: StatementRowCandidate,
    layout_profile: StatementLayoutProfile,
) -> bool:
    values = {
        candidate.token.amount_minor
        for candidate in _profiled_amounts(row, layout_profile)
        if _has_money_like_evidence(candidate.token)
        and candidate.role not in {"purchase_total", "plan_total", "pending_balance"}
    }
    return len(values) > 1


def _clean_description(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" -:\t")


def _profile_status(value: str) -> StatementProfileEvidenceStatus:
    if value in {
        "readable",
        "password_required",
        "password_invalid",
        "extraction_failed",
        "insufficient_text_layer",
    }:
        return value  # type: ignore[return-value]
    return "extraction_failed"
