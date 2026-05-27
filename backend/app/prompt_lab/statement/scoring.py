"""Statement prompt-lab scoring helpers."""

from __future__ import annotations

import re
import string
import unicodedata
from difflib import SequenceMatcher
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from datetime import date

    from app.schemas.statement import StatementExtractionOutput, StatementLine


def score_statement_output(
    *,
    expected: StatementExtractionOutput,
    actual: StatementExtractionOutput,
) -> dict[str, Any]:
    """Compare statement extraction outputs without reusing receipt scoring rules."""
    expected_lines = expected.lines
    actual_lines = actual.lines
    alignment = align_statement_lines(expected_lines=expected_lines, actual_lines=actual_lines)
    matched_pairs = alignment["matched_pairs"]
    amount_matches = 0
    date_matches = 0
    description_matches = 0
    description_exact_matches = 0
    line_type_matches = 0
    currency_matches = 0

    for pair in matched_pairs:
        expected_line = expected_lines[pair["expected_index"]]
        actual_line = actual_lines[pair["actual_index"]]
        if expected_line.amount_minor == actual_line.amount_minor:
            amount_matches += 1
        if expected_line.date == actual_line.date:
            date_matches += 1
        if expected_line.currency == actual_line.currency:
            currency_matches += 1
        if expected_line.line_type == actual_line.line_type:
            line_type_matches += 1
        if _normalize_description_exact(expected_line.description) == _normalize_description_exact(
            actual_line.description
        ):
            description_exact_matches += 1
        if descriptions_match_for_scoring(expected_line, actual_line):
            description_matches += 1

    line_count_match = len(expected_lines) == len(actual_lines)
    currency_match = expected.statement.currency == actual.statement.currency
    issuer_match = (expected.statement.issuer or "").lower() == (
        actual.statement.issuer or ""
    ).lower()
    passed = (
        line_count_match
        and currency_match
        and issuer_match
        and len(matched_pairs) == len(expected_lines)
        and not alignment["unmatched_expected"]
        and not alignment["unmatched_actual"]
        and amount_matches == len(expected_lines)
        and date_matches == len(expected_lines)
        and description_matches == len(expected_lines)
        and line_type_matches == len(expected_lines)
        and currency_matches == len(expected_lines)
    )

    return {
        "passed": passed,
        "line_count_match": line_count_match,
        "expected_line_count": len(expected_lines),
        "actual_line_count": len(actual_lines),
        "line_count_delta": len(actual_lines) - len(expected_lines),
        "currency_match": currency_match,
        "issuer_match": issuer_match,
        "alignment": alignment,
        "amount_matches": amount_matches,
        "date_matches": date_matches,
        "description_matches": description_matches,
        "description_exact_matches": description_exact_matches,
        "line_type_matches": line_type_matches,
        "line_currency_matches": currency_matches,
    }


def align_statement_lines(
    *,
    expected_lines: list[StatementLine],
    actual_lines: list[StatementLine],
) -> dict[str, Any]:
    """Best-match expected and actual statement lines with deterministic tie-breaking."""
    candidate_pairs: list[dict[str, Any]] = []
    for expected_index, expected_line in enumerate(expected_lines):
        for actual_index, actual_line in enumerate(actual_lines):
            score, reasons = _line_match_score(expected_line, actual_line)
            if score >= 0.60:
                source_distance = abs(expected_line.source_order - actual_line.source_order)
                candidate_pairs.append(
                    {
                        "expected_index": expected_index,
                        "actual_index": actual_index,
                        "expected_source_order": expected_line.source_order,
                        "actual_source_order": actual_line.source_order,
                        "match_score": round(score, 4),
                        "match_reasons": reasons,
                        "_source_distance": source_distance,
                    }
                )

    matched_pairs: list[dict[str, Any]] = []
    used_expected: set[int] = set()
    used_actual: set[int] = set()
    for candidate in sorted(
        candidate_pairs,
        key=lambda item: (
            -float(item["match_score"]),
            int(item["_source_distance"]),
            int(item["expected_index"]),
            int(item["actual_index"]),
        ),
    ):
        expected_index = int(candidate["expected_index"])
        actual_index = int(candidate["actual_index"])
        if expected_index in used_expected or actual_index in used_actual:
            continue
        used_expected.add(expected_index)
        used_actual.add(actual_index)
        matched = {key: value for key, value in candidate.items() if key != "_source_distance"}
        matched_pairs.append(matched)

    matched_pairs.sort(key=lambda item: int(item["expected_index"]))
    unmatched_expected = [
        _alignment_line_sample(index=index, line=line)
        for index, line in enumerate(expected_lines)
        if index not in used_expected
    ]
    unmatched_actual = [
        _alignment_line_sample(index=index, line=line)
        for index, line in enumerate(actual_lines)
        if index not in used_actual
    ]
    order_drift_examples = [
        {
            "expected_source_order": pair["expected_source_order"],
            "actual_source_order": pair["actual_source_order"],
            "match_score": pair["match_score"],
            "match_reasons": pair["match_reasons"],
        }
        for pair in matched_pairs
        if pair["expected_source_order"] != pair["actual_source_order"]
    ]
    return {
        "policy": "best_match_with_source_order_diagnostics",
        "matched_pairs": matched_pairs,
        "unmatched_expected": unmatched_expected,
        "unmatched_actual": unmatched_actual,
        "order_drift_count": len(order_drift_examples),
        "order_drift_examples": order_drift_examples[:10],
        "candidate_threshold": 0.60,
    }


def descriptions_match_for_scoring(
    expected_line: StatementLine,
    actual_line: StatementLine,
) -> bool:
    """Return true for exact or narrowly safe OCR-only description differences."""
    expected = _normalize_description_for_scoring(expected_line.description)
    actual = _normalize_description_for_scoring(actual_line.description)
    return expected == actual


def _line_match_score(
    expected_line: StatementLine,
    actual_line: StatementLine,
) -> tuple[float, list[str]]:
    reasons: list[str] = []
    description_similarity = _description_similarity(
        expected_line.description,
        actual_line.description,
    )
    if descriptions_match_for_scoring(expected_line, actual_line):
        reasons.append("description_normalized_match")
    elif description_similarity >= 0.75:
        reasons.append("description_fuzzy_match")

    date_score = _date_similarity(expected_line.date, actual_line.date)
    if date_score == 1:
        reasons.append("date_exact")
    elif date_score:
        reasons.append("date_near")

    currency_score = 1.0 if expected_line.currency == actual_line.currency else 0.0
    if currency_score:
        reasons.append("currency_exact")

    line_type_score = 1.0 if expected_line.line_type == actual_line.line_type else 0.0
    if line_type_score:
        reasons.append("line_type_exact")

    amount_score = 1.0 if expected_line.amount_minor == actual_line.amount_minor else 0.0
    if amount_score:
        reasons.append("amount_exact")
    elif _same_sign(expected_line.amount_minor, actual_line.amount_minor):
        reasons.append("amount_same_sign")

    source_score = _source_order_similarity(expected_line.source_order, actual_line.source_order)
    if source_score == 1:
        reasons.append("source_order_exact")
    elif source_score >= 0.5:
        reasons.append("source_order_near")

    score = (
        description_similarity * 0.45
        + date_score * 0.25
        + currency_score * 0.10
        + amount_score * 0.10
        + line_type_score * 0.05
        + source_score * 0.05
    )
    return score, reasons


def _description_similarity(expected: str, actual: str) -> float:
    expected_normalized = _normalize_description_for_scoring(expected)
    actual_normalized = _normalize_description_for_scoring(actual)
    if not expected_normalized or not actual_normalized:
        return 0.0
    if expected_normalized == actual_normalized:
        return 1.0
    expected_tokens = set(expected_normalized.split())
    actual_tokens = set(actual_normalized.split())
    token_score = (
        len(expected_tokens & actual_tokens) / len(expected_tokens | actual_tokens)
        if expected_tokens and actual_tokens
        else 0.0
    )
    sequence_score = SequenceMatcher(None, expected_normalized, actual_normalized).ratio()
    return max(token_score, sequence_score)


def _date_similarity(expected: date | None, actual: date | None) -> float:
    if expected is None or actual is None:
        return 0.0
    if expected == actual:
        return 1.0
    if abs((expected - actual).days) <= 1:
        return 0.5
    return 0.0


def _source_order_similarity(expected: int, actual: int) -> float:
    distance = abs(expected - actual)
    if distance == 0:
        return 1.0
    if distance >= 10:
        return 0.0
    return max(0.0, 1.0 - (distance / 10))


def _same_sign(expected: int, actual: int) -> bool:
    if expected == 0 or actual == 0:
        return expected == actual
    return (expected > 0 and actual > 0) or (expected < 0 and actual < 0)


def _alignment_line_sample(*, index: int, line: StatementLine) -> dict[str, Any]:
    return {
        "index": index,
        "source_order": line.source_order,
        "date": line.date.isoformat() if line.date else None,
        "description": line.description,
        "amount_minor": line.amount_minor,
        "currency": line.currency,
        "line_type": line.line_type,
    }


def _normalize_description_exact(value: str) -> str:
    return " ".join(value.casefold().split())


def _normalize_description_for_scoring(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    ascii_value = ascii_value.replace("|", "l")
    ascii_value = re.sub(r"\bI(?=\b)", "l", ascii_value)
    ascii_value = re.sub(r"\bI(?=tda\b)", "l", ascii_value)
    ascii_value = re.sub(r"\bDI(?=[*\\s])", "Dl", ascii_value)
    punctuation = string.punctuation.replace("*", "")
    table = str.maketrans({char: " " for char in punctuation})
    return " ".join(ascii_value.translate(table).casefold().split())
