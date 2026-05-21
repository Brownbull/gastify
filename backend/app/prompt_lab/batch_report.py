"""Batch-level prompt-lab reporting."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from decimal import Decimal
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from app.prompt_lab.adapter import load_expected_receipt
from app.prompt_lab.costs import LEGACY_ESTIMATED_COST_PER_SCAN_USD
from app.services.coalesce import to_minor_units
from app.services.receipt_validation_policy import DEFAULT_RECEIPT_VALIDATION_POLICY

BATCH_SUMMARY_SCHEMA_VERSION = "prompt-lab-batch-summary.v8"
PROMOTION_THRESHOLD = {
    "threshold_id": "receipt-extraction-promotion-v1",
    "required_case_count": 14,
    "requires_no_cache_evidence": True,
    "max_provider_errors": 0,
    "max_significant_failures": 0,
    "requires_classified_threshold_failures": True,
    "minor_review_policy": (
        "minor_review cases may remain dev-review items, but they do not by themselves "
        "authorize production promotion."
    ),
    "runtime_evidence_required": [
        "staging-e2e S23 fixture gate",
        "staging S23 live Gemini smoke",
    ],
}


def write_batch_report(
    *,
    manifest_paths: list[Path],
    output_dir: Path,
    label: str = "six-case",
) -> dict[str, Any]:
    """Write machine-readable and markdown batch summaries for prompt-lab manifests."""
    output_dir.mkdir(parents=True, exist_ok=True)
    manifests = [_load_json(path) for path in manifest_paths]
    cases = [_case_summary(manifest) for manifest in manifests]
    total_input = sum(case["tokens"]["input_tokens"] for case in cases)
    total_output = sum(case["tokens"]["output_tokens"] for case in cases)
    total_cost = sum((Decimal(case["cost_usd"]) for case in cases), Decimal("0"))
    legacy_total = LEGACY_ESTIMATED_COST_PER_SCAN_USD * len(cases)
    cache_evidence_status_count = sum(
        1
        for case in cases
        if "cache" in str(case["status"]) or str(case["status"]) == "missing-cache"
    )
    provider_error_count = sum(1 for case in cases if case["status"] == "provider-error")
    policy = _validation_policy(cases)
    summary = {
        "schema_version": BATCH_SUMMARY_SCHEMA_VERSION,
        "label": label,
        "generated_at": datetime.now(UTC).isoformat(),
        "case_count": len(cases),
        "statuses": [case["status"] for case in cases],
        "strict_counts": _count_values(case["strict_status"] for case in cases),
        "severity_counts": _count_values(case["severity_status"] for case in cases),
        "cache_evidence_status_count": cache_evidence_status_count,
        "cache_evidence_blocking": cache_evidence_status_count > 0,
        "provider_error_count": provider_error_count,
        "no_cache_evidence_valid": cache_evidence_status_count == 0 and provider_error_count == 0,
        "validation_policy": policy,
        "baseline_counts": {
            "scored": sum(1 for case in cases if case["baseline_available"]),
            "unbaselined_smoke": sum(1 for case in cases if not case["baseline_available"]),
        },
        "cases": cases,
        "totals": {
            "input_tokens": total_input,
            "output_tokens": total_output,
            "total_tokens": total_input + total_output,
            "cost_usd": _money(total_cost),
        },
        "legacy_comparison": {
            "legacy_cost_kind": "legacy_flat_estimate",
            "legacy_flat_estimate_cost_per_scan_usd": _money(LEGACY_ESTIMATED_COST_PER_SCAN_USD),
            "legacy_flat_estimate_batch_cost_usd": _money(legacy_total),
            "legacy_token_kind": "legacy_rough_token_estimate",
            "gastify_cost_kind": "provider_reported_tokens_estimated_cost",
            "notes": (
                "Legacy Boletapp prompt-testing used flat apiCost estimates and rough token "
                "analysis. Gastify batch totals use provider-reported tokens and current "
                "model pricing."
            ),
        },
    }
    summary["promotion_threshold"] = PROMOTION_THRESHOLD
    summary["promotion_decision"] = _promotion_decision(summary)

    output_slug = _slug(label)
    summary_path = output_dir / f"{output_slug}-summary.json"
    analysis_path = output_dir / f"{output_slug}-analysis.md"
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    analysis_path.write_text(_markdown(summary), encoding="utf-8")
    summary["summary_path"] = str(summary_path)
    summary["analysis_path"] = str(analysis_path)
    return summary


def _case_summary(manifest: dict[str, Any]) -> dict[str, Any]:
    cost_summary = _load_optional_json(manifest.get("cost_summary_path"))
    provenance = _load_optional_json(manifest.get("field_provenance_path"))
    score = _load_optional_json(manifest.get("score_path")) or {}
    raw = _load_optional_json(manifest.get("raw_output_path")) or {}
    raw_extraction = raw.get("extraction", {}) if isinstance(raw, dict) else {}
    processed = _load_optional_json(manifest.get("processed_output_path")) or {}
    extraction = processed.get("extraction", {}) if isinstance(processed, dict) else {}
    verdict = processed.get("verdict", {}) if isinstance(processed, dict) else {}
    expected = _load_expected(manifest)
    cost_totals = (cost_summary or {}).get("totals", {})
    tokens = {
        "input_tokens": int(cost_totals.get("input_tokens") or 0),
        "output_tokens": int(cost_totals.get("output_tokens") or 0),
        "total_tokens": int(cost_totals.get("total_tokens") or 0),
    }
    total_amount = _int_or_none(extraction.get("total_amount"))
    discount_amount = _int_or_none(extraction.get("discount_amount"))
    line_items = extraction.get("line_items") if isinstance(extraction, dict) else []
    extracted_item_count = len(line_items) if isinstance(line_items, list) else 0
    expected_item_count = len(expected.items) if expected else None
    expected_total = expected.total_minor if expected else None
    expected_discount = expected.discount_total_minor if expected else None
    full_item_matches = _full_item_matches(
        expected=expected,
        line_items=line_items if isinstance(line_items, list) else [],
        currency=str(extraction.get("currency_code") or ""),
    )
    raw_diagnostics = _extraction_diagnostics(
        expected=expected,
        extraction=raw_extraction,
    )
    processed_diagnostics = _extraction_diagnostics(
        expected=expected,
        extraction=extraction,
    )
    extraction_score = score.get("extraction", {}) if isinstance(score, dict) else {}
    reconstruction_gate = score.get("reconstruction_gate", {}) if isinstance(score, dict) else {}
    transaction_gate = score.get("transaction_gate", {}) if isinstance(score, dict) else {}
    strict_status = str(score.get("strict_status") or manifest["status"])
    severity_status = str(score.get("severity_status") or _legacy_severity_status(manifest))
    severity_reasons = score.get("severity_reasons") if isinstance(score, dict) else []
    validation_policy = score.get("validation_policy") if isinstance(score, dict) else None
    provenance_highlights = _provenance_highlights(provenance)
    item_total_matches = reconstruction_gate.get("item_total_matches")
    item_totals_match = reconstruction_gate.get("item_totals_match")
    item_total_matches_by_name = reconstruction_gate.get("item_total_matches_by_name")
    quantity_matches_by_name = reconstruction_gate.get("quantity_matches_by_name")
    unit_price_matches_by_name = reconstruction_gate.get("unit_price_matches_by_name")
    full_item_matches_by_name = reconstruction_gate.get("full_item_matches_by_name")
    if item_totals_match is None and expected_item_count is not None:
        item_totals_match = item_total_matches == expected_item_count
    failure_reasons = _failure_reasons(
        status=str(manifest["status"]),
        transaction_gate=transaction_gate,
        reconstruction_gate=reconstruction_gate,
        expected_item_count=expected_item_count,
        extracted_item_count=extracted_item_count,
        item_total_matches=item_total_matches,
        item_total_matches_by_name=item_total_matches_by_name,
    )
    case = {
        "case_id": manifest["case_id"],
        "status": manifest["status"],
        "strict_status": strict_status,
        "severity_status": severity_status,
        "severity_reasons": severity_reasons if isinstance(severity_reasons, list) else [],
        "validation_policy": (
            validation_policy
            if isinstance(validation_policy, dict)
            else DEFAULT_RECEIPT_VALIDATION_POLICY.to_dict()
        ),
        "manifest_path": manifest.get("manifest_path"),
        "raw_output_path": manifest.get("raw_output_path"),
        "processed_output_path": manifest.get("processed_output_path"),
        "field_provenance_path": manifest.get("field_provenance_path"),
        "cost_summary_path": manifest.get("cost_summary_path"),
        "score_path": manifest.get("score_path"),
        "prompt_identity": manifest.get("prompt_identity", {}),
        "baseline_available": bool(manifest.get("baseline_path")),
        "tokens": tokens,
        "cost_usd": str(cost_totals.get("cost_usd") or "0"),
        "final_total_minor": total_amount,
        "expected_total_minor": expected_total,
        "total_delta_minor": (
            total_amount - expected_total
            if total_amount is not None and expected_total is not None
            else None
        ),
        "gross_total_minor": (
            total_amount + discount_amount
            if total_amount is not None and discount_amount is not None
            else None
        ),
        "discount_total_minor": discount_amount,
        "expected_discount_total_minor": expected_discount,
        "discount_delta_minor": reconstruction_gate.get("discount_delta_minor"),
        "extracted_item_count": extracted_item_count,
        "expected_item_count": expected_item_count,
        "item_count_delta": reconstruction_gate.get("item_count_delta"),
        "item_price_matches": extraction_score.get("item_price_matches"),
        "item_total_matches": item_total_matches,
        "item_totals_match": item_totals_match,
        "full_item_matches": full_item_matches,
        "matched_item_names": reconstruction_gate.get("matched_item_names"),
        "item_total_matches_by_name": item_total_matches_by_name,
        "quantity_matches_by_name": quantity_matches_by_name,
        "unit_price_matches_by_name": unit_price_matches_by_name,
        "full_item_matches_by_name": full_item_matches_by_name,
        "item_totals_match_by_name": reconstruction_gate.get("item_totals_match_by_name"),
        "quantity_matches": reconstruction_gate.get("quantity_matches"),
        "unit_price_matches": reconstruction_gate.get("unit_price_matches"),
        "single_item_positional_fallback": reconstruction_gate.get(
            "single_item_positional_fallback",
            False,
        ),
        "discount_total_match": reconstruction_gate.get("discount_total_match"),
        "reconstructed_total_minor": _int_or_none(verdict.get("reconstructed_total")),
        "discrepancy_minor_units": _int_or_none(verdict.get("discrepancy_minor_units")),
        "discrepancy_ratio": verdict.get("discrepancy_ratio"),
        "reconciliation_severity": verdict.get("severity"),
        "transaction_gate_passed": transaction_gate.get("passed"),
        "merchant_match": transaction_gate.get("merchant_match"),
        "currency_match": transaction_gate.get("currency_match"),
        "total_match": transaction_gate.get("total_match"),
        "visible_total_conflict": transaction_gate.get("visible_total_conflict"),
        "math_passed": transaction_gate.get("math_passed"),
        "all_category_keys_valid": transaction_gate.get("all_category_keys_valid"),
        "reconstruction_gate_passed": reconstruction_gate.get("passed"),
        "threshold_failure_reasons": failure_reasons,
        "provenance_highlights": provenance_highlights,
        "raw_diagnostics": raw_diagnostics,
        "processed_diagnostics": processed_diagnostics,
    }
    case["threshold_factors"] = _threshold_factors(case)
    case["stage_attribution"] = _stage_attribution(
        case=case,
        raw_diagnostics=raw_diagnostics,
        processed_diagnostics=processed_diagnostics,
    )
    return case


def _load_expected(manifest: dict[str, Any]):
    baseline_path = manifest.get("baseline_path")
    if not baseline_path:
        return None
    path = Path(str(baseline_path))
    if not path.exists():
        return None
    return load_expected_receipt(path, case_id=str(manifest["case_id"]))


def _full_item_matches(
    *,
    expected: Any,
    line_items: list[dict[str, Any]],
    currency: str,
) -> int | None:
    if expected is None:
        return None

    matches = 0
    comparable = min(len(expected.items), len(line_items))
    for index in range(comparable):
        expected_item = expected.items[index]
        actual_item = line_items[index]
        actual_total = _minor_from_item(actual_item.get("total_price"), currency)
        actual_unit = _minor_from_item(actual_item.get("unit_price"), currency)
        actual_quantity = _optional_decimal(actual_item.get("qty"))
        total_matches = actual_total == expected_item.total_minor
        quantity_matches = _quantity_equal(expected_item.quantity, actual_quantity)
        unit_matches = expected_item.unit_minor is None or expected_item.unit_minor == actual_unit
        if total_matches and quantity_matches and unit_matches:
            matches += 1
    return matches


def _extraction_diagnostics(
    *,
    expected: Any,
    extraction: dict[str, Any],
) -> dict[str, Any]:
    currency = str(
        extraction.get("currency_code") or (expected.currency if expected is not None else "") or ""
    )
    line_items = _line_items(extraction)
    transaction_total = _minor_from_item(extraction.get("total_amount"), currency)
    discount_total = _minor_from_item(extraction.get("discount_amount"), currency)
    item_total_sum = _item_total_sum(line_items=line_items, currency=currency)
    expected_item_sum = (
        sum(item.total_minor for item in expected.items) if expected is not None else None
    )
    expected_count = len(expected.items) if expected is not None else None
    item_total_matches = _item_total_match_count(
        expected=expected,
        line_items=line_items,
        currency=currency,
    )
    item_total_mismatches = _item_total_mismatches(
        expected=expected,
        line_items=line_items,
        currency=currency,
    )
    item_name_matches = _item_name_match_count(expected=expected, line_items=line_items)
    item_total_missing = _missing_count(item_total_matches, expected_count)
    item_name_missing = _missing_count(item_name_matches, expected_count)

    return {
        "currency_code": currency or None,
        "transaction_total_minor": transaction_total,
        "expected_transaction_total_minor": expected.total_minor if expected else None,
        "transaction_total_delta_minor": _optional_delta(
            transaction_total,
            expected.total_minor if expected else None,
        ),
        "transaction_total_delta_ratio": _ratio_abs(
            _optional_delta(transaction_total, expected.total_minor if expected else None),
            expected.total_minor if expected else None,
        ),
        "discount_total_minor": discount_total,
        "expected_discount_total_minor": expected.discount_total_minor if expected else None,
        "discount_delta_minor": _optional_money_delta(
            discount_total,
            expected.discount_total_minor if expected else None,
        ),
        "item_count": len(line_items),
        "expected_item_count": expected_count,
        "item_count_delta": (
            len(line_items) - expected_count if expected_count is not None else None
        ),
        "item_name_matches": item_name_matches,
        "item_name_missing": item_name_missing,
        "item_name_missing_ratio": _ratio_abs(item_name_missing, expected_count),
        "item_total_matches": item_total_matches,
        "item_total_mismatch_count": len(item_total_mismatches),
        "item_total_mismatches": item_total_mismatches,
        "item_total_missing": item_total_missing,
        "item_total_missing_ratio": _ratio_abs(item_total_missing, expected_count),
        "item_total_sum_minor": item_total_sum,
        "expected_item_total_sum_minor": expected_item_sum,
        "item_total_sum_delta_minor": _optional_delta(item_total_sum, expected_item_sum),
        "item_total_sum_delta_ratio": _ratio_abs(
            _optional_delta(item_total_sum, expected_item_sum),
            expected_item_sum,
        ),
        "item_sum_to_final_delta_minor": _optional_delta(
            item_total_sum,
            expected.total_minor if expected else None,
        ),
    }


def _line_items(extraction: dict[str, Any]) -> list[dict[str, Any]]:
    value = extraction.get("line_items") if isinstance(extraction, dict) else []
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _item_total_sum(*, line_items: list[dict[str, Any]], currency: str) -> int:
    total = 0
    for item in line_items:
        total += _minor_from_item(item.get("total_price"), currency) or 0
    return total


def _item_total_match_count(
    *,
    expected: Any,
    line_items: list[dict[str, Any]],
    currency: str,
) -> int | None:
    if expected is None:
        return None

    matches = 0
    comparable = min(len(expected.items), len(line_items))
    for index in range(comparable):
        actual_total = _minor_from_item(line_items[index].get("total_price"), currency)
        if actual_total == expected.items[index].total_minor:
            matches += 1
    return matches


def _item_total_mismatches(
    *,
    expected: Any,
    line_items: list[dict[str, Any]],
    currency: str,
) -> list[dict[str, Any]]:
    if expected is None:
        return []

    mismatches = []
    last_index = max(len(expected.items), len(line_items))
    for index in range(last_index):
        expected_item = expected.items[index] if index < len(expected.items) else None
        actual_item = line_items[index] if index < len(line_items) else None
        expected_total = expected_item.total_minor if expected_item is not None else None
        actual_total = (
            _minor_from_item(actual_item.get("total_price"), currency)
            if actual_item is not None
            else None
        )
        if expected_total == actual_total:
            continue
        mismatches.append(
            {
                "index": index,
                "expected_name": expected_item.name if expected_item is not None else None,
                "actual_name": actual_item.get("name") if actual_item is not None else None,
                "expected_total_minor": expected_total,
                "actual_total_minor": actual_total,
                "delta_minor": _optional_money_delta(actual_total, expected_total),
            }
        )
    return mismatches


def _item_name_match_count(
    *,
    expected: Any,
    line_items: list[dict[str, Any]],
) -> int | None:
    if expected is None:
        return None

    unmatched_indexes = set(range(len(line_items)))
    matches = 0
    for expected_item in expected.items:
        best_index = None
        best_score = 0.0
        for index in unmatched_indexes:
            score = _item_name_similarity(expected_item.name, line_items[index].get("name"))
            if score > best_score:
                best_score = score
                best_index = index
        if best_index is not None and best_score >= 0.62:
            unmatched_indexes.remove(best_index)
            matches += 1
    return matches


def _item_name_similarity(expected_name: Any, actual_name: Any) -> float:
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


def _normalize_item_name(value: Any) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() else " " for ch in str(value or "")).split())


def _stage_attribution(
    *,
    case: dict[str, Any],
    raw_diagnostics: dict[str, Any],
    processed_diagnostics: dict[str, Any],
) -> dict[str, str]:
    if not case["baseline_available"]:
        return {
            "primary_stage": "unbaselined",
            "reason": "No baseline is available, so raw and processed deltas are descriptive only.",
        }

    raw_amounts_ok = _transaction_ok(raw_diagnostics) and _item_sum_ok(raw_diagnostics)
    raw_items_ok = _item_count_ok(raw_diagnostics) and _item_prices_ok(raw_diagnostics)
    processed_amounts_ok = _transaction_ok(processed_diagnostics) and _item_sum_ok(
        processed_diagnostics
    )
    processed_items_ok = _item_count_ok(processed_diagnostics) and _item_prices_ok(
        processed_diagnostics
    )

    if case["transaction_gate_passed"] is True and case["reconstruction_gate_passed"] is True:
        return {
            "primary_stage": "pass",
            "reason": "Transaction and reconstruction gates passed.",
        }
    if raw_amounts_ok and raw_items_ok and (not processed_amounts_ok or not processed_items_ok):
        return {
            "primary_stage": "postprocess/math",
            "reason": (
                "Raw transaction total and item totals cover the baseline, but processed "
                "arithmetic or item reconstruction does not."
            ),
        }
    if (
        raw_amounts_ok
        and raw_items_ok
        and processed_amounts_ok
        and processed_items_ok
        and (
            case["math_passed"] is False
            or case["discount_total_match"] is False
            or case["visible_total_conflict"] is True
        )
    ):
        return {
            "primary_stage": "postprocess/math",
            "reason": (
                "Raw and processed item arithmetic are aligned, but deterministic math, "
                "discount, or visible-total rules still fail."
            ),
        }
    if raw_amounts_ok and processed_amounts_ok and processed_items_ok:
        return {
            "primary_stage": "scoring/policy",
            "reason": "Processed arithmetic is aligned, but the score/gate still fails.",
        }
    if _transaction_ok(raw_diagnostics) and not raw_items_ok:
        return {
            "primary_stage": "raw-extraction",
            "reason": (
                "The transaction total is correct, but raw item coverage or item prices "
                "do not cover the baseline."
            ),
        }
    if not raw_amounts_ok or not raw_items_ok:
        return {
            "primary_stage": "raw-extraction",
            "reason": (
                "The first extraction already has total, item-count, item-sum, or item-price drift."
            ),
        }
    if not processed_amounts_ok or not processed_items_ok:
        return {
            "primary_stage": "postprocess/math",
            "reason": (
                "Raw evidence is closer than the processed result, so rules/math need review."
            ),
        }
    return {
        "primary_stage": "scoring/policy",
        "reason": "No raw-vs-processed arithmetic drift explains the remaining gate failure.",
    }


def _transaction_ok(diagnostics: dict[str, Any]) -> bool:
    return diagnostics.get("transaction_total_delta_minor") == 0


def _item_sum_ok(diagnostics: dict[str, Any]) -> bool:
    return diagnostics.get("item_total_sum_delta_minor") == 0


def _item_count_ok(diagnostics: dict[str, Any]) -> bool:
    return diagnostics.get("item_count_delta") == 0


def _item_prices_ok(diagnostics: dict[str, Any]) -> bool:
    return diagnostics.get("item_total_missing") == 0


def _failure_reasons(
    *,
    status: str,
    transaction_gate: dict[str, Any],
    reconstruction_gate: dict[str, Any],
    expected_item_count: int | None,
    extracted_item_count: int,
    item_total_matches: Any,
    item_total_matches_by_name: Any,
) -> list[str]:
    if not status.startswith("threshold-failed"):
        return []

    reasons: list[str] = []
    if transaction_gate.get("passed") is False:
        if transaction_gate.get("merchant_match") is False:
            reasons.append("transaction: merchant mismatch")
        if transaction_gate.get("currency_match") is False:
            reasons.append("transaction: currency mismatch")
        if transaction_gate.get("total_match") is False:
            reasons.append("transaction: final total mismatch")
        if transaction_gate.get("visible_total_conflict") is True:
            reasons.append("transaction: visible total conflict")
        if transaction_gate.get("math_passed") is False:
            reasons.append("transaction: reconstructed math failed")
        if transaction_gate.get("all_category_keys_valid") is False:
            reasons.append("transaction: invalid category key")

    if reconstruction_gate.get("passed") is False:
        item_delta = reconstruction_gate.get("item_count_delta")
        if item_delta not in (None, 0):
            reasons.append(
                "reconstruction: item count mismatch "
                f"({extracted_item_count} extracted vs {expected_item_count} expected)"
            )
        if expected_item_count:
            scored_item_total_matches = _fallback(
                item_total_matches_by_name,
                item_total_matches,
            )
            if (
                scored_item_total_matches is not None
                and scored_item_total_matches < expected_item_count
            ):
                positional = (
                    f", positional {item_total_matches}/{expected_item_count}"
                    if item_total_matches != scored_item_total_matches
                    else ""
                )
                reasons.append(
                    "reconstruction: item total-price matches by name "
                    f"{scored_item_total_matches}/{expected_item_count}{positional}"
                )
            quantity_matches = _fallback(
                reconstruction_gate.get("quantity_matches_by_name"),
                reconstruction_gate.get("quantity_matches"),
            )
            if quantity_matches is not None and quantity_matches < expected_item_count:
                reasons.append(
                    "reconstruction: quantity matches by name "
                    f"{quantity_matches}/{expected_item_count}"
                )
            unit_matches = _fallback(
                reconstruction_gate.get("unit_price_matches_by_name"),
                reconstruction_gate.get("unit_price_matches"),
            )
            if unit_matches is not None and unit_matches < expected_item_count:
                reasons.append(
                    "reconstruction: unit price matches by name "
                    f"{unit_matches}/{expected_item_count}"
                )
        if reconstruction_gate.get("discount_total_match") is False:
            reasons.append("reconstruction: receipt discount mismatch")

    return reasons or ["threshold failed for an unclassified scoring reason"]


def _threshold_factors(case: dict[str, Any]) -> dict[str, Any]:
    expected_count = case["expected_item_count"]
    expected_total = case["expected_total_minor"]
    item_count_delta = case["item_count_delta"]
    item_total_matches = _fallback(case["item_total_matches_by_name"], case["item_total_matches"])
    quantity_matches = _fallback(case["quantity_matches_by_name"], case["quantity_matches"])
    unit_price_matches = _fallback(case["unit_price_matches_by_name"], case["unit_price_matches"])
    severity_basis = "name"
    if case.get("single_item_positional_fallback") is True:
        severity_basis = "single-item-positional"
        item_total_matches = _max_int_match(item_total_matches, case["item_total_matches"])
        quantity_matches = _max_int_match(quantity_matches, case["quantity_matches"])
        unit_price_matches = _max_int_match(unit_price_matches, case["unit_price_matches"])
    item_total_missing = _missing_count(item_total_matches, expected_count)
    quantity_missing = _missing_count(quantity_matches, expected_count)
    unit_price_missing = _missing_count(unit_price_matches, expected_count)
    positional_item_total_missing = _missing_count(case["item_total_matches"], expected_count)
    positional_quantity_missing = _missing_count(case["quantity_matches"], expected_count)
    positional_unit_price_missing = _missing_count(case["unit_price_matches"], expected_count)
    discount_delta = case["discount_delta_minor"]
    policy = case["validation_policy"]

    return {
        "transaction": {
            "merchant_match": case["merchant_match"],
            "currency_match": case["currency_match"],
            "final_total_match": case["total_match"],
            "visible_total_conflict": case["visible_total_conflict"],
            "math_passed": case["math_passed"],
            "all_category_keys_valid": case["all_category_keys_valid"],
        },
        "reconstruction": {
            "item_count_delta": item_count_delta,
            "item_count_delta_ratio": _ratio_abs(item_count_delta, expected_count),
            "item_total_missing": item_total_missing,
            "item_total_mismatch_ratio": _ratio_abs(item_total_missing, expected_count),
            "positional_item_total_missing": positional_item_total_missing,
            "positional_item_total_mismatch_ratio": _ratio_abs(
                positional_item_total_missing,
                expected_count,
            ),
            "quantity_missing": quantity_missing,
            "quantity_mismatch_ratio": _ratio_abs(quantity_missing, expected_count),
            "positional_quantity_missing": positional_quantity_missing,
            "positional_quantity_mismatch_ratio": _ratio_abs(
                positional_quantity_missing,
                expected_count,
            ),
            "unit_price_missing": unit_price_missing,
            "unit_price_mismatch_ratio": _ratio_abs(unit_price_missing, expected_count),
            "positional_unit_price_missing": positional_unit_price_missing,
            "positional_unit_price_mismatch_ratio": _ratio_abs(
                positional_unit_price_missing,
                expected_count,
            ),
            "severity_match_basis": severity_basis,
            "single_item_positional_fallback": case.get(
                "single_item_positional_fallback",
                False,
            ),
            "discount_delta_minor": discount_delta,
            "discount_delta_ratio": _ratio_abs(discount_delta, expected_total),
        },
        "policy_thresholds": {
            "major_reconstruction_discrepancy_ratio": _float_policy(
                policy, "major_reconstruction_discrepancy_ratio"
            ),
            "significant_item_count_delta_ratio": _float_policy(
                policy, "significant_item_count_delta_ratio"
            ),
            "significant_item_total_mismatch_ratio": _float_policy(
                policy, "significant_item_total_mismatch_ratio"
            ),
            "significant_quantity_mismatch_ratio": _float_policy(
                policy, "significant_quantity_mismatch_ratio"
            ),
            "significant_unit_price_mismatch_ratio": _float_policy(
                policy, "significant_unit_price_mismatch_ratio"
            ),
            "significant_discount_delta_ratio": _float_policy(
                policy, "significant_discount_delta_ratio"
            ),
        },
        "severity_reasons": case["severity_reasons"],
    }


def _promotion_decision(summary: dict[str, Any]) -> dict[str, Any]:
    blockers: list[str] = []
    threshold = PROMOTION_THRESHOLD
    if summary["case_count"] != threshold["required_case_count"]:
        blockers.append(
            f"case count {summary['case_count']} != required {threshold['required_case_count']}"
        )
    if summary["cache_evidence_status_count"] > 0:
        blockers.append("cache-derived evidence present")
    if summary["provider_error_count"] > threshold["max_provider_errors"]:
        blockers.append("provider-error packets present")
    significant_failures = int(summary["severity_counts"].get("significant_failure", 0))
    if significant_failures > threshold["max_significant_failures"]:
        blockers.append(f"{significant_failures} significant_failure cases present")

    unclassified = [
        case["case_id"]
        for case in summary["cases"]
        if case["strict_status"].startswith("threshold-failed")
        and any("unclassified" in reason for reason in case["threshold_failure_reasons"])
    ]
    if unclassified:
        blockers.append("unclassified threshold failures: " + ", ".join(unclassified))

    prompt_lab_threshold_passed = not blockers
    runtime_reasons = list(threshold["runtime_evidence_required"])
    return {
        "threshold_id": threshold["threshold_id"],
        "prompt_lab_threshold_passed": prompt_lab_threshold_passed,
        "production_promotion_allowed": False,
        "blocking_reasons": blockers,
        "minor_review_count": int(summary["severity_counts"].get("minor_review", 0)),
        "production_blocking_reasons": [
            *blockers,
            *runtime_reasons,
        ],
    }


def _provenance_highlights(provenance: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not provenance:
        return []
    interesting = {
        "created",
        "normalized",
        "removed",
        "suppressed",
        "synthesized",
        "ignored_by_postprocess",
        "explicit_receipt_discount",
        "visible_adjustment_total",
        "ignored_informational_savings",
        "multiplier_accepted",
        "multiplier_rejected",
        "n_for_price_parsed",
        "conflict_unresolved",
        "major_reconstruction_warning",
    }
    highlights = []
    for field in provenance.get("fields", []):
        if field.get("operation") in interesting and field.get("origin_stage") == "postprocess":
            highlights.append(
                {
                    "field_path": field.get("field_path"),
                    "operation": field.get("operation"),
                    "notes": field.get("notes"),
                }
            )
    return highlights[:12]


def _markdown(summary: dict[str, Any]) -> str:
    lines = [
        f"# {_title(summary['label'])} Prompt-Lab Analysis",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Cases: `{summary['case_count']}`",
        f"- Baselined/scored cases: `{summary['baseline_counts']['scored']}`",
        f"- Unbaselined smoke cases: `{summary['baseline_counts']['unbaselined_smoke']}`",
        f"- Total tokens: `{summary['totals']['total_tokens']}` "
        f"({summary['totals']['input_tokens']} input / "
        f"{summary['totals']['output_tokens']} output)",
        f"- Estimated Gastify cost: `${summary['totals']['cost_usd']}`",
        f"- Legacy comparison basis: `{summary['legacy_comparison']['legacy_cost_kind']}`",
        f"- Validation policy: `{summary['validation_policy']['policy_id']}"
        f"@{summary['validation_policy']['policy_version']}`",
        f"- Strict counts: `{summary['strict_counts']}`",
        f"- Severity counts: `{summary['severity_counts']}`",
        f"- No-cache evidence valid: `{summary['no_cache_evidence_valid']}`",
        "- Prompt-lab promotion threshold passed: "
        f"`{summary['promotion_decision']['prompt_lab_threshold_passed']}`",
        "- Production promotion allowed: "
        f"`{summary['promotion_decision']['production_promotion_allowed']}`",
        f"- Promotion blockers: `{summary['promotion_decision']['production_blocking_reasons']}`",
        "",
        "## Threshold Factor Matrix",
        "",
        "| Case | Strict | Severity | Transaction Factors | Reconstruction Factors | "
        "Severity Metrics | Error Summary |",
        "|---|---|---|---|---|---|---|",
    ]
    for case in summary["cases"]:
        lines.append(
            "| "
            f"{case['case_id']} | "
            f"{case['strict_status']} | "
            f"{case['severity_status']} | "
            f"{_transaction_factor_cell(case)} | "
            f"{_reconstruction_factor_cell(case)} | "
            f"{_severity_metric_cell(case)} | "
            f"{_error_summary_cell(case)} |"
        )
    lines.extend(
        [
            "",
            "## Raw Vs Processed Arithmetic",
            "",
            (
                "This table separates first extraction misses from deterministic "
                "postprocess/math failures. A zero transaction delta means the final "
                "payable total was read correctly. Item severity is driven by item "
                "identity coverage, item count, item total-price matches, and gross "
                "item-sum distance."
            ),
            "",
            "| Case | Primary Stage | Raw Transaction | Raw Items | Raw Item Sum | "
            "Processed Transaction | Processed Items | Processed Item Sum | Stage Reason |",
            "|---|---|---|---|---|---|---|---|---|",
        ]
    )
    for case in summary["cases"]:
        raw_diagnostics = case["raw_diagnostics"]
        processed_diagnostics = case["processed_diagnostics"]
        attribution = case["stage_attribution"]
        lines.append(
            "| "
            f"{case['case_id']} | "
            f"{attribution['primary_stage']} | "
            f"{_diagnostic_transaction_cell(raw_diagnostics)} | "
            f"{_diagnostic_items_cell(raw_diagnostics)} | "
            f"{_diagnostic_item_sum_cell(raw_diagnostics)} | "
            f"{_diagnostic_transaction_cell(processed_diagnostics)} | "
            f"{_diagnostic_items_cell(processed_diagnostics)} | "
            f"{_diagnostic_item_sum_cell(processed_diagnostics)} | "
            f"{_markdown_cell(attribution['reason'])} |"
        )
    mismatch_cases = [
        case
        for case in summary["cases"]
        if case["raw_diagnostics"]["item_total_mismatch_count"] > 0
        or case["processed_diagnostics"]["item_total_mismatch_count"] > 0
    ]
    lines.extend(
        [
            "",
            "## Item Price Delta Details",
            "",
            (
                "This table shows the first item-level total-price deltas where raw or "
                "processed item totals differ from the baseline. Positive deltas mean "
                "the scan value is higher than expected; negative deltas mean it is lower."
            ),
            "",
        ]
    )
    if not mismatch_cases:
        lines.append("- No item total-price deltas were found.")
    else:
        lines.extend(
            [
                "| Case | Raw Item Deltas | Processed Item Deltas |",
                "|---|---|---|",
            ]
        )
        for case in mismatch_cases:
            lines.append(
                "| "
                f"{case['case_id']} | "
                f"{_item_mismatch_cell(case['raw_diagnostics'])} | "
                f"{_item_mismatch_cell(case['processed_diagnostics'])} |"
            )
    lines.extend(_fix_focus_lines(summary))
    lines.extend(
        [
            "",
            "## Run Output Summary",
            "",
            (
                "| Case | Status | Strict | Severity | Tx Gate | Recon Gate | Final | Gross | "
                "Discount | Reconstructed | Discrepancy | Severity | Tokens | Cost USD |"
            ),
            "|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|",
        ]
    )
    for case in summary["cases"]:
        lines.append(
            "| "
            f"{case['case_id']} | "
            f"{case['status']} | "
            f"{case['strict_status']} | "
            f"{case['severity_status']} | "
            f"{case['transaction_gate_passed']} | "
            f"{case['reconstruction_gate_passed']} | "
            f"{case['final_total_minor']} | "
            f"{case['gross_total_minor']} | "
            f"{case['discount_total_minor']} | "
            f"{case['reconstructed_total_minor']} | "
            f"{case['discrepancy_minor_units']} | "
            f"{case['reconciliation_severity']} | "
            f"{case['tokens']['total_tokens']} | "
            f"{case['cost_usd']} |"
        )
    lines.extend(
        [
            "",
            "## Gate Failure Details",
            "",
            "| Case | Status | Transaction Match | Final Total | Expected Final | "
            "Before Discount | Discount | Items Extracted | Items Expected | Item Delta | "
            "Item Totals Name/Pos | Item Totals Match | Full Matches Name/Pos | "
            "Quantities Name/Pos | Unit Prices Name/Pos | Discount Match | Failure Reasons |",
            "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|",
        ]
    )
    for case in summary["cases"]:
        expected_count = case["expected_item_count"]
        reasons = "; ".join(case["threshold_failure_reasons"]) or "-"
        severity_reasons = "; ".join(case["severity_reasons"]) or "-"
        total_match_text = _name_pos_match_count(
            case["item_total_matches_by_name"],
            case["item_total_matches"],
            expected_count,
        )
        full_match_text = _name_pos_match_count(
            case["full_item_matches_by_name"],
            case["full_item_matches"],
            expected_count,
        )
        quantity_match_text = _name_pos_match_count(
            case["quantity_matches_by_name"],
            case["quantity_matches"],
            expected_count,
        )
        unit_match_text = _name_pos_match_count(
            case["unit_price_matches_by_name"],
            case["unit_price_matches"],
            expected_count,
        )
        lines.append(
            "| "
            f"{case['case_id']} | "
            f"{case['status']} ({case['severity_status']}: {severity_reasons}) | "
            f"{_optional_text(case['transaction_gate_passed'])} | "
            f"{_optional_text(case['final_total_minor'])} | "
            f"{_optional_text(case['expected_total_minor'])} | "
            f"{_optional_text(case['gross_total_minor'])} | "
            f"{_optional_text(case['discount_total_minor'])} | "
            f"{case['extracted_item_count']} | "
            f"{expected_count if expected_count is not None else 'n/a'} | "
            f"{_optional_text(case['item_count_delta'])} | "
            f"{total_match_text} | "
            f"{_optional_text(case['item_totals_match'])} | "
            f"{full_match_text} | "
            f"{quantity_match_text} | "
            f"{unit_match_text} | "
            f"{_optional_text(case['discount_total_match'])} | "
            f"{reasons} |"
        )
    lines.extend(["", "## Provenance Highlights", ""])
    for case in summary["cases"]:
        lines.append(f"### {case['case_id']}")
        highlights = case["provenance_highlights"]
        if not highlights:
            lines.append("- No post-processing highlights recorded.")
        for item in highlights:
            lines.append(f"- `{item['field_path']}`: `{item['operation']}` - {item['notes']}")
        lines.append("")
    return "\n".join(lines)


def _transaction_factor_cell(case: dict[str, Any]) -> str:
    factors = case["threshold_factors"]["transaction"]
    return _br_join(
        [
            f"merchant={_bool_label(factors['merchant_match'])}",
            f"currency={_bool_label(factors['currency_match'])}",
            f"total={_bool_label(factors['final_total_match'])}",
            f"visible_total={_visible_conflict_label(factors['visible_total_conflict'])}",
            f"math={_bool_label(factors['math_passed'])}",
            f"categories={_bool_label(factors['all_category_keys_valid'])}",
        ]
    )


def _reconstruction_factor_cell(case: dict[str, Any]) -> str:
    expected_count = case["expected_item_count"]
    expected_count_text = str(expected_count) if expected_count is not None else "n/a"
    factors = case["threshold_factors"]["reconstruction"]
    total_match_text = _name_pos_match_count(
        case["item_total_matches_by_name"],
        case["item_total_matches"],
        expected_count,
    )
    full_match_text = _name_pos_match_count(
        case["full_item_matches_by_name"],
        case["full_item_matches"],
        expected_count,
    )
    quantity_match_text = _name_pos_match_count(
        case["quantity_matches_by_name"],
        case["quantity_matches"],
        expected_count,
    )
    unit_match_text = _name_pos_match_count(
        case["unit_price_matches_by_name"],
        case["unit_price_matches"],
        expected_count,
    )
    parts = [
        f"items={case['extracted_item_count']}/{expected_count_text} "
        f"(delta {_optional_text(factors['item_count_delta'])})",
        f"names={_match_count(case['matched_item_names'], expected_count)}",
        f"item_totals={total_match_text}",
        f"full={full_match_text}",
        f"qty={quantity_match_text}",
        f"unit={unit_match_text}",
        "discount="
        f"{_bool_label(case['discount_total_match'])} "
        f"({_optional_text(case['discount_total_minor'])}/"
        f"{_optional_text(case['expected_discount_total_minor'])}, "
        f"delta {_optional_text(factors['discount_delta_minor'])})",
    ]
    if factors.get("single_item_positional_fallback") is True:
        parts.append("severity_basis=single-item positional")
    return _br_join(parts)


def _severity_metric_cell(case: dict[str, Any]) -> str:
    factors = case["threshold_factors"]
    recon = factors["reconstruction"]
    thresholds = factors["policy_thresholds"]
    return _br_join(
        [
            _ratio_line(
                "math",
                case["discrepancy_ratio"],
                thresholds["major_reconstruction_discrepancy_ratio"],
            ),
            _ratio_line(
                "item_count_delta",
                recon["item_count_delta_ratio"],
                thresholds["significant_item_count_delta_ratio"],
            ),
            _ratio_line(
                "item_total_missing_effective",
                recon["item_total_mismatch_ratio"],
                thresholds["significant_item_total_mismatch_ratio"],
            ),
            _ratio_line(
                "qty_missing_effective",
                recon["quantity_mismatch_ratio"],
                thresholds["significant_quantity_mismatch_ratio"],
            ),
            _ratio_line(
                "unit_missing_effective",
                recon["unit_price_mismatch_ratio"],
                thresholds["significant_unit_price_mismatch_ratio"],
            ),
            f"severity_basis={recon['severity_match_basis']}",
            _ratio_line(
                "item_total_missing_pos",
                recon["positional_item_total_mismatch_ratio"],
                thresholds["significant_item_total_mismatch_ratio"],
            ),
            _ratio_line(
                "discount_delta",
                recon["discount_delta_ratio"],
                thresholds["significant_discount_delta_ratio"],
            ),
        ]
    )


def _error_summary_cell(case: dict[str, Any]) -> str:
    threshold = case["threshold_failure_reasons"]
    severity = case["severity_reasons"]
    parts = []
    if threshold:
        parts.append("threshold: " + "; ".join(str(reason) for reason in threshold))
    if severity:
        parts.append("severity: " + "; ".join(str(reason) for reason in severity))
    return _markdown_cell("<br>".join(parts) if parts else "-")


def _diagnostic_transaction_cell(diagnostics: dict[str, Any]) -> str:
    return _br_join(
        [
            "total="
            f"{_optional_text(diagnostics['transaction_total_minor'])}/"
            f"{_optional_text(diagnostics['expected_transaction_total_minor'])}",
            _delta_with_ratio(
                diagnostics["transaction_total_delta_minor"],
                diagnostics["transaction_total_delta_ratio"],
            ),
        ]
    )


def _diagnostic_items_cell(diagnostics: dict[str, Any]) -> str:
    expected_count = diagnostics["expected_item_count"]
    name_matches = _match_count(diagnostics["item_name_matches"], expected_count)
    price_matches = _match_count(diagnostics["item_total_matches"], expected_count)
    return _br_join(
        [
            f"names={name_matches}",
            f"prices={price_matches}",
            "count="
            f"{diagnostics['item_count']}/"
            f"{_optional_text(expected_count)} "
            f"(delta {_optional_text(diagnostics['item_count_delta'])})",
        ]
    )


def _diagnostic_item_sum_cell(diagnostics: dict[str, Any]) -> str:
    return _br_join(
        [
            "sum="
            f"{_optional_text(diagnostics['item_total_sum_minor'])}/"
            f"{_optional_text(diagnostics['expected_item_total_sum_minor'])}",
            _delta_with_ratio(
                diagnostics["item_total_sum_delta_minor"],
                diagnostics["item_total_sum_delta_ratio"],
            ),
            f"sum-final delta={_optional_text(diagnostics['item_sum_to_final_delta_minor'])}",
        ]
    )


def _item_mismatch_cell(diagnostics: dict[str, Any]) -> str:
    mismatches = diagnostics["item_total_mismatches"]
    if not mismatches:
        return "-"
    lines = []
    for mismatch in mismatches[:8]:
        lines.append(
            "#"
            f"{mismatch['index'] + 1} "
            f"{_optional_text(mismatch['expected_name'])} -> "
            f"{_optional_text(mismatch['actual_name'])}: "
            f"{_optional_text(mismatch['expected_total_minor'])} -> "
            f"{_optional_text(mismatch['actual_total_minor'])} "
            f"(delta {_optional_text(mismatch['delta_minor'])})"
        )
    remaining = len(mismatches) - len(lines)
    if remaining > 0:
        lines.append(f"+{remaining} more")
    return _br_join(lines)


def _fix_focus_lines(summary: dict[str, Any]) -> list[str]:
    failed_cases = [
        case for case in summary["cases"] if case["strict_status"].startswith("threshold-failed")
    ]
    if not failed_cases:
        return [
            "",
            "## Fix Focus From This Run",
            "",
            "- No threshold-failed cases in this run.",
        ]

    tx_ok_count = sum(
        1 for case in failed_cases if case["raw_diagnostics"]["transaction_total_delta_minor"] == 0
    )
    raw_cases = [
        case
        for case in failed_cases
        if case["stage_attribution"]["primary_stage"] == "raw-extraction"
    ]
    postprocess_cases = [
        case
        for case in failed_cases
        if case["stage_attribution"]["primary_stage"] == "postprocess/math"
    ]
    item_alignment_cases = [
        case
        for case in raw_cases
        if case["raw_diagnostics"]["item_name_matches"]
        == case["raw_diagnostics"]["expected_item_count"]
        and case["raw_diagnostics"]["item_total_mismatch_count"] > 0
    ]
    processed_worse_cases = [
        case
        for case in failed_cases
        if _abs_int(case["processed_diagnostics"]["item_total_sum_delta_minor"])
        > _abs_int(case["raw_diagnostics"]["item_total_sum_delta_minor"])
    ]
    one_item_delta_cases = [
        case for case in raw_cases if case["raw_diagnostics"]["item_total_mismatch_count"] == 1
    ]

    lines = [
        "",
        "## Fix Focus From This Run",
        "",
        (
            f"- Final transaction total is not the current blocker: {tx_ok_count}/"
            f"{len(failed_cases)} threshold-failed cases have raw transaction total delta `0`."
        ),
    ]
    if raw_cases:
        lines.append(
            "- Raw extraction is the primary stage for "
            f"{len(raw_cases)}/{len(failed_cases)} failed cases: "
            f"{_case_list(raw_cases)}."
        )
    if postprocess_cases:
        lines.append(
            "- Deterministic postprocess/math is the primary stage for "
            f"{len(postprocess_cases)}/{len(failed_cases)} failed cases: "
            f"{_case_list(postprocess_cases)}."
        )
    if item_alignment_cases:
        lines.append(
            "- Evaluation contract fix: "
            f"{len(item_alignment_cases)} failed cases identify every expected item name but "
            "still lose many positional item-price matches. Add a name/amount matching pass "
            "before pricing severity treats row-position drift as broad item failure. Cases: "
            f"{_case_list(item_alignment_cases)}."
        )
    if one_item_delta_cases:
        lines.append(
            "- Prompt/model fix: one-item price misses are isolated in "
            f"{_case_list(one_item_delta_cases)}; prioritize quantity times unit-price "
            "evidence for those receipts."
        )
    if processed_worse_cases:
        lines.append(
            "- Coalesce/math fix: processed item-sum distance is worse than raw in "
            f"{_case_list(processed_worse_cases)}; inspect normalization rules that changed "
            "raw item totals before scoring."
        )
    return lines


def _case_list(cases: list[dict[str, Any]]) -> str:
    return ", ".join(f"`{case['case_id']}`" for case in cases)


def _abs_int(value: Any) -> int:
    return abs(int(value or 0))


def _delta_with_ratio(delta: Any, ratio: Any) -> str:
    return f"delta={_optional_text(delta)} ({_percent(ratio)})"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_optional_json(path: str | None) -> dict[str, Any] | None:
    if not path:
        return None
    candidate = Path(path)
    if not candidate.exists():
        return None
    return _load_json(candidate)


def _match_count(value: Any, expected_count: int | None) -> str:
    if value is None or expected_count is None:
        return "n/a"
    return f"{value}/{expected_count}"


def _name_pos_match_count(
    name_value: Any, positional_value: Any, expected_count: int | None
) -> str:
    name_text = _match_count(name_value, expected_count)
    positional_text = _match_count(positional_value, expected_count)
    if name_text == positional_text:
        return name_text
    return f"{name_text} (pos {positional_text})"


def _br_join(parts: list[str]) -> str:
    return _markdown_cell("<br>".join(parts))


def _markdown_cell(value: str) -> str:
    return value.replace("|", "/")


def _bool_label(value: Any) -> str:
    if value is True:
        return "ok"
    if value is False:
        return "fail"
    return "n/a"


def _visible_conflict_label(value: Any) -> str:
    if value is True:
        return "conflict"
    if value is False:
        return "none"
    return "n/a"


def _ratio_line(label: str, ratio: Any, threshold: float | None) -> str:
    threshold_text = f"sig>{_percent(threshold)}" if threshold is not None else "sig>n/a"
    return f"{label}={_percent(ratio)} ({threshold_text})"


def _percent(value: Any) -> str:
    if value is None:
        return "n/a"
    return f"{float(value) * 100:.1f}%"


def _optional_text(value: Any) -> str:
    return "n/a" if value is None else str(value)


def _fallback(value: Any, fallback: Any) -> Any:
    return fallback if value is None else value


def _count_values(values: Any) -> dict[str, int]:
    counts: dict[str, int] = {}
    for value in values:
        key = str(value)
        counts[key] = counts.get(key, 0) + 1
    return counts


def _validation_policy(cases: list[dict[str, Any]]) -> dict[str, Any]:
    for case in cases:
        policy = case.get("validation_policy")
        if isinstance(policy, dict):
            return policy
    return DEFAULT_RECEIPT_VALIDATION_POLICY.to_dict()


def _legacy_severity_status(manifest: dict[str, Any]) -> str:
    status = str(manifest.get("status") or "")
    if status.startswith("completed"):
        return "pass"
    if status.startswith("threshold-failed"):
        return "minor_review"
    return status or "unknown"


def _money(value: Decimal) -> str:
    return format(value.normalize(), "f")


def _int_or_none(value: Any) -> int | None:
    if value is None:
        return None
    return int(Decimal(str(value)))


def _minor_from_item(value: Any, currency: str) -> int | None:
    if value is None:
        return None
    return to_minor_units(Decimal(str(value)), currency)


def _optional_delta(actual: int | None, expected: int | None) -> int | None:
    if actual is None or expected is None:
        return None
    return actual - expected


def _optional_money_delta(actual: int | None, expected: int | None) -> int | None:
    if actual is None and expected is None:
        return None
    return (actual or 0) - (expected or 0)


def _optional_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _missing_count(matches: Any, expected_count: int | None) -> int | None:
    if matches is None or expected_count is None:
        return None
    return max(expected_count - int(matches), 0)


def _max_int_match(left: Any, right: Any) -> Any:
    if isinstance(left, int) and isinstance(right, int):
        return max(left, right)
    if isinstance(right, int):
        return right
    return left


def _ratio_abs(value: Any, denominator: int | None) -> float | None:
    if value is None or denominator in (None, 0):
        return None
    return abs(float(value)) / abs(float(denominator))


def _float_policy(policy: dict[str, Any], key: str) -> float | None:
    value = policy.get(key)
    if value is None:
        return None
    return float(value)


def _quantity_equal(left: Decimal | None, right: Decimal | None) -> bool:
    return (left or Decimal(1)) == (right or Decimal(1))


def _slug(value: str) -> str:
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")
    return "-".join(part for part in slug.split("-") if part) or "batch"


def _title(value: str) -> str:
    return " ".join(part.capitalize() for part in _slug(value).split("-"))
