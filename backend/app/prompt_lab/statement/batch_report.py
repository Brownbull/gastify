"""Batch report for statement Gemini prompt-lab runs."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, cast

STATEMENT_BATCH_SUMMARY_SCHEMA_VERSION = "statement-prompt-lab-batch-summary.v1"


def write_statement_batch_report(
    *,
    manifest_paths: list[Path],
    output_dir: Path,
    label: str = "statement-live",
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifests = [_load_json(path) for path in manifest_paths]
    cases = [_case_summary(manifest) for manifest in manifests]
    totals = _totals(cases)
    summary = {
        "schema_version": STATEMENT_BATCH_SUMMARY_SCHEMA_VERSION,
        "label": label,
        "generated_at": datetime.now(UTC).isoformat(),
        "case_count": len(cases),
        "statuses": [case["status"] for case in cases],
        "status_counts": _count_values(case["status"] for case in cases),
        "failure_owner_counts": _count_values(
            case["failure_owner"] for case in cases if case["failure_owner"]
        ),
        "provider_error_count": sum(1 for case in cases if case["status"] == "provider-error"),
        "cache_evidence_status_count": sum(
            1 for case in cases if "cache" in case["status"] or case["status"] == "missing-cache"
        ),
        "no_cache_evidence_count": sum(
            1
            for case in cases
            if case["status"] in {"completed", "threshold-failed", "provider-error"}
        ),
        "baseline_counts": {
            "scored": sum(1 for case in cases if case["baseline_available"]),
            "missing_expected": sum(1 for case in cases if not case["baseline_available"]),
        },
        "cases": cases,
        "totals": totals,
    }
    summary["promotion_decision"] = _promotion_decision(summary)

    output_slug = _slug(label)
    summary_path = output_dir / f"{output_slug}-statement-live-summary.json"
    analysis_path = output_dir / f"{output_slug}-statement-live-analysis.md"
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    analysis_path.write_text(_markdown(summary), encoding="utf-8")
    summary["summary_path"] = str(summary_path)
    summary["analysis_path"] = str(analysis_path)
    return summary


def _case_summary(manifest: dict[str, Any]) -> dict[str, Any]:
    score = _load_optional_json(manifest.get("score_path")) or manifest.get("score", {})
    cost = _load_optional_json(manifest.get("cost_summary_path")) or manifest.get(
        "cost_summary", {}
    )
    processed = _load_optional_json(manifest.get("processed_output_path")) or {}
    reconciliation = _load_optional_json(manifest.get("reconciliation_path")) or {}
    statement = (processed.get("statement_extraction") or {}) if isinstance(processed, dict) else {}
    lines = statement.get("lines", []) if isinstance(statement, dict) else []
    cost_totals = cost.get("totals", {}) if isinstance(cost, dict) else {}
    differences = score.get("differences", {}) if isinstance(score, dict) else {}
    counts = reconciliation.get("counts", {}) if isinstance(reconciliation, dict) else {}
    severity_counts = (
        differences.get("severity_counts", {}) if isinstance(differences, dict) else {}
    )
    return {
        "case_id": str(manifest.get("case_id")),
        "issuer": manifest.get("issuer"),
        "status": str(manifest.get("status")),
        "manifest_path": manifest.get("manifest_path"),
        "raw_output_path": manifest.get("raw_output_path"),
        "processed_output_path": manifest.get("processed_output_path"),
        "score_path": manifest.get("score_path"),
        "reconciliation_path": manifest.get("reconciliation_path"),
        "payload_examples_path": manifest.get("payload_examples_path"),
        "cost_summary_path": manifest.get("cost_summary_path"),
        "prompt_identity": manifest.get("prompt_identity", {}),
        "baseline_available": bool(manifest.get("expected_path")),
        "passed": bool(score.get("passed")) if isinstance(score, dict) else False,
        "failure_owner": manifest.get("failure_owner") or score.get("failure_owner"),
        "line_count": len(lines) if isinstance(lines, list) else 0,
        "line_count_delta": differences.get("line_count_delta"),
        "field_mismatch_count": differences.get("mismatch_count"),
        "field_mismatch_counts": differences.get("field_mismatch_counts", {}),
        "severity_counts": {
            "critical": int(severity_counts.get("critical") or 0),
            "high": int(severity_counts.get("high") or 0),
            "medium": int(severity_counts.get("medium") or 0),
            "low": int(severity_counts.get("low") or 0),
        },
        "promotion_blockers": differences.get("promotion_blockers", []),
        "recommended_owner": differences.get("recommended_owner"),
        "downstream_impact": differences.get("downstream_impact", []),
        "metadata": {
            "currency_match": score.get("currency_match") if isinstance(score, dict) else None,
            "issuer_match": score.get("issuer_match") if isinstance(score, dict) else None,
        },
        "reconciliation_counts": {
            "matched": int(counts.get("matched") or 0),
            "statement_only": int(counts.get("statement_only") or 0),
            "receipt_only": int(counts.get("receipt_only") or 0),
            "ambiguous": int(counts.get("ambiguous") or 0),
            "failed": int(counts.get("failed") or 0),
            "candidate_transactions": int(counts.get("candidate_transactions") or 0),
        },
        "tokens": {
            "input_tokens": int(cost_totals.get("input_tokens") or 0),
            "output_tokens": int(cost_totals.get("output_tokens") or 0),
            "total_tokens": int(cost_totals.get("total_tokens") or 0),
        },
        "cost_usd": str(cost_totals.get("cost_usd") or "0"),
    }


def _promotion_decision(summary: dict[str, Any]) -> dict[str, Any]:
    reasons: list[str] = []
    if summary["case_count"] == 0:
        reasons.append("no_statement_cases")
    if summary["provider_error_count"]:
        reasons.append("provider_errors_present")
    if summary["cache_evidence_status_count"]:
        reasons.append("cached_or_missing_cache_evidence_present")
    if summary["baseline_counts"]["missing_expected"]:
        reasons.append("expected_fixture_gap")
    failed = [case for case in summary["cases"] if not case["passed"]]
    if failed:
        reasons.append("expected_vs_actual_failures_present")

    if not reasons:
        decision = "ready_for_runtime_prompt_promotion_review"
    elif any(reason in reasons for reason in ("provider_errors_present", "expected_fixture_gap")):
        decision = "must_classify_provider_or_baseline_failures"
    else:
        decision = "needs_prompt_or_coalesce_iteration"
    return {
        "decision": decision,
        "ready": not reasons,
        "reasons": reasons,
        "runtime_note": (
            "This is provider-quality prompt-lab evidence only. Web, API, and S23 "
            "runtime gates remain separate."
        ),
    }


def _totals(cases: list[dict[str, Any]]) -> dict[str, Any]:
    total_input = sum(case["tokens"]["input_tokens"] for case in cases)
    total_output = sum(case["tokens"]["output_tokens"] for case in cases)
    total_cost = sum((Decimal(case["cost_usd"]) for case in cases), Decimal("0"))
    reconciliation_counts = {
        "matched": 0,
        "statement_only": 0,
        "receipt_only": 0,
        "ambiguous": 0,
        "failed": 0,
        "candidate_transactions": 0,
    }
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    promotion_blockers: set[str] = set()
    downstream_impact: set[str] = set()
    for case in cases:
        for key in reconciliation_counts:
            reconciliation_counts[key] += int(case["reconciliation_counts"][key])
        for severity in severity_counts:
            severity_counts[severity] += int(case["severity_counts"][severity])
        promotion_blockers.update(case.get("promotion_blockers") or [])
        downstream_impact.update(case.get("downstream_impact") or [])
    return {
        "input_tokens": total_input,
        "output_tokens": total_output,
        "total_tokens": total_input + total_output,
        "cost_usd": _money(total_cost),
        "reconciliation_counts": reconciliation_counts,
        "severity_counts": severity_counts,
        "promotion_blockers": sorted(promotion_blockers),
        "downstream_impact": sorted(downstream_impact),
    }


def _markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Statement Gemini Prompt-Lab Analysis",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Label: `{summary['label']}`",
        f"- Cases: `{summary['case_count']}`",
        f"- Provider errors: `{summary['provider_error_count']}`",
        f"- Cache evidence statuses: `{summary['cache_evidence_status_count']}`",
        f"- No-cache evidence cases: `{summary['no_cache_evidence_count']}`",
        f"- Total cost: `${summary['totals']['cost_usd']}`",
        f"- Promotion decision: `{summary['promotion_decision']['decision']}`",
        "",
        "## Reconciliation Totals",
        "",
        "| Matched | Statement Only | Receipt Only | Ambiguous | Failed | Candidates |",
        "| ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    counts = summary["totals"]["reconciliation_counts"]
    lines.append(
        "| "
        + " | ".join(
            str(counts[key])
            for key in (
                "matched",
                "statement_only",
                "receipt_only",
                "ambiguous",
                "failed",
                "candidate_transactions",
            )
        )
        + " |"
    )
    lines.extend(
        [
            "",
            "## Case Summary",
            "",
            "| Case | Status | Passed | Failure Owner | Lines | Line Delta | Mismatches | "
            "Matched | Statement Only | Receipt Only | Ambiguous |",
            "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for case in summary["cases"]:
        counts = case["reconciliation_counts"]
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{case['case_id']}`",
                    f"`{case['status']}`",
                    "`yes`" if case["passed"] else "`no`",
                    f"`{case['failure_owner'] or 'none'}`",
                    str(case["line_count"]),
                    str(case["line_count_delta"]),
                    str(case["field_mismatch_count"]),
                    str(counts["matched"]),
                    str(counts["statement_only"]),
                    str(counts["receipt_only"]),
                    str(counts["ambiguous"]),
                ]
            )
            + " |"
        )
    if summary["promotion_decision"]["reasons"]:
        lines.extend(["", "## Blocking Reasons", ""])
        lines.extend(f"- `{reason}`" for reason in summary["promotion_decision"]["reasons"])
    if any(summary["totals"]["severity_counts"].values()):
        lines.extend(
            [
                "",
                "## Failure Diagnostics",
                "",
                "- Severity totals: "
                + ", ".join(
                    f"`{severity}={count}`"
                    for severity, count in summary["totals"]["severity_counts"].items()
                    if int(count)
                ),
                "- Promotion blockers: "
                + ", ".join(f"`{blocker}`" for blocker in summary["totals"]["promotion_blockers"]),
                "",
                "### Downstream Impact",
                "",
            ]
        )
        lines.extend(f"- {impact}" for impact in summary["totals"]["downstream_impact"])
    return "\n".join(lines) + "\n"


def _load_json(path: Path) -> dict[str, Any]:
    return cast("dict[str, Any]", json.loads(path.read_text(encoding="utf-8")))


def _load_optional_json(path: object) -> dict[str, Any] | None:
    if not path:
        return None
    candidate = Path(str(path))
    if not candidate.exists():
        return None
    return cast("dict[str, Any]", json.loads(candidate.read_text(encoding="utf-8")))


def _count_values(values: object) -> dict[str, int]:
    counts: dict[str, int] = {}
    if not isinstance(values, list | tuple | set):
        return counts
    for value in values:
        key = str(value)
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


def _money(value: Decimal) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".") or "0"


def _slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "statement-live"
