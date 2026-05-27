"""Consolidated statement approach suite reports."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal, cast

from app.prompt_lab.paths import LATEST_RESULTS_ROOT, ensure_workspace
from app.prompt_lab.run_ids import next_serial_run_id, slug_run_id
from app.prompt_lab.statement.cases import StatementCase, get_statement_case
from app.prompt_lab.statement.deterministic import run_statement_deterministic_case
from app.prompt_lab.statement.readiness import (
    FALLBACK_PROMOTED_WITH_CAVEATS,
    FALLBACK_READY_WITH_CAVEATS,
    aggregate_fallback_readiness,
    candidate_safety_from_report_case,
    case_fallback_readiness,
)
from app.prompt_lab.statement.report import write_statement_expected_report
from app.prompt_lab.statement.runner import run_statement_case

if TYPE_CHECKING:
    from collections.abc import Iterable

StatementSuiteApproach = Literal["auto", "pymupdf", "gemini"]

DEFAULT_STATEMENT_SUITE_CASE_IDS = [
    "cmr/cmr202503",
    "cmr/cmr202504",
    "cmr/cmr202505",
    "edwards/edw202506",
    "edwards/edw202507",
    "scotiabank/sco202206",
    "scotiabank/sco202207",
]
DEFAULT_STATEMENT_SUITE_APPROACHES: list[StatementSuiteApproach] = ["auto", "gemini"]
SUITE_SCHEMA_VERSION = "statement-approach-suite.v1"


async def run_statement_suite(
    *,
    case_ids: list[str] | None = None,
    approaches: list[StatementSuiteApproach] | None = None,
    run_id: str | None = None,
    output_root: Path = LATEST_RESULTS_ROOT,
    credentials_root: Path | None = None,
    transaction_scope_firebase_uid: str | None = None,
    gemini_live: bool = False,
    gemini_cache_only: bool = False,
    bypass_cache: bool = False,
    model: str | None = None,
    prompt_id: str | None = None,
    gemini_input: str = "profile-rows",
) -> dict[str, Any]:
    """Run statement extraction approaches into one suite folder."""
    ensure_workspace()
    selected_case_ids = case_ids or DEFAULT_STATEMENT_SUITE_CASE_IDS
    selected_approaches = approaches or DEFAULT_STATEMENT_SUITE_APPROACHES
    cases = [get_statement_case(case_id) for case_id in selected_case_ids]
    _assert_expected_fixtures(cases)
    _assert_approach_options(
        approaches=selected_approaches,
        gemini_live=gemini_live,
        gemini_cache_only=gemini_cache_only,
        bypass_cache=bypass_cache,
    )

    suite_parent = output_root / "statements"
    resolved_run_id = slug_run_id(
        run_id or next_serial_run_id(suite_parent, "statement-approach-suite")
    )
    suite_dir = suite_parent / resolved_run_id
    suite_dir.mkdir(parents=True, exist_ok=True)

    approach_manifests: list[dict[str, Any]] = []
    for approach in selected_approaches:
        if approach == "auto":
            approach_manifests.append(
                await _run_auto_approach(
                    suite_dir=suite_dir,
                    run_id=resolved_run_id,
                    cases=cases,
                    credentials_root=credentials_root,
                    transaction_scope_firebase_uid=transaction_scope_firebase_uid,
                )
            )
        elif approach == "pymupdf":
            approach_manifests.append(
                await _run_pymupdf_approach(
                    suite_dir=suite_dir,
                    run_id=resolved_run_id,
                    cases=cases,
                    credentials_root=credentials_root,
                    transaction_scope_firebase_uid=transaction_scope_firebase_uid,
                )
            )
        elif approach == "gemini":
            approach_manifests.append(
                await _run_gemini_approach(
                    suite_dir=suite_dir,
                    run_id=resolved_run_id,
                    cases=cases,
                    credentials_root=credentials_root,
                    transaction_scope_firebase_uid=transaction_scope_firebase_uid,
                    live=gemini_live,
                    cache_only=gemini_cache_only,
                    bypass_cache=bypass_cache,
                    model=model,
                    prompt_id=prompt_id,
                    gemini_input=gemini_input,
                )
            )
        else:  # pragma: no cover - Literal plus CLI choices keep this unreachable.
            raise ValueError(f"unsupported statement suite approach: {approach}")

    report = _suite_report(
        run_id=resolved_run_id,
        suite_dir=suite_dir,
        case_ids=[case.id for case in cases],
        approach_manifests=approach_manifests,
    )
    _write_suite_outputs(suite_dir=suite_dir, report=report)
    return {
        "status": "written",
        "run_id": resolved_run_id,
        "suite_dir": str(suite_dir),
        "manifest_path": str(suite_dir / "manifest.json"),
        "report_path": str(suite_dir / "report.json"),
        "markdown_path": str(suite_dir / "REPORT.md"),
        "executive_summary_path": str(suite_dir / "EXECUTIVE_SUMMARY.md"),
        "case_count": len(cases),
        "approaches": [manifest["approach"] for manifest in approach_manifests],
        "recommendation": report["recommendation"],
    }


def _assert_expected_fixtures(cases: list[StatementCase]) -> None:
    missing = [
        case.id for case in cases if case.expected_path is None or not case.expected_path.exists()
    ]
    if missing:
        raise ValueError(
            "statement-suite-run requires expected fixtures for: " + ", ".join(missing)
        )


def _assert_approach_options(
    *,
    approaches: list[StatementSuiteApproach],
    gemini_live: bool,
    gemini_cache_only: bool,
    bypass_cache: bool,
) -> None:
    if gemini_live and gemini_cache_only:
        raise ValueError("statement-suite-run --gemini-live cannot be combined with --cache-only")
    if bypass_cache and not gemini_live:
        raise ValueError("statement-suite-run --bypass-cache requires --gemini-live")
    if len(set(approaches)) != len(approaches):
        raise ValueError("statement-suite-run approaches must be unique")


async def _run_pymupdf_approach(
    *,
    suite_dir: Path,
    run_id: str,
    cases: list[StatementCase],
    credentials_root: Path | None,
    transaction_scope_firebase_uid: str | None,
) -> dict[str, Any]:
    approach_dir = suite_dir / "approaches" / "pymupdf"
    manifest_paths: list[Path] = []
    for case in cases:
        packet_dir = approach_dir / "cases" / _case_slug(case.id) / "run"
        packets = await run_statement_deterministic_case(
            case,
            extractors=["pymupdf"],
            credentials_root=credentials_root,
            run_id=run_id,
            artifact_dir=packet_dir,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
        )
        manifest_paths.extend(Path(packet["manifest_path"]) for packet in packets)

    report_manifest = await write_statement_expected_report(
        run_id=run_id,
        output_dir=approach_dir,
        case_output_root=approach_dir / "cases",
        deterministic_case_variant_dirs=False,
        actual_source="deterministic",
        deterministic_manifest_paths=manifest_paths,
        transaction_scope_firebase_uid=transaction_scope_firebase_uid,
    )
    return _approach_manifest(
        approach="pymupdf",
        approach_dir=approach_dir,
        report_manifest=report_manifest,
        source_manifest_paths=manifest_paths,
        provider_calls_allowed=False,
    )


async def _run_auto_approach(
    *,
    suite_dir: Path,
    run_id: str,
    cases: list[StatementCase],
    credentials_root: Path | None,
    transaction_scope_firebase_uid: str | None,
) -> dict[str, Any]:
    approach_dir = suite_dir / "approaches" / "auto"
    manifest_paths: list[Path] = []
    for case in cases:
        packet_dir = approach_dir / "cases" / _case_slug(case.id) / "run"
        packets = await run_statement_deterministic_case(
            case,
            extractors=["pymupdf"],
            credentials_root=credentials_root,
            run_id=run_id,
            artifact_dir=packet_dir,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
        )
        manifest_paths.extend(Path(packet["manifest_path"]) for packet in packets)

    report_manifest = await write_statement_expected_report(
        run_id=run_id,
        output_dir=approach_dir,
        case_output_root=approach_dir / "cases",
        deterministic_case_variant_dirs=False,
        actual_source="deterministic",
        deterministic_manifest_paths=manifest_paths,
        transaction_scope_firebase_uid=transaction_scope_firebase_uid,
    )
    return _approach_manifest(
        approach="auto",
        approach_dir=approach_dir,
        report_manifest=report_manifest,
        source_manifest_paths=manifest_paths,
        provider_calls_allowed=False,
    )


async def _run_gemini_approach(
    *,
    suite_dir: Path,
    run_id: str,
    cases: list[StatementCase],
    credentials_root: Path | None,
    transaction_scope_firebase_uid: str | None,
    live: bool,
    cache_only: bool,
    bypass_cache: bool,
    model: str | None,
    prompt_id: str | None,
    gemini_input: str,
) -> dict[str, Any]:
    approach_dir = suite_dir / "approaches" / "gemini"
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
            artifact_dir=approach_dir / "cases" / _case_slug(case.id) / "run",
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            gemini_input=gemini_input,
        )
        manifest_paths.append(Path(packet["manifest_path"]))

    report_manifest = await write_statement_expected_report(
        run_id=run_id,
        output_dir=approach_dir,
        case_output_root=approach_dir / "cases",
        actual_source="live-gemini",
        manifest_paths=manifest_paths,
        transaction_scope_firebase_uid=transaction_scope_firebase_uid,
    )
    return _approach_manifest(
        approach="gemini",
        approach_dir=approach_dir,
        report_manifest=report_manifest,
        source_manifest_paths=manifest_paths,
        provider_calls_allowed=live,
    )


def _approach_manifest(
    *,
    approach: StatementSuiteApproach,
    approach_dir: Path,
    report_manifest: dict[str, Any],
    source_manifest_paths: list[Path],
    provider_calls_allowed: bool,
) -> dict[str, Any]:
    return {
        "approach": approach,
        "approach_dir": str(approach_dir),
        "report_path": report_manifest["report_path"],
        "markdown_path": report_manifest["markdown_path"],
        "manifest_path": report_manifest.get("generated_artifacts", {}).get("manifest_path")
        or str(approach_dir / "manifest.json"),
        "source_manifest_paths": [str(path) for path in source_manifest_paths],
        "provider_calls_allowed": provider_calls_allowed,
    }


def _suite_report(
    *,
    run_id: str,
    suite_dir: Path,
    case_ids: list[str],
    approach_manifests: list[dict[str, Any]],
) -> dict[str, Any]:
    approach_reports = [
        _load_json(Path(str(manifest["report_path"]))) for manifest in approach_manifests
    ]
    approach_summaries = [
        _approach_summary(manifest=manifest, report=report)
        for manifest, report in zip(approach_manifests, approach_reports, strict=True)
    ]
    recommendation = _recommendation(approach_summaries)
    fallback_readiness = _suite_fallback_readiness(approach_summaries)
    runtime_readiness = _suite_runtime_critical_field_readiness(approach_summaries)
    improvement_potential = _suite_improvement_potential(approach_summaries)
    provider_cost_report = _suite_provider_cost_report(approach_summaries)
    return {
        "schema_version": SUITE_SCHEMA_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "run_id": run_id,
        "suite_dir": str(suite_dir),
        "case_ids": case_ids,
        "recommendation": recommendation,
        "fallback_readiness": fallback_readiness,
        "fallback_transaction_readiness": (fallback_readiness or {}).get(
            "fallback_transaction_readiness"
        ),
        "fallback_p0_components": (fallback_readiness or {}).get("fallback_p0_components", {}),
        "fallback_caveat_impact": (fallback_readiness or {}).get("fallback_caveat_impact", []),
        "line_coverage_band": (fallback_readiness or {}).get("line_coverage_band"),
        "decision_explanation": (fallback_readiness or {}).get("decision_explanation"),
        "approaches": approach_summaries,
        "case_comparison": _case_comparison(approach_summaries),
        "runtime_critical_field_readiness": runtime_readiness,
        "improvement_potential": improvement_potential,
        "provider_cost_report": provider_cost_report,
        "privacy": {
            "raw_pdfs_committed": False,
            "credentials_committed": False,
            "suite_root_is_gitignored": True,
        },
    }


def _approach_summary(
    *,
    manifest: dict[str, Any],
    report: dict[str, Any],
) -> dict[str, Any]:
    cases = report.get("cases", [])
    case_summaries = [_case_summary(case) for case in cases]
    field_counts = _sum_counter(case["field_mismatch_counts"] for case in case_summaries)
    severity_counts = _sum_counter(case["severity_counts"] for case in case_summaries)
    reconciliation_counts = _sum_counter(case["reconciliation_counts"] for case in case_summaries)
    cost_totals = _approach_cost_totals(report)
    fallback_readiness = aggregate_fallback_readiness(
        approach=str(manifest["approach"]),
        case_summaries=case_summaries,
        require_provider_quality=manifest["approach"] == "gemini",
    )
    return {
        "approach": manifest["approach"],
        "approach_dir": manifest["approach_dir"],
        "report_path": manifest["report_path"],
        "markdown_path": manifest["markdown_path"],
        "provider_calls_allowed": manifest["provider_calls_allowed"],
        "case_count": len(case_summaries),
        "passed_cases": sum(1 for case in case_summaries if case["passed"]),
        "failed_cases": sum(1 for case in case_summaries if not case["passed"]),
        "expected_line_count": sum(int(case["expected_line_count"]) for case in case_summaries),
        "actual_line_count": sum(int(case["actual_line_count"]) for case in case_summaries),
        "ledger_ready_count": sum(
            int(case.get("ledger_ready_count") or 0) for case in case_summaries
        ),
        "non_ledger_ready_count": sum(
            int(case.get("non_ledger_ready_count") or 0) for case in case_summaries
        ),
        "total_line_count_delta": sum(
            abs(int(case["line_count_delta"])) for case in case_summaries
        ),
        "field_mismatch_counts": field_counts,
        "severity_counts": severity_counts,
        "installment_mismatches": int(field_counts.get("installment", 0)),
        "recurrence_field_mismatches": int(field_counts.get("installment", 0)),
        "reconciliation_counts": reconciliation_counts,
        "cost_totals": cost_totals,
        "provider_cost_summary": _approach_provider_cost_summary(
            report=report,
            case_summaries=case_summaries,
            approach=str(manifest["approach"]),
            provider_calls_allowed=bool(manifest["provider_calls_allowed"]),
            cost_totals=cost_totals,
        ),
        "fallback_readiness": fallback_readiness,
        "fallback_transaction_readiness": fallback_readiness.get("fallback_transaction_readiness"),
        "fallback_p0_components": fallback_readiness.get("fallback_p0_components", {}),
        "fallback_caveat_impact": fallback_readiness.get("fallback_caveat_impact", []),
        "line_coverage_band": fallback_readiness.get("line_coverage_band"),
        "decision_explanation": fallback_readiness.get("decision_explanation"),
        "cases": case_summaries,
    }


def _case_summary(case: dict[str, Any]) -> dict[str, Any]:
    extraction = case["current_extraction"]
    differences = extraction["differences"]
    score = extraction["score_against_expected"]
    field_counts = differences["field_mismatch_counts"]
    candidate_safety = candidate_safety_from_report_case(case)
    summary = {
        "case_id": case["case_id"],
        "case_variant_id": case.get("case_variant_id", case["case_id"]),
        "passed": bool(score.get("passed")),
        "status": extraction.get("source_status")
        or ("completed" if score.get("passed") else "failed"),
        "actual_source": extraction["actual_source"],
        "extractor": extraction.get("extractor") or extraction["actual_source"],
        "expected_line_count": case["expected"]["line_count"],
        "actual_line_count": extraction["line_count"],
        "ledger_ready_count": int(extraction.get("ledger_ready_count") or 0),
        "non_ledger_ready_count": int(extraction.get("non_ledger_ready_count") or 0),
        "line_count_delta": differences["line_count_delta"],
        "field_mismatch_counts": dict(field_counts),
        "severity_counts": dict(differences["severity_counts"]),
        "amount_mismatches": int(field_counts.get("amount_minor", 0)),
        "date_mismatches": int(field_counts.get("date", 0)),
        "description_mismatches": int(field_counts.get("description", 0)),
        "line_type_mismatches": int(field_counts.get("line_type", 0)),
        "currency_mismatches": int(field_counts.get("currency", 0)),
        "installment_mismatches": int(field_counts.get("installment", 0)),
        "recurrence_field_mismatches": int(field_counts.get("installment", 0)),
        "reconciliation_counts": dict(case["reconciliation"]["counts"]),
        "candidate_safety": candidate_safety,
        "promotion_blockers": differences["promotion_blockers"],
        "artifact_dir": case["artifact_dir"],
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
    summary["decision_explanation"] = summary["fallback_readiness"].get("decision_explanation")
    return summary


def _case_comparison(approaches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    case_ids = sorted({case["case_id"] for approach in approaches for case in approach["cases"]})
    rows: list[dict[str, Any]] = []
    for case_id in case_ids:
        by_approach = {
            approach["approach"]: next(
                case for case in approach["cases"] if case["case_id"] == case_id
            )
            for approach in approaches
            if any(case["case_id"] == case_id for case in approach["cases"])
        }
        rows.append(
            {
                "case_id": case_id,
                "approaches": by_approach,
                "best_approach": _best_case_approach(by_approach),
            }
        )
    return rows


def _best_case_approach(cases_by_approach: dict[str, dict[str, Any]]) -> str | None:
    if not cases_by_approach:
        return None
    return sorted(
        cases_by_approach.items(),
        key=lambda item: (
            not item[1]["passed"],
            abs(int(item[1]["line_count_delta"])),
            int(item[1]["severity_counts"].get("critical", 0)),
            int(item[1]["amount_mismatches"]),
            sum(int(value) for value in item[1]["field_mismatch_counts"].values()),
        ),
    )[0][0]


def _recommendation(approaches: list[dict[str, Any]]) -> str:
    by_name = {approach["approach"]: approach for approach in approaches}
    auto = by_name.get("auto")
    pymupdf = by_name.get("pymupdf")
    gemini = by_name.get("gemini")
    deterministic_primary = auto or pymupdf
    gemini_readiness = (gemini or {}).get("fallback_readiness", {})
    if (
        deterministic_primary
        and _all_cases_pass(deterministic_primary)
        and (not gemini or not _approach_better(gemini, deterministic_primary))
    ):
        if gemini_readiness.get("status") in {
            FALLBACK_READY_WITH_CAVEATS,
            FALLBACK_PROMOTED_WITH_CAVEATS,
        }:
            return "pymupdf_primary_gemini_fallback_promoted_with_caveats"
        return "pymupdf_primary"
    if (
        pymupdf
        and _all_cases_pass(pymupdf)
        and (not gemini or not _approach_better(gemini, pymupdf))
    ):
        if gemini_readiness.get("status") in {
            FALLBACK_READY_WITH_CAVEATS,
            FALLBACK_PROMOTED_WITH_CAVEATS,
        }:
            return "pymupdf_primary_gemini_fallback_promoted_with_caveats"
        return "pymupdf_primary"
    if gemini and _all_cases_pass(gemini) and (not pymupdf or _approach_better(gemini, pymupdf)):
        return "gemini_primary"
    if (
        deterministic_primary
        and gemini
        and deterministic_primary["passed_cases"] > 0
        and (gemini["provider_calls_allowed"] or gemini["passed_cases"] > 0)
    ):
        return "pymupdf_with_gemini_fallback"
    return "needs_iteration"


def _suite_fallback_readiness(approaches: list[dict[str, Any]]) -> dict[str, Any] | None:
    by_name = {approach["approach"]: approach for approach in approaches}
    gemini = by_name.get("gemini")
    if gemini is not None:
        return gemini.get("fallback_readiness")
    primary = by_name.get("auto") or by_name.get("pymupdf")
    if primary is not None:
        return primary.get("fallback_readiness")
    return None


def _suite_runtime_critical_field_readiness(
    approaches: list[dict[str, Any]],
) -> list[dict[str, str]]:
    primary = _primary_readiness_approach(approaches)
    if primary is None:
        return []
    fields = primary["field_mismatch_counts"]
    comparable = max(
        min(
            int(primary.get("expected_line_count") or 0),
            int(primary.get("actual_line_count") or 0),
        ),
        1,
    )
    return [
        _readiness_row(
            "Date",
            _suite_mismatch_result(primary, "date", comparable),
            (
                "Safe for reconciliation date windows."
                if not int(fields.get("date", 0) or 0)
                else "Can push receipts outside the matching tolerance window."
            ),
        ),
        _readiness_row(
            "Amount",
            _suite_mismatch_result(primary, "amount_minor", comparable),
            (
                "Safe for amount matching and candidate totals."
                if not int(fields.get("amount_minor", 0) or 0)
                else "Blocks matches or creates wrong transaction totals."
            ),
        ),
        _readiness_row(
            "Currency",
            _suite_mismatch_result(primary, "currency", comparable),
            (
                "Safe for ledger currency and amount interpretation."
                if not int(fields.get("currency", 0) or 0)
                else "Can prevent matches or create unsafe candidate payloads."
            ),
        ),
        _readiness_row(
            "Line Coverage",
            (
                f"{primary.get('actual_line_count', 0)}/{primary.get('expected_line_count', 0)} "
                f"lines on `{primary['approach']}`; "
                f"absolute delta {primary.get('total_line_count_delta', 0)}"
            ),
            "Missing or extra rows can hide spend, credits, or duplicate candidates.",
        ),
        _readiness_row(
            "Ledger Readiness",
            (
                f"{primary.get('ledger_ready_count', 0)} ready; "
                f"{primary.get('non_ledger_ready_count', 0)} held back"
            ),
            "Only ledger-ready lines can match receipts or create statement-only candidates.",
        ),
        _readiness_row(
            "Merchant Description",
            _suite_mismatch_result(primary, "description", comparable),
            "Description drift affects fuzzy merchant confidence more than ledger safety.",
        ),
        _readiness_row(
            "Line Type",
            _suite_mismatch_result(primary, "line_type", comparable),
            (
                "Wrong line type can change candidate behavior for payments, "
                "credits, fees, or charges."
            ),
        ),
        _readiness_row(
            "Installment And Original Currency Evidence",
            (
                f"installment {fields.get('installment', 0)}; "
                f"original currency {fields.get('original_currency', 0)}; "
                f"original amount {fields.get('original_amount_minor', 0)}"
            ),
            "Affects auditability and recurrence hints more than basic amount/date matching.",
        ),
    ]


def _suite_improvement_potential(approaches: list[dict[str, Any]]) -> list[dict[str, str]]:
    primary = _primary_readiness_approach(approaches)
    if primary is None:
        return []
    fields = primary["field_mismatch_counts"]
    rows: list[dict[str, str]] = []
    if int(fields.get("amount_minor", 0) or 0):
        rows.append(
            _improvement_row(
                "Fix selected statement amount",
                "Highest: protects reconciliation and statement-created transaction totals.",
                "Medium",
                "Medium: stricter rules can lower coverage on unusual layouts.",
            )
        )
    else:
        rows.append(
            _improvement_row(
                "Preserve deterministic primary gates",
                "Keeps date, amount, and currency stable for runtime matching.",
                "Low",
                "Low: primary parser is already the promoted path for known layouts.",
            )
        )
    if int(primary.get("total_line_count_delta") or 0):
        rows.append(
            _improvement_row(
                "Improve missing/extra row coverage",
                "High: prevents hidden spend, credits, and false candidates.",
                "Medium-high",
                "Medium: broader capture can admit summaries or totals.",
            )
        )
    if int(fields.get("line_type", 0) or 0):
        rows.append(
            _improvement_row(
                "Tighten line type behavior",
                "Medium: prevents payment/credit rows from becoming spend candidates.",
                "Low-medium",
                "Low: classification vocabulary is narrow.",
            )
        )
    if int(fields.get("installment", 0) or 0):
        rows.append(
            _improvement_row(
                "Preserve installment and term markers",
                "Medium: improves recurrence hints and amount diagnostics.",
                "Low-medium",
                "Low: only visible evidence should be copied.",
            )
        )
    if int(fields.get("description", 0) or 0):
        rows.append(
            _improvement_row(
                "Normalize merchant descriptions for scoring",
                "Medium: improves reports and fuzzy merchant confidence.",
                "Low-medium",
                "Low: merchant dirtiness should not block ledger readiness.",
            )
        )
    if len(rows) == 1 and primary.get("failed_cases") == 0:
        rows.append(
            _improvement_row(
                "Expand private corpus coverage",
                "High: proves deterministic primary stays stable beyond the current suite.",
                "Medium",
                "Low-medium: new layouts may expose unsupported sections.",
            )
        )
    return rows[:6]


def _primary_readiness_approach(approaches: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not approaches:
        return None
    by_name = {approach["approach"]: approach for approach in approaches}
    return (
        by_name.get("auto")
        or by_name.get("pymupdf")
        or sorted(
            approaches,
            key=_approach_rank,
        )[0]
    )


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


def _suite_mismatch_result(
    approach: dict[str, Any],
    field: str,
    comparable_lines: int,
) -> str:
    count = int(approach.get("field_mismatch_counts", {}).get(field, 0) or 0)
    pct = round((count / comparable_lines) * 100, 2)
    return f"{count} mismatches on `{approach['approach']}` ({pct}%)"


def _all_cases_pass(approach: dict[str, Any]) -> bool:
    return bool(approach["case_count"]) and approach["passed_cases"] == approach["case_count"]


def _approach_better(left: dict[str, Any], right: dict[str, Any]) -> bool:
    return _approach_rank(left) < _approach_rank(right)


def _approach_rank(approach: dict[str, Any]) -> tuple[int, int, int, int, int]:
    field_mismatches = sum(int(value) for value in approach["field_mismatch_counts"].values())
    return (
        int(approach["failed_cases"]),
        int(approach["severity_counts"].get("critical", 0)),
        int(approach["field_mismatch_counts"].get("amount_minor", 0)),
        field_mismatches,
        int(approach["total_line_count_delta"]),
    )


def _suite_provider_cost_report(approaches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "approach": approach["approach"],
            **dict(approach.get("provider_cost_summary") or {}),
        }
        for approach in approaches
    ]


def _approach_provider_cost_summary(
    *,
    report: dict[str, Any],
    case_summaries: list[dict[str, Any]],
    approach: str,
    provider_calls_allowed: bool,
    cost_totals: dict[str, Any],
) -> dict[str, Any]:
    cost_items = _case_cost_items(report)
    provider_call_count = sum(1 for item in cost_items if int(item["total_tokens"]) > 0)
    total_tokens = int(cost_totals.get("total_tokens") or 0)
    total_cost = Decimal(str(cost_totals.get("cost_usd") or "0"))
    ledger_ready = sum(int(case.get("ledger_ready_count") or 0) for case in case_summaries)
    highest = max(
        cost_items,
        key=lambda item: Decimal(str(item["cost_usd"])),
        default={
            "case_id": "none",
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cost_usd": "0",
        },
    )
    deterministic_calls_avoided = len(case_summaries) if approach in {"auto", "pymupdf"} else 0
    avg_tokens = round(total_tokens / provider_call_count, 2) if provider_call_count else 0
    avg_cost = (
        str((total_cost / Decimal(provider_call_count)).quantize(Decimal("0.000000001")))
        if provider_call_count
        else "0"
    )
    cost_per_line = (
        str((total_cost / Decimal(ledger_ready)).quantize(Decimal("0.000000001")))
        if ledger_ready and total_cost
        else "0"
    )
    return {
        "provider_call_count": provider_call_count,
        "provider_calls_allowed": provider_calls_allowed,
        "deterministic_calls_avoided": deterministic_calls_avoided,
        "total_input_tokens": int(cost_totals.get("input_tokens") or 0),
        "total_output_tokens": int(cost_totals.get("output_tokens") or 0),
        "total_tokens": total_tokens,
        "total_cost_usd": str(total_cost),
        "average_tokens_per_provider_call": avg_tokens,
        "average_cost_usd_per_provider_call": avg_cost,
        "highest_cost_case": highest["case_id"],
        "highest_cost_usd": str(highest["cost_usd"]),
        "cost_per_ledger_ready_line_usd": cost_per_line,
    }


def _case_cost_items(report: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    case_files = report.get("generated_artifacts", {}).get("case_artifact_files", {})
    for case_id, artifacts in case_files.items():
        cost_path = artifacts.get("cost_summary_path")
        if not cost_path:
            continue
        payload = _load_json(Path(str(cost_path)))
        cost = payload.get("totals", {})
        input_tokens = int(cost.get("input_tokens") or 0)
        output_tokens = int(cost.get("output_tokens") or 0)
        items.append(
            {
                "case_id": str(case_id),
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": int(cost.get("total_tokens") or input_tokens + output_tokens),
                "cost_usd": str(cost.get("cost_usd") or "0"),
            }
        )
    return items


def _approach_cost_totals(report: dict[str, Any]) -> dict[str, Any]:
    totals: dict[str, int | Decimal] = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "cost_usd": Decimal("0"),
    }
    case_files = report.get("generated_artifacts", {}).get("case_artifact_files", {})
    for artifacts in case_files.values():
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
        **{key: value for key, value in totals.items() if key != "cost_usd"},
        "cost_usd": str(totals["cost_usd"]),
    }


def _sum_counter(counters: Iterable[dict[str, Any]]) -> dict[str, int]:
    total: dict[str, int] = {}
    for counter in counters:
        for key, value in counter.items():
            total[key] = total.get(key, 0) + int(value or 0)
    return dict(sorted(total.items()))


def _write_suite_outputs(*, suite_dir: Path, report: dict[str, Any]) -> None:
    _write_json(suite_dir / "report.json", report)
    _write_json(suite_dir / "manifest.json", _suite_manifest(report))
    (suite_dir / "REPORT.md").write_text(_markdown_report(report), encoding="utf-8")
    (suite_dir / "EXECUTIVE_SUMMARY.md").write_text(
        _executive_summary(report),
        encoding="utf-8",
    )


def _suite_manifest(report: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": report["schema_version"],
        "generated_at": report["generated_at"],
        "run_id": report["run_id"],
        "status": "written",
        "recommendation": report["recommendation"],
        "fallback_readiness": report.get("fallback_readiness"),
        "case_ids": report["case_ids"],
        "approaches": [
            {
                "approach": approach["approach"],
                "report_path": approach["report_path"],
                "markdown_path": approach["markdown_path"],
                "case_count": approach["case_count"],
                "passed_cases": approach["passed_cases"],
                "failed_cases": approach["failed_cases"],
            }
            for approach in report["approaches"]
        ],
        "report_path": str(Path(report["suite_dir"]) / "report.json"),
        "markdown_path": str(Path(report["suite_dir"]) / "REPORT.md"),
        "executive_summary_path": str(Path(report["suite_dir"]) / "EXECUTIVE_SUMMARY.md"),
    }


def _markdown_report(report: dict[str, Any]) -> str:
    lines = [
        "# Statement Approach Comparison",
        "",
        f"- Run ID: `{report['run_id']}`",
        f"- Recommendation: `{report['recommendation']}`",
        f"- Cases: `{len(report['case_ids'])}`",
        "",
        "## Fallback Transaction Readiness",
        "",
        *_fallback_transaction_readiness_summary(report.get("fallback_readiness", {})),
        "",
        *_fallback_factor_weight_table(report.get("fallback_readiness", {})),
        "",
        "## Fallback Readiness Gate",
        "",
    ]
    lines.extend(_fallback_readiness_table(report["approaches"]))
    if report.get("fallback_readiness"):
        readiness = report["fallback_readiness"]
        lines.extend(
            [
                "",
                f"Suite fallback status: `{readiness.get('status')}`; "
                f"P0 passed: `{'yes' if readiness.get('p0_passed') else 'no'}`; "
                "candidate safety: "
                f"`{'yes' if readiness.get('candidate_safety_passed') else 'no'}`.",
            ]
        )
    lines.extend(
        [
            "",
            "## Approach Summary",
            "",
            "| Approach | Strict Passed | Strict Failed | Fallback Status | P0 Score | Amount | "
            "Date | Description | Type | Installment | Reconciliation matched | Cost USD |",
            "| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for approach in report["approaches"]:
        fields = approach["field_mismatch_counts"]
        reconciliation = approach["reconciliation_counts"]
        readiness = approach.get("fallback_readiness", {})
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{approach['approach']}`",
                    str(approach["passed_cases"]),
                    str(approach["failed_cases"]),
                    f"`{readiness.get('status', 'not_ready')}`",
                    f"`{readiness.get('p0_readiness_score_label', '0/100')}`",
                    str(fields.get("amount_minor", 0)),
                    str(fields.get("date", 0)),
                    str(fields.get("description", 0)),
                    str(fields.get("line_type", 0)),
                    str(fields.get("installment", 0)),
                    str(reconciliation.get("matched", 0)),
                    str(approach["cost_totals"]["cost_usd"]),
                ]
            )
            + " |"
        )
    lines.extend(["", "## Runtime Critical Field Readiness", ""])
    lines.extend(_runtime_readiness_table(report.get("runtime_critical_field_readiness", [])))
    lines.extend(["", "## API Usage And Cost", ""])
    lines.extend(_provider_cost_table(report.get("provider_cost_report", [])))
    lines.extend(["", "## Improvement Potential", ""])
    lines.extend(_improvement_potential_table(report.get("improvement_potential", [])))
    lines.extend(["", "## Case Comparison", ""])
    for row in report["case_comparison"]:
        lines.append(f"### `{row['case_id']}`")
        lines.append("")
        lines.append(
            "| Approach | Strict Passed | Fallback Ready | P0 Blockers | Caveats | Lines | "
            "Amount | Date | Currency | Description | Type | Best |"
        )
        lines.append(
            "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |"
        )
        for approach_name, case in row["approaches"].items():
            readiness = case.get("fallback_readiness", {})
            lines.append(
                "| "
                + " | ".join(
                    [
                        f"`{approach_name}`",
                        "`yes`" if case["passed"] else "`no`",
                        f"`{readiness.get('status', 'not_ready')}`",
                        str(len(readiness.get("blocking_reasons", []))),
                        str(len(readiness.get("caveats", []))),
                        str(case["actual_line_count"]),
                        str(case["amount_mismatches"]),
                        str(case["date_mismatches"]),
                        str(case["currency_mismatches"]),
                        str(case["description_mismatches"]),
                        str(case["line_type_mismatches"]),
                        "`yes`" if row["best_approach"] == approach_name else "",
                    ]
                )
                + " |"
            )
        lines.append("")
    return "\n".join(lines)


def _executive_summary(report: dict[str, Any]) -> str:
    lines = [
        "# Executive Summary",
        "",
        f"Recommendation: `{report['recommendation']}`.",
        "",
        "## Bottom Line",
        "",
        _executive_bottom_line(report),
        "",
        "## Fallback Transaction Readiness",
        "",
        *_fallback_transaction_readiness_summary(report.get("fallback_readiness", {})),
        "",
        *_fallback_factor_weight_table(report.get("fallback_readiness", {})),
        "",
        "## Fallback Readiness Gate",
        "",
        *_fallback_readiness_table(report["approaches"]),
        "",
        "## Runtime Critical Field Readiness",
        "",
        *_runtime_readiness_table(report.get("runtime_critical_field_readiness", [])),
        "",
        "## API Usage And Cost",
        "",
        *_provider_cost_table(report.get("provider_cost_report", [])),
        "",
        "## Improvement Potential",
        "",
        *_improvement_potential_table(report.get("improvement_potential", [])),
        "",
        "## Results",
        "",
    ]
    for approach in report["approaches"]:
        fields = approach["field_mismatch_counts"]
        mode = _approach_evidence_label(approach)
        readiness = approach.get("fallback_readiness", {})
        lines.append(
            "- "
            f"`{approach['approach']}`: strict `{approach['passed_cases']}/"
            f"{approach['case_count']}` cases passed; fallback "
            f"`{readiness.get('status', 'not_ready')}`; "
            f"P0 score `{readiness.get('p0_readiness_score_label', '0/100')}`; "
            f"amount mismatches `{fields.get('amount_minor', 0)}`, "
            f"description mismatches `{fields.get('description', 0)}`, "
            f"line-type mismatches `{fields.get('line_type', 0)}`, "
            f"cost `${approach['cost_totals']['cost_usd']}`; {mode}."
        )
    lines.extend(["", "## What Went Well", ""])
    good = _executive_good_points(report)
    lines.extend([f"- {point}" for point in good] or ["- No approach passed enough cases yet."])
    lines.extend(["", "## What Went Wrong", ""])
    bad = _executive_problem_points(report)
    lines.extend([f"- {point}" for point in bad] or ["- No blocking extraction problems detected."])
    lines.extend(["", "## Fixes To Try Next", ""])
    fixes = _executive_fix_points(report)
    lines.extend([f"- {point}" for point in fixes])
    return "\n".join(lines) + "\n"


def _executive_bottom_line(report: dict[str, Any]) -> str:
    by_name = {approach["approach"]: approach for approach in report["approaches"]}
    auto = by_name.get("auto")
    pymupdf = by_name.get("pymupdf")
    gemini = by_name.get("gemini")
    deterministic_primary = auto or pymupdf
    if gemini and not _approach_has_provider_evidence(gemini):
        return (
            "This suite does not contain live Gemini extraction evidence yet; the Gemini "
            "lane is not a valid provider-quality comparison until it is run with live "
            "provider calls or reused live provider manifests."
        )
    if deterministic_primary and _all_cases_pass(deterministic_primary) and gemini is None:
        return (
            "`auto` routes to deterministic PyMuPDF for these baselined cases; the next "
            "risk is corpus expansion, not this extraction gate."
        )
    if (
        deterministic_primary
        and _all_cases_pass(deterministic_primary)
        and gemini
        and gemini.get("fallback_readiness", {}).get("status")
        in {FALLBACK_READY_WITH_CAVEATS, FALLBACK_PROMOTED_WITH_CAVEATS}
    ):
        return (
            "`auto` routes to deterministic PyMuPDF for the known-layout suite. Gemini "
            "fallback is promotion-ready for unsupported layouts with documented caveats "
            "because P0 fields and candidate safety passed."
        )
    if (
        deterministic_primary
        and _all_cases_pass(deterministic_primary)
        and (gemini is None or not _approach_better(gemini, deterministic_primary))
    ):
        return (
            "`auto` routes to deterministic PyMuPDF for this suite. Keep Gemini as a "
            "transparent fallback comparison while expanding the private corpus."
        )
    if (
        deterministic_primary
        and gemini
        and deterministic_primary["passed_cases"] > gemini["passed_cases"]
    ):
        return (
            "`auto`/`pymupdf` is ahead on this suite, but non-CMR issuer coverage and Gemini "
            "fallback quality still need iteration before promotion."
        )
    if gemini and pymupdf and gemini["passed_cases"] > pymupdf["passed_cases"]:
        return (
            "`gemini` is ahead on this suite; use the mismatch tables to decide whether "
            "PyMuPDF remains a narrow CMR parser or becomes a fallback."
        )
    return "The suite still needs iteration before one approach can be promoted."


def _approach_evidence_label(approach: dict[str, Any]) -> str:
    if approach["approach"] in {"auto", "pymupdf"}:
        return "deterministic PyMuPDF evidence; no Gemini categorization or provider call"
    if _approach_has_provider_evidence(approach):
        return "live/cached Gemini provider evidence"
    return "Gemini dry-run/cache-miss evidence only; not provider-quality evidence"


def _approach_has_provider_evidence(approach: dict[str, Any]) -> bool:
    if approach["approach"] != "gemini":
        return False
    no_provider_statuses = {
        "dry-run",
        "missing-cache",
        "password_required",
        "password_invalid",
    }
    return any(case["status"] not in no_provider_statuses for case in approach["cases"])


def _executive_good_points(report: dict[str, Any]) -> list[str]:
    points: list[str] = []
    for approach in report["approaches"]:
        fields = approach["field_mismatch_counts"]
        if approach["passed_cases"]:
            passed_case_ids = [
                f"`{case['case_id']}`" for case in approach["cases"] if case["passed"]
            ]
            points.append(
                f"`{approach['approach']}` passed `{approach['passed_cases']}`/"
                f"`{approach['case_count']}` cases: " + ", ".join(passed_case_ids) + "."
            )
        if approach["passed_cases"] and int(fields.get("amount_minor", 0)) == 0:
            points.append(
                f"`{approach['approach']}` had zero amount mismatches on comparable lines."
            )
        if (
            approach["approach"] in {"auto", "pymupdf"}
            and approach["cost_totals"]["cost_usd"] == "0"
        ):
            points.append(
                f"`{approach['approach']}` produced local extraction evidence with zero "
                "provider cost."
            )
    return points


def _executive_problem_points(report: dict[str, Any]) -> list[str]:
    points: list[str] = []
    for approach in report["approaches"]:
        readiness = approach.get("fallback_readiness", {})
        failed_cases = [case for case in approach["cases"] if not case["passed"]]
        if failed_cases:
            label = (
                "strict fixture diagnostics"
                if readiness.get("status")
                in {FALLBACK_READY_WITH_CAVEATS, FALLBACK_PROMOTED_WITH_CAVEATS}
                else "failed"
            )
            points.append(
                f"`{approach['approach']}` {label} for `{len(failed_cases)}` case(s): "
                + ", ".join(f"`{case['case_id']}` ({case['status']})" for case in failed_cases)
                + "."
            )
            fields = approach["field_mismatch_counts"]
            severities = approach["severity_counts"]
            points.append(
                f"`{approach['approach']}` field impact: "
                f"`{fields.get('amount_minor', 0)}` amount, "
                f"`{fields.get('description', 0)}` description, "
                f"`{fields.get('line_type', 0)}` line-type, "
                f"`{fields.get('installment', 0)}` installment, and "
                f"`{severities.get('critical', 0)}` critical issue(s)."
            )
        zero_line_cases = [
            case
            for case in failed_cases
            if int(case["actual_line_count"]) == 0 and int(case["expected_line_count"]) > 0
        ]
        if zero_line_cases:
            points.append(
                f"`{approach['approach']}` produced zero normalized lines for "
                + ", ".join(
                    f"`{case['case_id']}` expected `{case['expected_line_count']}`"
                    for case in zero_line_cases
                )
                + "."
            )
        if approach["approach"] == "gemini" and all(
            case["status"] == "dry-run" for case in approach["cases"]
        ):
            points.append(
                "`gemini` did not produce provider-quality results in this suite because it "
                "ran in dry-run mode."
            )
    return points


def _executive_fix_points(report: dict[str, Any]) -> list[str]:
    fixes: list[str] = []
    by_name = {approach["approach"]: approach for approach in report["approaches"]}
    pymupdf = by_name.get("auto") or by_name.get("pymupdf")
    gemini = by_name.get("gemini")
    if pymupdf and any(case["actual_line_count"] == 0 for case in pymupdf["cases"]):
        zero_cases = [
            case["case_id"] for case in pymupdf["cases"] if int(case["actual_line_count"]) == 0
        ]
        fixes.append(
            "Add issuer-specific PyMuPDF row grouping/layout rules for "
            + ", ".join(f"`{case_id}`" for case_id in zero_cases)
            + "."
        )
    if gemini and _approach_has_provider_evidence(gemini):
        fields = gemini["field_mismatch_counts"]
        if int(fields.get("amount_minor", 0)):
            fixes.append(
                "Tighten the Gemini prompt/coalesce contract for installment amount "
                "selection so the selected amount is the current statement-line charge, "
                "not the plan total or remaining balance."
            )
        if int(fields.get("installment", 0)):
            fixes.append(
                "Preserve visible installment markers in Gemini output and decide whether "
                "missing `01/01` markers should block promotion or become a low-severity "
                "audit warning."
            )
        if int(fields.get("description", 0)):
            fixes.append(
                "Review Gemini description drift by issuer and split true merchant loss "
                "from safe OCR/city-suffix differences in scoring."
            )
        if int(fields.get("line_type", 0)):
            fixes.append(
                "Add deterministic issuer rules or prompt examples for insurance, fee, "
                "payment, and adjustment line types before runtime promotion."
            )
    if gemini and all(case["status"] == "dry-run" for case in gemini["cases"]):
        fixes.append(
            "Run the suite with `--gemini-live --bypass-cache --confirm-live-cost` "
            "before using Gemini for approach comparison."
        )
    if not fixes and any(_all_cases_pass(approach) for approach in report["approaches"]):
        fixes.append(
            "Expand the deterministic check to the remaining private statement corpus "
            "and keep Gemini comparison evidence for fallback decisions."
        )
    elif not fixes:
        fixes.append(
            "Use the top-level `REPORT.md` mismatch table to choose the next prompt or layout rule."
        )
    return fixes


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


def _fallback_readiness_table(approaches: list[dict[str, Any]]) -> list[str]:
    lines = [
        "| Approach | Status | P0 Score | P0 Passed | Line Coverage | Candidate Safety | "
        "Strict Cases | Caveats | Blockers |",
        "| --- | --- | ---: | --- | ---: | --- | ---: | --- | --- |",
    ]
    if not approaches:
        lines.append("| `none` | `not_ready` | `0/100` | `no` | 0% | `no` | 0/0 | - | `no_cases` |")
        return lines
    for approach in approaches:
        readiness = approach.get("fallback_readiness", {})
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{approach.get('approach')}`",
                    f"`{readiness.get('status', 'not_ready')}`",
                    f"`{readiness.get('p0_readiness_score_label', '0/100')}`",
                    "`yes`" if readiness.get("p0_passed") else "`no`",
                    f"{round(float(readiness.get('line_coverage_ratio') or 0) * 100, 2)}%",
                    "`yes`" if readiness.get("candidate_safety_passed") else "`no`",
                    f"{approach.get('passed_cases', 0)}/{approach.get('case_count', 0)}",
                    _md_value(", ".join(readiness.get("caveats", [])[:4]) or "-"),
                    _md_value(", ".join(readiness.get("blocking_reasons", [])[:4]) or "-"),
                ]
            )
            + " |"
        )
    return lines


def _provider_cost_table(rows: list[dict[str, Any]]) -> list[str]:
    lines = [
        "| Approach | Deterministic Calls Avoided | Fallback Calls Made | Avg Tokens | "
        "Avg Cost USD | Highest Cost Case | Highest Cost USD | Cost / Ledger-Ready Line |",
        "| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |",
    ]
    if not rows:
        lines.append("| `none` | 0 | 0 | 0 | 0 | - | 0 | 0 |")
        return lines
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{row.get('approach')}`",
                    str(row.get("deterministic_calls_avoided", 0)),
                    str(row.get("provider_call_count", 0)),
                    str(row.get("average_tokens_per_provider_call", 0)),
                    str(row.get("average_cost_usd_per_provider_call", "0")),
                    f"`{row.get('highest_cost_case', 'none')}`",
                    str(row.get("highest_cost_usd", "0")),
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


def _md_value(value: Any) -> str:
    return " ".join(str(value).split()).replace("|", "\\|")


def _case_slug(case_id: str) -> str:
    return slug_run_id(case_id.replace("/", "-"))


def _load_json(path: Path) -> dict[str, Any]:
    return cast("dict[str, Any]", json.loads(path.read_text(encoding="utf-8")))


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )


def _json_default(value: object) -> str:
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")
