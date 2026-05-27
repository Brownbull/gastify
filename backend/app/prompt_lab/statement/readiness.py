"""Fallback-readiness policy for statement prompt-lab reports."""

from __future__ import annotations

from typing import Any

FALLBACK_STRICT_READY = "strict_ready"
FALLBACK_READY_WITH_CAVEATS = "fallback_ready_with_caveats"
FALLBACK_PROMOTED_WITH_CAVEATS = "fallback_promoted_with_caveats"
FALLBACK_NOT_READY = "not_ready"
FALLBACK_MIN_LINE_COVERAGE_RATIO = 0.90
FALLBACK_MAX_LINE_COVERAGE_RATIO = 1.10
FALLBACK_P0_COMPONENT_WEIGHTS = {
    "amount": 25,
    "date": 25,
    "currency": 20,
    "candidate_safety": 20,
    "line_coverage": 10,
}

NO_PROVIDER_QUALITY_STATUSES = {
    "dry-run",
    "missing-cache",
    "password_required",
    "password_invalid",
}
P0_FIELDS = ("amount_minor", "date", "currency")
CAVEAT_FIELDS = (
    "description",
    "line_type",
    "installment",
    "original_currency",
    "original_amount_minor",
)
PAYMENT_LIKE_LINE_TYPES = {"payment", "refund", "credit", "reversal"}


def candidate_safety_from_report_case(case: dict[str, Any]) -> dict[str, Any]:
    """Inspect reconciliation output for unsafe statement-created candidates."""

    line_outcomes = list(case.get("reconciliation", {}).get("line_outcomes", []) or [])
    unsafe_examples: list[dict[str, Any]] = []
    candidate_count = 0
    for outcome in line_outcomes:
        candidate = outcome.get("candidate_transaction")
        if candidate is None:
            continue
        candidate_count += 1
        reasons: list[str] = []
        if outcome.get("ledger_ready") is False:
            reasons.append("candidate_from_non_ledger_ready_line")
        if str(outcome.get("line_type") or "") in PAYMENT_LIKE_LINE_TYPES:
            reasons.append("candidate_from_payment_like_line")
        if not candidate.get("transaction_date"):
            reasons.append("candidate_missing_date")
        if not candidate.get("currency"):
            reasons.append("candidate_missing_currency")
        try:
            total_minor = int(candidate.get("total_minor") or 0)
        except (TypeError, ValueError):
            total_minor = 0
        if total_minor <= 0:
            reasons.append("candidate_non_positive_amount")
        if reasons:
            unsafe_examples.append(
                {
                    "source_order": outcome.get("source_order"),
                    "description": outcome.get("description"),
                    "line_type": outcome.get("line_type"),
                    "amount_minor": outcome.get("amount_minor"),
                    "currency": outcome.get("currency"),
                    "reasons": reasons,
                }
            )

    return {
        "evaluated": bool(line_outcomes),
        "passed": not unsafe_examples,
        "candidate_transaction_count": candidate_count,
        "unsafe_candidate_count": len(unsafe_examples),
        "unsafe_examples": unsafe_examples[:5],
    }


def case_fallback_readiness(case: dict[str, Any]) -> dict[str, Any]:
    """Classify one case for fallback runtime use independently from strict score."""

    fields = case.get("field_mismatch_counts", {})
    expected = int(case.get("expected_line_count") or 0)
    actual = int(case.get("actual_line_count") or 0)
    line_coverage_ratio = round((actual / expected), 4) if expected else 1.0
    line_coverage_passed = line_coverage_ratio >= FALLBACK_MIN_LINE_COVERAGE_RATIO
    candidate_safety = case.get("candidate_safety") or {"passed": True, "evaluated": False}
    p0_mismatches = {
        field: int(fields.get(field, 0) or 0)
        for field in P0_FIELDS
        if int(fields.get(field, 0) or 0)
    }
    p0_passed = not p0_mismatches
    provider_quality = str(case.get("status") or "") not in NO_PROVIDER_QUALITY_STATUSES

    blockers: list[str] = []
    if not provider_quality:
        blockers.append(f"no_provider_quality_output:{case.get('status')}")
    if expected > 0 and actual == 0:
        blockers.append("no_normalized_lines")
    for field, count in p0_mismatches.items():
        blockers.append(f"{field}_mismatches:{count}")
    if line_coverage_ratio < FALLBACK_MIN_LINE_COVERAGE_RATIO:
        pct = round(line_coverage_ratio * 100, 2)
        blockers.append(f"line_coverage_below_90_pct:{pct}%")
    if not candidate_safety.get("passed", True):
        blockers.append(
            f"unsafe_candidate_transactions:{candidate_safety.get('unsafe_candidate_count', 0)}"
        )

    caveats: list[str] = []
    for field in CAVEAT_FIELDS:
        count = int(fields.get(field, 0) or 0)
        if count:
            caveats.append(f"{field}_drift:{count}")
    line_delta = int(case.get("line_count_delta") or 0)
    if line_delta:
        caveats.append(f"line_count_delta:{line_delta}")
    if line_coverage_ratio > FALLBACK_MAX_LINE_COVERAGE_RATIO:
        pct = round(line_coverage_ratio * 100, 2)
        caveats.append(f"line_coverage_above_110_pct:{pct}%")
    if int(case.get("non_ledger_ready_count") or 0):
        caveats.append(f"non_ledger_ready_lines:{case.get('non_ledger_ready_count')}")
    if not bool(case.get("passed")) and not blockers:
        caveats.append("strict_fixture_score_failed_on_non_p0_fields")
    p0_components = _p0_components(
        fields=fields,
        candidate_safety=candidate_safety,
        expected=expected,
        actual=actual,
        line_coverage_ratio=line_coverage_ratio,
        line_coverage_passed=line_coverage_passed,
    )
    readiness_score = _p0_score(p0_components)
    caveat_impact = _caveat_impact(caveats)
    line_coverage_band = _line_coverage_band(
        expected=expected,
        actual=actual,
        ratio=line_coverage_ratio,
        passed=line_coverage_passed,
    )

    if bool(case.get("passed")) and provider_quality and candidate_safety.get("passed", True):
        status = FALLBACK_STRICT_READY
    elif (
        provider_quality
        and p0_passed
        and line_coverage_passed
        and candidate_safety.get("passed", True)
    ):
        status = FALLBACK_PROMOTED_WITH_CAVEATS
    else:
        status = FALLBACK_NOT_READY

    return {
        "status": status,
        "fallback_transaction_readiness": {
            "status": status,
            "score": readiness_score,
            "score_label": f"{readiness_score}/100",
            "p0_passed": p0_passed,
            "candidate_safety_passed": bool(candidate_safety.get("passed", True)),
            "line_coverage_passed": line_coverage_passed,
            "blocking_reasons": blockers,
            "caveats": caveats,
            "decision_explanation": _decision_explanation(
                status=status,
                score=readiness_score,
                blockers=blockers,
                caveats=caveats,
            ),
        },
        "fallback_p0_components": p0_components,
        "fallback_caveat_impact": caveat_impact,
        "line_coverage_band": line_coverage_band,
        "decision_explanation": _decision_explanation(
            status=status,
            score=readiness_score,
            blockers=blockers,
            caveats=caveats,
        ),
        "p0_readiness_score": readiness_score,
        "p0_readiness_score_label": f"{readiness_score}/100",
        "p0_passed": p0_passed,
        "p0_field_mismatch_counts": p0_mismatches,
        "line_coverage_ratio": line_coverage_ratio,
        "line_coverage_passed": line_coverage_passed,
        "candidate_safety_passed": bool(candidate_safety.get("passed", True)),
        "candidate_safety": candidate_safety,
        "provider_quality": provider_quality,
        "blocking_reasons": blockers,
        "caveats": caveats,
    }


def aggregate_fallback_readiness(
    *,
    approach: str,
    case_summaries: list[dict[str, Any]],
    require_provider_quality: bool,
) -> dict[str, Any]:
    """Aggregate case fallback-readiness into an approach-level gate."""

    if not case_summaries:
        return _aggregate_result(
            approach=approach,
            status=FALLBACK_NOT_READY,
            case_summaries=[],
            blocking_reasons=["no_cases"],
            caveats=[],
        )

    case_readiness = [
        case.get("fallback_readiness") or case_fallback_readiness(case)
        for case in case_summaries
    ]
    blocking_reasons = _unique(
        reason
        for readiness in case_readiness
        for reason in readiness.get("blocking_reasons", [])
    )
    caveats = _unique(
        caveat
        for readiness in case_readiness
        for caveat in readiness.get("caveats", [])
    )
    if require_provider_quality and not any(
        readiness.get("provider_quality") for readiness in case_readiness
    ):
        blocking_reasons.append("no_provider_quality_evidence")

    all_strict = all(
        readiness.get("status") == FALLBACK_STRICT_READY for readiness in case_readiness
    )
    all_ready = all(
        readiness.get("status")
        in {
            FALLBACK_STRICT_READY,
            FALLBACK_READY_WITH_CAVEATS,
            FALLBACK_PROMOTED_WITH_CAVEATS,
        }
        for readiness in case_readiness
    )
    if all_strict and not blocking_reasons:
        status = FALLBACK_STRICT_READY
    elif all_ready and not blocking_reasons:
        status = FALLBACK_PROMOTED_WITH_CAVEATS
    else:
        status = FALLBACK_NOT_READY

    return _aggregate_result(
        approach=approach,
        status=status,
        case_summaries=case_summaries,
        blocking_reasons=blocking_reasons,
        caveats=caveats,
    )


def _aggregate_result(
    *,
    approach: str,
    status: str,
    case_summaries: list[dict[str, Any]],
    blocking_reasons: list[str],
    caveats: list[str],
) -> dict[str, Any]:
    expected = sum(int(case.get("expected_line_count") or 0) for case in case_summaries)
    actual = sum(int(case.get("actual_line_count") or 0) for case in case_summaries)
    fields = _sum_counter(case.get("field_mismatch_counts", {}) for case in case_summaries)
    candidate_safety = [
        case.get("candidate_safety", {}) for case in case_summaries
    ]
    unsafe_count = sum(int(item.get("unsafe_candidate_count") or 0) for item in candidate_safety)
    line_coverage_ratio = round((actual / expected), 4) if expected else 1.0
    case_line_coverage_passed = all(
        bool((case.get("fallback_readiness") or {}).get("line_coverage_passed", True))
        for case in case_summaries
    )
    line_coverage_passed = (
        line_coverage_ratio >= FALLBACK_MIN_LINE_COVERAGE_RATIO
        and case_line_coverage_passed
    )
    aggregate_candidate_safety = {
        "passed": unsafe_count == 0,
        "evaluated": any(bool(item.get("evaluated")) for item in candidate_safety),
        "unsafe_candidate_count": unsafe_count,
        "candidate_transaction_count": sum(
            int(item.get("candidate_transaction_count") or 0)
            for item in candidate_safety
        ),
    }
    p0_components = _p0_components(
        fields=fields,
        candidate_safety=aggregate_candidate_safety,
        expected=expected,
        actual=actual,
        line_coverage_ratio=line_coverage_ratio,
        line_coverage_passed=line_coverage_passed,
    )
    readiness_score = _p0_score(p0_components)
    line_coverage_band = _line_coverage_band(
        expected=expected,
        actual=actual,
        ratio=line_coverage_ratio,
        passed=line_coverage_passed,
    )
    return {
        "approach": approach,
        "status": status,
        "fallback_transaction_readiness": {
            "status": status,
            "score": readiness_score,
            "score_label": f"{readiness_score}/100",
            "p0_passed": not any(int(fields.get(field, 0) or 0) for field in P0_FIELDS),
            "candidate_safety_passed": unsafe_count == 0,
            "line_coverage_passed": line_coverage_passed,
            "blocking_reasons": blocking_reasons,
            "caveats": caveats[:20],
            "decision_explanation": _decision_explanation(
                status=status,
                score=readiness_score,
                blockers=blocking_reasons,
                caveats=caveats,
            ),
        },
        "fallback_p0_components": p0_components,
        "fallback_caveat_impact": _caveat_impact(caveats),
        "line_coverage_band": line_coverage_band,
        "decision_explanation": _decision_explanation(
            status=status,
            score=readiness_score,
            blockers=blocking_reasons,
            caveats=caveats,
        ),
        "p0_readiness_score": readiness_score,
        "p0_readiness_score_label": f"{readiness_score}/100",
        "p0_passed": not any(int(fields.get(field, 0) or 0) for field in P0_FIELDS),
        "p0_field_mismatch_counts": {
            field: int(fields.get(field, 0) or 0)
            for field in P0_FIELDS
            if int(fields.get(field, 0) or 0)
        },
        "line_coverage_ratio": line_coverage_ratio,
        "line_coverage_passed": line_coverage_passed,
        "candidate_safety_passed": unsafe_count == 0,
        "unsafe_candidate_count": unsafe_count,
        "candidate_transaction_count": aggregate_candidate_safety["candidate_transaction_count"],
        "blocking_reasons": blocking_reasons,
        "caveats": caveats[:20],
        "case_status_counts": _sum_counter(
            {
                str((case.get("fallback_readiness") or {}).get("status") or FALLBACK_NOT_READY): 1
            }
            for case in case_summaries
        ),
        "ready_case_count": sum(
            1
            for case in case_summaries
            if (case.get("fallback_readiness") or {}).get("status")
            in {
                FALLBACK_STRICT_READY,
                FALLBACK_READY_WITH_CAVEATS,
                FALLBACK_PROMOTED_WITH_CAVEATS,
            }
        ),
        "case_count": len(case_summaries),
    }


def _p0_components(
    *,
    fields: dict[str, Any],
    candidate_safety: dict[str, Any],
    expected: int,
    actual: int,
    line_coverage_ratio: float,
    line_coverage_passed: bool,
) -> dict[str, dict[str, Any]]:
    amount_count = int(fields.get("amount_minor", 0) or 0)
    date_count = int(fields.get("date", 0) or 0)
    currency_count = int(fields.get("currency", 0) or 0)
    unsafe_count = int(candidate_safety.get("unsafe_candidate_count") or 0)
    return {
        "amount": _component(
            weight=FALLBACK_P0_COMPONENT_WEIGHTS["amount"],
            passed=amount_count == 0,
            current_result=f"{amount_count} amount mismatches",
            decision_impact="Blocker: wrong amounts can create incorrect transaction totals.",
        ),
        "date": _component(
            weight=FALLBACK_P0_COMPONENT_WEIGHTS["date"],
            passed=date_count == 0,
            current_result=f"{date_count} date mismatches",
            decision_impact="Blocker: wrong dates can break receipt matching windows.",
        ),
        "currency": _component(
            weight=FALLBACK_P0_COMPONENT_WEIGHTS["currency"],
            passed=currency_count == 0,
            current_result=f"{currency_count} currency mismatches",
            decision_impact="Blocker: wrong currencies can corrupt ledger interpretation.",
        ),
        "candidate_safety": _component(
            weight=FALLBACK_P0_COMPONENT_WEIGHTS["candidate_safety"],
            passed=bool(candidate_safety.get("passed", True)),
            current_result=f"{unsafe_count} unsafe candidate transactions",
            decision_impact=(
                "Blocker: fallback must not create payment-like, non-ledger-ready, "
                "missing-date, missing-currency, or non-positive candidates."
            ),
        ),
        "line_coverage": _component(
            weight=FALLBACK_P0_COMPONENT_WEIGHTS["line_coverage"],
            passed=line_coverage_passed,
            current_result=(
                f"{actual}/{expected} lines ({round(line_coverage_ratio * 100, 2)}%)"
            ),
            decision_impact=(
                "Blocker below 90% coverage; over-coverage is a caveat when candidate-safe."
            ),
        ),
    }


def _component(
    *,
    weight: int,
    passed: bool,
    current_result: str,
    decision_impact: str,
) -> dict[str, Any]:
    return {
        "weight": weight,
        "passed": passed,
        "score_awarded": weight if passed else 0,
        "current_result": current_result,
        "decision_impact": decision_impact,
    }


def _p0_score(components: dict[str, dict[str, Any]]) -> int:
    return sum(int(component.get("score_awarded") or 0) for component in components.values())


def _line_coverage_band(
    *,
    expected: int,
    actual: int,
    ratio: float,
    passed: bool,
) -> dict[str, Any]:
    return {
        "min_ratio": FALLBACK_MIN_LINE_COVERAGE_RATIO,
        "max_ratio": FALLBACK_MAX_LINE_COVERAGE_RATIO,
        "expected_line_count": expected,
        "actual_line_count": actual,
        "ratio": ratio,
        "percentage": round(ratio * 100, 2),
        "passed": passed,
    }


def _caveat_impact(caveats: list[str]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    for caveat in caveats:
        result.append(
            {
                "caveat": caveat,
                "impact": _caveat_message(caveat),
            }
        )
    return result


def _caveat_message(caveat: str) -> str:
    if caveat.startswith("description_drift"):
        return "Affects fuzzy merchant confidence and user-facing labels; not transaction safety."
    if caveat.startswith("line_type_drift"):
        return "Can affect reconciliation behavior; unsafe candidates are checked separately."
    if caveat.startswith("installment_drift"):
        return "Affects recurrence/audit detail more than basic transaction matching."
    if caveat.startswith("original_currency") or caveat.startswith("original_amount"):
        return "Affects foreign-currency audit explanation, not the selected billing amount."
    if caveat.startswith("non_ledger_ready"):
        return "Rows were preserved for audit but held back from candidate creation."
    if caveat.startswith("line_count_delta"):
        return "Line count differs but remains inside the accepted fallback coverage band."
    if caveat.startswith("line_coverage_above_110_pct"):
        return (
            "Extra extracted lines can add review noise; candidate safety decides whether "
            "they are blocked from unsafe transaction creation."
        )
    if caveat == "strict_fixture_score_failed_on_non_p0_fields":
        return "Strict diagnostics failed, but P0 transaction-readiness fields passed."
    return "Non-P0 issue tracked as a caveat."


def _decision_explanation(
    *,
    status: str,
    score: int,
    blockers: list[str],
    caveats: list[str],
) -> str:
    if status == FALLBACK_STRICT_READY:
        return f"P0 readiness score {score}/100 and strict fixture scoring passed."
    if status == FALLBACK_READY_WITH_CAVEATS:
        return (
            f"P0 readiness score {score}/100; fallback is transaction-ready with "
            f"{len(caveats)} non-P0 caveat(s)."
        )
    if status == FALLBACK_PROMOTED_WITH_CAVEATS:
        return (
            f"P0 readiness score {score}/100; fallback is promoted for runtime fallback "
            f"use with {len(caveats)} documented caveat(s)."
        )
    return (
        f"P0 readiness score {score}/100; fallback is blocked by "
        + (", ".join(blockers) if blockers else "unclassified readiness failure")
        + "."
    )


def _sum_counter(counters: Any) -> dict[str, int]:
    total: dict[str, int] = {}
    for counter in counters:
        for key, value in counter.items():
            total[key] = total.get(key, 0) + int(value or 0)
    return dict(sorted(total.items()))


def _unique(values: Any) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        text = str(value)
        if text in seen:
            continue
        seen.add(text)
        result.append(text)
    return result
