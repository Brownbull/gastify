"""Deterministic statement PDF extraction experiments for prompt-lab evidence."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING, Any, Literal

from app.prompt_lab.paths import LATEST_RESULTS_ROOT, ensure_workspace
from app.prompt_lab.run_ids import next_serial_run_id
from app.prompt_lab.statement.cache import sha256_file
from app.prompt_lab.statement.cases import (
    StatementCase,
    extract_statement_text,
    inspect_pdf,
    load_issuer_password,
)
from app.prompt_lab.statement.provenance import build_statement_field_provenance
from app.prompt_lab.statement.report import (
    _line_differences,
    _load_receipt_transactions_snapshot,
    _simulate_reconciliation,
    _transactions_for_case,
)
from app.prompt_lab.statement.scoring import score_statement_output
from app.schemas.statement import (
    StatementAmountCandidate,
    StatementAmountRole,
    StatementExtractionOutput,
    StatementInfo,
    StatementLine,
    StatementLineType,
    StatementProcessingMetadata,
)
from app.services.statement_routing import extract_statement_with_pymupdf

if TYPE_CHECKING:
    from pathlib import Path

    import fitz  # type: ignore[import-untyped]

StatementDeterministicExtractor = Literal["pypdf", "pymupdf"]
DeterministicOutput = tuple[
    StatementExtractionOutput,
    dict[str, Any],
    dict[str, Any],
    dict[str, Any],
    dict[str, Any],
]

_DATE_RE = re.compile(r"^\d{2}/\d{2}/\d{4}$")
_SHORT_DATE_RE = re.compile(r"^\d{2}/\d{2}/\d{2}$")
_INSTALLMENT_RE = re.compile(r"^\d{2}/\d{2}$")
_MONEY_RE = re.compile(r"^-?\$?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+$")
_FOREIGN_CURRENCIES = {"USD", "EUR", "GBP", "BRL", "ARS"}
_STATEMENT_USD_MARKERS = {"US", "US$", "USD"}
_BANK_LAYOUT_ISSUERS = {"edwards", "scotiabank"}
_TRANSACTION_CODE_X_MIN = 292
_DESCRIPTION_X_MIN = 135
_DESCRIPTION_X_MAX = 292
_AMOUNT_X_MIN = 315
_CURRENT_AMOUNT_X_MIN = 500
_BANK_AMOUNT_X_MIN = 360
_BANK_DESCRIPTION_X_MIN = 190


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


async def run_statement_deterministic_case(
    case: StatementCase,
    *,
    extractors: list[StatementDeterministicExtractor],
    credentials_root: Path | None = None,
    results_root: Path = LATEST_RESULTS_ROOT,
    run_id: str | None = None,
    artifact_dir: Path | None = None,
    transaction_scope_firebase_uid: str | None = None,
) -> list[dict[str, Any]]:
    """Run deterministic extractor variants for one statement case."""
    ensure_workspace()
    if artifact_dir is not None and len(extractors) != 1:
        raise ValueError("artifact_dir can only be used with exactly one deterministic extractor")
    packets: list[dict[str, Any]] = []
    for extractor in extractors:
        packet = await _run_extractor(
            case,
            extractor=extractor,
            credentials_root=credentials_root,
            results_root=results_root,
            run_id=run_id,
            artifact_dir=artifact_dir,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
        )
        packets.append(packet)
    return packets


async def _run_extractor(
    case: StatementCase,
    *,
    extractor: StatementDeterministicExtractor,
    credentials_root: Path | None,
    results_root: Path,
    run_id: str | None,
    artifact_dir: Path | None,
    transaction_scope_firebase_uid: str | None,
) -> dict[str, Any]:
    expected = _load_expected(case)
    password = _password_for_case(case, credentials_root)
    pdf_input = _pdf_input(case, password=password)
    if pdf_input["status"] != "readable":
        processed = _status_output(case, pdf_input, extractor=extractor)
        raw_output = _raw_output(
            extractor=extractor,
            provider_call="skipped",
            extraction=processed,
            status=str(pdf_input["status"]),
            notes=["pdf_preflight_not_readable"],
        )
        text_layer = _empty_text_layer(extractor=extractor, pdf_input=pdf_input)
        layout_words: dict[str, Any] = _empty_layout_words(extractor=extractor)
        candidate_rows: dict[str, Any] = _empty_candidate_rows(extractor=extractor)
    elif extractor == "pypdf":
        processed, raw_output, text_layer, layout_words, candidate_rows = _pypdf_output(
            case,
            credentials_root=credentials_root,
        )
    else:
        processed, raw_output, text_layer, layout_words, candidate_rows = _pymupdf_output(
            case,
            password=password,
            pdf_input=pdf_input,
        )

    score = _score(expected=expected, actual=processed)
    transactions, db_snapshot = await _load_receipt_transactions_snapshot(
        transaction_scope_firebase_uid=transaction_scope_firebase_uid
    )
    reconciliation = (
        _simulate_reconciliation(
            processed,
            _transactions_for_case(
                base_transactions=transactions,
                output=processed,
                case_id=case.id,
                fixture="none",
            ),
        )
        if processed.pdf_status == "readable"
        else _empty_reconciliation(db_snapshot)
    )
    packet = {
        "case_id": case.id,
        "issuer": case.issuer,
        "pdf": case.relative_path,
        "expected_path": str(case.expected_path) if case.expected_path else None,
        "extractor": extractor,
        "actual_source": "deterministic",
        "document_type": "credit_card_statement",
        "status": "completed" if score.get("passed") else "threshold-failed",
        "evidence_label": f"statement-deterministic-{extractor}",
        "artifact_layout": "statement-deterministic-run-folder-v1",
        "runtime_equivalent": False,
        "runtime_evidence_note": (
            "Deterministic statement prompt-lab evidence is local parser evidence only; "
            "Gemini and device/runtime gates remain separate."
        ),
        "generated_at": datetime.now(UTC).isoformat(),
        "pdf_input": pdf_input,
        "text_layer": text_layer,
        "layout_words": layout_words,
        "candidate_rows": candidate_rows,
        "raw_output": raw_output,
        "processed_output": {
            "document_type": "credit_card_statement",
            "normalization_stage": f"statement_deterministic_{extractor}",
            "status": "completed",
            "statement_extraction": processed.model_dump(mode="json"),
            "coalesce": {
                "status": "completed",
                "candidate_transactions_created": False,
            },
        },
        "field_provenance": build_statement_field_provenance(
            raw=processed,
            processed=processed,
            source=f"deterministic_{extractor}",
        ),
        "score": score,
        "reconciliation": reconciliation,
        "payload_examples": reconciliation["payload_examples"],
        "cost_summary": {
            "totals": {
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "cost_usd": "0",
            },
            "model_name": None,
            "notes": [
                "No Gemini/provider call was made.",
                f"deterministic_extractor={extractor}",
            ],
        },
        "database": db_snapshot,
    }
    return _write_packet(
        packet,
        results_root=results_root,
        run_id=run_id,
        artifact_dir=artifact_dir,
    )


def _pypdf_output(
    case: StatementCase,
    *,
    credentials_root: Path | None,
) -> DeterministicOutput:
    packet = extract_statement_text(
        case,
        credentials_root=credentials_root,
        include_source_text=False,
    )
    extraction = packet.extraction
    extraction.processing.warnings = sorted(
        {
            *extraction.processing.warnings,
            "deterministic_pypdf_text_only",
            "no_line_normalization",
        }
    )
    text_layer = {
        "extractor": "pypdf",
        "pdf_status": extraction.pdf_status,
        "page_count": extraction.processing.page_count,
        "text_char_count": extraction.processing.text_char_count,
        "text_line_count": extraction.processing.text_line_count,
        "raw_text_sha256": extraction.processing.raw_text_sha256,
        "contains_raw_statement_text": False,
    }
    layout_words = _empty_layout_words(extractor="pypdf")
    candidate_rows = _empty_candidate_rows(
        extractor="pypdf",
        warnings=["pypdf_has_no_layout_coordinates", "no_line_normalization"],
    )
    raw_output = _raw_output(
        extractor="pypdf",
        provider_call="skipped",
        extraction=extraction,
        status=extraction.pdf_status,
        notes=["pypdf text baseline only; Gemini was not called."],
    )
    return extraction, raw_output, text_layer, layout_words, candidate_rows


def _pymupdf_output(
    case: StatementCase,
    *,
    password: str | None,
    pdf_input: dict[str, Any],
) -> DeterministicOutput:
    result = extract_statement_with_pymupdf(
        case.pdf_path,
        password=password,
        issuer_hint=case.issuer,
    )
    processed = result.extraction
    raw_output = _raw_output(
        extractor="pymupdf",
        provider_call="skipped",
        extraction=processed,
        status=processed.pdf_status,
        notes=[
            "PyMuPDF layout parser; Gemini was not called.",
            f"routing={result.routing.asdict()}",
        ],
    )
    return processed, raw_output, result.text_layer, result.layout_words, result.candidate_rows


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
    line = StatementLine(
        source_order=_candidate_source_order(row_index),
        date=date_value,
        description=description,
        amount_minor=selected_amount,
        currency="CLP",
        line_type=_line_type(description=description, amount_minor=selected_amount),
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
        amount_candidates=_amount_candidates(
            selected=selected,
            amount_words=amount_words,
            installment_word=installment_word,
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
    line = StatementLine(
        source_order=_candidate_source_order(row_index),
        date=date_value,
        description=description,
        amount_minor=selected_amount,
        currency=currency,
        line_type=_line_type(description=description, amount_minor=selected_amount),
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
        amount_candidates=_bank_amount_candidates(
            selected=selected,
            amount_words=amount_words,
            installment_word=installment_word,
            currency=currency,
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
        if 90 <= word.x0 <= 190 and (_DATE_RE.match(word.text) or _SHORT_DATE_RE.match(word.text))
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
        candidates.append(
            StatementAmountCandidate(
                role="selected",
                amount_minor=selected_amount,
                currency=currency,
                visible_text=selected.text,
                column_label=_bank_amount_column_label(
                    selected,
                    selected=selected,
                    installment_word=installment_word,
                    currency=currency,
                ),
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
                column_label=_bank_amount_column_label(
                    selected,
                    selected=selected,
                    installment_word=installment_word,
                    currency=currency,
                ),
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
) -> StatementAmountRole:
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
        candidates.append(
            StatementAmountCandidate(
                role="selected",
                amount_minor=selected_amount,
                currency="CLP",
                visible_text=selected.text,
                column_label=_amount_column_label(selected, installment_word=installment_word),
            )
        )
        current_role: StatementAmountRole = (
            "current_installment"
            if _fixed_term_parts(installment_word)
            else "current_statement_amount"
        )
        candidates.append(
            StatementAmountCandidate(
                role=current_role,
                amount_minor=selected_amount,
                currency="CLP",
                visible_text=selected.text,
                column_label=_amount_column_label(selected, installment_word=installment_word),
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


def _unselected_amount_role(word: _Word, *, installment_word: _Word | None) -> StatementAmountRole:
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


def _line_type(*, description: str, amount_minor: int) -> StatementLineType:
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
    case: StatementCase,
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
        issuer=case.issuer,
        period_start=_parse_date(period.group(1)) if period else None,
        period_end=_parse_date(period.group(2)) if period else None,
        closing_date=_parse_date(closing.group(1)) if closing else None,
        due_date=_parse_date(due.group(1)) if due else None,
        currency="CLP",
        total_debit_minor=total_debit,
        total_credit_minor=payment_total or None,
        payment_due_minor=total_debit,
        card_alias_candidate="CMR" if case.issuer == "cmr" else case.issuer.upper(),
    )


def _pdf_input(case: StatementCase, *, password: str | None) -> dict[str, Any]:
    metadata = inspect_pdf(case.pdf_path, password=password)
    return {
        "case_id": case.id,
        "issuer": case.issuer,
        "filename": case.pdf_path.name,
        "relative_path": case.relative_path,
        "raw_pdf_sha256": sha256_file(case.pdf_path),
        "size_bytes": case.pdf_path.stat().st_size,
        "page_count": metadata.page_count,
        "is_encrypted": metadata.is_encrypted,
        "password_source_exists": bool(password),
        "status": metadata.status,
        "decrypted_pdf_written": False,
    }


def _status_output(
    case: StatementCase,
    pdf_input: dict[str, Any],
    *,
    extractor: StatementDeterministicExtractor,
) -> StatementExtractionOutput:
    return StatementExtractionOutput(
        pdf_status=pdf_input["status"],
        statement=StatementInfo(issuer=case.issuer),
        lines=[],
        processing=StatementProcessingMetadata(
            provider="codex-pdf-text",
            prompt_id=f"deterministic:{extractor}",
            model_name=extractor,
            page_count=pdf_input.get("page_count"),
            warnings=[str(pdf_input["status"])],
        ),
    )


def _score(
    *,
    expected: StatementExtractionOutput | None,
    actual: StatementExtractionOutput,
) -> dict[str, Any]:
    if expected is None:
        return {
            "passed": False,
            "reason": "missing_expected_fixture",
            "failure_owner": "expected_fixture_gap",
        }
    score = score_statement_output(expected=expected, actual=actual)
    score["differences"] = _line_differences(expected=expected, actual=actual)
    return score


def _load_expected(case: StatementCase) -> StatementExtractionOutput | None:
    if case.expected_path is None or not case.expected_path.exists():
        return None
    return StatementExtractionOutput.model_validate_json(
        case.expected_path.read_text(encoding="utf-8")
    )


def _password_for_case(case: StatementCase, credentials_root: Path | None) -> str | None:
    if credentials_root is not None:
        return load_issuer_password(credentials_root.expanduser().resolve() / case.issuer)
    return load_issuer_password(case.pdf_path.parent)


def _raw_output(
    *,
    extractor: StatementDeterministicExtractor,
    provider_call: str,
    extraction: StatementExtractionOutput,
    status: str,
    notes: list[str],
) -> dict[str, Any]:
    return {
        "document_type": "credit_card_statement",
        "provider": "deterministic",
        "extractor": extractor,
        "provider_call": provider_call,
        "status": status,
        "notes": notes,
        "extraction": extraction.model_dump(mode="json"),
    }


def _empty_text_layer(
    *,
    extractor: StatementDeterministicExtractor,
    pdf_input: dict[str, Any],
) -> dict[str, Any]:
    return {
        "extractor": extractor,
        "pdf_status": pdf_input.get("status"),
        "page_count": pdf_input.get("page_count"),
        "text_char_count": 0,
        "text_line_count": 0,
        "raw_text_sha256": None,
        "contains_raw_statement_text": False,
    }


def _empty_layout_words(
    *,
    extractor: StatementDeterministicExtractor,
) -> dict[str, Any]:
    return {
        "extractor": extractor,
        "word_count": 0,
        "words": [],
        "contains_raw_statement_text": False,
        "warnings": ["layout_words_not_available"],
    }


def _empty_candidate_rows(
    *,
    extractor: StatementDeterministicExtractor,
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "extractor": extractor,
        "candidate_row_count": 0,
        "normalized_line_count": 0,
        "rows": [],
        "rejected_rows": [],
        "warnings": warnings or [],
    }


def _empty_reconciliation(db_snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "mode": "read_only_local_simulation",
        "date_window": None,
        "receipt_transactions_available": int(db_snapshot.get("transactions_available") or 0),
        "local_db_transactions_available": int(db_snapshot.get("transactions_available") or 0),
        "synthetic_transactions_available": 0,
        "receipt_transactions_considered": 0,
        "synthetic_transactions_considered": 0,
        "receipt_transactions_ignored_out_of_window": 0,
        "counts": {
            "matched": 0,
            "statement_only": 0,
            "receipt_only": 0,
            "ambiguous": 0,
            "failed": 0,
            "candidate_transactions": 0,
        },
        "payload_examples": {
            "matched": [],
            "statement_only": [],
            "receipt_only": [],
            "ambiguous": [],
            "failed": [],
            "manual_review": [],
        },
        "coverage_ratio": 0.0,
        "line_outcomes": [],
        "receipt_only": [],
        "ignored_receipts_out_of_window": [],
    }


def _confidence(*, lines: list[StatementLine], candidate_rows: list[_CandidateRow]) -> float:
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


def _write_packet(
    packet: dict[str, Any],
    *,
    results_root: Path,
    run_id: str | None,
    artifact_dir: Path | None = None,
) -> dict[str, Any]:
    if artifact_dir is None:
        batch_parent = results_root / "statements"
        batch_run_id = _slug(
            run_id
            or next_serial_run_id(
                batch_parent,
                f"statement-deterministic-{packet['case_id']}-{packet['extractor']}",
            )
        )
        packet_dir = (
            batch_parent / batch_run_id / _slug(str(packet["case_id"])) / str(packet["extractor"])
        )
    else:
        batch_run_id = _slug(run_id or artifact_dir.name)
        packet_dir = artifact_dir
    packet_dir.mkdir(parents=True, exist_ok=True)
    packet["batch_run_id"] = batch_run_id
    packet["artifact_dir"] = str(packet_dir)
    filenames = {
        "pdf_input": "pdf_input.json",
        "text_layer": "text_layer.json",
        "layout_words": "layout_words.json",
        "candidate_rows": "candidate_rows.json",
        "raw_output": "raw_output.json",
        "processed_output": "processed_output.json",
        "field_provenance": "field_provenance.json",
        "score": "score.json",
        "reconciliation": "reconciliation.json",
        "payload_examples": "payload_examples.json",
        "cost_summary": "cost_summary.json",
    }
    for key, filename in filenames.items():
        path = packet_dir / filename
        _write_json(path, packet[key])
        packet[f"{key}_path"] = str(path)
    manifest_path = packet_dir / "manifest.json"
    packet["manifest_path"] = str(manifest_path)
    _write_json(manifest_path, packet)
    return packet


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )


def _json_default(value: object) -> str:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _is_money(value: str) -> bool:
    return bool(_MONEY_RE.match(value.replace("$", "")))


def _parse_money(value: str, *, currency: str) -> int | None:
    cleaned = value.strip().replace("$", "")
    if not cleaned:
        return None
    try:
        if currency == "CLP":
            return int(cleaned.replace(".", ""))
        decimal_value = Decimal(cleaned.replace(".", "").replace(",", "."))
        return int((decimal_value * Decimal("100")).quantize(Decimal("1")))
    except (ValueError, InvalidOperation):
        return None


def _parse_bank_amount(value: str, *, currency: str) -> int | None:
    cleaned = value.strip().replace("$", "")
    if not cleaned:
        return None
    if currency != "CLP":
        return _parse_money(cleaned, currency=currency)
    try:
        if "," in cleaned:
            decimal_value = Decimal(cleaned.replace(".", "").replace(",", "."))
            return int((decimal_value * Decimal("100")).quantize(Decimal("1")))
        return int(cleaned.replace(".", ""))
    except (ValueError, InvalidOperation):
        return None


def _parse_date(value: str) -> date | None:
    try:
        day, month, year = value.split("/")
        return date(int(year), int(month), int(day))
    except ValueError:
        return None


def _parse_statement_date(value: str) -> date | None:
    if _DATE_RE.match(value):
        return _parse_date(value)
    if not _SHORT_DATE_RE.match(value):
        return None
    try:
        day, month, year = value.split("/")
        return date(2000 + int(year), int(month), int(day))
    except ValueError:
        return None


def _fixed_term_parts(word: _Word | None) -> tuple[int, int] | None:
    if word is None:
        return None
    match = re.match(r"^(\d{2})/(\d{2})$", word.text)
    if match is None:
        return None
    current = int(match.group(1))
    total = int(match.group(2))
    if current <= 0 or total <= 1:
        return None
    return current, total


def _candidate_source_order(row_index: int) -> int:
    return row_index


def _sha256_text(value: str) -> str:
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "case"
