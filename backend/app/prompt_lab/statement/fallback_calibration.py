"""Gemini fallback calibration mode for statement prompt-lab."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal

from app.config import settings
from app.prompt_lab.paths import LATEST_RESULTS_ROOT, ensure_workspace
from app.prompt_lab.run_ids import next_serial_run_id, slug_run_id
from app.prompt_lab.statement.cases import StatementCase, get_statement_case
from app.prompt_lab.statement.readiness import (
    FALLBACK_PROMOTED_WITH_CAVEATS,
    FALLBACK_READY_WITH_CAVEATS,
    FALLBACK_STRICT_READY,
    aggregate_fallback_readiness,
    candidate_safety_from_report_case,
    case_fallback_readiness,
)
from app.prompt_lab.statement.report import write_statement_expected_report
from app.prompt_lab.statement.runner import run_statement_case
from app.prompt_lab.statement.suite import DEFAULT_STATEMENT_SUITE_CASE_IDS

CALIBRATION_SCHEMA_VERSION = "statement-gemini-fallback-calibration.v1"
DEFAULT_BASELINE_RUN_ID = "20260527T011456Z-001-statement-fallback-calibration"
_IMPACT_WEIGHTS = {
    "missing_extra_line": 100,
    "amount_minor": 100,
    "date": 80,
    "currency": 80,
    "line_type": 40,
    "description": 30,
    "installment": 30,
    "missing_single_installment_marker": 5,
    "original_currency": 15,
    "original_amount_minor": 15,
    "order_drift": 5,
}
PromptSuggestionClassification = Literal[
    "generalizable",
    "schema_invariant",
    "single_case_but_generic",
    "case_specific_rejected",
]

_FIELD_FAILURE_CLASSES = {
    "amount_minor": "amount_selection",
    "date": "date",
    "description": "description_drift",
    "line_type": "line_type",
    "currency": "currency",
    "installment": "installment_recurrence",
    "original_currency": "amount_candidates_evidence",
    "original_amount_minor": "amount_candidates_evidence",
}
_FAILURE_CLASS_ORDER = [
    "amount_selection",
    "missing_extra_lines",
    "description_drift",
    "line_type",
    "date",
    "currency",
    "installment_recurrence",
    "amount_candidates_evidence",
    "ordering_drift",
]
_FORBIDDEN_ISSUER_TOKENS = (
    "cmr",
    "falabella",
    "edwards",
    "scotiabank",
)
_FORBIDDEN_LAYOUT_TOKENS = (
    "pymupdf",
    "coordinate",
    "coordinates",
    "x-coordinate",
    "y-coordinate",
    "x0",
    "y0",
    "x1",
    "y1",
    "bounding box",
    "pixel",
    "column x",
)
_FORBIDDEN_MERCHANT_TOKENS = (
    "mercadopago",
    "amazon",
    "codiner",
)
_SCHEMA_FIELD_TOKENS = (
    "amount_minor",
    "line_type",
    "installment",
    "original_currency",
    "original_amount_minor",
    "source_order",
)


async def run_statement_fallback_calibration(
    *,
    case_ids: list[str] | None = None,
    run_id: str | None = None,
    output_root: Path = LATEST_RESULTS_ROOT,
    credentials_root: Path | None = None,
    transaction_scope_firebase_uid: str | None = None,
    live: bool = False,
    cache_only: bool = False,
    bypass_cache: bool = False,
    from_manifest_paths: list[Path] | None = None,
    model: str | None = None,
    prompt_id: str | None = None,
    gemini_input: str = "profile-rows",
) -> dict[str, Any]:
    """Run or reuse Gemini-only statement outputs and write calibration reports."""
    ensure_workspace()
    source_manifests = [Path(path) for path in from_manifest_paths or []]
    selected_case_ids = case_ids or DEFAULT_STATEMENT_SUITE_CASE_IDS
    cases = (
        _cases_from_manifests(source_manifests)
        if source_manifests
        else [get_statement_case(case_id) for case_id in selected_case_ids]
    )
    _assert_expected_fixtures(cases)

    calibration_parent = output_root / "statements"
    resolved_run_id = slug_run_id(
        run_id or next_serial_run_id(calibration_parent, "statement-fallback-calibration")
    )
    calibration_dir = calibration_parent / resolved_run_id
    gemini_dir = calibration_dir / "gemini-only"
    calibration_dir.mkdir(parents=True, exist_ok=True)
    gemini_dir.mkdir(parents=True, exist_ok=True)

    manifest_paths = (
        source_manifests
        if source_manifests
        else await _run_gemini_cases(
            cases=cases,
            gemini_dir=gemini_dir,
            run_id=resolved_run_id,
            credentials_root=credentials_root,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            live=live,
            cache_only=cache_only,
            bypass_cache=bypass_cache,
            model=model,
            prompt_id=prompt_id,
            gemini_input=gemini_input,
        )
    )
    approach_manifest = await write_statement_expected_report(
        run_id=resolved_run_id,
        output_dir=gemini_dir,
        case_output_root=gemini_dir / "cases",
        actual_source="live-gemini",
        manifest_paths=manifest_paths,
        transaction_scope_firebase_uid=transaction_scope_firebase_uid,
    )
    approach_report = _load_json(Path(str(approach_manifest["report_path"])))
    report = build_statement_fallback_calibration_report(
        run_id=resolved_run_id,
        calibration_dir=calibration_dir,
        gemini_dir=gemini_dir,
        approach_report=approach_report,
        approach_manifest=approach_manifest,
        source_manifest_paths=manifest_paths,
        run_mode=_run_mode(
            from_manifest=bool(source_manifests),
            live=live,
            cache_only=cache_only,
            bypass_cache=bypass_cache,
        ),
        provider_calls_allowed=live and not bool(source_manifests),
        cache_policy=_cache_policy(
            from_manifest=bool(source_manifests),
            live=live,
            cache_only=cache_only,
            bypass_cache=bypass_cache,
        ),
        model=model or settings.gemini_model,
        prompt_id=prompt_id or settings.statement_extraction_prompt_id,
        gemini_input=gemini_input,
        transaction_scope_firebase_uid=transaction_scope_firebase_uid,
    )
    _write_calibration_outputs(calibration_dir=calibration_dir, report=report)
    return _summary(report)


def build_statement_fallback_calibration_report(
    *,
    run_id: str,
    calibration_dir: Path,
    gemini_dir: Path,
    approach_report: dict[str, Any],
    approach_manifest: dict[str, Any],
    source_manifest_paths: list[Path],
    run_mode: str,
    provider_calls_allowed: bool,
    cache_policy: str,
    model: str,
    prompt_id: str,
    gemini_input: str,
    transaction_scope_firebase_uid: str | None,
) -> dict[str, Any]:
    """Build a calibration report from an existing live-Gemini approach report."""
    case_summaries = [_case_summary(case) for case in approach_report.get("cases", [])]
    totals = _totals(case_summaries, approach_report)
    _apply_case_contribution_percentages(case_summaries, totals)
    prompt_candidates = build_prompt_improvement_candidates(case_summaries)
    fallback_readiness = aggregate_fallback_readiness(
        approach="gemini",
        case_summaries=case_summaries,
        require_provider_quality=True,
    )
    runtime_readiness = build_runtime_critical_field_readiness(totals)
    improvement_potential = build_improvement_potential(totals, prompt_candidates)
    provider_cost_report = build_provider_cost_report(totals)
    recommendation = _calibration_recommendation(
        case_summaries=case_summaries,
        prompt_candidates=prompt_candidates,
        fallback_readiness=fallback_readiness,
    )
    baseline_comparison = _baseline_comparison(
        calibration_dir=calibration_dir,
        totals=totals,
    )
    return {
        "schema_version": CALIBRATION_SCHEMA_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "run_id": run_id,
        "calibration_dir": str(calibration_dir),
        "gemini_dir": str(gemini_dir),
        "run_mode": run_mode,
        "provider": "gemini",
        "provider_calls_allowed": provider_calls_allowed,
        "cache_policy": cache_policy,
        "model": model,
        "prompt_id": prompt_id,
        "gemini_input": gemini_input,
        "transaction_scope_firebase_uid": transaction_scope_firebase_uid,
        "recommendation": recommendation,
        "fallback_readiness": fallback_readiness,
        "fallback_transaction_readiness": fallback_readiness.get(
            "fallback_transaction_readiness"
        ),
        "fallback_p0_components": fallback_readiness.get("fallback_p0_components", {}),
        "fallback_caveat_impact": fallback_readiness.get("fallback_caveat_impact", []),
        "line_coverage_band": fallback_readiness.get("line_coverage_band"),
        "decision_explanation": fallback_readiness.get("decision_explanation"),
        "cases": case_summaries,
        "totals": totals,
        "runtime_critical_field_readiness": runtime_readiness,
        "improvement_potential": improvement_potential,
        "provider_cost_report": provider_cost_report,
        "baseline_comparison": baseline_comparison,
        "failure_classes": _aggregate_failure_classes(case_summaries),
        "prompt_improvement_candidates": prompt_candidates,
        "recommended_prompt_improvements": [
            candidate
            for candidate in prompt_candidates
            if candidate["classification"] != "case_specific_rejected"
        ],
        "anti_overfit_policy": {
            "name": "issuer-neutral-examples",
            "recommended_guidance_must_not_include": [
                "issuer names",
                "filenames",
                "case ids",
                "exact merchant names",
                "coordinate or layout-library instructions",
            ],
            "classifications": [
                "generalizable",
                "schema_invariant",
                "single_case_but_generic",
                "case_specific_rejected",
            ],
        },
        "source_manifest_paths": [str(path) for path in source_manifest_paths],
        "approach_report_path": approach_manifest["report_path"],
        "approach_markdown_path": approach_manifest["markdown_path"],
        "privacy": {
            "raw_pdfs_committed": False,
            "credentials_committed": False,
            "calibration_artifacts_are_private": True,
        },
    }


def build_prompt_improvement_candidates(
    case_summaries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return issuer-neutral prompt recommendations from calibration failures."""
    field_counts = _sum_counter(case["field_mismatch_counts"] for case in case_summaries)
    failure_classes = _aggregate_failure_classes(case_summaries)
    candidates: list[dict[str, Any]] = []
    if field_counts.get("amount_minor") or failure_classes.get("amount_selection", 0):
        candidates.append(
            _candidate(
                candidate_id="amount-current-statement-line",
                priority="P0 financial correctness",
                impacted_fields=["amount_minor", "amount_candidates", "amount_selection_reason"],
                failure_classes=["amount_selection", "amount_candidates_evidence"],
                impact=(
                    "Wrong amounts block valid receipt matches and can create incorrect "
                    "statement-only transaction candidates."
                ),
                tradeoff=(
                    "The provider should prefer manual-review warnings when several money "
                    "columns look plausible instead of guessing a total or balance."
                ),
                regression_risk=(
                    "Medium: stricter amount rules can reduce extraction confidence on "
                    "statements that expose only one amount column."
                ),
                wording=(
                    "For each transaction row, set amount_minor to the amount charged or "
                    "credited on the current statement line. When installment, total plan, "
                    "pending balance, foreign original, and current charge amounts are all "
                    "visible, do not use totals, balances, or original purchase amounts as "
                    "amount_minor; keep those as amount_candidates with roles."
                ),
            )
        )
    if failure_classes.get("missing_extra_lines", 0):
        candidates.append(
            _candidate(
                candidate_id="line-coverage-no-summary-rows",
                priority="P0 financial correctness",
                impacted_fields=["lines", "source_order"],
                failure_classes=["missing_extra_lines"],
                impact=(
                    "Missing or extra lines can hide spend, duplicate spend, or invalidate "
                    "coverage metrics."
                ),
                tradeoff=(
                    "Broader row capture can accidentally include subtotal, payment due, or "
                    "previous balance summary rows unless the prompt excludes summaries."
                ),
                regression_risk="High: line coverage rules affect every unknown statement layout.",
                wording=(
                    "Extract every transaction, payment, fee, interest, tax, insurance, "
                    "refund, and adjustment row exactly once. Do not extract statement "
                    "summaries, previous balances, due totals, subtotals, or headers as "
                    "transaction lines."
                ),
            )
        )
    if field_counts.get("line_type"):
        candidates.append(
            _candidate(
                candidate_id="line-type-financial-behavior",
                priority="P1 reconciliation quality",
                impacted_fields=["line_type", "amount_minor"],
                failure_classes=["line_type"],
                impact=(
                    "Wrong line types can create spend candidates for credits or payments "
                    "and can force avoidable manual review."
                ),
                tradeoff=(
                    "Some issuer wording is ambiguous, so uncertain rows should keep a "
                    "warning rather than forcing a confident label."
                ),
                regression_risk=(
                    "Medium: classification vocabulary differs across statement families."
                ),
                wording=(
                    "Classify charges, fees, interest, tax, insurance, payments, refunds, "
                    "reversals, and adjustments by financial behavior. Negative credits, "
                    "payments, refunds, and reversals must not be marked as charge."
                ),
            )
        )
    if field_counts.get("installment"):
        candidates.append(
            _candidate(
                candidate_id="installment-marker-and-term-preservation",
                priority="P1 reconciliation quality",
                impacted_fields=[
                    "installment",
                    "recurrence_kind",
                    "term_current",
                    "term_total",
                    "recurrence_label",
                ],
                failure_classes=["installment_recurrence"],
                impact=(
                    "Missing installment or term data makes amount mistakes harder to "
                    "diagnose and weakens transaction recurrence suggestions."
                ),
                tradeoff=(
                    "Visible single-installment markers add audit detail but can create "
                    "low-value differences if not consistently printed."
                ),
                regression_risk="Low: visible term markers are usually explicit.",
                wording=(
                    "Preserve visible installment or term markers such as NN/MM, N of M, "
                    "or a printed number of installments. Map fixed-term evidence to the "
                    "term fields, and leave recurrence unknown when no visible evidence is "
                    "present."
                ),
            )
        )
    if field_counts.get("description"):
        candidates.append(
            _candidate(
                candidate_id="merchant-description-clean-boundary",
                priority="P1 reconciliation quality",
                impacted_fields=["description", "original_currency", "original_amount_minor"],
                failure_classes=["description_drift", "amount_candidates_evidence"],
                impact=(
                    "Description drift can lower merchant matching confidence and produce "
                    "unclear user-facing transaction candidates."
                ),
                tradeoff=(
                    "Over-cleaning can remove useful merchant branch or payment-network text."
                ),
                regression_risk=(
                    "Medium: description conventions differ across issuers and countries."
                ),
                wording=(
                    "Keep description focused on merchant or payee text. Do not append "
                    "foreign-currency markers, local currency labels, authorization notes, "
                    "or amount-column labels to description; store currency metadata in the "
                    "currency fields."
                ),
            )
        )
    if field_counts.get("currency") or field_counts.get("original_currency"):
        candidates.append(
            _candidate(
                candidate_id="currency-local-vs-original",
                priority="P1 reconciliation quality",
                impacted_fields=["currency", "original_currency", "original_amount_minor"],
                failure_classes=["currency", "amount_candidates_evidence"],
                impact=(
                    "Wrong currencies prevent reconciliation and make audit trails hard to "
                    "explain."
                ),
                tradeoff=(
                    "Foreign purchase rows may show both original and statement currencies, "
                    "so the prompt must keep both without swapping them."
                ),
                regression_risk="Medium: foreign-currency notation is format-dependent.",
                wording=(
                    "Use the statement billing currency for currency and amount_minor. "
                    "Use original_currency and original_amount_minor only for the printed "
                    "foreign original amount, preserving cent-based minor units when the "
                    "foreign currency has decimals."
                ),
            )
        )
    if field_counts.get("date"):
        candidates.append(
            _candidate(
                candidate_id="transaction-date-over-posting-date",
                priority="P1 reconciliation quality",
                impacted_fields=["date"],
                failure_classes=["date"],
                impact="Wrong dates can push receipts outside the reconciliation tolerance window.",
                tradeoff=(
                    "Some statements show transaction and posting dates together; when only "
                    "one is visible, the provider should record that date with a warning."
                ),
                regression_risk="Medium: date column labels vary across statement layouts.",
                wording=(
                    "Use the transaction purchase, payment, or movement date for date when "
                    "both transaction and posting dates are visible. If only one date is "
                    "visible, use it and add a warning that the date role was ambiguous."
                ),
            )
        )
    if failure_classes.get("ordering_drift", 0):
        candidates.append(
            _candidate(
                candidate_id="source-order-visible-row-order",
                priority="P2 metadata/completeness",
                impacted_fields=["source_order"],
                failure_classes=["ordering_drift"],
                impact=(
                    "Ordering drift does not fail value extraction, but it weakens manual "
                    "auditability when reviewing the PDF against artifacts."
                ),
                tradeoff="Strict order preservation should not override financial field accuracy.",
                regression_risk="Low: source_order is diagnostic metadata.",
                wording=(
                    "Set source_order to the visible transaction row order in the statement, "
                    "starting at 1 and increasing by one for each extracted line."
                ),
            )
        )
    candidates.extend(_rejected_case_specific_suggestions(case_summaries))
    return candidates


def build_runtime_critical_field_readiness(totals: dict[str, Any]) -> list[dict[str, str]]:
    """Return the executive table that maps extraction quality to runtime meaning."""
    field_counts = totals.get("field_mismatch_counts", {})
    comparable = int(totals.get("comparable_line_count") or 0)
    expected = int(totals.get("expected_line_count") or 0)
    actual = int(totals.get("actual_line_count") or 0)
    line_delta = int(totals.get("line_count_delta") or 0)
    return [
        _readiness_row(
            "Date",
            _mismatch_result(field_counts, "date", comparable),
            (
                "Safe for reconciliation date windows."
                if not int(field_counts.get("date", 0) or 0)
                else "Can push receipts outside the matching tolerance window."
            ),
        ),
        _readiness_row(
            "Amount",
            _mismatch_result(field_counts, "amount_minor", comparable),
            (
                "Safe for amount matching and candidate totals."
                if not int(field_counts.get("amount_minor", 0) or 0)
                else "Blocks matches or creates wrong transaction totals."
            ),
        ),
        _readiness_row(
            "Currency",
            _mismatch_result(field_counts, "currency", comparable),
            (
                "Safe for ledger currency and amount interpretation."
                if not int(field_counts.get("currency", 0) or 0)
                else "Can prevent matches or create unsafe candidate payloads."
            ),
        ),
        _readiness_row(
            "Line Coverage",
            f"{actual}/{expected} lines; delta {line_delta}",
            (
                "All expected rows are represented."
                if line_delta == 0
                else "Missing or extra rows can hide spend, credits, or duplicate candidates."
            ),
        ),
        _readiness_row(
            "Ledger Readiness",
            (
                f"{totals.get('ledger_ready_count', 0)} ready; "
                f"{totals.get('non_ledger_ready_count', 0)} held back"
            ),
            "Only ledger-ready lines can match receipts or create statement-only candidates.",
        ),
        _readiness_row(
            "Merchant Description",
            _mismatch_result(field_counts, "description", comparable),
            (
                "Merchant matching remains readable enough for fuzzy matching."
                if not int(field_counts.get("description", 0) or 0)
                else "Can reduce merchant-match confidence, but does not block ledger safety."
            ),
        ),
        _readiness_row(
            "Line Type",
            _mismatch_result(field_counts, "line_type", comparable),
            (
                "Spend/payment behavior is classified consistently."
                if not int(field_counts.get("line_type", 0) or 0)
                else "Can create wrong candidate behavior for payments, credits, fees, or charges."
            ),
        ),
        _readiness_row(
            "Installment And Original Currency Evidence",
            (
                f"installment {field_counts.get('installment', 0)}; "
                f"original currency {field_counts.get('original_currency', 0)}; "
                f"original amount {field_counts.get('original_amount_minor', 0)}"
            ),
            "Affects auditability and recurrence hints more than basic amount/date matching.",
        ),
    ]


def build_improvement_potential(
    totals: dict[str, Any],
    prompt_candidates: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Return a compact improvement/gain/complexity/risk table for summaries."""
    field_counts = totals.get("field_mismatch_counts", {})
    line_delta = abs(int(totals.get("line_count_delta") or 0))
    rows: list[dict[str, str]] = []
    if int(field_counts.get("amount_minor", 0) or 0):
        rows.append(
            _improvement_row(
                "Fix selected statement amount",
                "Highest: protects reconciliation and statement-created transaction totals.",
                "Medium",
                "Medium: stricter amount rules can lower coverage on unusual layouts.",
            )
        )
    else:
        rows.append(
            _improvement_row(
                "Preserve current amount/date/currency gates",
                "Keeps the fields that matter most for matching stable.",
                "Low",
                "Low: maintain existing strict scoring and safety checks.",
            )
        )
    if line_delta:
        rows.append(
            _improvement_row(
                "Improve missing/extra row coverage",
                "High: prevents hidden spend, credits, and false candidate transactions.",
                "Medium-high",
                "Medium: broader row capture can admit summaries or totals.",
            )
        )
    if int(field_counts.get("line_type", 0) or 0):
        rows.append(
            _improvement_row(
                "Tighten line type behavior",
                "Medium: avoids payment/credit rows becoming spend candidates.",
                "Low-medium",
                "Low: behavior vocabulary is small, but issuer wording varies.",
            )
        )
    if int(field_counts.get("installment", 0) or 0):
        rows.append(
            _improvement_row(
                "Preserve installment and term markers",
                "Medium: improves recurrence hints and amount-selection diagnostics.",
                "Low-medium",
                "Low: only visible evidence should be copied.",
            )
        )
    if int(field_counts.get("original_currency", 0) or 0) or int(
        field_counts.get("original_amount_minor", 0) or 0
    ):
        rows.append(
            _improvement_row(
                "Improve original-currency metadata",
                "Medium: improves auditability for foreign rows without changing ledger totals.",
                "Medium",
                "Low-medium: foreign notation is layout-dependent.",
            )
        )
    if int(field_counts.get("description", 0) or 0):
        rows.append(
            _improvement_row(
                "Normalize merchant descriptions for scoring",
                "Medium: makes reports clearer and improves fuzzy merchant confidence.",
                "Low-medium",
                "Low: merchant dirtiness should not block ledger-ready rows.",
            )
        )
    for candidate in prompt_candidates:
        if candidate.get("classification") == "case_specific_rejected":
            continue
        candidate_id = str(candidate.get("id") or "")
        if not candidate_id or any(row["improvement"] == candidate_id for row in rows):
            continue
        if len(rows) >= 6:
            break
        rows.append(
            _improvement_row(
                candidate_id,
                str(candidate.get("downstream_impact") or "Improves fallback extraction quality."),
                "Prompt-only",
                str(candidate.get("regression_risk") or "Unknown"),
            )
        )
    return rows[:6]


def build_provider_cost_report(totals: dict[str, Any]) -> list[dict[str, Any]]:
    """Return prompt-lab API cost controls for the fallback calibration summary."""
    cost_totals = totals.get("cost_totals", {})
    input_tokens = int(cost_totals.get("input_tokens") or 0)
    output_tokens = int(cost_totals.get("output_tokens") or 0)
    total_tokens = int(cost_totals.get("total_tokens") or input_tokens + output_tokens)
    total_cost = Decimal(str(cost_totals.get("cost_usd") or "0"))
    case_count = int(totals.get("case_count") or 0)
    provider_calls = case_count if total_tokens > 0 else 0
    ledger_ready = int(totals.get("ledger_ready_count") or 0)
    avg_tokens = round(total_tokens / provider_calls, 2) if provider_calls else 0
    avg_cost = (
        str((total_cost / Decimal(provider_calls)).quantize(Decimal("0.000000001")))
        if provider_calls
        else "0"
    )
    cost_per_line = (
        str((total_cost / Decimal(ledger_ready)).quantize(Decimal("0.000000001")))
        if ledger_ready and total_cost
        else "0"
    )
    return [
        {
            "approach": "gemini",
            "input_mode": next(iter(totals.get("gemini_input_modes", {"unknown": 0}))),
            "deterministic_calls_avoided": 0,
            "fallback_calls_made": provider_calls,
            "average_tokens_per_provider_call": avg_tokens,
            "average_cost_usd_per_provider_call": avg_cost,
            "total_input_tokens": input_tokens,
            "total_output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "total_cost_usd": str(total_cost),
            "cost_per_ledger_ready_line_usd": cost_per_line,
        }
    ]


def _readiness_row(field: str, current_result: str, downstream_meaning: str) -> dict[str, str]:
    return {
        "field": field,
        "current_result": current_result,
        "downstream_meaning": downstream_meaning,
    }


def _improvement_row(
    improvement: str,
    potential_gain: str,
    complexity: str,
    risk: str,
) -> dict[str, str]:
    return {
        "improvement": improvement,
        "potential_gain": potential_gain,
        "complexity": complexity,
        "risk": risk,
    }


def _mismatch_result(
    field_counts: dict[str, Any],
    field: str,
    comparable_lines: int,
) -> str:
    count = int(field_counts.get(field, 0) or 0)
    denominator = comparable_lines if comparable_lines > 0 else 1
    pct = round((count / denominator) * 100, 2)
    return f"{count} mismatches across {comparable_lines} comparable lines ({pct}%)"


def classify_prompt_suggestion(
    wording: str,
    *,
    case_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Classify whether prompt guidance is issuer-neutral enough for promotion."""
    lowered = wording.lower()
    forbidden = _forbidden_matches(lowered, case_ids=case_ids)
    if forbidden:
        return {
            "classification": "case_specific_rejected",
            "reasons": forbidden,
            "recommended_for_prompt_promotion": False,
        }
    if any(token in lowered for token in _SCHEMA_FIELD_TOKENS):
        classification: PromptSuggestionClassification = "schema_invariant"
    elif "when " in lowered or "for each " in lowered or "visible " in lowered:
        classification = "generalizable"
    else:
        classification = "single_case_but_generic"
    return {
        "classification": classification,
        "reasons": [],
        "recommended_for_prompt_promotion": True,
    }


async def _run_gemini_cases(
    *,
    cases: list[StatementCase],
    gemini_dir: Path,
    run_id: str,
    credentials_root: Path | None,
    transaction_scope_firebase_uid: str | None,
    live: bool,
    cache_only: bool,
    bypass_cache: bool,
    model: str | None,
    prompt_id: str | None,
    gemini_input: str,
) -> list[Path]:
    manifest_paths: list[Path] = []
    for case in cases:
        packet = await run_statement_case(
            case,
            prompt_id=prompt_id,
            model=model,
            live=live,
            cache_only=cache_only,
            bypass_cache=bypass_cache,
            credentials_root=credentials_root,
            run_id=run_id,
            artifact_dir=gemini_dir / "cases" / _case_slug(case.id) / "run",
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            gemini_input=gemini_input,
        )
        manifest_paths.append(Path(str(packet["manifest_path"])))
    return manifest_paths


def _cases_from_manifests(manifest_paths: list[Path]) -> list[StatementCase]:
    cases: list[StatementCase] = []
    for manifest_path in manifest_paths:
        manifest = _load_json(manifest_path)
        cases.append(get_statement_case(str(manifest["case_id"])))
    return cases


def _assert_expected_fixtures(cases: list[StatementCase]) -> None:
    missing = [
        case.id
        for case in cases
        if case.expected_path is None or not case.expected_path.exists()
    ]
    if missing:
        raise ValueError(
            "statement-fallback-calibrate requires expected fixtures for: "
            + ", ".join(missing)
        )


def _case_summary(case: dict[str, Any]) -> dict[str, Any]:
    extraction = case["current_extraction"]
    differences = extraction.get("differences", {})
    score = extraction.get("score_against_expected", {})
    field_counts = dict(differences.get("field_mismatch_counts", {}))
    expected_line_count = int(case.get("expected", {}).get("line_count", 0) or 0)
    actual_line_count = int(extraction.get("line_count", 0) or 0)
    comparable_lines = int(
        differences.get("comparable_lines")
        or max(min(expected_line_count, actual_line_count), 0)
    )
    ledger_ready_count = int(extraction.get("ledger_ready_count", 0) or 0)
    non_ledger_ready_count = int(extraction.get("non_ledger_ready_count", 0) or 0)
    corrections = _corrections_by_source_order(case)
    impact = _weighted_impact_summary(
        differences=differences,
        expected_line_count=expected_line_count,
        actual_line_count=actual_line_count,
        correction_by_source_order=corrections,
    )
    candidate_safety = candidate_safety_from_report_case(case)
    summary = {
        "case_id": case["case_id"],
        "issuer": case.get("issuer"),
        "status": extraction.get("source_status")
        or ("passed" if score.get("passed") else "failed"),
        "gemini_input_mode": extraction.get("gemini_input_mode", "pdf"),
        "pdf_evidence_summary": extraction.get("pdf_evidence_summary"),
        "compact_evidence_summary": extraction.get("compact_evidence_summary"),
        "compact_provider_evidence_summary": extraction.get(
            "compact_provider_evidence_summary"
        ),
        "passed": bool(score.get("passed")),
        "expected_line_count": expected_line_count,
        "actual_line_count": actual_line_count,
        "comparable_line_count": comparable_lines,
        "ledger_ready_count": ledger_ready_count,
        "non_ledger_ready_count": non_ledger_ready_count,
        "line_count_delta": differences.get("line_count_delta", 0),
        "field_mismatch_counts": field_counts,
        "field_mismatch_percentages": _field_mismatch_percentages(
            field_counts=field_counts,
            comparable_lines=comparable_lines,
        ),
        "missing_extra_percentages": _missing_extra_percentages(
            differences=differences,
            expected_line_count=expected_line_count,
        ),
        "weighted_impact": impact,
        "location_examples": impact["top_locations"],
        "coalesce_correction_count": len(corrections),
        "coalesce_corrections": [
            {"source_order": source_order, **correction}
            for source_order, correction in sorted(corrections.items())
        ],
        "severity_counts": dict(differences.get("severity_counts", {})),
        "pattern_counts": dict(differences.get("pattern_counts", {})),
        "failure_classes": _case_failure_classes(differences),
        "candidate_safety": candidate_safety,
        "promotion_blockers": list(differences.get("promotion_blockers", [])),
        "downstream_impact": list(differences.get("downstream_impact", [])),
        "recommended_owner": differences.get("recommended_owner"),
        "order_drift_count": int(
            differences.get("source_order_diagnostics", {}).get("order_drift_count") or 0
        ),
        "concrete_examples": _concrete_examples(differences),
        "reconciliation_counts": dict(case.get("reconciliation", {}).get("counts", {})),
        "payload_examples": dict(case.get("reconciliation", {}).get("payload_examples", {})),
        "artifact_dir": case.get("artifact_dir"),
        "source_manifest_path": extraction.get("source_manifest_path"),
    }
    summary["fallback_readiness"] = case_fallback_readiness(summary)
    summary["fallback_transaction_readiness"] = summary["fallback_readiness"].get(
        "fallback_transaction_readiness"
    )
    summary["fallback_p0_components"] = summary["fallback_readiness"].get(
        "fallback_p0_components", {}
    )
    summary["fallback_caveat_impact"] = summary["fallback_readiness"].get(
        "fallback_caveat_impact", []
    )
    summary["line_coverage_band"] = summary["fallback_readiness"].get("line_coverage_band")
    summary["decision_explanation"] = summary["fallback_readiness"].get(
        "decision_explanation"
    )
    return summary


def _field_mismatch_percentages(
    *,
    field_counts: dict[str, Any],
    comparable_lines: int,
) -> dict[str, float]:
    denominator = comparable_lines if comparable_lines > 0 else 1
    return {
        field: round((int(count or 0) / denominator) * 100, 2)
        for field, count in sorted(field_counts.items())
    }


def _missing_extra_percentages(
    *,
    differences: dict[str, Any],
    expected_line_count: int,
) -> dict[str, float]:
    denominator = expected_line_count if expected_line_count > 0 else 1
    missing_count = int(differences.get("missing_actual_count") or 0)
    extra_count = int(differences.get("extra_actual_count") or 0)
    return {
        "missing_actual_pct": round((missing_count / denominator) * 100, 2),
        "extra_actual_pct": round((extra_count / denominator) * 100, 2),
    }


def _weighted_impact_summary(
    *,
    differences: dict[str, Any],
    expected_line_count: int,
    actual_line_count: int,
    correction_by_source_order: dict[int, dict[str, Any]],
) -> dict[str, Any]:
    comparable_lines = int(differences.get("comparable_lines") or 0)
    denominator = comparable_lines if comparable_lines > 0 else max(
        min(expected_line_count, actual_line_count), 1
    )
    field_scores: dict[str, int] = {}
    locations: list[dict[str, Any]] = []
    total_score = 0

    for mismatch in differences.get("mismatches", []):
        for issue in mismatch.get("issues", []):
            field = str(issue.get("field") or "line")
            pattern = str(issue.get("pattern") or "")
            weight = _impact_weight(field=field, pattern=pattern)
            total_score += weight
            field_scores[field] = field_scores.get(field, 0) + weight
            expected_source_order = _source_order_value(
                mismatch.get("matched_expected_source_order")
                or mismatch.get("source_order")
                or (mismatch.get("expected_line") or {}).get("source_order")
            )
            actual_source_order = _source_order_value(
                mismatch.get("matched_actual_source_order")
                or (mismatch.get("actual_line") or {}).get("source_order")
            )
            fields = mismatch.get("fields", {})
            values = fields.get(field, {}) if isinstance(fields, dict) else {}
            correction = correction_by_source_order.get(actual_source_order or -1, {})
            locations.append(
                {
                    "case_field": field,
                    "field": field,
                    "source_order": expected_source_order,
                    "actual_source_order": actual_source_order,
                    "severity": issue.get("severity") or mismatch.get("severity"),
                    "pattern": pattern,
                    "weight": weight,
                    "expected_value": values.get("expected"),
                    "gemini_value": correction.get("raw_amount_minor")
                    if field == "amount_minor" and correction
                    else values.get("actual"),
                    "corrected_value": correction.get("processed_amount_minor")
                    if field == "amount_minor" and correction
                    else None,
                    "downstream_impact": issue.get("downstream_impact"),
                    "transaction": _compact_line(mismatch.get("expected_line")),
                }
            )

    missing_count = int(differences.get("missing_actual_count") or 0)
    extra_count = int(differences.get("extra_actual_count") or 0)
    for line in differences.get("unmatched_expected", []):
        total_score += _IMPACT_WEIGHTS["missing_extra_line"]
        field_scores["missing_actual_line"] = (
            field_scores.get("missing_actual_line", 0)
            + _IMPACT_WEIGHTS["missing_extra_line"]
        )
        locations.append(
            {
                "case_field": "missing_actual_line",
                "field": "line",
                "source_order": _source_order_value(line.get("source_order")),
                "actual_source_order": None,
                "severity": "critical",
                "pattern": "missing_actual_line",
                "weight": _IMPACT_WEIGHTS["missing_extra_line"],
                "expected_value": _compact_line(line),
                "gemini_value": None,
                "corrected_value": None,
                "downstream_impact": "Missing lines can hide statement spend or credits.",
                "transaction": _compact_line(line),
            }
        )
    for line in differences.get("unmatched_actual", []):
        total_score += _IMPACT_WEIGHTS["missing_extra_line"]
        field_scores["extra_actual_line"] = (
            field_scores.get("extra_actual_line", 0)
            + _IMPACT_WEIGHTS["missing_extra_line"]
        )
        locations.append(
            {
                "case_field": "extra_actual_line",
                "field": "line",
                "source_order": None,
                "actual_source_order": _source_order_value(line.get("source_order")),
                "severity": "critical",
                "pattern": "extra_actual_line",
                "weight": _IMPACT_WEIGHTS["missing_extra_line"],
                "expected_value": None,
                "gemini_value": _compact_line(line),
                "corrected_value": None,
                "downstream_impact": "Extra lines can duplicate spend or create false candidates.",
                "transaction": _compact_line(line),
            }
        )

    order_drift_count = int(
        differences.get("source_order_diagnostics", {}).get("order_drift_count") or 0
    )
    if order_drift_count:
        order_score = order_drift_count * _IMPACT_WEIGHTS["order_drift"]
        total_score += order_score
        field_scores["order_drift"] = field_scores.get("order_drift", 0) + order_score
        for example in differences.get("source_order_diagnostics", {}).get(
            "order_drift_examples", []
        )[:5]:
            locations.append(
                {
                    "case_field": "order_drift",
                    "field": "source_order",
                    "source_order": _source_order_value(example.get("expected_source_order")),
                    "actual_source_order": _source_order_value(
                        example.get("actual_source_order")
                    ),
                    "severity": "low",
                    "pattern": "order_drift",
                    "weight": _IMPACT_WEIGHTS["order_drift"],
                    "expected_value": example.get("expected_source_order"),
                    "gemini_value": example.get("actual_source_order"),
                    "corrected_value": None,
                    "downstream_impact": "Order drift affects auditability, not amount matching.",
                    "transaction": None,
                }
            )

    field_issue_counts = {
        field: int(count or 0)
        for field, count in differences.get("field_mismatch_counts", {}).items()
    }
    return {
        "score": total_score,
        "score_per_expected_line": round(
            total_score / (expected_line_count if expected_line_count > 0 else 1),
            2,
        ),
        "field_scores": dict(sorted(field_scores.items())),
        "field_issue_counts": dict(sorted(field_issue_counts.items())),
        "field_issue_percentages": _field_mismatch_percentages(
            field_counts=field_issue_counts,
            comparable_lines=denominator,
        ),
        "missing_extra_line_count": missing_count + extra_count,
        "missing_extra_line_pct": round(
            ((missing_count + extra_count) / (expected_line_count or 1)) * 100,
            2,
        ),
        "top_locations": sorted(
            locations,
            key=lambda item: (
                -int(item.get("weight") or 0),
                int(item.get("source_order") or 999999),
                str(item.get("field") or ""),
            ),
        )[:20],
    }


def _impact_weight(*, field: str, pattern: str) -> int:
    if field == "installment" and pattern == "missing_single_installment_marker":
        return _IMPACT_WEIGHTS["missing_single_installment_marker"]
    return _IMPACT_WEIGHTS.get(field, 0)


def _source_order_value(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _corrections_by_source_order(case: dict[str, Any]) -> dict[int, dict[str, Any]]:
    path = case.get("artifacts", {}).get("field_provenance_path")
    if not path:
        return {}
    provenance_path = Path(str(path))
    if not provenance_path.exists():
        return {}
    try:
        provenance = _load_json(provenance_path)
    except (OSError, json.JSONDecodeError):
        return {}
    corrections: dict[int, dict[str, Any]] = {}
    for line in provenance.get("line_sources", []):
        normalization = line.get("normalization") or {}
        if not normalization.get("amount_minor_changed"):
            continue
        source_order = _source_order_value(line.get("source_order"))
        if source_order is None:
            continue
        corrections[source_order] = {
            "raw_amount_minor": normalization.get("raw_amount_minor"),
            "processed_amount_minor": normalization.get("processed_amount_minor"),
            "amount_correction_source": line.get("amount_correction_source")
            or line.get("amount_source"),
        }
    return corrections


def _case_failure_classes(differences: dict[str, Any]) -> dict[str, int]:
    counts: dict[str, int] = {key: 0 for key in _FAILURE_CLASS_ORDER}
    for field, count in differences.get("field_mismatch_counts", {}).items():
        failure_class = _FIELD_FAILURE_CLASSES.get(field)
        if failure_class:
            counts[failure_class] += int(count or 0)
    missing_extra = int(differences.get("missing_actual_count") or 0) + int(
        differences.get("extra_actual_count") or 0
    )
    counts["missing_extra_lines"] += missing_extra
    counts["ordering_drift"] += int(
        differences.get("source_order_diagnostics", {}).get("order_drift_count") or 0
    )
    return {key: value for key, value in counts.items() if value}


def _concrete_examples(differences: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    examples: dict[str, list[dict[str, Any]]] = {}
    for mismatch in differences.get("mismatches", []):
        issues_by_field = {
            issue.get("field"): issue
            for issue in mismatch.get("issues", [])
            if issue.get("field")
        }
        for field, values in mismatch.get("fields", {}).items():
            failure_class = _FIELD_FAILURE_CLASSES.get(field, str(field))
            field_examples = examples.setdefault(failure_class, [])
            if len(field_examples) >= 2:
                continue
            issue = issues_by_field.get(field, {})
            field_examples.append(
                {
                    "field": field,
                    "severity": issue.get("severity") or mismatch.get("severity"),
                    "pattern": issue.get("pattern"),
                    "expected": values.get("expected"),
                    "actual": values.get("actual"),
                    "expected_line": mismatch.get("expected_line"),
                    "actual_line": mismatch.get("actual_line"),
                    "matched_expected_source_order": mismatch.get(
                        "matched_expected_source_order"
                    ),
                    "matched_actual_source_order": mismatch.get("matched_actual_source_order"),
                    "match_score": mismatch.get("match_score"),
                    "match_reasons": mismatch.get("match_reasons", []),
                    "transaction_context": mismatch.get("transaction_context"),
                }
            )
    missing = examples.setdefault("missing_extra_lines", [])
    for line in differences.get("unmatched_expected", [])[:2]:
        if len(missing) >= 2:
            break
        missing.append(
            {
                "field": "line",
                "severity": "critical",
                "pattern": "missing_actual_line",
                "expected": line,
                "actual": None,
            }
        )
    for line in differences.get("unmatched_actual", [])[:2]:
        if len(missing) >= 2:
            break
        missing.append(
            {
                "field": "line",
                "severity": "critical",
                "pattern": "extra_actual_line",
                "expected": None,
                "actual": line,
            }
        )
    return {key: value for key, value in examples.items() if value}


def _totals(
    case_summaries: list[dict[str, Any]],
    approach_report: dict[str, Any],
) -> dict[str, Any]:
    field_counts = _sum_counter(case["field_mismatch_counts"] for case in case_summaries)
    severity_counts = _sum_counter(case["severity_counts"] for case in case_summaries)
    reconciliation_counts = _sum_counter(
        case["reconciliation_counts"] for case in case_summaries
    )
    expected_line_count = sum(int(case["expected_line_count"]) for case in case_summaries)
    actual_line_count = sum(int(case["actual_line_count"]) for case in case_summaries)
    ledger_ready_count = sum(int(case.get("ledger_ready_count") or 0) for case in case_summaries)
    non_ledger_ready_count = sum(
        int(case.get("non_ledger_ready_count") or 0) for case in case_summaries
    )
    weighted_score = sum(
        int(case.get("weighted_impact", {}).get("score") or 0)
        for case in case_summaries
    )
    weighted_field_scores = _sum_counter(
        [
            case.get("weighted_impact", {}).get("field_scores", {})
            for case in case_summaries
        ]
    )
    comparable_lines = sum(
        max(
            min(int(case["expected_line_count"]), int(case["actual_line_count"])),
            0,
        )
        for case in case_summaries
    )
    coalesce_correction_count = sum(
        int(case.get("coalesce_correction_count") or 0)
        for case in case_summaries
    )
    return {
        "case_count": len(case_summaries),
        "gemini_input_modes": _sum_counter(
            [
                {str(case.get("gemini_input_mode") or "unknown"): 1}
                for case in case_summaries
            ]
        ),
        "pdf_evidence": _pdf_evidence_totals(case_summaries),
        "compact_evidence": _compact_evidence_totals(case_summaries),
        "compact_provider_evidence": _compact_provider_evidence_totals(case_summaries),
        "passed_cases": sum(1 for case in case_summaries if case["passed"]),
        "failed_cases": sum(1 for case in case_summaries if not case["passed"]),
        "expected_line_count": expected_line_count,
        "actual_line_count": actual_line_count,
        "comparable_line_count": comparable_lines,
        "ledger_ready_count": ledger_ready_count,
        "non_ledger_ready_count": non_ledger_ready_count,
        "line_count_delta": sum(int(case["line_count_delta"]) for case in case_summaries),
        "field_mismatch_counts": field_counts,
        "field_mismatch_percentages": _field_mismatch_percentages(
            field_counts=field_counts,
            comparable_lines=comparable_lines,
        ),
        "severity_counts": severity_counts,
        "failure_classes": _aggregate_failure_classes(case_summaries),
        "reconciliation_counts": reconciliation_counts,
        "cost_totals": _cost_totals(approach_report),
        "weighted_impact_score": weighted_score,
        "weighted_impact_per_expected_line": round(
            weighted_score / (expected_line_count if expected_line_count > 0 else 1),
            2,
        ),
        "weighted_field_scores": weighted_field_scores,
        "top_weighted_locations": _top_weighted_locations(case_summaries),
        "coalesce_correction_count": coalesce_correction_count,
    }


def _pdf_evidence_totals(case_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    evidence = [
        case.get("pdf_evidence_summary")
        for case in case_summaries
        if case.get("pdf_evidence_summary")
    ]
    return {
        "case_count": len(evidence),
        "status_counts": _sum_counter(
            [{str(item.get("status") or "unknown"): 1} for item in evidence]
        ),
        "text_line_count": sum(int(item.get("text_line_count") or 0) for item in evidence),
        "word_count": sum(int(item.get("word_count") or 0) for item in evidence),
        "row_count": sum(int(item.get("row_count") or 0) for item in evidence),
    }


def _compact_evidence_totals(case_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    evidence = [
        case.get("compact_evidence_summary")
        for case in case_summaries
        if case.get("compact_evidence_summary")
    ]
    return {
        "case_count": len(evidence),
        "status_counts": _sum_counter(
            [{str(item.get("status") or "unknown"): 1} for item in evidence]
        ),
        "text_line_count": sum(int(item.get("text_line_count") or 0) for item in evidence),
        "row_count": sum(int(item.get("row_count") or 0) for item in evidence),
        "candidate_row_count": sum(
            int(item.get("candidate_row_count") or 0) for item in evidence
        ),
    }


def _compact_provider_evidence_totals(case_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    evidence = [
        case.get("compact_provider_evidence_summary")
        for case in case_summaries
        if case.get("compact_provider_evidence_summary")
    ]
    return {
        "case_count": len(evidence),
        "status_counts": _sum_counter(
            [{str(item.get("status") or "unknown"): 1} for item in evidence]
        ),
        "provider_row_count": sum(
            int(item.get("provider_row_count") or item.get("row_count") or 0)
            for item in evidence
        ),
        "candidate_row_count": sum(
            int(item.get("candidate_row_count") or 0) for item in evidence
        ),
    }


def _apply_case_contribution_percentages(
    case_summaries: list[dict[str, Any]],
    totals: dict[str, Any],
) -> None:
    denominator = int(totals.get("weighted_impact_score") or 0)
    for case in case_summaries:
        impact = case.get("weighted_impact", {})
        score = int(impact.get("score") or 0)
        impact["case_contribution_pct"] = round(
            (score / denominator) * 100,
            2,
        ) if denominator else 0.0


def _top_weighted_locations(case_summaries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    locations: list[dict[str, Any]] = []
    for case in case_summaries:
        for location in case.get("weighted_impact", {}).get("top_locations", []):
            locations.append({"case_id": case["case_id"], **location})
    return sorted(
        locations,
        key=lambda item: (
            -int(item.get("weight") or 0),
            str(item.get("case_id") or ""),
            int(item.get("source_order") or 999999),
        ),
    )[:20]


def _baseline_comparison(
    *,
    calibration_dir: Path,
    totals: dict[str, Any],
) -> dict[str, Any]:
    baseline_report_path = (
        calibration_dir.parent / DEFAULT_BASELINE_RUN_ID / "report.json"
    )
    if not baseline_report_path.exists():
        return {
            "baseline_run_id": DEFAULT_BASELINE_RUN_ID,
            "available": False,
            "reason": "baseline_report_not_found",
        }
    try:
        baseline = _load_json(baseline_report_path)
    except (OSError, json.JSONDecodeError):
        return {
            "baseline_run_id": DEFAULT_BASELINE_RUN_ID,
            "available": False,
            "reason": "baseline_report_unreadable",
        }
    baseline_totals = _baseline_totals_from_report(baseline)
    baseline_score = int(
        baseline_totals.get("weighted_impact_score")
        or _estimated_weighted_score_from_totals(baseline_totals)
    )
    current_score = int(totals.get("weighted_impact_score") or 0)
    baseline_fields = baseline_totals.get("field_mismatch_counts", {})
    current_fields = totals.get("field_mismatch_counts", {})
    field_deltas = {
        field: int(current_fields.get(field, 0) or 0)
        - int(baseline_fields.get(field, 0) or 0)
        for field in sorted(set(baseline_fields) | set(current_fields))
    }
    return {
        "baseline_run_id": DEFAULT_BASELINE_RUN_ID,
        "available": True,
        "baseline_report_path": str(baseline_report_path),
        "weighted_impact_score_delta": current_score - baseline_score,
        "weighted_impact_score_delta_pct": _pct_delta(
            current=current_score,
            baseline=baseline_score,
        ),
        "field_mismatch_count_deltas": field_deltas,
        "passed_cases_delta": int(totals.get("passed_cases") or 0)
        - int(baseline_totals.get("passed_cases") or 0),
        "failed_cases_delta": int(totals.get("failed_cases") or 0)
        - int(baseline_totals.get("failed_cases") or 0),
    }


def _pct_delta(*, current: int, baseline: int) -> float | None:
    if baseline == 0:
        return None
    return round(((current - baseline) / baseline) * 100, 2)


def _signed_pct(value: float | None) -> str:
    if value is None:
        return "n/a"
    sign = "+" if value > 0 else ""
    return f"{sign}{value}%"


def _baseline_totals_from_report(baseline: dict[str, Any]) -> dict[str, Any]:
    totals = dict(baseline.get("totals", {}))
    if totals.get("weighted_impact_score") is not None:
        return totals
    approach_report_path = baseline.get("approach_report_path")
    if not approach_report_path:
        return totals
    path = Path(str(approach_report_path))
    if not path.exists():
        return totals
    try:
        approach_report = _load_json(path)
    except (OSError, json.JSONDecodeError):
        return totals
    case_summaries = [_case_summary(case) for case in approach_report.get("cases", [])]
    return _totals(case_summaries, approach_report)


def _estimated_weighted_score_from_totals(totals: dict[str, Any]) -> int:
    field_counts = totals.get("field_mismatch_counts", {})
    score = 0
    for field, count in field_counts.items():
        score += _IMPACT_WEIGHTS.get(str(field), 0) * int(count or 0)
    score += abs(int(totals.get("line_count_delta") or 0)) * _IMPACT_WEIGHTS[
        "missing_extra_line"
    ]
    return score


def _aggregate_failure_classes(case_summaries: list[dict[str, Any]]) -> dict[str, int]:
    totals = _sum_counter(case["failure_classes"] for case in case_summaries)
    return {
        failure_class: totals[failure_class]
        for failure_class in _FAILURE_CLASS_ORDER
        if totals.get(failure_class)
    }


def _candidate(
    *,
    candidate_id: str,
    priority: str,
    impacted_fields: list[str],
    failure_classes: list[str],
    impact: str,
    tradeoff: str,
    regression_risk: str,
    wording: str,
) -> dict[str, Any]:
    classification = classify_prompt_suggestion(wording)
    return {
        "id": candidate_id,
        "priority": priority,
        "impacted_fields": impacted_fields,
        "failure_classes": failure_classes,
        "downstream_impact": impact,
        "tradeoff": tradeoff,
        "regression_risk": regression_risk,
        "issuer_neutral_sample_wording": wording,
        **classification,
    }


def _rejected_case_specific_suggestions(
    case_summaries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rejected: list[dict[str, Any]] = []
    for case in case_summaries:
        if case["passed"] and not case["field_mismatch_counts"]:
            continue
        wording = (
            f"Create a custom rule for {case['case_id']} from issuer {case.get('issuer')} "
            "using its statement layout."
        )
        classification = classify_prompt_suggestion(
            wording,
            case_ids=[str(case["case_id"])],
        )
        rejected.append(
            {
                "id": f"rejected-case-specific-{_case_slug(str(case['case_id']))}",
                "priority": "rejected",
                "impacted_fields": sorted(case["field_mismatch_counts"].keys()),
                "failure_classes": sorted(case["failure_classes"].keys()),
                "downstream_impact": "Would overfit fallback prompt behavior to a known fixture.",
                "tradeoff": "Fast local improvement, poor unknown-layout generalization.",
                "regression_risk": "High: issuer-specific prompt rules can regress future layouts.",
                "issuer_neutral_sample_wording": wording,
                **classification,
            }
        )
    return rejected


def _forbidden_matches(lowered_wording: str, *, case_ids: list[str] | None) -> list[str]:
    matches: list[str] = []
    for token in _FORBIDDEN_ISSUER_TOKENS:
        if _contains_token(lowered_wording, token):
            matches.append(f"issuer_name:{token}")
    for token in _FORBIDDEN_LAYOUT_TOKENS:
        if token in lowered_wording:
            matches.append(f"layout_specific:{token}")
    for token in _FORBIDDEN_MERCHANT_TOKENS:
        if token in lowered_wording:
            matches.append(f"exact_merchant:{token}")
    for case_id in case_ids or DEFAULT_STATEMENT_SUITE_CASE_IDS:
        for token in {case_id.lower(), case_id.split("/")[-1].lower()}:
            if token and token in lowered_wording:
                matches.append(f"case_id_or_filename:{token}")
    return sorted(set(matches))


def _contains_token(value: str, token: str) -> bool:
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", value))


def _calibration_recommendation(
    *,
    case_summaries: list[dict[str, Any]],
    prompt_candidates: list[dict[str, Any]],
    fallback_readiness: dict[str, Any],
) -> str:
    if not case_summaries:
        return "needs_more_baselines"
    provider_quality_cases = [
        case
        for case in case_summaries
        if case["status"]
        not in {"dry-run", "missing-cache", "password_required", "password_invalid"}
    ]
    if not provider_quality_cases:
        return "needs_more_baselines"
    recommended_candidates = [
        candidate
        for candidate in prompt_candidates
        if candidate["classification"] != "case_specific_rejected"
    ]
    if all(case["passed"] for case in case_summaries) and not recommended_candidates:
        return "prompt_ready_for_fallback"
    if fallback_readiness.get("status") == FALLBACK_STRICT_READY:
        return "prompt_ready_for_fallback"
    if fallback_readiness.get("status") in {
        FALLBACK_READY_WITH_CAVEATS,
        FALLBACK_PROMOTED_WITH_CAVEATS,
    }:
        return FALLBACK_PROMOTED_WITH_CAVEATS
    if any(
        str(candidate["priority"]).startswith(("P0", "P1"))
        for candidate in recommended_candidates
    ):
        return "needs_prompt_iteration"
    return "needs_more_baselines"


def _cost_totals(approach_report: dict[str, Any]) -> dict[str, Any]:
    totals = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "cost_usd": Decimal("0"),
    }
    artifact_files = approach_report.get("generated_artifacts", {}).get(
        "case_artifact_files", {}
    )
    for artifacts in artifact_files.values():
        cost_path = artifacts.get("cost_summary_path")
        if not cost_path:
            continue
        payload = _load_json(Path(str(cost_path)))
        cost = payload.get("totals", {})
        totals["input_tokens"] += int(cost.get("input_tokens") or 0)
        totals["output_tokens"] += int(cost.get("output_tokens") or 0)
        totals["total_tokens"] += int(cost.get("total_tokens") or 0)
        totals["cost_usd"] += Decimal(str(cost.get("cost_usd") or "0"))
    return {
        "input_tokens": totals["input_tokens"],
        "output_tokens": totals["output_tokens"],
        "total_tokens": totals["total_tokens"],
        "cost_usd": str(totals["cost_usd"]),
    }


def _write_calibration_outputs(*, calibration_dir: Path, report: dict[str, Any]) -> None:
    report_path = calibration_dir / "report.json"
    calibration_path = calibration_dir / "calibration.json"
    markdown_path = calibration_dir / "REPORT.md"
    calibration_markdown_path = calibration_dir / "FALLBACK_CALIBRATION.md"
    executive_summary_path = calibration_dir / "EXECUTIVE_SUMMARY.md"
    manifest_path = calibration_dir / "manifest.json"
    _write_json(report_path, report)
    _write_json(calibration_path, report)
    markdown = _markdown_report(report)
    markdown_path.write_text(markdown, encoding="utf-8")
    calibration_markdown_path.write_text(markdown, encoding="utf-8")
    executive_summary_path.write_text(_executive_summary(report), encoding="utf-8")
    _write_json(
        manifest_path,
        {
            "schema_version": report["schema_version"],
            "generated_at": report["generated_at"],
            "run_id": report["run_id"],
            "status": "written",
            "recommendation": report["recommendation"],
            "fallback_readiness": report.get("fallback_readiness"),
            "case_count": report["totals"]["case_count"],
            "passed_cases": report["totals"]["passed_cases"],
            "failed_cases": report["totals"]["failed_cases"],
            "report_path": str(report_path),
            "calibration_path": str(calibration_path),
            "markdown_path": str(markdown_path),
            "fallback_calibration_path": str(calibration_markdown_path),
            "executive_summary_path": str(executive_summary_path),
            "approach_report_path": report["approach_report_path"],
            "source_manifest_paths": report["source_manifest_paths"],
        },
    )


def _markdown_report(report: dict[str, Any]) -> str:
    totals = report["totals"]
    lines = [
        "# Statement Gemini Fallback Calibration",
        "",
        f"- Run ID: `{report['run_id']}`",
        f"- Recommendation: `{report['recommendation']}`",
        f"- Run mode: `{report['run_mode']}`",
        f"- Cache policy: `{report['cache_policy']}`",
        f"- Cases: `{totals['case_count']}`",
        f"- Passed: `{totals['passed_cases']}`",
            f"- Failed: `{totals['failed_cases']}`",
            f"- Cost USD: `{totals['cost_totals']['cost_usd']}`",
            f"- Gemini input modes: `{totals.get('gemini_input_modes', {})}`",
            f"- Fallback readiness: `{report.get('fallback_readiness', {}).get('status')}`",
            "",
            "## Fallback Transaction Readiness",
            "",
            *_fallback_transaction_readiness_summary(report.get("fallback_readiness", {})),
            "",
            *_fallback_factor_weight_table(report.get("fallback_readiness", {})),
            "",
            "## API Usage And Cost",
            "",
            *_provider_cost_table(report.get("provider_cost_report", [])),
            "",
            "## Fallback Readiness Gate",
            "",
            *_fallback_readiness_table(report.get("fallback_readiness", {})),
            "",
            "## Case Results",
            "",
        "| Case | Status | Passed | Lines | Amount | Date | Description | Type | Currency | "
        "Installment | Order Drift | Weighted Impact | Case Contribution |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for case in report["cases"]:
        fields = case["field_mismatch_counts"]
        impact = case.get("weighted_impact", {})
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{case['case_id']}`",
                    f"`{case['status']}`",
                    "`yes`" if case["passed"] else "`no`",
                    f"{case['actual_line_count']}/{case['expected_line_count']}",
                    str(fields.get("amount_minor", 0)),
                    str(fields.get("date", 0)),
                    str(fields.get("description", 0)),
                    str(fields.get("line_type", 0)),
                    str(fields.get("currency", 0)),
                    str(fields.get("installment", 0)),
                    str(case["order_drift_count"]),
                    str(impact.get("score", 0)),
                    f"{impact.get('case_contribution_pct', 0.0)}%",
                ]
            )
            + " |"
        )
    lines.extend(
        [
            "",
            "## Weighted Impact",
            "",
            f"- Total weighted impact score: `{totals.get('weighted_impact_score', 0)}`",
            "- Weighted impact per expected line: "
            f"`{totals.get('weighted_impact_per_expected_line', 0)}`",
            f"- Safe coalesce amount corrections: `{totals.get('coalesce_correction_count', 0)}`",
            (
                f"- Ledger-ready lines: `{totals.get('ledger_ready_count', 0)}`; "
                f"non-ledger-ready lines: `{totals.get('non_ledger_ready_count', 0)}`"
            ),
            f"- PDF evidence coverage: `{totals.get('pdf_evidence', {})}`",
            f"- Compact row evidence coverage: `{totals.get('compact_evidence', {})}`",
            "- Provider compact evidence coverage: "
            f"`{totals.get('compact_provider_evidence', {})}`",
            "",
            "| Field | Mismatches | Mismatch % | Weighted Score |",
            "| --- | ---: | ---: | ---: |",
        ]
    )
    for field, count in totals.get("field_mismatch_counts", {}).items():
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{field}`",
                    str(count),
                    f"{totals.get('field_mismatch_percentages', {}).get(field, 0.0)}%",
                    str(totals.get("weighted_field_scores", {}).get(field, 0)),
                ]
            )
            + " |"
        )
    lines.extend(["", "## Runtime Critical Field Readiness", ""])
    lines.extend(_runtime_readiness_table(report.get("runtime_critical_field_readiness", [])))
    lines.extend(["", "## Improvement Potential", ""])
    lines.extend(_improvement_potential_table(report.get("improvement_potential", [])))
    lines.extend(["", "### Where The Weighted Differences Are Located", ""])
    lines.extend(
        _weighted_locations_table(
            report.get("totals", {}).get("top_weighted_locations", [])
        )
    )
    if report.get("baseline_comparison", {}).get("available"):
        baseline = report["baseline_comparison"]
        lines.extend(
            [
                "",
                "## Baseline Comparison",
                "",
                f"- Baseline run: `{baseline['baseline_run_id']}`",
                f"- Weighted impact delta: `{baseline['weighted_impact_score_delta']}`",
                "- Weighted impact delta %: "
                f"`{_signed_pct(baseline['weighted_impact_score_delta_pct'])}`",
                "",
                "| Field | Mismatch Count Delta |",
                "| --- | ---: |",
            ]
        )
        for field, delta in baseline.get("field_mismatch_count_deltas", {}).items():
            lines.append(f"| `{field}` | {delta} |")
    else:
        lines.extend(
            [
                "",
                "## Baseline Comparison",
                "",
                f"- Baseline run `{DEFAULT_BASELINE_RUN_ID}` was not available locally.",
            ]
        )
    lines.extend(
        [
            "",
            "## Failure Classes",
            "",
            "| Class | Count |",
            "| --- | ---: |",
        ]
    )
    for failure_class, count in report["failure_classes"].items():
        lines.append(f"| `{failure_class}` | {count} |")
    if not report["failure_classes"]:
        lines.append("| `none` | 0 |")

    lines.extend(["", "## Concrete Expected Vs Actual Examples", ""])
    examples_written = False
    for case in report["cases"]:
        for failure_class, examples in case["concrete_examples"].items():
            if not examples:
                continue
            examples_written = True
            lines.append(f"### `{case['case_id']}` - `{failure_class}`")
            lines.append("")
            lines.extend(
                [
                    "| Field | Expected Fixture | Actual Origin | Actual Value | "
                    "Difference Summary | Severity | Pattern | Expected Line | Actual Line |",
                    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
                ]
            )
            for example in examples:
                lines.append(
                    "| "
                    + " | ".join(
                        [
                            f"`{example.get('field')}`",
                            _md_table_value(example.get("expected")),
                            "`Gemini Fallback`",
                            _md_table_value(example.get("actual")),
                            _example_difference_summary(example),
                            f"`{example.get('severity')}`",
                            f"`{example.get('pattern')}`",
                            _md_table_value(_compact_line(example.get("expected_line"))),
                            _md_table_value(_compact_line(example.get("actual_line"))),
                        ]
                    )
                    + " |"
                )
            lines.append("")
    if not examples_written:
        lines.append("- No expected-vs-actual value differences were found.")

    lines.extend(
        [
            "",
            "## Prompt Improvement Candidates",
            "",
            "| Priority | Candidate | Recommended | Fields | Tradeoff | Regression Risk |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for candidate in report["prompt_improvement_candidates"]:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{candidate['priority']}`",
                    f"`{candidate['id']}`",
                    "`yes`" if candidate["recommended_for_prompt_promotion"] else "`no`",
                    ", ".join(f"`{field}`" for field in candidate["impacted_fields"]) or "-",
                    candidate["tradeoff"],
                    candidate["regression_risk"],
                ]
            )
            + " |"
        )
    if not report["prompt_improvement_candidates"]:
        lines.append("| `none` | `none` | `no` | - | - | - |")
    lines.extend(["", "### Issuer-Neutral Sample Wording", ""])
    for candidate in report["recommended_prompt_improvements"]:
        lines.append(f"- `{candidate['id']}`: {candidate['issuer_neutral_sample_wording']}")
    rejected = [
        candidate
        for candidate in report["prompt_improvement_candidates"]
        if candidate["classification"] == "case_specific_rejected"
    ]
    lines.extend(["", "### Rejected Anti-Overfit Suggestions", ""])
    if rejected:
        for candidate in rejected:
            lines.append(
                f"- `{candidate['id']}` rejected: "
                + ", ".join(candidate.get("reasons", []))
            )
    else:
        lines.append("- No rejected case-specific suggestions were generated.")

    lines.extend(
        [
            "",
            "## Downstream Impact",
            "",
        ]
    )
    impacts = sorted(
        {
            impact
            for case in report["cases"]
            for impact in case.get("downstream_impact", [])
        }
    )
    if impacts:
        lines.extend(f"- {impact}" for impact in impacts)
    else:
        lines.append("- No downstream blockers were detected in the compared outputs.")
    lines.extend(
        [
            "",
            "## Runtime Boundary",
            "",
            "- This calibration report tunes the Gemini fallback only.",
            "- Runtime strategy remains deterministic PyMuPDF first, Gemini fallback after "
            "upload-level AI processing consent.",
            "- The report does not edit or promote the registered prompt automatically.",
        ]
    )
    return "\n".join(lines)


def _executive_summary(report: dict[str, Any]) -> str:
    totals = report["totals"]
    recommended = report["recommended_prompt_improvements"]
    failed_cases = [case for case in report["cases"] if not case["passed"]]
    lines = [
        "# Executive Summary",
        "",
        f"Recommendation: `{report['recommendation']}`.",
        "",
        "## Bottom Line",
        "",
        (
            f"Gemini fallback calibration covered `{totals['case_count']}` statement cases, "
            f"with `{totals['passed_cases']}` passing and `{totals['failed_cases']}` failing."
        ),
        (
            f"Weighted impact score is `{totals.get('weighted_impact_score', 0)}` "
            f"across `{totals['expected_line_count']}` expected line(s), or "
            f"`{totals.get('weighted_impact_per_expected_line', 0)}` per expected line."
        ),
        f"Gemini input modes: `{totals.get('gemini_input_modes', {})}`.",
        f"Compact row evidence coverage: `{totals.get('compact_evidence', {})}`.",
        f"Provider compact evidence coverage: `{totals.get('compact_provider_evidence', {})}`.",
        f"Fallback readiness: `{report.get('fallback_readiness', {}).get('status')}`.",
        (
            f"Ledger-ready lines: `{totals.get('ledger_ready_count', 0)}`; "
            f"non-ledger-ready lines: `{totals.get('non_ledger_ready_count', 0)}`."
        ),
        "",
        "## Fallback Transaction Readiness",
        "",
        *_fallback_transaction_readiness_summary(report.get("fallback_readiness", {})),
        "",
        *_fallback_factor_weight_table(report.get("fallback_readiness", {})),
        "",
        "## API Usage And Cost",
        "",
        *_provider_cost_table(report.get("provider_cost_report", [])),
        "",
        "## Fallback Readiness Gate",
        "",
        *_fallback_readiness_table(report.get("fallback_readiness", {})),
        "",
        "## Runtime Critical Field Readiness",
        "",
        *_runtime_readiness_table(report.get("runtime_critical_field_readiness", [])),
        "",
        "## Improvement Potential",
        "",
        *_improvement_potential_table(report.get("improvement_potential", [])),
        "",
        "## What Went Well",
        "",
    ]
    if totals["passed_cases"]:
        lines.append(f"- `{totals['passed_cases']}` case(s) met the expected fixture contract.")
    else:
        lines.append("- No case fully met the expected fixture contract yet.")
    if totals["actual_line_count"]:
        lines.append(
            f"- Gemini produced `{totals['actual_line_count']}` normalized line(s) for scoring."
        )
        lines.append(
            f"- `{totals.get('ledger_ready_count', 0)}` line(s) are eligible for matching or "
            "statement-created transaction candidates."
        )
    if totals.get("coalesce_correction_count"):
        lines.append(
            "- Shared coalesce safely corrected "
            f"`{totals['coalesce_correction_count']}` amount(s) from explicit candidates."
        )
    if not totals.get("field_mismatch_counts", {}).get("date"):
        lines.append("- Date extraction has no mismatches in this run.")
    if not totals.get("field_mismatch_counts", {}).get("currency"):
        lines.append("- Statement-line currency extraction has no mismatches in this run.")
    lines.extend(["", "## What Went Wrong", ""])
    if failed_cases:
        diagnostics_label = (
            "strict fixture diagnostics"
            if report.get("fallback_readiness", {}).get("status")
            in {FALLBACK_READY_WITH_CAVEATS, FALLBACK_PROMOTED_WITH_CAVEATS}
            else "failed"
        )
        for case in failed_cases[:4]:
            classes = ", ".join(
                f"`{key}={value}`" for key, value in case["failure_classes"].items()
            )
            impact = case.get("weighted_impact", {})
            lines.append(
                f"- `{case['case_id']}` {diagnostics_label}: "
                f"{classes or 'no classified mismatch'}; "
                f"weighted score `{impact.get('score', 0)}` "
                f"({impact.get('case_contribution_pct', 0.0)}% of total)."
            )
    else:
        lines.append("- No scored case failed.")
    lines.extend(
        [
            "",
            "## Difference Weight And Percentage",
            "",
            "| Field | Mismatches | Mismatch % | Weighted Score |",
            "| --- | ---: | ---: | ---: |",
        ]
    )
    for field, count in totals.get("field_mismatch_counts", {}).items():
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{field}`",
                    str(count),
                    f"{totals.get('field_mismatch_percentages', {}).get(field, 0.0)}%",
                    str(totals.get("weighted_field_scores", {}).get(field, 0)),
                ]
            )
            + " |"
        )
    lines.extend(
        [
            "",
            "## Where Differences Are Located",
            "",
        ]
    )
    lines.extend(_weighted_locations_table(totals.get("top_weighted_locations", [])[:10]))
    baseline = report.get("baseline_comparison", {})
    lines.extend(["", "## Baseline Delta", ""])
    if baseline.get("available"):
        lines.append(f"- Baseline run: `{baseline['baseline_run_id']}`.")
        lines.append(
            f"- Weighted impact changed by `{baseline['weighted_impact_score_delta']}` "
            f"({_signed_pct(baseline['weighted_impact_score_delta_pct'])})."
        )
        important_deltas = [
            ("amount_minor", "amount"),
            ("date", "date"),
            ("description", "description"),
            ("installment", "installment"),
        ]
        for field, label in important_deltas:
            delta = baseline.get("field_mismatch_count_deltas", {}).get(field)
            if delta is not None:
                lines.append(f"- `{label}` mismatch delta: `{delta}`.")
    else:
        lines.append(f"- Baseline run `{DEFAULT_BASELINE_RUN_ID}` was not available locally.")
    lines.extend(["", "## Fixes To Try Next", ""])
    if recommended:
        for candidate in recommended[:5]:
            lines.append(
                f"- {candidate['priority']}: `{candidate['id']}` impacts "
                + ", ".join(f"`{field}`" for field in candidate["impacted_fields"])
                + "."
            )
    else:
        lines.append("- No prompt changes are recommended from this calibration run.")
    lines.extend(
        [
            "",
            "## Runtime Strategy",
            "",
            "- Keep deterministic PyMuPDF as the primary runtime extractor.",
            "- Use this report only to tune the transparent Gemini fallback for unsupported "
            "or low-confidence layouts.",
        ]
    )
    return "\n".join(lines)


def _weighted_locations_table(locations: list[dict[str, Any]]) -> list[str]:
    lines = [
        "| Case | Field | Expected Source Order | Gemini Source Order | Severity | "
        "Weight | Expected Fixture | Gemini Value | Corrected Value | Downstream Impact |",
        "| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- | --- |",
    ]
    if not locations:
        lines.append("| `none` | `none` | - | - | - | 0 | - | - | - | - |")
        return lines
    for location in locations[:20]:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{location.get('case_id')}`",
                    f"`{location.get('field')}`",
                    _md_table_value(location.get("source_order")),
                    _md_table_value(location.get("actual_source_order")),
                    f"`{location.get('severity')}`",
                    str(location.get("weight", 0)),
                    _md_table_value(location.get("expected_value")),
                    _md_table_value(location.get("gemini_value")),
                    _md_table_value(location.get("corrected_value")),
                    _md_value(location.get("downstream_impact") or "-"),
                ]
            )
            + " |"
        )
    return lines


def _fallback_transaction_readiness_summary(readiness: dict[str, Any]) -> list[str]:
    transaction = readiness.get("fallback_transaction_readiness", {}) if readiness else {}
    if not transaction:
        return [
            "- Fallback transaction readiness: `not_ready`.",
            "- P0 readiness score: `0/100`.",
        ]
    return [
        f"- Fallback transaction readiness: `{transaction.get('status', 'not_ready')}`.",
        f"- P0 readiness score: `{transaction.get('score_label', '0/100')}`.",
        f"- Decision: {transaction.get('decision_explanation', '-')}",
    ]


def _fallback_factor_weight_table(readiness: dict[str, Any]) -> list[str]:
    components = readiness.get("fallback_p0_components", {}) if readiness else {}
    lines = [
        "| Factor | Weight | Current Result | Decision Impact |",
        "| --- | ---: | --- | --- |",
    ]
    if not components:
        lines.append("| `none` | 0 | - | - |")
        return lines
    for factor, component in components.items():
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{factor}`",
                    str(component.get("weight", 0)),
                    _md_value(component.get("current_result") or "-"),
                    _md_value(component.get("decision_impact") or "-"),
                ]
            )
            + " |"
        )
    return lines


def _fallback_readiness_table(readiness: dict[str, Any]) -> list[str]:
    lines = [
        "| Status | P0 Score | P0 Passed | Line Coverage | Candidate Safety | Ready Cases | "
        "Caveats | Blockers |",
        "| --- | ---: | --- | ---: | --- | ---: | --- | --- |",
    ]
    if not readiness:
        lines.append("| `not_ready` | `0/100` | `no` | 0% | `no` | 0/0 | - | `no_report` |")
        return lines
    lines.append(
        "| "
        + " | ".join(
            [
                f"`{readiness.get('status', 'not_ready')}`",
                f"`{readiness.get('p0_readiness_score_label', '0/100')}`",
                "`yes`" if readiness.get("p0_passed") else "`no`",
                f"{round(float(readiness.get('line_coverage_ratio') or 0) * 100, 2)}%",
                "`yes`" if readiness.get("candidate_safety_passed") else "`no`",
                f"{readiness.get('ready_case_count', 0)}/{readiness.get('case_count', 0)}",
                _md_value(", ".join(readiness.get("caveats", [])[:5]) or "-"),
                _md_value(", ".join(readiness.get("blocking_reasons", [])[:5]) or "-"),
            ]
        )
        + " |"
    )
    return lines


def _runtime_readiness_table(rows: list[dict[str, str]]) -> list[str]:
    lines = [
        "| Field | Current Result | Downstream Meaning |",
        "| --- | --- | --- |",
    ]
    if not rows:
        lines.append("| `none` | - | - |")
        return lines
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{row.get('field')}`",
                    _md_value(row.get("current_result") or "-"),
                    _md_value(row.get("downstream_meaning") or "-"),
                ]
            )
            + " |"
        )
    return lines


def _provider_cost_table(rows: list[dict[str, Any]]) -> list[str]:
    lines = [
        "| Approach | Input Mode | Fallback Calls Made | Avg Tokens | Avg Cost USD | "
        "Total Cost USD | Cost / Ledger-Ready Line |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    if not rows:
        lines.append("| `none` | - | 0 | 0 | 0 | 0 | 0 |")
        return lines
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{row.get('approach')}`",
                    f"`{row.get('input_mode', '-')}`",
                    str(row.get("fallback_calls_made", 0)),
                    str(row.get("average_tokens_per_provider_call", 0)),
                    str(row.get("average_cost_usd_per_provider_call", "0")),
                    str(row.get("total_cost_usd", "0")),
                    str(row.get("cost_per_ledger_ready_line_usd", "0")),
                ]
            )
            + " |"
        )
    return lines


def _improvement_potential_table(rows: list[dict[str, str]]) -> list[str]:
    lines = [
        "| Improvement | Potential Gain | Complexity | Risk |",
        "| --- | --- | --- | --- |",
    ]
    if not rows:
        lines.append("| `none` | - | - | - |")
        return lines
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{row.get('improvement')}`",
                    _md_value(row.get("potential_gain") or "-"),
                    _md_value(row.get("complexity") or "-"),
                    _md_value(row.get("risk") or "-"),
                ]
            )
            + " |"
        )
    return lines


def _summary(report: dict[str, Any]) -> dict[str, Any]:
    calibration_dir = Path(str(report["calibration_dir"]))
    return {
        "status": "written",
        "run_id": report["run_id"],
        "recommendation": report["recommendation"],
        "fallback_readiness": report.get("fallback_readiness"),
        "case_count": report["totals"]["case_count"],
        "passed_cases": report["totals"]["passed_cases"],
        "failed_cases": report["totals"]["failed_cases"],
        "report_path": str(calibration_dir / "report.json"),
        "calibration_path": str(calibration_dir / "calibration.json"),
        "markdown_path": str(calibration_dir / "REPORT.md"),
        "fallback_calibration_path": str(calibration_dir / "FALLBACK_CALIBRATION.md"),
        "executive_summary_path": str(calibration_dir / "EXECUTIVE_SUMMARY.md"),
        "manifest_path": str(calibration_dir / "manifest.json"),
    }


def _run_mode(
    *,
    from_manifest: bool,
    live: bool,
    cache_only: bool,
    bypass_cache: bool,
) -> str:
    if from_manifest:
        return "from_manifest"
    if cache_only:
        return "cache_only"
    if live and bypass_cache:
        return "live_no_cache"
    if live:
        return "live"
    return "dry_run"


def _cache_policy(
    *,
    from_manifest: bool,
    live: bool,
    cache_only: bool,
    bypass_cache: bool,
) -> str:
    if from_manifest:
        return "manifest_reuse_no_provider_call"
    if cache_only:
        return "cache_only_no_provider_call"
    if live and bypass_cache:
        return "bypass_cache_fresh_provider_call"
    if live:
        return "cache_then_provider"
    return "dry_run_no_provider_call"


def _sum_counter(counters: list[dict[str, Any]]) -> dict[str, int]:
    total: dict[str, int] = {}
    for counter in counters:
        for key, value in counter.items():
            total[key] = total.get(key, 0) + int(value or 0)
    return dict(sorted(total.items()))


def _case_slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "case"


def _compact_line(line: dict[str, Any] | None) -> dict[str, Any] | None:
    if not line:
        return None
    return {
        "source_order": line.get("source_order"),
        "date": line.get("date"),
        "description": line.get("description"),
        "amount_minor": line.get("amount_minor"),
        "currency": line.get("currency"),
        "line_type": line.get("line_type"),
        "installment": line.get("installment"),
    }


def _md_value(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, (dict, list)):
        text = json.dumps(value, sort_keys=True, default=_json_default)
    else:
        text = str(value)
    return " ".join(text.split()).replace("|", "\\|")


def _md_table_value(value: Any) -> str:
    return f"`{_md_value(value)}`"


def _example_difference_summary(example: dict[str, Any]) -> str:
    expected = example.get("expected")
    actual = example.get("actual")
    if expected == actual:
        return "`same`"
    if expected is None:
        return "`different: expected missing`"
    if actual is None:
        return "`different: actual missing`"
    if isinstance(expected, int) and isinstance(actual, int):
        delta = actual - expected
        sign = "+" if delta > 0 else ""
        return f"`different: {sign}{delta}`"
    return "`different: changed`"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )


def _json_default(value: object) -> str:
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")
