"""Prompt lab scoring for transaction correctness and receipt reconstruction."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal
from difflib import SequenceMatcher
from typing import TYPE_CHECKING

from app.prompts import V4_CATEGORY_KEYS
from app.services.coalesce import has_visible_total_conflict, to_minor_units
from app.services.receipt_validation_policy import (
    ReceiptValidationPolicy,
    get_receipt_validation_policy,
)

if TYPE_CHECKING:
    from app.prompt_lab.adapter import ExpectedReceipt
    from app.schemas.scan import (
        CategorizationResult,
        GeminiExtractionResult,
        MathReconciliationVerdict,
        RawGeminiExtractionResult,
    )


@dataclass(frozen=True)
class PromptLabScore:
    extraction: dict[str, bool | int | float | str | None]
    categorization: dict[str, bool | int | float]
    pipeline: dict[str, bool | int | float | str | None]
    transaction_gate: dict[str, bool | int | float | str | None]
    reconstruction_gate: dict[str, bool | int | float | str | None]
    passed: bool
    strict_status: str
    severity_status: str
    severity_reasons: list[str]
    validation_policy: dict[str, str | int | float]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def score_prompt_run(
    *,
    expected: ExpectedReceipt | None,
    extraction: GeminiExtractionResult,
    categorization: CategorizationResult,
    verdict: MathReconciliationVerdict,
    raw_extraction: RawGeminiExtractionResult | None = None,
    policy: ReceiptValidationPolicy | None = None,
) -> PromptLabScore:
    policy = policy or get_receipt_validation_policy()
    visible_total_conflict = has_visible_total_conflict(raw_extraction, extraction)
    extraction_score = _score_extraction(expected, extraction, visible_total_conflict)
    categorization_score = _score_categorization(categorization, len(extraction.line_items))
    pipeline_score = _score_pipeline(verdict)
    transaction_gate = _score_transaction_gate(
        extraction_score, categorization_score, pipeline_score
    )
    reconstruction_gate = _score_reconstruction_gate(expected, extraction)
    passed = bool(transaction_gate["passed"]) and bool(reconstruction_gate["passed"])
    severity_status, severity_reasons = _severity_status(
        expected=expected,
        extraction_score=extraction_score,
        categorization_score=categorization_score,
        pipeline_score=pipeline_score,
        transaction_gate=transaction_gate,
        reconstruction_gate=reconstruction_gate,
        policy=policy,
    )
    return PromptLabScore(
        extraction=extraction_score,
        categorization=categorization_score,
        pipeline=pipeline_score,
        transaction_gate=transaction_gate,
        reconstruction_gate=reconstruction_gate,
        passed=passed,
        strict_status="completed" if passed else "threshold-failed",
        severity_status=severity_status,
        severity_reasons=severity_reasons,
        validation_policy=policy.to_dict(),
    )


def _score_transaction_gate(
    extraction_score: dict[str, bool | int | float | str | None],
    categorization_score: dict[str, bool | int | float],
    pipeline_score: dict[str, bool | int | float | str | None],
) -> dict[str, bool | int | float | str | None]:
    baseline_available = extraction_score["merchant_match"] is not None
    if baseline_available:
        extraction_passed = (
            bool(extraction_score["merchant_match"])
            and bool(extraction_score["currency_match"])
            and bool(extraction_score["total_match"])
        )
    else:
        extraction_passed = not bool(extraction_score["visible_total_conflict"])

    passed = (
        extraction_passed
        and not bool(extraction_score["visible_total_conflict"])
        and bool(categorization_score["all_category_keys_valid"])
        and bool(pipeline_score["completed"])
    )
    return {
        "passed": passed,
        "baseline_available": baseline_available,
        "merchant_match": extraction_score["merchant_match"],
        "currency_match": extraction_score["currency_match"],
        "total_match": extraction_score["total_match"],
        "visible_total_conflict": extraction_score["visible_total_conflict"],
        "math_passed": pipeline_score["math_passed"],
        "all_category_keys_valid": categorization_score["all_category_keys_valid"],
    }


def _score_reconstruction_gate(
    expected: ExpectedReceipt | None,
    extraction: GeminiExtractionResult,
) -> dict[str, bool | int | float | str | None]:
    if expected is None:
        return {
            "passed": True,
            "baseline_available": False,
            "item_count_delta": None,
            "item_totals_match": None,
            "item_total_matches": None,
            "quantity_matches": None,
            "unit_price_matches": None,
            "full_item_matches": None,
            "matched_item_names": None,
            "item_totals_match_by_name": None,
            "item_total_matches_by_name": None,
            "quantity_matches_by_name": None,
            "unit_price_matches_by_name": None,
            "full_item_matches_by_name": None,
            "single_item_positional_fallback": False,
            "discount_total_match": None,
        }

    quantity_matches = 0
    unit_price_matches = 0
    item_total_matches = 0
    full_item_matches = 0
    comparable = min(len(expected.items), len(extraction.line_items))
    for index in range(comparable):
        expected_item = expected.items[index]
        actual_item = extraction.line_items[index]
        quantity_match = _quantity_equal(expected_item.quantity, actual_item.qty)
        if quantity_match:
            quantity_matches += 1
        actual_total = to_minor_units(actual_item.total_price, extraction.currency_code)
        total_match = expected_item.total_minor == actual_total
        if total_match:
            item_total_matches += 1
        actual_unit = (
            to_minor_units(actual_item.unit_price, extraction.currency_code)
            if actual_item.unit_price is not None
            else None
        )
        unit_match = expected_item.unit_minor is None or expected_item.unit_minor == actual_unit
        if unit_match:
            unit_price_matches += 1
        if total_match and quantity_match and unit_match:
            full_item_matches += 1

    name_matches = _name_aware_item_matches(expected, extraction)
    item_total_matches_by_name = sum(1 for match in name_matches if match["total_match"])
    quantity_matches_by_name = sum(1 for match in name_matches if match["quantity_match"])
    unit_price_matches_by_name = sum(1 for match in name_matches if match["unit_match"])
    full_item_matches_by_name = sum(1 for match in name_matches if match["full_match"])

    actual_discount_total = (
        to_minor_units(extraction.discount_amount, extraction.currency_code)
        if extraction.discount_amount is not None
        else None
    )
    item_count_delta = len(extraction.line_items) - len(expected.items)
    single_item_positional_fallback = (
        len(expected.items) == 1
        and item_count_delta == 0
        and len(name_matches) == 0
        and full_item_matches == 1
    )
    item_totals_match = item_total_matches_by_name == len(expected.items)
    discount_total_match = expected.discount_total_minor == actual_discount_total
    passed = (
        item_count_delta == 0
        and item_totals_match
        and quantity_matches_by_name == len(expected.items)
        and unit_price_matches_by_name == len(expected.items)
        and discount_total_match
    )
    return {
        "passed": passed,
        "baseline_available": True,
        "item_count_delta": item_count_delta,
        "item_totals_match": item_totals_match,
        "item_total_matches": item_total_matches,
        "quantity_matches": quantity_matches,
        "unit_price_matches": unit_price_matches,
        "full_item_matches": full_item_matches,
        "matched_item_names": len(name_matches),
        "item_totals_match_by_name": item_totals_match,
        "item_total_matches_by_name": item_total_matches_by_name,
        "quantity_matches_by_name": quantity_matches_by_name,
        "unit_price_matches_by_name": unit_price_matches_by_name,
        "full_item_matches_by_name": full_item_matches_by_name,
        "single_item_positional_fallback": single_item_positional_fallback,
        "discount_total_match": discount_total_match,
        "discount_delta_minor": _optional_money_delta(
            actual_discount_total,
            expected.discount_total_minor,
        ),
    }


def _severity_status(
    *,
    expected: ExpectedReceipt | None,
    extraction_score: dict[str, bool | int | float | str | None],
    categorization_score: dict[str, bool | int | float],
    pipeline_score: dict[str, bool | int | float | str | None],
    transaction_gate: dict[str, bool | int | float | str | None],
    reconstruction_gate: dict[str, bool | int | float | str | None],
    policy: ReceiptValidationPolicy,
) -> tuple[str, list[str]]:
    if transaction_gate.get("passed") is True and reconstruction_gate.get("passed") is True:
        return "pass", []

    reasons: list[str] = []
    if extraction_score.get("currency_match") is False:
        reasons.append("significant: currency mismatch")
    if extraction_score.get("total_match") is False:
        reasons.append("significant: final total mismatch")
    if extraction_score.get("visible_total_conflict") is True:
        reasons.append("significant: visible total conflict")
    if categorization_score.get("all_category_keys_valid") is False:
        reasons.append("significant: invalid item category key")
    if (
        isinstance(pipeline_score.get("discrepancy_ratio"), int | float)
        and float(pipeline_score["discrepancy_ratio"])
        > policy.major_reconstruction_discrepancy_ratio
    ):
        reasons.append("significant: reconstruction discrepancy over policy threshold")

    if expected is not None:
        expected_count = len(expected.items)
        item_total_matches_for_severity = _severity_match_count(
            reconstruction_gate,
            "item_total_matches_by_name",
            "item_total_matches",
            expected_count,
        )
        quantity_matches_for_severity = _severity_match_count(
            reconstruction_gate,
            "quantity_matches_by_name",
            "quantity_matches",
            expected_count,
        )
        unit_price_matches_for_severity = _severity_match_count(
            reconstruction_gate,
            "unit_price_matches_by_name",
            "unit_price_matches",
            expected_count,
        )
        if _ratio_abs(reconstruction_gate.get("item_count_delta"), expected_count) > (
            policy.significant_item_count_delta_ratio
        ):
            reasons.append("significant: item count delta over policy threshold")
        if (
            _missing_match_ratio(
                item_total_matches_for_severity,
                expected_count,
            )
            > policy.significant_item_total_mismatch_ratio
        ):
            reasons.append("significant: item total matches by name below policy threshold")
        if (
            _missing_match_ratio(
                quantity_matches_for_severity,
                expected_count,
            )
            > policy.significant_quantity_mismatch_ratio
        ):
            reasons.append("significant: quantity matches by name below policy threshold")
        if (
            _missing_match_ratio(
                unit_price_matches_for_severity,
                expected_count,
            )
            > policy.significant_unit_price_mismatch_ratio
        ):
            reasons.append("significant: unit price matches by name below policy threshold")
        discount_delta = reconstruction_gate.get("discount_delta_minor")
        if (
            isinstance(discount_delta, int | float)
            and _ratio_abs(discount_delta, expected.total_minor)
            > policy.significant_discount_delta_ratio
        ):
            reasons.append("significant: receipt discount delta over policy threshold")

    if reasons:
        return "significant_failure", reasons
    return "minor_review", ["minor: strict gate failed below configured significance thresholds"]


def _ratio_abs(value: object, denominator: int | None) -> float:
    if value is None or denominator in (None, 0):
        return 0.0 if value in (None, 0) else 1.0
    return abs(float(value)) / abs(float(denominator))


def _optional_money_delta(actual: int | None, expected: int | None) -> int | None:
    if actual is None and expected is None:
        return None
    return (actual or 0) - (expected or 0)


def _severity_match_count(
    reconstruction_gate: dict[str, bool | int | float | str | None],
    name_key: str,
    positional_key: str,
    expected_count: int,
) -> object:
    name_matches = reconstruction_gate.get(name_key)
    if expected_count == 1 and reconstruction_gate.get("single_item_positional_fallback") is True:
        positional_matches = reconstruction_gate.get(positional_key)
        if isinstance(name_matches, int) and isinstance(positional_matches, int):
            return max(name_matches, positional_matches)
        return positional_matches
    return name_matches


def _name_aware_item_matches(
    expected: ExpectedReceipt,
    extraction: GeminiExtractionResult,
) -> list[dict[str, bool | int | float]]:
    unmatched_indexes = set(range(len(extraction.line_items)))
    matches: list[dict[str, bool | int | float]] = []
    for expected_index, expected_item in enumerate(expected.items):
        best_index = None
        best_rank: tuple[bool, bool, bool, bool, float] | None = None
        for actual_index in unmatched_indexes:
            actual_item = extraction.line_items[actual_index]
            similarity = _item_name_similarity(expected_item.name, actual_item.name)
            if similarity < 0.62:
                continue
            actual_total = to_minor_units(actual_item.total_price, extraction.currency_code)
            actual_unit = (
                to_minor_units(actual_item.unit_price, extraction.currency_code)
                if actual_item.unit_price is not None
                else None
            )
            total_match = expected_item.total_minor == actual_total
            quantity_match = _quantity_equal(expected_item.quantity, actual_item.qty)
            unit_match = expected_item.unit_minor is None or expected_item.unit_minor == actual_unit
            full_match = total_match and quantity_match and unit_match
            rank = (full_match, total_match, quantity_match, unit_match, similarity)
            if best_rank is None or rank > best_rank:
                best_rank = rank
                best_index = actual_index
        if best_index is None or best_rank is None:
            continue
        unmatched_indexes.remove(best_index)
        matches.append(
            {
                "expected_index": expected_index,
                "actual_index": best_index,
                "name_similarity": round(float(best_rank[4]), 3),
                "total_match": best_rank[1],
                "quantity_match": best_rank[2],
                "unit_match": best_rank[3],
                "full_match": best_rank[0],
            }
        )
    return matches


def _item_name_similarity(expected_name: object, actual_name: object) -> float:
    expected_text = _normalize_item_name(expected_name)
    actual_text = _normalize_item_name(actual_name)
    if not expected_text or not actual_text:
        return 0.0
    if (
        len(expected_text) >= 3
        and len(actual_text) >= 3
        and (expected_text in actual_text or actual_text in expected_text)
    ):
        return 1.0
    return SequenceMatcher(None, expected_text, actual_text).ratio()


def _normalize_item_name(value: object) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() else " " for ch in str(value or "")).split())


def _missing_match_ratio(matches: object, expected_count: int) -> float:
    if not expected_count:
        return 0.0
    if not isinstance(matches, int):
        return 0.0
    return max(expected_count - matches, 0) / expected_count


def _score_extraction(
    expected: ExpectedReceipt | None,
    extraction: GeminiExtractionResult,
    visible_total_conflict: bool,
) -> dict[str, bool | int | float | str | None]:
    if expected is None:
        return {
            "merchant_match": None,
            "merchant_similarity": None,
            "date_match": None,
            "currency_match": None,
            "total_match": None,
            "item_count_delta": None,
            "item_price_matches": 0,
            "confidence": extraction.confidence_score,
            "visible_total_conflict": visible_total_conflict,
        }

    actual_total = to_minor_units(extraction.total_amount, extraction.currency_code)
    expected_items = expected.items
    item_price_matches = 0
    for index, expected_item in enumerate(expected_items):
        if index >= len(extraction.line_items):
            continue
        actual_item = extraction.line_items[index]
        actual_price = to_minor_units(actual_item.total_price, extraction.currency_code)
        if actual_price == expected_item.total_minor:
            item_price_matches += 1

    merchant_similarity = SequenceMatcher(
        None,
        expected.merchant.lower(),
        extraction.merchant_name.lower(),
    ).ratio()

    return {
        "merchant_match": merchant_similarity >= 0.8,
        "merchant_similarity": round(merchant_similarity, 3),
        "date_match": expected.transaction_date == extraction.transaction_date,
        "currency_match": expected.currency == extraction.currency_code,
        "total_match": expected.total_minor == actual_total,
        "item_count_delta": len(extraction.line_items) - len(expected_items),
        "item_price_matches": item_price_matches,
        "confidence": extraction.confidence_score,
        "visible_total_conflict": visible_total_conflict,
    }


def _score_categorization(
    categorization: CategorizationResult,
    item_count: int,
) -> dict[str, bool | int | float]:
    valid_keys = set(V4_CATEGORY_KEYS)
    valid_assignments = [
        assignment
        for assignment in categorization.assignments
        if assignment.category_key in valid_keys
    ]
    covered_indexes = {assignment.line_item_index for assignment in categorization.assignments}
    coverage = len(covered_indexes) / item_count if item_count else 0
    return {
        "all_category_keys_valid": len(valid_assignments) == len(categorization.assignments),
        "valid_assignments": len(valid_assignments),
        "assignment_count": len(categorization.assignments),
        "assignment_coverage": round(coverage, 3),
        "all_items_assigned": len(covered_indexes) == item_count,
    }


def _score_pipeline(
    verdict: MathReconciliationVerdict,
) -> dict[str, bool | int | float | str | None]:
    return {
        "math_passed": verdict.passed,
        "discrepancy_minor_units": verdict.discrepancy_minor_units,
        "reconstructed_total": verdict.reconstructed_total,
        "discrepancy_ratio": verdict.discrepancy_ratio,
        "severity": verdict.severity,
        "state": "completed" if verdict.passed else "needs_review",
        "completed": verdict.passed,
    }


def _quantity_equal(left: Decimal | None, right: Decimal | None) -> bool:
    left_value = left or Decimal(1)
    right_value = right or Decimal(1)
    return left_value == right_value
