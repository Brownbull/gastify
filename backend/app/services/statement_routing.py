"""Runtime statement layout routing and deterministic PDF parsing."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING, Any

import fitz

from app.schemas.statement import (
    StatementAmountCandidate,
    StatementExtractionOutput,
    StatementInfo,
    StatementLine,
    StatementProcessingMetadata,
)

if TYPE_CHECKING:
    from pathlib import Path

KNOWN_STATEMENT_ISSUERS = {"cmr", "edwards", "scotiabank"}
DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD = 0.80

_DATE_RE = re.compile(r"^\d{2}/\d{2}/\d{4}$")
_SHORT_DATE_RE = re.compile(r"^\d{2}/\d{2}/\d{2}$")
_INSTALLMENT_RE = re.compile(r"^\d{2}/\d{2}$")
_MONEY_RE = re.compile(
    r"^-?\$?\d{1,3}(?:\.\d{3})*(?:,\d+)?$"
    r"|^\$-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$"
    r"|^-?\d+$"
)
_FOREIGN_CURRENCIES = {"USD", "EUR", "GBP", "BRL", "ARS"}
_STATEMENT_USD_MARKERS = {"US", "US$", "USD"}
_BANK_LAYOUT_ISSUERS = {"edwards", "scotiabank"}
_DESCRIPTION_X_MIN = 135
_DESCRIPTION_X_MAX = 292
_AMOUNT_X_MIN = 315
_CURRENT_AMOUNT_X_MIN = 500
_BANK_AMOUNT_X_MIN = 360
_BANK_DESCRIPTION_X_MIN = 190


@dataclass(frozen=True)
class StatementRoutingDecision:
    issuer: str | None
    parser_id: str | None
    confidence: float
    reasons: tuple[str, ...]
    fallback_required: bool

    def asdict(self) -> dict[str, Any]:
        return {
            "issuer": self.issuer,
            "parser_id": self.parser_id,
            "confidence": self.confidence,
            "reasons": list(self.reasons),
            "fallback_required": self.fallback_required,
        }


@dataclass(frozen=True)
class StatementDeterministicExtraction:
    extraction: StatementExtractionOutput
    routing: StatementRoutingDecision
    text_layer: dict[str, Any]
    layout_words: dict[str, Any]
    candidate_rows: dict[str, Any]


@dataclass(frozen=True)
class _Word:
    page: int
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    block: int
    line: int
    word: int


@dataclass(frozen=True)
class _CandidateRow:
    page: int
    row_index: int
    y0: float
    y1: float
    words: list[_Word]
    line: StatementLine | None
    warnings: list[str]
    column_evidence: dict[str, Any]


def extract_statement_with_pymupdf(
    path: Path,
    *,
    password: str | None = None,
    issuer_hint: str | None = None,
    threshold: float = DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD,
) -> StatementDeterministicExtraction:
    """Extract known credit-card statement layouts with PyMuPDF and explicit routing evidence."""
    document = fitz.open(path)
    try:
        if document.needs_pass and not document.authenticate(password or ""):
            routing = StatementRoutingDecision(
                issuer=_normalized_issuer(issuer_hint),
                parser_id=None,
                confidence=0.0,
                reasons=("password_invalid",),
                fallback_required=True,
            )
            extraction = _status_output(
                status="password_invalid",
                issuer_hint=issuer_hint,
                page_count=None,
                warnings=["password_invalid"],
            )
            return StatementDeterministicExtraction(
                extraction=extraction,
                routing=routing,
                text_layer=_empty_text_layer(status="password_invalid", page_count=None),
                layout_words=_empty_layout_words(),
                candidate_rows=_empty_candidate_rows(warnings=["password_invalid"]),
            )

        page_texts = [page.get_text("text") for page in document]
        raw_text = "\n".join(page_texts)
        words = _extract_words(document)
        routing = route_statement_layout(
            text=raw_text,
            words=words,
            issuer_hint=issuer_hint,
            threshold=threshold,
        )
        if routing.issuer is None or routing.fallback_required:
            extraction = _status_output(
                status="extraction_failed",
                issuer_hint=issuer_hint,
                page_count=document.page_count,
                warnings=[
                    "deterministic_route_fallback_required",
                    *routing.reasons,
                ],
                raw_text=raw_text,
            )
            return StatementDeterministicExtraction(
                extraction=extraction,
                routing=routing,
                text_layer=_text_layer(document=document, raw_text=raw_text),
                layout_words=_layout_words(document=document, words=words),
                candidate_rows=_empty_candidate_rows(
                    warnings=["deterministic_route_fallback_required"]
                ),
            )

        rows = _group_words_into_rows(words)
        candidate_rows = [
            _candidate_row(row_index=index, row_words=row, issuer=routing.issuer)
            for index, row in enumerate(rows, 1)
        ]
        lines = [row.line for row in candidate_rows if row.line is not None]
        for source_order, line in enumerate(lines, start=1):
            if line.source_order != source_order:
                line.source_order = source_order
        extraction_confidence = _extraction_confidence(
            lines=lines,
            candidate_rows=candidate_rows,
        )
        warnings = {
            "deterministic_pymupdf_layout_extraction",
            *[f"routing:{reason}" for reason in routing.reasons],
            *_statement_warning_lines(candidate_rows),
        }
        if extraction_confidence < threshold:
            warnings.add("deterministic_quality_gate_failed")
        processing_confidence = round(min(routing.confidence, extraction_confidence), 4)
        extraction = StatementExtractionOutput(
            pdf_status="readable",
            statement=_statement_info(
                issuer=routing.issuer,
                text=raw_text,
                lines=lines,
            ),
            lines=lines,
            processing=StatementProcessingMetadata(
                provider="codex-pdf-text",
                prompt_id=f"deterministic:pymupdf:{routing.issuer}",
                model_name="pymupdf",
                confidence=processing_confidence,
                page_count=document.page_count,
                raw_text_sha256=_sha256_text(raw_text),
                text_char_count=len(raw_text),
                text_line_count=len([line for line in raw_text.splitlines() if line.strip()]),
                warnings=sorted(warnings),
            ),
        )
        return StatementDeterministicExtraction(
            extraction=extraction,
            routing=routing,
            text_layer=_text_layer(document=document, raw_text=raw_text),
            layout_words=_layout_words(document=document, words=words),
            candidate_rows=_candidate_rows_payload(candidate_rows),
        )
    finally:
        document.close()


def route_statement_layout(
    *,
    text: str,
    words: list[_Word],
    issuer_hint: str | None = None,
    threshold: float = DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD,
) -> StatementRoutingDecision:
    """Pick the deterministic parser for a PDF text/word layer."""
    candidates = [
        _routing_candidate("cmr", text=text, words=words, issuer_hint=issuer_hint),
        _routing_candidate("edwards", text=text, words=words, issuer_hint=issuer_hint),
        _routing_candidate("scotiabank", text=text, words=words, issuer_hint=issuer_hint),
    ]
    best = max(candidates, key=lambda item: item.confidence)
    if best.confidence < threshold:
        reasons = (*best.reasons, "routing_confidence_below_threshold")
        return StatementRoutingDecision(
            issuer=best.issuer,
            parser_id=best.parser_id,
            confidence=best.confidence,
            reasons=tuple(dict.fromkeys(reasons)),
            fallback_required=True,
        )
    return StatementRoutingDecision(
        issuer=best.issuer,
        parser_id=best.parser_id,
        confidence=best.confidence,
        reasons=best.reasons,
        fallback_required=False,
    )


def deterministic_quality_passed(
    extraction: StatementExtractionOutput,
    routing: StatementRoutingDecision,
    *,
    threshold: float = DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD,
) -> bool:
    """Return whether deterministic extraction is strong enough to avoid Gemini fallback."""
    if routing.fallback_required:
        return False
    if extraction.pdf_status != "readable" or not extraction.lines:
        return False
    if (extraction.processing.confidence or 0.0) < threshold:
        return False
    return "deterministic_quality_gate_failed" not in extraction.processing.warnings


def _routing_candidate(
    issuer: str,
    *,
    text: str,
    words: list[_Word],
    issuer_hint: str | None,
) -> StatementRoutingDecision:
    normalized = text.casefold()
    hint = _normalized_issuer(issuer_hint)
    score = 0.0
    reasons: list[str] = []
    if hint == issuer:
        score += 0.55
        reasons.append("issuer_hint_match")

    if issuer == "cmr":
        if "cmr" in normalized:
            score += 0.35
            reasons.append("cmr_text_marker")
        if "falabella" in normalized:
            score += 0.20
            reasons.append("falabella_text_marker")
        if "período facturado" in normalized or "periodo facturado" in normalized:
            score += 0.15
            reasons.append("cmr_period_marker")
        if _has_cmr_row_signature(words):
            score += 0.30
            reasons.append("cmr_coordinate_signature")
    elif issuer == "edwards":
        if "edwards" in normalized:
            score += 0.45
            reasons.append("edwards_text_marker")
        if "banco de chile" in normalized:
            score += 0.15
            reasons.append("banco_de_chile_marker")
        if _has_bank_row_signature(words):
            score += 0.25
            reasons.append("bank_coordinate_signature")
        if "mastercard" in normalized or "visa" in normalized:
            score += 0.10
            reasons.append("bank_card_network_marker")
    else:
        if "scotiabank" in normalized:
            score += 0.55
            reasons.append("scotiabank_text_marker")
        if _has_bank_row_signature(words):
            score += 0.25
            reasons.append("bank_coordinate_signature")
        if "mastercard" in normalized or "visa" in normalized:
            score += 0.10
            reasons.append("bank_card_network_marker")

    confidence = round(min(score, 1.0), 4)
    return StatementRoutingDecision(
        issuer=issuer,
        parser_id=f"pymupdf:{issuer}",
        confidence=confidence,
        reasons=tuple(reasons or ["no_known_layout_signature"]),
        fallback_required=confidence < DEFAULT_DETERMINISTIC_ROUTING_THRESHOLD,
    )


def _has_cmr_row_signature(words: list[_Word]) -> bool:
    for row in _group_words_into_rows(words):
        has_date = any(85 <= word.x0 <= 125 and _DATE_RE.match(word.text) for word in row)
        has_amount = any(word.x0 >= _AMOUNT_X_MIN and _is_money(word.text) for word in row)
        if has_date and has_amount:
            return True
    return False


def _has_bank_row_signature(words: list[_Word]) -> bool:
    for row in _group_words_into_rows(words):
        has_date = any(
            90 <= word.x0 <= 190
            and (_DATE_RE.match(word.text) or _SHORT_DATE_RE.match(word.text))
            for word in row
        )
        has_amount = any(word.x0 >= _BANK_AMOUNT_X_MIN and _is_money(word.text) for word in row)
        if has_date and has_amount:
            return True
    return False


def _normalized_issuer(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().casefold()
    if normalized in KNOWN_STATEMENT_ISSUERS:
        return normalized
    if "cmr" in normalized or "falabella" in normalized:
        return "cmr"
    if "edwards" in normalized:
        return "edwards"
    if "scotia" in normalized:
        return "scotiabank"
    return None


def _extract_words(document: fitz.Document) -> list[_Word]:
    words: list[_Word] = []
    for page_index, page in enumerate(document, start=1):
        for item in page.get_text("words", sort=True):
            x0, y0, x1, y1, text, block, line, word = item
            words.append(
                _Word(
                    page=page_index,
                    x0=float(x0),
                    y0=float(y0),
                    x1=float(x1),
                    y1=float(y1),
                    text=str(text),
                    block=int(block),
                    line=int(line),
                    word=int(word),
                )
            )
    return words


def _group_words_into_rows(words: list[_Word]) -> list[list[_Word]]:
    rows: list[list[_Word]] = []
    current: list[_Word] = []
    current_page: int | None = None
    current_y: float | None = None
    for word in sorted(words, key=lambda item: (item.page, item.y0, item.x0)):
        if current_page != word.page or current_y is None or abs(word.y0 - current_y) > 3.0:
            if current:
                rows.append(sorted(current, key=lambda item: item.x0))
            current = [word]
            current_page = word.page
            current_y = word.y0
            continue
        current.append(word)
        current_y = (current_y + word.y0) / 2
    if current:
        rows.append(sorted(current, key=lambda item: item.x0))
    return rows


def _candidate_row(
    *,
    row_index: int,
    row_words: list[_Word],
    issuer: str,
) -> _CandidateRow:
    if issuer in _BANK_LAYOUT_ISSUERS:
        return _bank_candidate_row(row_index=row_index, row_words=row_words, issuer=issuer)
    return _cmr_candidate_row(row_index=row_index, row_words=row_words)


def _cmr_candidate_row(*, row_index: int, row_words: list[_Word]) -> _CandidateRow:
    warnings: list[str] = []
    date_word = _transaction_date_word(row_words)
    if date_word is None:
        return _row(row_index=row_index, row_words=row_words, line=None, warnings=[])
    amount_words = [word for word in row_words if word.x0 >= _AMOUNT_X_MIN and _is_money(word.text)]
    installment_word = next((word for word in row_words if _INSTALLMENT_RE.match(word.text)), None)
    if not amount_words:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["transaction_date_without_amount_cells"],
        )
    selected = _selected_amount_word(amount_words=amount_words, installment_word=installment_word)
    if selected is None:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["no_selectable_amount_cell"],
        )
    date_value = _parse_date(date_word.text)
    if date_value is None:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["invalid_transaction_date"],
        )
    description, original_currency, original_amount_minor = _description_and_foreign(
        words=[
            word
            for word in row_words
            if word.x0 > date_word.x1 and _DESCRIPTION_X_MIN <= word.x0 < _DESCRIPTION_X_MAX
        ]
    )
    if not description:
        warnings.append("missing_description")
        description = "Unknown statement line"
    selected_amount = _parse_money(selected.text, currency="CLP")
    if selected_amount is None:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["selected_amount_parse_failed"],
        )
    line_type = _line_type(description=description, amount_minor=selected_amount)
    amount_candidates = _amount_candidates(
        selected=selected,
        amount_words=amount_words,
        installment_word=installment_word,
    )
    selected_label = _amount_column_label(selected, installment_word=installment_word)
    line = StatementLine(
        source_order=_candidate_source_order(row_index),
        row_type=line_type,
        date=date_value,
        description=description,
        amount_minor=selected_amount,
        currency="CLP",
        line_type=line_type,
        installment=installment_word.text if installment_word else None,
        original_currency=original_currency,
        original_amount_minor=original_amount_minor,
        card_alias_candidate="CMR",
        category_key="Other",
        amount_selection_reason=_amount_selection_reason(
            selected=selected,
            installment_word=installment_word,
            amount_words=amount_words,
        ),
        amount_candidates=amount_candidates,
        ledger_ready=_deterministic_ledger_ready(
            date_value=date_value,
            amount_minor=selected_amount,
            currency="CLP",
            amount_candidates=amount_candidates,
            warnings=warnings,
        ),
        confidence=_deterministic_line_confidence(warnings=warnings),
        warnings=warnings,
        source_row_index=row_index,
        source_page=row_words[0].page if row_words else None,
        field_provenance=_deterministic_field_provenance(
            row_index=row_index,
            page=row_words[0].page if row_words else None,
            parser_id="pymupdf:cmr",
            date_word=date_word,
            selected_word=selected,
            selected_role=_selected_amount_role(amount_candidates, selected_amount),
            selected_label=selected_label,
            installment_word=installment_word,
            column_evidence={
                "description_x_range": [_DESCRIPTION_X_MIN, _DESCRIPTION_X_MAX],
                "amount_x_min": _AMOUNT_X_MIN,
                "current_amount_x_min": _CURRENT_AMOUNT_X_MIN,
            },
        ),
    )
    return _row(
        row_index=row_index,
        row_words=row_words,
        line=line,
        warnings=warnings,
        column_evidence={
            "date_x0": round(date_word.x0, 2),
            "description_x_range": [_DESCRIPTION_X_MIN, _DESCRIPTION_X_MAX],
            "amount_x_min": _AMOUNT_X_MIN,
            "current_amount_x_min": _CURRENT_AMOUNT_X_MIN,
            "selected_amount_x0": round(selected.x0, 2),
            "installment_x0": round(installment_word.x0, 2) if installment_word else None,
        },
    )


def _bank_candidate_row(
    *,
    row_index: int,
    row_words: list[_Word],
    issuer: str,
) -> _CandidateRow:
    warnings: list[str] = []
    date_word = _bank_transaction_date_word(row_words)
    if date_word is None:
        return _row(row_index=row_index, row_words=row_words, line=None, warnings=[])
    amount_words = [
        word for word in row_words if word.x0 >= _BANK_AMOUNT_X_MIN and _is_money(word.text)
    ]
    if not amount_words:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["transaction_date_without_amount_cells"],
        )
    installment_word = next((word for word in row_words if _INSTALLMENT_RE.match(word.text)), None)
    currency = _bank_line_currency(row_words)
    selected = _bank_selected_amount_word(
        amount_words=amount_words,
        installment_word=installment_word,
        currency=currency,
    )
    if selected is None:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["no_selectable_amount_cell"],
        )
    date_value = _parse_statement_date(date_word.text)
    if date_value is None:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["invalid_transaction_date"],
        )
    first_amount_x = min(word.x0 for word in amount_words)
    description = _bank_description(
        row_words=row_words,
        date_word=date_word,
        first_amount_x=first_amount_x,
    )
    if not description:
        warnings.append("missing_description")
        description = "Unknown statement line"
    selected_amount = _parse_bank_amount(selected.text, currency=currency)
    if selected_amount is None:
        return _row(
            row_index=row_index,
            row_words=row_words,
            line=None,
            warnings=["selected_amount_parse_failed"],
        )
    original_currency, original_amount_minor = _bank_original_amount(
        amount_words=amount_words,
        selected=selected,
        currency=currency,
    )
    line_type = _line_type(description=description, amount_minor=selected_amount)
    amount_candidates = _bank_amount_candidates(
        selected=selected,
        amount_words=amount_words,
        installment_word=installment_word,
        currency=currency,
    )
    selected_label = _bank_amount_column_label(
        selected,
        selected=selected,
        installment_word=installment_word,
        currency=currency,
    )
    line = StatementLine(
        source_order=_candidate_source_order(row_index),
        row_type=line_type,
        date=date_value,
        description=description,
        amount_minor=selected_amount,
        currency=currency,
        line_type=line_type,
        installment=installment_word.text if installment_word else None,
        original_currency=original_currency,
        original_amount_minor=original_amount_minor,
        card_alias_candidate=_card_alias_for_issuer(issuer),
        category_key="Other",
        amount_selection_reason=_bank_amount_selection_reason(
            selected=selected,
            installment_word=installment_word,
            currency=currency,
            amount_words=amount_words,
        ),
        amount_candidates=amount_candidates,
        ledger_ready=_deterministic_ledger_ready(
            date_value=date_value,
            amount_minor=selected_amount,
            currency=currency,
            amount_candidates=amount_candidates,
            warnings=warnings,
        ),
        confidence=_deterministic_line_confidence(warnings=warnings),
        warnings=warnings,
        source_row_index=row_index,
        source_page=row_words[0].page if row_words else None,
        field_provenance=_deterministic_field_provenance(
            row_index=row_index,
            page=row_words[0].page if row_words else None,
            parser_id=f"pymupdf:{issuer}",
            date_word=date_word,
            selected_word=selected,
            selected_role=_selected_amount_role(amount_candidates, selected_amount),
            selected_label=selected_label,
            installment_word=installment_word,
            column_evidence={
                "description_x_min": _BANK_DESCRIPTION_X_MIN,
                "first_amount_x0": round(first_amount_x, 2),
                "amount_x_min": _BANK_AMOUNT_X_MIN,
                "currency": currency,
            },
        ),
    )
    return _row(
        row_index=row_index,
        row_words=row_words,
        line=line,
        warnings=warnings,
        column_evidence={
            "date_x0": round(date_word.x0, 2),
            "description_x_min": _BANK_DESCRIPTION_X_MIN,
            "first_amount_x0": round(first_amount_x, 2),
            "amount_x_min": _BANK_AMOUNT_X_MIN,
            "selected_amount_x0": round(selected.x0, 2),
            "installment_x0": round(installment_word.x0, 2) if installment_word else None,
            "currency": currency,
        },
    )


def _row(
    *,
    row_index: int,
    row_words: list[_Word],
    line: StatementLine | None,
    warnings: list[str],
    column_evidence: dict[str, Any] | None = None,
) -> _CandidateRow:
    return _CandidateRow(
        page=row_words[0].page if row_words else 0,
        row_index=row_index,
        y0=min((word.y0 for word in row_words), default=0.0),
        y1=max((word.y1 for word in row_words), default=0.0),
        words=row_words,
        line=line,
        warnings=warnings,
        column_evidence=column_evidence or {},
    )


def _transaction_date_word(words: list[_Word]) -> _Word | None:
    candidates = [word for word in words if 85 <= word.x0 <= 125 and _DATE_RE.match(word.text)]
    return candidates[0] if candidates else None


def _bank_transaction_date_word(words: list[_Word]) -> _Word | None:
    candidates = [
        word
        for word in words
        if 90 <= word.x0 <= 190
        and (_DATE_RE.match(word.text) or _SHORT_DATE_RE.match(word.text))
    ]
    return candidates[0] if candidates else None


def _selected_amount_word(
    *,
    amount_words: list[_Word],
    installment_word: _Word | None,
) -> _Word | None:
    if installment_word is not None:
        right_of_installment = [word for word in amount_words if word.x0 >= _CURRENT_AMOUNT_X_MIN]
        if right_of_installment:
            return max(right_of_installment, key=lambda word: word.x0)
    non_zero = [
        word for word in amount_words if (_parse_money(word.text, currency="CLP") or 0) != 0
    ]
    if non_zero:
        return max(
            non_zero,
            key=lambda word: abs(_parse_money(word.text, currency="CLP") or 0),
        )
    return amount_words[-1] if amount_words else None


def _bank_selected_amount_word(
    *,
    amount_words: list[_Word],
    installment_word: _Word | None,
    currency: str,
) -> _Word | None:
    if currency == "USD":
        return max(amount_words, key=lambda word: word.x0) if amount_words else None
    if installment_word is not None:
        right_of_installment = [word for word in amount_words if word.x0 > installment_word.x1]
        if right_of_installment:
            return max(right_of_installment, key=lambda word: word.x0)
    return _selected_amount_word(amount_words=amount_words, installment_word=installment_word)


def _bank_line_currency(words: list[_Word]) -> str:
    if any(word.text.upper() in _STATEMENT_USD_MARKERS for word in words):
        return "USD"
    if any("dolar" in word.text.casefold() for word in words):
        return "USD"
    return "CLP"


def _bank_description(
    *,
    row_words: list[_Word],
    date_word: _Word,
    first_amount_x: float,
) -> str:
    description_words = [
        word.text
        for word in row_words
        if word.x0 > date_word.x1
        and _BANK_DESCRIPTION_X_MIN <= word.x0 < first_amount_x
        and word.text.upper() not in _STATEMENT_USD_MARKERS
        and word.text != "$"
    ]
    return " ".join(description_words).strip()


def _bank_original_amount(
    *,
    amount_words: list[_Word],
    selected: _Word,
    currency: str,
) -> tuple[str | None, int | None]:
    if not amount_words:
        return None, None
    first = min(amount_words, key=lambda word: word.x0)
    if currency == "USD":
        if len(amount_words) == 1:
            return None, None
        return "CLP", _parse_bank_amount(first.text, currency="CLP")
    return None, _parse_bank_amount(first.text, currency="CLP")


def _bank_amount_candidates(
    *,
    selected: _Word,
    amount_words: list[_Word],
    installment_word: _Word | None,
    currency: str,
) -> list[StatementAmountCandidate]:
    candidates: list[StatementAmountCandidate] = []
    selected_amount = _parse_bank_amount(selected.text, currency=currency)
    if selected_amount is not None:
        selected_label = _bank_amount_column_label(
            selected,
            selected=selected,
            installment_word=installment_word,
            currency=currency,
        )
        candidates.append(
            StatementAmountCandidate(
                role="selected",
                amount_minor=selected_amount,
                currency=currency,
                visible_text=selected.text,
                column_label=selected_label,
            )
        )
        candidates.append(
            StatementAmountCandidate(
                role=(
                    "current_installment"
                    if installment_word is not None and currency == "CLP"
                    else "current_statement_amount"
                ),
                amount_minor=selected_amount,
                currency=currency,
                visible_text=selected.text,
                column_label=selected_label,
            )
        )
    for word in amount_words:
        if word is selected:
            continue
        amount_currency = "CLP" if currency == "USD" else currency
        amount = _parse_bank_amount(word.text, currency=amount_currency)
        if amount is None:
            continue
        candidates.append(
            StatementAmountCandidate(
                role=_bank_unselected_amount_role(
                    word,
                    selected=selected,
                    installment_word=installment_word,
                    currency=currency,
                ),
                amount_minor=amount,
                currency=amount_currency,
                visible_text=word.text,
                column_label=_bank_amount_column_label(
                    word,
                    selected=selected,
                    installment_word=installment_word,
                    currency=currency,
                ),
            )
        )
    return candidates


def _bank_unselected_amount_role(
    word: _Word,
    *,
    selected: _Word,
    installment_word: _Word | None,
    currency: str,
) -> str:
    if currency == "USD":
        return "foreign_original"
    if installment_word is not None and word.x0 < selected.x0:
        return "purchase_total" if word.x0 < 450 else "plan_total"
    return "unknown"


def _bank_amount_column_label(
    word: _Word,
    *,
    selected: _Word,
    installment_word: _Word | None,
    currency: str,
) -> str:
    if currency == "USD":
        return "USD amount" if word is selected else "CLP reference amount"
    if installment_word is not None and word.x0 > installment_word.x1:
        return "current statement amount"
    if installment_word is not None and word.x0 < selected.x0:
        return "purchase/plan amount"
    return "statement amount"


def _bank_amount_selection_reason(
    *,
    selected: _Word,
    installment_word: _Word | None,
    currency: str,
    amount_words: list[_Word],
) -> str:
    if currency == "USD":
        return "selected rightmost foreign-currency statement amount"
    if installment_word is not None and selected.x0 > installment_word.x1:
        return "selected amount to the right of visible installment marker"
    if len(amount_words) == 1:
        return "selected only visible amount cell"
    return "selected statement amount cell from issuer-specific coordinates"


def _description_and_foreign(words: list[_Word]) -> tuple[str, str | None, int | None]:
    description_words: list[str] = []
    original_currency: str | None = None
    original_amount_minor: int | None = None
    index = 0
    while index < len(words):
        text = words[index].text
        upper = text.upper()
        if upper == "CL" and index + 2 < len(words):
            possible_currency = words[index + 1].text.upper()
            possible_amount = words[index + 2].text
            if possible_currency in _FOREIGN_CURRENCIES:
                parsed = _parse_money(possible_amount, currency=possible_currency)
                if parsed is not None:
                    original_currency = possible_currency
                    original_amount_minor = parsed
                    index += 3
                    continue
        if upper in _FOREIGN_CURRENCIES and index + 1 < len(words):
            parsed = _parse_money(words[index + 1].text, currency=upper)
            if parsed is not None:
                original_currency = upper
                original_amount_minor = parsed
                index += 2
                continue
        description_words.append(text)
        index += 1
    return " ".join(description_words).strip(), original_currency, original_amount_minor


def _amount_candidates(
    *,
    selected: _Word,
    amount_words: list[_Word],
    installment_word: _Word | None,
) -> list[StatementAmountCandidate]:
    candidates: list[StatementAmountCandidate] = []
    selected_amount = _parse_money(selected.text, currency="CLP")
    if selected_amount is not None:
        selected_label = _amount_column_label(selected, installment_word=installment_word)
        candidates.append(
            StatementAmountCandidate(
                role="selected",
                amount_minor=selected_amount,
                currency="CLP",
                visible_text=selected.text,
                column_label=selected_label,
            )
        )
        candidates.append(
            StatementAmountCandidate(
                role=(
                    "current_installment"
                    if _fixed_term_parts(installment_word)
                    else "current_statement_amount"
                ),
                amount_minor=selected_amount,
                currency="CLP",
                visible_text=selected.text,
                column_label=selected_label,
            )
        )
    for word in amount_words:
        if word is selected:
            continue
        amount = _parse_money(word.text, currency="CLP")
        if amount is None:
            continue
        candidates.append(
            StatementAmountCandidate(
                role=_unselected_amount_role(word, installment_word=installment_word),
                amount_minor=amount,
                currency="CLP",
                visible_text=word.text,
                column_label=_amount_column_label(word, installment_word=installment_word),
            )
        )
    return candidates


def _unselected_amount_role(word: _Word, *, installment_word: _Word | None) -> str:
    parts = _fixed_term_parts(installment_word)
    if parts and word.x0 < _CURRENT_AMOUNT_X_MIN:
        return "purchase_total" if word.x0 < 370 else "plan_total"
    return "unknown"


def _amount_column_label(word: _Word, *, installment_word: _Word | None) -> str:
    if word.x0 >= _CURRENT_AMOUNT_X_MIN:
        return "current statement amount"
    if installment_word is not None and word.x0 < _CURRENT_AMOUNT_X_MIN:
        return "purchase/plan amount"
    return "statement amount"


def _amount_selection_reason(
    *,
    selected: _Word,
    installment_word: _Word | None,
    amount_words: list[_Word],
) -> str:
    if installment_word is not None and selected.x0 >= _CURRENT_AMOUNT_X_MIN:
        return "selected rightmost current cuota/current statement amount column"
    if len(amount_words) == 1:
        return "selected only visible amount cell"
    return "selected non-zero statement amount cell from explicit row coordinates"


def _line_type(*, description: str, amount_minor: int) -> str:
    normalized = description.casefold()
    if amount_minor < 0 and "pago" in normalized:
        return "payment"
    if amount_minor < 0:
        return "adjustment"
    if (
        "comision" in normalized
        or "mantencion" in normalized
        or "administracion mensual" in normalized
    ):
        return "fee"
    if (
        "metlife" in normalized
        or "vida chilena" in normalized
        or "vida security" in normalized
        or "seg auto" in normalized
        or "desgravamen" in normalized
        or "cesantia" in normalized
    ):
        return "insurance"
    return "charge"


def _card_alias_for_issuer(issuer: str) -> str:
    if issuer == "edwards":
        return "Banco Edwards"
    if issuer == "scotiabank":
        return "Scotiabank"
    return issuer.upper()


def _statement_info(
    *,
    issuer: str,
    text: str,
    lines: list[StatementLine],
) -> StatementInfo:
    compact = " ".join(text.split())
    period = re.search(
        r"Per[ií]odo Facturado\s+(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})",
        compact,
        re.IGNORECASE,
    )
    closing = re.search(
        r"Fecha Facturaci[oó]n Estado de Cuenta:\s+(\d{2}/\d{2}/\d{4})",
        compact,
        re.IGNORECASE,
    )
    due = re.search(r"Pagar Hasta\s+(\d{2}/\d{2}/\d{4})", compact, re.IGNORECASE)
    total = re.search(
        r"Monto Total Facturado a Pagar\s+\$?([0-9.]+)",
        compact,
        re.IGNORECASE,
    )
    total_debit = _parse_money(total.group(1), currency="CLP") if total else None
    payment_total = abs(
        sum(
            line.amount_minor
            for line in lines
            if line.line_type == "payment" and line.amount_minor < 0
        )
    )
    return StatementInfo(
        issuer=issuer,
        period_start=_parse_date(period.group(1)) if period else None,
        period_end=_parse_date(period.group(2)) if period else None,
        closing_date=_parse_date(closing.group(1)) if closing else None,
        due_date=_parse_date(due.group(1)) if due else None,
        currency="CLP",
        total_debit_minor=total_debit,
        total_credit_minor=payment_total or None,
        payment_due_minor=total_debit,
        card_alias_candidate="CMR" if issuer == "cmr" else issuer.upper(),
    )


def _status_output(
    *,
    status: str,
    issuer_hint: str | None,
    page_count: int | None,
    warnings: list[str],
    raw_text: str = "",
) -> StatementExtractionOutput:
    return StatementExtractionOutput(
        pdf_status=status,
        statement=StatementInfo(issuer=_normalized_issuer(issuer_hint) or issuer_hint),
        lines=[],
        processing=StatementProcessingMetadata(
            provider="codex-pdf-text",
            prompt_id="deterministic:pymupdf",
            model_name="pymupdf",
            confidence=0.0,
            page_count=page_count,
            raw_text_sha256=_sha256_text(raw_text) if raw_text else None,
            text_char_count=len(raw_text),
            text_line_count=len([line for line in raw_text.splitlines() if line.strip()]),
            warnings=warnings,
        ),
    )


def _extraction_confidence(
    *,
    lines: list[StatementLine],
    candidate_rows: list[_CandidateRow],
) -> float:
    candidate_count = sum(1 for row in candidate_rows if row.line is not None or row.warnings)
    if not candidate_count:
        return 0.0
    return round(min(len(lines) / candidate_count, 1.0), 4)


def _statement_warning_lines(candidate_rows: list[_CandidateRow]) -> list[str]:
    warnings: set[str] = set()
    for row in candidate_rows:
        warnings.update(row.warnings)
    if not any(row.line is not None for row in candidate_rows):
        warnings.add("no_normalized_statement_lines")
    return sorted(warnings)


def _deterministic_ledger_ready(
    *,
    date_value: date | None,
    amount_minor: int,
    currency: str,
    amount_candidates: list[StatementAmountCandidate],
    warnings: list[str],
) -> bool:
    if date_value is None or amount_minor == 0 or not currency:
        return False
    blocking_warnings = {
        "selected_amount_parse_failed",
        "invalid_transaction_date",
        "no_selectable_amount_cell",
    }
    if any(warning in blocking_warnings for warning in warnings):
        return False
    selected_abs = abs(amount_minor)
    safe_roles = {"selected", "current_statement_amount", "current_installment"}
    return any(
        candidate.role in safe_roles and abs(candidate.amount_minor) == selected_abs
        for candidate in amount_candidates
    )


def _deterministic_line_confidence(*, warnings: list[str]) -> float:
    if not warnings:
        return 0.98
    if warnings == ["missing_description"]:
        return 0.9
    return 0.85


def _selected_amount_role(
    amount_candidates: list[StatementAmountCandidate],
    amount_minor: int,
) -> str | None:
    selected_abs = abs(amount_minor)
    preferred_roles = ("current_installment", "current_statement_amount", "selected")
    for role in preferred_roles:
        if any(
            candidate.role == role and abs(candidate.amount_minor) == selected_abs
            for candidate in amount_candidates
        ):
            return role
    return None


def _deterministic_field_provenance(
    *,
    row_index: int,
    page: int | None,
    parser_id: str,
    date_word: _Word,
    selected_word: _Word,
    selected_role: str | None,
    selected_label: str | None,
    installment_word: _Word | None,
    column_evidence: dict[str, Any],
) -> dict[str, object]:
    return {
        "source": "deterministic_pymupdf_known_layout",
        "parser_id": parser_id,
        "source_row_index": row_index,
        "source_page": page,
        "date_visible_text": date_word.text,
        "date_x0": round(date_word.x0, 2),
        "amount_visible_text": selected_word.text,
        "amount_role": selected_role,
        "amount_column_label": selected_label,
        "amount_x0": round(selected_word.x0, 2),
        "installment_visible_text": installment_word.text if installment_word else None,
        "installment_x0": round(installment_word.x0, 2) if installment_word else None,
        "column_evidence": column_evidence,
    }


def _text_layer(*, document: fitz.Document, raw_text: str) -> dict[str, Any]:
    return {
        "extractor": "pymupdf",
        "pdf_status": "readable",
        "page_count": document.page_count,
        "text_char_count": len(raw_text),
        "text_line_count": len([line for line in raw_text.splitlines() if line.strip()]),
        "raw_text_sha256": _sha256_text(raw_text),
        "contains_raw_statement_text": False,
    }


def _layout_words(*, document: fitz.Document, words: list[_Word]) -> dict[str, Any]:
    return {
        "extractor": "pymupdf",
        "contains_raw_statement_text": True,
        "word_count": len(words),
        "pages": [
            {
                "page": page_number,
                "word_count": sum(1 for word in words if word.page == page_number),
            }
            for page_number in range(1, document.page_count + 1)
        ],
        "words": [_word_payload(word) for word in words],
    }


def _candidate_rows_payload(candidate_rows: list[_CandidateRow]) -> dict[str, Any]:
    return {
        "extractor": "pymupdf",
        "row_grouping": "page_then_y_coordinate_threshold",
        "candidate_row_count": len(candidate_rows),
        "normalized_line_count": sum(1 for row in candidate_rows if row.line is not None),
        "rows": [_candidate_row_payload(row) for row in candidate_rows if row.line is not None],
        "rejected_rows": [
            _candidate_row_payload(row)
            for row in candidate_rows
            if row.line is None and row.warnings
        ][:50],
    }


def _empty_text_layer(*, status: str, page_count: int | None) -> dict[str, Any]:
    return {
        "extractor": "pymupdf",
        "pdf_status": status,
        "page_count": page_count,
        "text_char_count": 0,
        "text_line_count": 0,
        "raw_text_sha256": None,
        "contains_raw_statement_text": False,
    }


def _empty_layout_words() -> dict[str, Any]:
    return {
        "extractor": "pymupdf",
        "word_count": 0,
        "words": [],
        "contains_raw_statement_text": False,
        "warnings": ["layout_words_not_available"],
    }


def _empty_candidate_rows(*, warnings: list[str] | None = None) -> dict[str, Any]:
    return {
        "extractor": "pymupdf",
        "candidate_row_count": 0,
        "normalized_line_count": 0,
        "rows": [],
        "rejected_rows": [],
        "warnings": warnings or [],
    }


def _word_payload(word: _Word) -> dict[str, Any]:
    return {
        "page": word.page,
        "x0": round(word.x0, 2),
        "y0": round(word.y0, 2),
        "x1": round(word.x1, 2),
        "y1": round(word.y1, 2),
        "text": word.text,
        "block": word.block,
        "line": word.line,
        "word": word.word,
    }


def _candidate_row_payload(row: _CandidateRow) -> dict[str, Any]:
    payload = {
        "page": row.page,
        "row_index": row.row_index,
        "y0": round(row.y0, 2),
        "y1": round(row.y1, 2),
        "text": " ".join(word.text for word in row.words),
        "warnings": row.warnings,
        "column_evidence": row.column_evidence,
    }
    if row.line is not None:
        payload["line"] = row.line.model_dump(mode="json")
    return payload


def _parse_date(value: str) -> date | None:
    try:
        day, month, year = value.split("/")
        return date(int(year), int(month), int(day))
    except (ValueError, TypeError):
        return None


def _parse_statement_date(value: str) -> date | None:
    if _DATE_RE.match(value):
        return _parse_date(value)
    if _SHORT_DATE_RE.match(value):
        try:
            day, month, year = value.split("/")
            return date(2000 + int(year), int(month), int(day))
        except (ValueError, TypeError):
            return None
    return None


def _parse_money(value: str, *, currency: str) -> int | None:
    text = value.strip().replace("$", "").replace(" ", "")
    if not text:
        return None
    sign = -1 if text.startswith("-") else 1
    text = text.lstrip("-")
    if currency == "CLP":
        digits = text.replace(".", "").replace(",", "")
        return sign * int(digits) if digits.isdigit() else None
    try:
        decimal = Decimal(text.replace(".", "").replace(",", "."))
    except InvalidOperation:
        return None
    return sign * int((decimal * 100).quantize(Decimal("1")))


def _parse_bank_amount(value: str, *, currency: str) -> int | None:
    return _parse_money(value, currency=currency)


def _is_money(value: str) -> bool:
    return bool(_MONEY_RE.match(value.strip()))


def _fixed_term_parts(word: _Word | None) -> tuple[int, int] | None:
    if word is None:
        return None
    try:
        current, total = word.text.split("/")
        return int(current), int(total)
    except (ValueError, AttributeError):
        return None


def _candidate_source_order(row_index: int) -> int:
    return max(row_index, 1)


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
