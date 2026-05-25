"""Statement prompt-lab scoring helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.schemas.statement import StatementExtractionOutput


def score_statement_output(
    *,
    expected: StatementExtractionOutput,
    actual: StatementExtractionOutput,
) -> dict[str, Any]:
    """Compare statement extraction outputs without reusing receipt scoring rules."""
    expected_lines = expected.lines
    actual_lines = actual.lines
    comparable = min(len(expected_lines), len(actual_lines))
    amount_matches = 0
    date_matches = 0
    description_matches = 0

    for index in range(comparable):
        expected_line = expected_lines[index]
        actual_line = actual_lines[index]
        if expected_line.amount_minor == actual_line.amount_minor:
            amount_matches += 1
        if expected_line.date == actual_line.date:
            date_matches += 1
        if _normalize_description(expected_line.description) == _normalize_description(
            actual_line.description
        ):
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
        and amount_matches == len(expected_lines)
        and date_matches == len(expected_lines)
        and description_matches == len(expected_lines)
    )

    return {
        "passed": passed,
        "line_count_match": line_count_match,
        "expected_line_count": len(expected_lines),
        "actual_line_count": len(actual_lines),
        "currency_match": currency_match,
        "issuer_match": issuer_match,
        "amount_matches": amount_matches,
        "date_matches": date_matches,
        "description_matches": description_matches,
    }


def _normalize_description(value: str) -> str:
    return " ".join(value.casefold().split())
