"""Local-only reports for statement expected fixtures and reconciliation readiness."""

from __future__ import annotations

import json
import math
import re
import string
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Literal

from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url

from app.config import settings
from app.db import engine
from app.prompt_lab.paths import LATEST_RESULTS_ROOT
from app.prompt_lab.run_ids import next_serial_run_id
from app.prompt_lab.statement.cases import (
    StatementCase,
    extract_statement_text,
    get_statement_case,
    list_statement_cases,
)
from app.prompt_lab.statement.scoring import (
    align_statement_lines,
    descriptions_match_for_scoring,
    score_statement_output,
)
from app.prompt_lab.statement.seed_db import STATEMENT_LAB_SEED_PROMPT_PREFIX
from app.schemas.statement import (
    StatementExtractionOutput,
    StatementLine,
    StatementPdfStatus,
    StatementProcessingMetadata,
)
from app.services.recurrence import recurrence_fields_from_statement_installment

_STATEMENT_CANDIDATE_ITEM_NAME = "Unidentified statement item"
_STATEMENT_TRANSACTION_LINE_TYPES = {
    "charge",
    "fee",
    "interest",
    "insurance",
    "tax",
    "adjustment",
    "other",
}
_DIAGNOSTIC_FIELDS = (
    "date",
    "description",
    "amount_minor",
    "currency",
    "line_type",
    "installment",
    "original_currency",
    "original_amount_minor",
)
_SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}
_MAX_MARKDOWN_VALUE_ROWS = 50
StatementReportActualSource = Literal["current", "mock-gemini", "live-gemini", "deterministic"]
StatementReportTransactionFixture = Literal["none", "edge-cases"]


@dataclass(frozen=True)
class _ReceiptTransaction:
    id: str
    ownership_scope_id: str | None
    transaction_date: date
    merchant: str
    total_minor: int
    currency: str
    receipt_type: str | None
    card_alias_id: str | None
    merchant_user_edited_at: str | None
    prompt_version: str | None = None
    source: str = "local-db"
    fixture_kind: str | None = None


@dataclass(frozen=True)
class _CandidateMatch:
    transaction: _ReceiptTransaction
    score: float
    reasons: list[str]


async def write_statement_expected_report(
    *,
    run_id: str | None = None,
    credentials_root: Path | None = None,
    output_root: Path = LATEST_RESULTS_ROOT,
    output_dir: Path | None = None,
    case_output_root: Path | None = None,
    deterministic_case_variant_dirs: bool = True,
    actual_source: StatementReportActualSource = "current",
    transaction_fixture: StatementReportTransactionFixture = "none",
    transaction_scope_firebase_uid: str | None = None,
    manifest_paths: list[Path] | None = None,
    deterministic_manifest_paths: list[Path] | None = None,
    comparison_manifest_paths: list[Path] | None = None,
) -> dict[str, Any]:
    """Write a private local report for statement fixtures with expected output.

    The report intentionally does not call Gemini. By default it compares the
    current Codex/pypdf text-only extractor against manual expected fixtures.
    In ``mock-gemini`` mode, it uses the expected fixture as simulated provider
    output so the downstream report/reconciliation artifacts can be exercised.
    """
    resolved_run_id = run_id or next_serial_run_id(
        output_root / "statements",
        f"statement-{actual_source}-report",
    )
    transactions, db_snapshot = await _load_receipt_transactions_snapshot(
        transaction_scope_firebase_uid=transaction_scope_firebase_uid
    )
    output_dir = output_dir or output_root / "statements" / resolved_run_id
    output_dir.mkdir(parents=True, exist_ok=True)
    case_root = case_output_root or output_dir

    comparison_reports: list[dict[str, Any]] = []
    if actual_source == "live-gemini":
        if not manifest_paths:
            raise ValueError("live-gemini statement reports require at least one manifest path")
        case_reports = [
            _case_report_from_manifest(
                manifest_path=manifest_path,
                transactions=transactions,
                transaction_fixture=transaction_fixture,
                output_dir=case_root / _slug(_manifest_case_id(manifest_path)),
            )
            for manifest_path in manifest_paths
        ]
    elif actual_source == "deterministic":
        if not deterministic_manifest_paths:
            raise ValueError("deterministic statement reports require at least one manifest path")
        case_reports = [
            _case_report_from_deterministic_manifest(
                manifest_path=manifest_path,
                transactions=transactions,
                transaction_fixture=transaction_fixture,
                output_dir=case_root
                / _slug(
                    _deterministic_manifest_case_key(manifest_path)
                    if deterministic_case_variant_dirs
                    else _manifest_case_id(manifest_path)
                ),
            )
            for manifest_path in deterministic_manifest_paths
        ]
        comparison_reports = [
            _case_report_from_manifest(
                manifest_path=manifest_path,
                transactions=transactions,
                transaction_fixture=transaction_fixture,
                output_dir=case_root / "comparison" / _slug(_manifest_case_id(manifest_path)),
            )
            for manifest_path in (comparison_manifest_paths or [])
        ]
    else:
        if manifest_paths:
            raise ValueError("statement report manifests are only supported with live-gemini")
        if deterministic_manifest_paths:
            raise ValueError(
                "deterministic manifests are only supported with actual_source=deterministic"
            )
        if comparison_manifest_paths:
            raise ValueError(
                "comparison manifests are only supported with actual_source=deterministic"
            )
        cases = [case for case in list_statement_cases() if case.expected_path is not None]
        case_reports = [
            _case_report(
                case,
                transactions=transactions,
                credentials_root=credentials_root,
                actual_source=actual_source,
                transaction_fixture=transaction_fixture,
                output_dir=case_root / _slug(case.id),
            )
            for case in cases
        ]
    summary = _summary(case_reports, db_snapshot)
    deterministic_comparison = (
        _deterministic_comparison(case_reports, comparison_reports)
        if actual_source == "deterministic"
        else None
    )
    report_path = output_dir / "report.json"
    markdown_path = output_dir / "REPORT.md"
    generated_artifacts = _report_artifacts(
        output_dir=output_dir,
        report_path=report_path,
        markdown_path=markdown_path,
        case_reports=case_reports,
    )
    report = {
        "schema_version": 1,
        "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "execution_mode": _execution_mode(actual_source),
        "actual_source": actual_source,
        "transaction_fixture": transaction_fixture,
        "transaction_scope": {
            "firebase_uid": transaction_scope_firebase_uid,
            "ownership_scope_id": db_snapshot.get("transaction_scope_ownership_scope_id"),
        },
        "privacy": {
            "raw_statement_text_included": False,
            "raw_pdfs_committed": False,
            "credentials_committed": False,
            "report_root_is_gitignored": True,
        },
        "database": db_snapshot,
        "summary": summary,
        "failure_summary": summary["failure_summary"],
        "severity_counts": summary["severity_counts"],
        "downstream_impact": summary["downstream_impact"],
        "recommended_owner": summary["recommended_owner"],
        "promotion_blockers": summary["promotion_blockers"],
        "generated_artifacts": generated_artifacts,
        "payload_examples": _aggregate_payload_examples(case_reports),
        "comparison_cases": comparison_reports,
        "deterministic_comparison": deterministic_comparison,
        "promotion_recommendation": (
            deterministic_comparison["promotion_recommendation"]
            if deterministic_comparison
            else None
        ),
        "cases": case_reports,
    }

    report_path.write_text(
        json.dumps(report, indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )
    markdown_path.write_text(_markdown_report(report), encoding="utf-8")
    manifest = {
        "status": "written",
        "run_id": resolved_run_id,
        "actual_source": actual_source,
        "transaction_fixture": transaction_fixture,
        "report_path": str(report_path),
        "markdown_path": str(markdown_path),
        "generated_artifacts": generated_artifacts,
        "case_count": len(case_reports),
        "summary": summary,
        "deterministic_comparison": deterministic_comparison,
        "promotion_recommendation": (
            deterministic_comparison["promotion_recommendation"]
            if deterministic_comparison
            else None
        ),
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return manifest


def _case_report(
    case: StatementCase,
    *,
    transactions: list[_ReceiptTransaction],
    credentials_root: Path | None,
    actual_source: StatementReportActualSource,
    transaction_fixture: StatementReportTransactionFixture,
    output_dir: Path,
) -> dict[str, Any]:
    assert case.expected_path is not None
    output_dir.mkdir(parents=True, exist_ok=True)
    expected = StatementExtractionOutput.model_validate_json(
        case.expected_path.read_text(encoding="utf-8")
    )
    packet = extract_statement_text(
        case,
        credentials_root=credentials_root,
        include_source_text=False,
    )
    actual = _actual_output(expected=expected, extracted=packet.extraction, source=actual_source)
    score = score_statement_output(expected=expected, actual=actual)
    differences = _line_differences(expected=expected, actual=actual)
    case_transactions = _transactions_for_case(
        base_transactions=transactions,
        output=actual,
        case_id=case.id,
        fixture=transaction_fixture,
    )
    reconciliation = _simulate_reconciliation(actual, case_transactions)
    expected_line_types: dict[str, int] = {}
    for line in expected.lines:
        expected_line_types[line.line_type] = expected_line_types.get(line.line_type, 0) + 1
    artifacts = _write_case_artifacts(
        output_dir=output_dir,
        case=case,
        actual_source=actual_source,
        transaction_fixture=transaction_fixture,
        pdf_text_extraction=packet.extraction,
        actual=actual,
        score=score,
        differences=differences,
        reconciliation=reconciliation,
    )

    return {
        "case_id": case.id,
        "issuer": case.issuer,
        "pdf": case.relative_path,
        "expected_path": str(case.expected_path),
        "artifact_dir": str(output_dir),
        "artifacts": artifacts,
        "failure_summary": differences["failure_summary"],
        "severity_counts": differences["severity_counts"],
        "downstream_impact": differences["downstream_impact"],
        "recommended_owner": differences["recommended_owner"],
        "promotion_blockers": differences["promotion_blockers"],
        "findings": _case_findings(
            actual_source=actual_source,
            transaction_fixture=transaction_fixture,
            expected=expected,
            actual=actual,
            score=score,
            reconciliation=reconciliation,
        ),
        "expected": {
            "pdf_status": expected.pdf_status,
            "issuer": expected.statement.issuer,
            "currency": expected.statement.currency,
            "period_start": _date_string(expected.statement.period_start),
            "period_end": _date_string(expected.statement.period_end),
            "due_date": _date_string(expected.statement.due_date),
            "line_count": len(expected.lines),
            "line_type_counts": dict(sorted(expected_line_types.items())),
            "processing": expected.processing.model_dump(mode="json"),
        },
        "current_extraction": {
            "actual_source": actual_source,
            "provider": actual.processing.provider,
            "pdf_status": actual.pdf_status,
            "issuer": actual.statement.issuer,
            "currency": actual.statement.currency,
            "line_count": len(actual.lines),
            "ledger_ready_count": sum(1 for line in actual.lines if line.ledger_ready),
            "non_ledger_ready_count": sum(1 for line in actual.lines if not line.ledger_ready),
            "processing": actual.processing.model_dump(mode="json"),
            "score_against_expected": score,
            "differences": differences,
        },
        "reconciliation": reconciliation,
    }


def _case_report_from_manifest(
    *,
    manifest_path: Path,
    transactions: list[_ReceiptTransaction],
    transaction_fixture: StatementReportTransactionFixture,
    output_dir: Path,
) -> dict[str, Any]:
    manifest = _load_json(manifest_path)
    case = get_statement_case(str(manifest["case_id"]))
    if case.expected_path is None:
        raise ValueError(f"statement case {case.id} does not have an expected fixture")
    output_dir.mkdir(parents=True, exist_ok=True)
    expected = StatementExtractionOutput.model_validate_json(
        case.expected_path.read_text(encoding="utf-8")
    )
    processed_payload = _load_json(Path(str(manifest["processed_output_path"])))
    statement_payload = processed_payload.get("statement_extraction")
    if statement_payload is None:
        actual = _empty_actual_from_manifest(case=case, manifest=manifest)
    else:
        actual = StatementExtractionOutput.model_validate(statement_payload)
    score = score_statement_output(expected=expected, actual=actual)
    differences = _line_differences(expected=expected, actual=actual)
    case_transactions = _transactions_for_case(
        base_transactions=transactions,
        output=actual,
        case_id=case.id,
        fixture=transaction_fixture,
    )
    reconciliation = _simulate_reconciliation(actual, case_transactions)
    expected_line_types: dict[str, int] = {}
    for line in expected.lines:
        expected_line_types[line.line_type] = expected_line_types.get(line.line_type, 0) + 1
    artifacts = _write_live_manifest_case_artifacts(
        output_dir=output_dir,
        case=case,
        source_manifest_path=manifest_path,
        source_manifest=manifest,
        transaction_fixture=transaction_fixture,
        actual=actual,
        score=score,
        differences=differences,
        reconciliation=reconciliation,
    )

    return {
        "case_id": case.id,
        "issuer": case.issuer,
        "pdf": case.relative_path,
        "expected_path": str(case.expected_path),
        "artifact_dir": str(output_dir),
        "artifacts": artifacts,
        "failure_summary": differences["failure_summary"],
        "severity_counts": differences["severity_counts"],
        "downstream_impact": differences["downstream_impact"],
        "recommended_owner": differences["recommended_owner"],
        "promotion_blockers": differences["promotion_blockers"],
        "findings": _case_findings(
            actual_source="live-gemini",
            transaction_fixture=transaction_fixture,
            expected=expected,
            actual=actual,
            score=score,
            reconciliation=reconciliation,
        ),
        "expected": {
            "pdf_status": expected.pdf_status,
            "issuer": expected.statement.issuer,
            "currency": expected.statement.currency,
            "period_start": _date_string(expected.statement.period_start),
            "period_end": _date_string(expected.statement.period_end),
            "due_date": _date_string(expected.statement.due_date),
            "line_count": len(expected.lines),
            "line_type_counts": dict(sorted(expected_line_types.items())),
            "processing": expected.processing.model_dump(mode="json"),
        },
        "current_extraction": {
            "actual_source": "live-gemini",
            "provider": actual.processing.provider,
            "pdf_status": actual.pdf_status,
            "issuer": actual.statement.issuer,
            "currency": actual.statement.currency,
            "line_count": len(actual.lines),
            "ledger_ready_count": sum(1 for line in actual.lines if line.ledger_ready),
            "non_ledger_ready_count": sum(1 for line in actual.lines if not line.ledger_ready),
            "processing": actual.processing.model_dump(mode="json"),
            "score_against_expected": score,
            "differences": differences,
            "source_manifest_path": str(manifest_path),
            "source_status": manifest.get("status"),
            "source_evidence_label": manifest.get("evidence_label"),
            "gemini_input_mode": manifest.get("gemini_input_mode", "pdf"),
            "pdf_evidence_summary": manifest.get("pdf_evidence_summary"),
            "compact_evidence_summary": manifest.get("compact_evidence_summary"),
            "compact_provider_evidence_summary": manifest.get(
                "compact_provider_evidence_summary"
            ),
        },
        "reconciliation": reconciliation,
    }


def _case_report_from_deterministic_manifest(
    *,
    manifest_path: Path,
    transactions: list[_ReceiptTransaction],
    transaction_fixture: StatementReportTransactionFixture,
    output_dir: Path,
) -> dict[str, Any]:
    manifest = _load_json(manifest_path)
    case = get_statement_case(str(manifest["case_id"]))
    if case.expected_path is None:
        raise ValueError(f"statement case {case.id} does not have an expected fixture")
    output_dir.mkdir(parents=True, exist_ok=True)
    expected = StatementExtractionOutput.model_validate_json(
        case.expected_path.read_text(encoding="utf-8")
    )
    processed_payload = _load_json(Path(str(manifest["processed_output_path"])))
    statement_payload = processed_payload.get("statement_extraction")
    if statement_payload is None:
        actual = _empty_actual_from_manifest(case=case, manifest=manifest)
    else:
        actual = StatementExtractionOutput.model_validate(statement_payload)
    score = score_statement_output(expected=expected, actual=actual)
    differences = _line_differences(expected=expected, actual=actual)
    case_transactions = _transactions_for_case(
        base_transactions=transactions,
        output=actual,
        case_id=case.id,
        fixture=transaction_fixture,
    )
    reconciliation = _simulate_reconciliation(actual, case_transactions)
    expected_line_types: dict[str, int] = {}
    for line in expected.lines:
        expected_line_types[line.line_type] = expected_line_types.get(line.line_type, 0) + 1
    artifacts = _write_deterministic_manifest_case_artifacts(
        output_dir=output_dir,
        case=case,
        source_manifest_path=manifest_path,
        source_manifest=manifest,
        transaction_fixture=transaction_fixture,
        actual=actual,
        score=score,
        differences=differences,
        reconciliation=reconciliation,
    )
    extractor = str(manifest.get("extractor") or "deterministic")

    return {
        "case_id": case.id,
        "case_variant_id": f"{case.id}#{extractor}",
        "issuer": case.issuer,
        "pdf": case.relative_path,
        "expected_path": str(case.expected_path),
        "artifact_dir": str(output_dir),
        "artifacts": artifacts,
        "extractor": extractor,
        "failure_summary": differences["failure_summary"],
        "severity_counts": differences["severity_counts"],
        "downstream_impact": differences["downstream_impact"],
        "recommended_owner": differences["recommended_owner"],
        "promotion_blockers": differences["promotion_blockers"],
        "findings": [
            *_case_findings(
                actual_source="deterministic",
                transaction_fixture=transaction_fixture,
                expected=expected,
                actual=actual,
                score=score,
                reconciliation=reconciliation,
            ),
            f"deterministic_extractor:{extractor}",
        ],
        "expected": {
            "pdf_status": expected.pdf_status,
            "issuer": expected.statement.issuer,
            "currency": expected.statement.currency,
            "period_start": _date_string(expected.statement.period_start),
            "period_end": _date_string(expected.statement.period_end),
            "due_date": _date_string(expected.statement.due_date),
            "line_count": len(expected.lines),
            "line_type_counts": dict(sorted(expected_line_types.items())),
            "processing": expected.processing.model_dump(mode="json"),
        },
        "current_extraction": {
            "actual_source": "deterministic",
            "extractor": extractor,
            "provider": actual.processing.provider,
            "pdf_status": actual.pdf_status,
            "issuer": actual.statement.issuer,
            "currency": actual.statement.currency,
            "line_count": len(actual.lines),
            "ledger_ready_count": sum(1 for line in actual.lines if line.ledger_ready),
            "non_ledger_ready_count": sum(1 for line in actual.lines if not line.ledger_ready),
            "processing": actual.processing.model_dump(mode="json"),
            "score_against_expected": score,
            "differences": differences,
            "source_manifest_path": str(manifest_path),
            "source_status": manifest.get("status"),
            "source_evidence_label": manifest.get("evidence_label"),
        },
        "reconciliation": reconciliation,
    }


def _manifest_case_id(manifest_path: Path) -> str:
    manifest = _load_json(manifest_path)
    return str(manifest["case_id"])


def _deterministic_manifest_case_key(manifest_path: Path) -> str:
    manifest = _load_json(manifest_path)
    return f"{manifest['case_id']}#{manifest.get('extractor', 'deterministic')}"


def _empty_actual_from_manifest(
    *,
    case: StatementCase,
    manifest: dict[str, Any],
) -> StatementExtractionOutput:
    source_status = str(manifest.get("status") or "extraction_failed")
    pdf_status = (
        source_status
        if source_status in StatementPdfStatus.__args__
        else "extraction_failed"
    )
    return StatementExtractionOutput(
        pdf_status=pdf_status,
        statement={"issuer": case.issuer},
        lines=[],
        processing=StatementProcessingMetadata(
            provider="gemini",
            prompt_id=str(manifest.get("prompt_identity", {}).get("prompt_id") or ""),
            model_name=str(manifest.get("prompt_identity", {}).get("model_name") or ""),
            warnings=[source_status],
        ),
    )


def _actual_output(
    *,
    expected: StatementExtractionOutput,
    extracted: StatementExtractionOutput,
    source: StatementReportActualSource,
) -> StatementExtractionOutput:
    if source == "current":
        return extracted
    mock = expected.model_copy(deep=True)
    mock.processing = StatementProcessingMetadata(
        provider="gemini",
        prompt_id=settings.statement_extraction_prompt_id,
        model_name=settings.gemini_model,
        confidence=0.94,
        page_count=expected.processing.page_count,
        text_char_count=expected.processing.text_char_count,
        text_line_count=expected.processing.text_line_count,
        warnings=[
            "mock_gemini_from_expected_fixture",
            "not_provider_quality_evidence",
        ],
    )
    return mock


def _write_case_artifacts(
    *,
    output_dir: Path,
    case: StatementCase,
    actual_source: StatementReportActualSource,
    transaction_fixture: StatementReportTransactionFixture,
    pdf_text_extraction: StatementExtractionOutput,
    actual: StatementExtractionOutput,
    score: dict[str, Any],
    differences: dict[str, Any],
    reconciliation: dict[str, Any],
) -> dict[str, str]:
    raw_output = {
        "document_type": "credit_card_statement",
        "actual_source": actual_source,
        "transaction_fixture": transaction_fixture,
        "simulated_provider": actual_source == "mock-gemini",
        "provider_output": actual.model_dump(mode="json"),
    }
    processed_output = {
        "document_type": "credit_card_statement",
        "normalization_stage": "statement_schema_direct",
        "statement_extraction": actual.model_dump(mode="json"),
        "coalesce": {
            "status": "not_yet_implemented",
            "note": (
                "Statement coalescing is still a future stage. This artifact records the "
                "normalized statement contract used by scoring and reconciliation."
            ),
        },
    }
    field_provenance = _field_provenance(
        actual_source=actual_source,
        actual=actual,
        pdf_text_extraction=pdf_text_extraction,
    )
    cost_summary = {
        "totals": {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cost_usd": "0",
        },
        "model_name": settings.gemini_model if actual_source == "mock-gemini" else None,
        "notes": [
            "No Gemini/provider call was made.",
            f"actual_source={actual_source}",
        ],
    }
    artifact_payloads = {
        "pdf_text_extraction": pdf_text_extraction.model_dump(mode="json"),
        "raw_output": raw_output,
        "processed_output": processed_output,
        "field_provenance": field_provenance,
        "score": {"score": score, "differences": differences},
        "reconciliation": reconciliation,
        "payload_examples": reconciliation["payload_examples"],
        "cost_summary": cost_summary,
    }
    artifacts: dict[str, str] = {}
    filenames = {
        "pdf_text_extraction": "pdf_text_extraction.json",
        "raw_output": "raw_output.json",
        "processed_output": "processed_output.json",
        "field_provenance": "field_provenance.json",
        "score": "score.json",
        "reconciliation": "reconciliation.json",
        "payload_examples": "payload_examples.json",
        "cost_summary": "cost_summary.json",
    }
    for key, payload in artifact_payloads.items():
        path = output_dir / filenames[key]
        _write_json(path, payload)
        artifacts[f"{key}_path"] = str(path)

    manifest_path = output_dir / "manifest.json"
    manifest = {
        "case_id": case.id,
        "issuer": case.issuer,
        "pdf": case.relative_path,
        "expected_path": str(case.expected_path) if case.expected_path else None,
        "actual_source": actual_source,
        "transaction_fixture": transaction_fixture,
        "status": "completed" if score["passed"] else "threshold-failed",
        "evidence_label": _execution_mode(actual_source),
        "artifact_layout": "statement-run-folder-v1",
        "document_type": "credit_card_statement",
        "runtime_equivalent": False,
        "runtime_evidence_note": (
            "Statement prompt-lab report evidence is local harness evidence only; "
            "provider and device gates remain separate."
        ),
        **artifacts,
    }
    _write_json(manifest_path, manifest)
    artifacts["manifest_path"] = str(manifest_path)
    return artifacts


def _write_live_manifest_case_artifacts(
    *,
    output_dir: Path,
    case: StatementCase,
    source_manifest_path: Path,
    source_manifest: dict[str, Any],
    transaction_fixture: StatementReportTransactionFixture,
    actual: StatementExtractionOutput,
    score: dict[str, Any],
    differences: dict[str, Any],
    reconciliation: dict[str, Any],
) -> dict[str, str]:
    pdf_input = _load_optional_json(source_manifest.get("pdf_input_path")) or {}
    pdf_evidence = _load_optional_json(source_manifest.get("pdf_evidence_path")) or {}
    compact_evidence = _load_optional_json(source_manifest.get("compact_evidence_path")) or {}
    compact_provider_evidence = _load_optional_json(
        source_manifest.get("compact_provider_evidence_path")
    ) or {}
    layout_profile = _load_optional_json(source_manifest.get("layout_profile_path")) or {}
    profile_application = _load_optional_json(
        source_manifest.get("profile_application_path")
    ) or {}
    unresolved_rows = _load_optional_json(source_manifest.get("unresolved_rows_path")) or []
    raw_output = _load_optional_json(source_manifest.get("raw_output_path")) or {}
    processed_output = _load_optional_json(source_manifest.get("processed_output_path")) or {
        "document_type": "credit_card_statement",
        "normalization_stage": "not_run",
        "status": source_manifest.get("status"),
        "statement_extraction": actual.model_dump(mode="json"),
    }
    field_provenance = _load_optional_json(source_manifest.get("field_provenance_path")) or {}
    cost_summary = _load_optional_json(source_manifest.get("cost_summary_path")) or {
        "totals": {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cost_usd": "0",
        },
        "notes": ["Live source manifest did not include a cost summary artifact."],
    }
    pdf_text_extraction = {
        "document_type": "credit_card_statement",
        "actual_source": "live-gemini",
        "source_manifest_path": str(source_manifest_path),
        "pdf_input": pdf_input,
        "pdf_evidence_summary": source_manifest.get("pdf_evidence_summary"),
        "compact_evidence_summary": source_manifest.get("compact_evidence_summary"),
        "compact_provider_evidence_summary": source_manifest.get(
            "compact_provider_evidence_summary"
        ),
        "contains_raw_statement_text": False,
    }
    report_raw_output = {
        "document_type": "credit_card_statement",
        "actual_source": "live-gemini",
        "transaction_fixture": transaction_fixture,
        "simulated_provider": False,
        "source_manifest_path": str(source_manifest_path),
        "source_status": source_manifest.get("status"),
        "provider_output": actual.model_dump(mode="json"),
        "gemini_input_mode": source_manifest.get("gemini_input_mode", "pdf"),
        "compact_evidence_summary": source_manifest.get("compact_evidence_summary"),
        "compact_provider_evidence_summary": source_manifest.get(
            "compact_provider_evidence_summary"
        ),
        "live_provider_artifact": raw_output,
        "layout_profile": layout_profile,
        "profile_application": profile_application,
    }
    artifact_payloads = {
        "pdf_text_extraction": pdf_text_extraction,
        "raw_output": report_raw_output,
        "processed_output": processed_output,
        "field_provenance": field_provenance,
        "score": {"score": score, "differences": differences},
        "reconciliation": reconciliation,
        "payload_examples": reconciliation["payload_examples"],
        "cost_summary": cost_summary,
        "pdf_input": pdf_input,
        "pdf_evidence": pdf_evidence,
        "compact_evidence": compact_evidence,
        "compact_provider_evidence": compact_provider_evidence,
        "layout_profile": layout_profile,
        "profile_application": profile_application,
        "unresolved_rows": unresolved_rows,
    }
    artifacts: dict[str, str] = {}
    filenames = {
        "pdf_text_extraction": "pdf_text_extraction.json",
        "raw_output": "raw_output.json",
        "processed_output": "processed_output.json",
        "field_provenance": "field_provenance.json",
        "score": "score.json",
        "reconciliation": "reconciliation.json",
        "payload_examples": "payload_examples.json",
        "cost_summary": "cost_summary.json",
        "pdf_input": "pdf_input.json",
        "pdf_evidence": "pdf_evidence.json",
        "compact_evidence": "compact_evidence.json",
        "compact_provider_evidence": "compact_provider_evidence.json",
        "layout_profile": "layout_profile.json",
        "profile_application": "profile_application.json",
        "unresolved_rows": "unresolved_rows.json",
    }
    for key, payload in artifact_payloads.items():
        path = output_dir / filenames[key]
        _write_json(path, payload)
        artifacts[f"{key}_path"] = str(path)

    manifest_path = output_dir / "manifest.json"
    manifest = {
        "case_id": case.id,
        "issuer": case.issuer,
        "pdf": case.relative_path,
        "expected_path": str(case.expected_path) if case.expected_path else None,
        "actual_source": "live-gemini",
        "transaction_fixture": transaction_fixture,
        "status": "completed" if score["passed"] else "threshold-failed",
        "source_status": source_manifest.get("status"),
        "source_manifest_path": str(source_manifest_path),
        "gemini_input_mode": source_manifest.get("gemini_input_mode", "pdf"),
        "pdf_evidence_summary": source_manifest.get("pdf_evidence_summary"),
        "compact_evidence_summary": source_manifest.get("compact_evidence_summary"),
        "evidence_label": "live_gemini_provider_manifest_report",
        "artifact_layout": "statement-report-folder-v1",
        "document_type": "credit_card_statement",
        "runtime_equivalent": False,
        "runtime_evidence_note": (
            "Statement prompt-lab report evidence reuses a provider manifest; "
            "device/runtime gates remain separate."
        ),
        **artifacts,
    }
    _write_json(manifest_path, manifest)
    artifacts["manifest_path"] = str(manifest_path)
    return artifacts


def _write_deterministic_manifest_case_artifacts(
    *,
    output_dir: Path,
    case: StatementCase,
    source_manifest_path: Path,
    source_manifest: dict[str, Any],
    transaction_fixture: StatementReportTransactionFixture,
    actual: StatementExtractionOutput,
    score: dict[str, Any],
    differences: dict[str, Any],
    reconciliation: dict[str, Any],
) -> dict[str, str]:
    pdf_input = _load_optional_json(source_manifest.get("pdf_input_path")) or {}
    text_layer = _load_optional_json(source_manifest.get("text_layer_path")) or {}
    layout_words = _load_optional_json(source_manifest.get("layout_words_path")) or {}
    candidate_rows = _load_optional_json(source_manifest.get("candidate_rows_path")) or {}
    raw_output = _load_optional_json(source_manifest.get("raw_output_path")) or {}
    processed_output = _load_optional_json(source_manifest.get("processed_output_path")) or {
        "document_type": "credit_card_statement",
        "normalization_stage": "not_run",
        "status": source_manifest.get("status"),
        "statement_extraction": actual.model_dump(mode="json"),
    }
    field_provenance = _load_optional_json(source_manifest.get("field_provenance_path")) or {}
    cost_summary = _load_optional_json(source_manifest.get("cost_summary_path")) or {
        "totals": {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cost_usd": "0",
        },
        "notes": ["No Gemini/provider call was made."],
    }
    extractor = str(source_manifest.get("extractor") or "deterministic")
    pdf_text_extraction = {
        "document_type": "credit_card_statement",
        "actual_source": "deterministic",
        "extractor": extractor,
        "source_manifest_path": str(source_manifest_path),
        "pdf_input": pdf_input,
        "text_layer": text_layer,
        "contains_raw_statement_text": False,
    }
    report_raw_output = {
        "document_type": "credit_card_statement",
        "actual_source": "deterministic",
        "extractor": extractor,
        "transaction_fixture": transaction_fixture,
        "simulated_provider": False,
        "provider_call": "skipped",
        "source_manifest_path": str(source_manifest_path),
        "source_status": source_manifest.get("status"),
        "provider_output": actual.model_dump(mode="json"),
        "deterministic_artifact": raw_output,
    }
    artifact_payloads = {
        "pdf_text_extraction": pdf_text_extraction,
        "text_layer": text_layer,
        "layout_words": layout_words,
        "candidate_rows": candidate_rows,
        "raw_output": report_raw_output,
        "processed_output": processed_output,
        "field_provenance": field_provenance,
        "score": {"score": score, "differences": differences},
        "reconciliation": reconciliation,
        "payload_examples": reconciliation["payload_examples"],
        "cost_summary": cost_summary,
        "pdf_input": pdf_input,
    }
    artifacts: dict[str, str] = {}
    filenames = {
        "pdf_text_extraction": "pdf_text_extraction.json",
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
        "pdf_input": "pdf_input.json",
    }
    for key, payload in artifact_payloads.items():
        path = output_dir / filenames[key]
        _write_json(path, payload)
        artifacts[f"{key}_path"] = str(path)

    manifest_path = output_dir / "manifest.json"
    manifest = {
        "case_id": case.id,
        "issuer": case.issuer,
        "pdf": case.relative_path,
        "expected_path": str(case.expected_path) if case.expected_path else None,
        "actual_source": "deterministic",
        "extractor": extractor,
        "transaction_fixture": transaction_fixture,
        "status": "completed" if score["passed"] else "threshold-failed",
        "source_status": source_manifest.get("status"),
        "source_manifest_path": str(source_manifest_path),
        "evidence_label": "statement_deterministic_manifest_report",
        "artifact_layout": "statement-deterministic-report-folder-v1",
        "document_type": "credit_card_statement",
        "runtime_equivalent": False,
        "runtime_evidence_note": (
            "Statement prompt-lab report evidence reuses deterministic parser artifacts; "
            "provider and device/runtime gates remain separate."
        ),
        **artifacts,
    }
    _write_json(manifest_path, manifest)
    artifacts["manifest_path"] = str(manifest_path)
    return artifacts


def _field_provenance(
    *,
    actual_source: StatementReportActualSource,
    actual: StatementExtractionOutput,
    pdf_text_extraction: StatementExtractionOutput,
) -> dict[str, Any]:
    source = (
        "mock_gemini_from_expected_fixture"
        if actual_source == "mock-gemini"
        else "codex_pdf_text_extraction"
    )
    line_sources = [
        {
            "source_order": line.source_order,
            "date_source": source,
            "description_source": source,
            "amount_source": source,
            "line_type_source": source,
        }
        for line in actual.lines
    ]
    return {
        "actual_source": actual_source,
        "statement_fields": {
            "issuer": source,
            "period_start": source,
            "period_end": source,
            "due_date": source,
            "currency": source,
            "totals": source,
        },
        "line_sources": line_sources,
        "pdf_text_stage": {
            "pdf_status": pdf_text_extraction.pdf_status,
            "provider": pdf_text_extraction.processing.provider,
            "page_count": pdf_text_extraction.processing.page_count,
            "text_line_count": pdf_text_extraction.processing.text_line_count,
            "warnings": pdf_text_extraction.processing.warnings,
        },
    }


def _line_differences(
    *,
    expected: StatementExtractionOutput,
    actual: StatementExtractionOutput,
) -> dict[str, Any]:
    alignment = align_statement_lines(expected_lines=expected.lines, actual_lines=actual.lines)
    mismatches: list[dict[str, Any]] = []
    field_mismatch_counts = {field: 0 for field in _DIAGNOSTIC_FIELDS}
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    pattern_counts: dict[str, int] = {}
    downstream_impact: set[str] = set()
    promotion_blockers: set[str] = set()
    blocking_source_orders: set[int] = set()
    for pair in alignment["matched_pairs"]:
        expected_line = expected.lines[pair["expected_index"]]
        actual_line = actual.lines[pair["actual_index"]]
        fields: dict[str, dict[str, Any]] = {}
        issues: list[dict[str, Any]] = []
        for field in _DIAGNOSTIC_FIELDS:
            expected_value = getattr(expected_line, field)
            actual_value = getattr(actual_line, field)
            if expected_value != actual_value:
                field_mismatch_counts[field] += 1
                fields[field] = {
                    "expected": _json_value(expected_value),
                    "actual": _json_value(actual_value),
                }
                issue = _field_issue(
                    field=field,
                    expected_line=expected_line,
                    actual_line=actual_line,
                )
                issues.append(issue)
                severity_counts[issue["severity"]] += 1
                pattern_counts[issue["pattern"]] = pattern_counts.get(issue["pattern"], 0) + 1
                downstream_impact.add(issue["downstream_impact"])
                if issue.get("promotion_blocker"):
                    promotion_blockers.add(str(issue["promotion_blocker"]))
                    blocking_source_orders.add(expected_line.source_order)
        if fields:
            mismatches.append(
                {
                    "source_order": expected_line.source_order,
                    "matched_expected_source_order": expected_line.source_order,
                    "matched_actual_source_order": actual_line.source_order,
                    "expected_index": pair["expected_index"],
                    "actual_index": pair["actual_index"],
                    "match_score": pair["match_score"],
                    "match_reasons": pair["match_reasons"],
                    "expected_line": _line_sample(expected_line),
                    "actual_line": _line_sample(actual_line),
                    "transaction_context": _mismatch_transaction_context(
                        expected_line=expected_line,
                        actual_line=actual_line,
                    ),
                    "fields": fields,
                    "severity": _highest_severity(issues),
                    "issues": issues,
                }
            )
    unmatched_expected = alignment["unmatched_expected"]
    unmatched_actual = alignment["unmatched_actual"]
    unmatched_count = len(unmatched_expected) + len(unmatched_actual)
    if unmatched_count:
        severity_counts["critical"] += unmatched_count
        promotion_blockers.add("unmatched_statement_lines_present")
        blocking_source_orders.update(int(line["source_order"]) for line in unmatched_expected)
        downstream_impact.add(
            "Missing or extra statement lines can hide spend, duplicate spend, or invalidate "
            "coverage metrics."
        )
        pattern_counts["unmatched_statement_lines"] = unmatched_count
    return {
        "line_count_delta": len(actual.lines) - len(expected.lines),
        "comparable_lines": len(alignment["matched_pairs"]),
        "line_alignment": _line_alignment_policy(),
        "source_order_diagnostics": {
            "order_drift_count": alignment["order_drift_count"],
            "order_drift_examples": alignment["order_drift_examples"],
        },
        "mismatch_count": len(mismatches),
        "blocking_mismatch_count": len(blocking_source_orders),
        "blocking_source_orders": sorted(blocking_source_orders),
        "mismatch_issue_count": sum(severity_counts.values()),
        "field_mismatch_counts": field_mismatch_counts,
        "severity_counts": severity_counts,
        "pattern_counts": dict(sorted(pattern_counts.items())),
        "downstream_impact": sorted(downstream_impact),
        "recommended_owner": _recommended_owner(
            promotion_blockers=promotion_blockers,
            severity_counts=severity_counts,
            pattern_counts=pattern_counts,
        ),
        "promotion_blockers": sorted(promotion_blockers),
        "failure_summary": {
            "line_count_delta": len(actual.lines) - len(expected.lines),
            "mismatched_lines": len(mismatches) + unmatched_count,
            "blocking_mismatched_lines": len(blocking_source_orders),
            "mismatch_issues": sum(severity_counts.values()),
            "field_mismatch_counts": field_mismatch_counts,
            "severity_counts": severity_counts,
            "top_patterns": _top_patterns(pattern_counts),
        },
        "mismatches": mismatches,
        "mismatch_samples": mismatches[:10],
        "missing_actual_count": len(unmatched_expected),
        "missing_actual_samples": unmatched_expected[:10],
        "extra_actual_count": len(unmatched_actual),
        "extra_actual_samples": unmatched_actual[:10],
        "unmatched_expected": unmatched_expected,
        "unmatched_actual": unmatched_actual,
    }


def _line_alignment_policy() -> dict[str, str]:
    return {
        "policy": "best_match_with_source_order_diagnostics",
        "coalesce": (
            "Provider lines are sorted by provider-supplied source_order during statement "
            "coalesce and then renumbered to 1..n."
        ),
        "scoring": (
            "The report matches expected and processed actual lines one-to-one using "
            "description, date, currency, source-order proximity, line type, and amount as a "
            "tie-breaker before comparing field values."
        ),
        "risk": (
            "Source-order drift no longer creates value mismatches by itself, but it remains "
            "visible under source_order_diagnostics."
        ),
    }


def _field_issue(
    *,
    field: str,
    expected_line: StatementLine,
    actual_line: StatementLine,
) -> dict[str, Any]:
    if field == "amount_minor":
        same_sign = _same_sign(expected_line.amount_minor, actual_line.amount_minor)
        multiplier = _amount_multiplier(expected_line.amount_minor, actual_line.amount_minor)
        if not same_sign:
            pattern = "amount_sign_mismatch"
            note = "The extracted amount has the wrong sign."
        elif expected_line.installment and multiplier is not None and 2 <= multiplier <= 12:
            pattern = "installment_total_or_balance_used_as_line_amount"
            note = (
                "The extracted amount looks like an installment total, balance, or full "
                "purchase value instead of the current statement-line amount."
            )
        else:
            pattern = "amount_mismatch"
            note = "The extracted amount does not equal the expected statement-line amount."
        return _issue(
            field=field,
            severity="critical",
            pattern=pattern,
            downstream_impact=(
                "Wrong amounts block valid receipt matches and can create incorrect "
                "statement-only transaction candidates."
            ),
            promotion_blocker="amount_mismatches_present",
            note=note,
            multiplier=multiplier,
            amount_evidence=_amount_selection_evidence(actual_line),
        )
    if field == "date":
        return _issue(
            field=field,
            severity="high",
            pattern="date_mismatch",
            downstream_impact=(
                "Wrong dates can push receipts outside the reconciliation tolerance window."
            ),
            promotion_blocker="date_mismatches_present",
            note="The extracted transaction date differs from the expected line date.",
        )
    if field == "currency":
        return _issue(
            field=field,
            severity="high",
            pattern="currency_mismatch",
            downstream_impact=(
                "Wrong currencies prevent reconciliation and can corrupt transaction totals."
            ),
            promotion_blocker="currency_mismatches_present",
            note="The extracted line currency differs from the expected line currency.",
        )
    if field == "line_type":
        pattern = (
            "negative_amount_classified_as_charge"
            if actual_line.amount_minor < 0 and actual_line.line_type == "charge"
            else "line_type_mismatch"
        )
        return _issue(
            field=field,
            severity="high",
            pattern=pattern,
            downstream_impact=(
                "Wrong line types can create spend candidates for credits/payments or force "
                "manual review for lines that should reconcile automatically."
            ),
            promotion_blocker="line_type_mismatches_present",
            note="The extracted line type changes downstream reconciliation behavior.",
        )
    if field == "installment":
        if expected_line.installment == "01/01" and not actual_line.installment:
            return _issue(
                field=field,
                severity="low",
                pattern="missing_single_installment_marker",
                downstream_impact=(
                    "Missing 01/01 markers reduce audit detail but do not usually change "
                    "the statement-line amount."
                ),
                promotion_blocker=None,
                note="The provider omitted a visible 01/01 marker.",
            )
        pattern = (
            "missing_installment_marker"
            if expected_line.installment and not actual_line.installment
            else "installment_mismatch"
        )
        return _issue(
            field=field,
            severity="high",
            pattern=pattern,
            downstream_impact=(
                "Missing installment markers make it harder to detect whether the provider "
                "chose the line amount or the full installment total."
            ),
            promotion_blocker="missing_installments_present",
            note="The extracted installment marker differs from the expected marker.",
        )
    if field == "description":
        if descriptions_match_for_scoring(expected_line, actual_line):
            return _issue(
                field=field,
                severity="low",
                pattern="safe_ocr_description_drift",
                downstream_impact=(
                    "Cosmetic OCR drift is normalized for scoring and should not block "
                    "reconciliation."
                ),
                promotion_blocker=None,
                note="The description differs only by safe OCR noise such as l/I/| drift.",
            )
        pattern = (
            "foreign_currency_marker_in_description"
            if _description_has_foreign_currency_marker(actual_line)
            else "merchant_description_drift"
        )
        return _issue(
            field=field,
            severity="medium",
            pattern=pattern,
            downstream_impact=(
                "Description drift can lower fuzzy merchant match confidence and produce "
                "unclear user-facing transaction candidates."
            ),
            promotion_blocker="description_mismatches_present",
            note="The extracted merchant/description differs beyond safe OCR normalization.",
        )
    if field in {"original_currency", "original_amount_minor"}:
        return _issue(
            field=field,
            severity="medium",
            pattern=f"{field}_mismatch",
            downstream_impact=(
                "Foreign-currency metadata drift weakens auditability and makes currency "
                "context harder to explain to users."
            ),
            promotion_blocker="foreign_currency_metadata_mismatches_present",
            note="The extracted foreign-currency metadata differs from the expected fixture.",
        )
    return _issue(
        field=field,
        severity="medium",
        pattern=f"{field}_mismatch",
        downstream_impact="The extracted statement field differs from the expected fixture.",
        promotion_blocker=f"{field}_mismatches_present",
        note="The extracted field differs from the expected fixture.",
    )


def _issue(
    *,
    field: str,
    severity: str,
    pattern: str,
    downstream_impact: str,
    promotion_blocker: str | None,
    note: str,
    multiplier: float | None = None,
    amount_evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    issue: dict[str, Any] = {
        "field": field,
        "severity": severity,
        "pattern": pattern,
        "downstream_impact": downstream_impact,
        "promotion_blocker": promotion_blocker,
        "note": note,
    }
    if multiplier is not None:
        issue["amount_multiplier"] = round(multiplier, 4)
    if amount_evidence is not None:
        issue["amount_evidence"] = amount_evidence
    return issue


def _amount_selection_evidence(line: StatementLine) -> dict[str, Any]:
    selected_candidates = [
        candidate
        for candidate in line.amount_candidates
        if candidate.amount_minor == line.amount_minor
    ]
    current_candidates = [
        candidate
        for candidate in line.amount_candidates
        if candidate.role in {"current_statement_amount", "current_installment"}
    ]
    suspicious_candidates = [
        candidate
        for candidate in line.amount_candidates
        if candidate.role in {"purchase_total", "plan_total", "pending_balance"}
    ]
    return {
        "amount_selection_reason": line.amount_selection_reason,
        "selected_amount_minor": line.amount_minor,
        "selected_candidate_roles": [candidate.role for candidate in selected_candidates],
        "current_amount_candidates": [
            candidate.model_dump(mode="json") for candidate in current_candidates[:5]
        ],
        "suspicious_total_candidates": [
            candidate.model_dump(mode="json") for candidate in suspicious_candidates[:5]
        ],
    }


def _same_sign(left: int, right: int) -> bool:
    return (left < 0 and right < 0) or (left >= 0 and right >= 0)


def _amount_multiplier(expected: int, actual: int) -> float | None:
    if expected == 0 or actual == expected:
        return None
    return abs(actual / expected)


def _description_has_foreign_currency_marker(line: StatementLine) -> bool:
    if not line.original_currency:
        return False
    currency = re.escape(line.original_currency.upper())
    return bool(re.search(rf"(^|\s)(CL\s+)?{currency}(\s|$)", line.description.upper()))


def _highest_severity(issues: list[dict[str, Any]]) -> str:
    if not issues:
        return "low"
    return max(issues, key=lambda issue: _SEVERITY_ORDER[str(issue["severity"])])["severity"]


def _recommended_owner(
    *,
    promotion_blockers: set[str],
    severity_counts: dict[str, int],
    pattern_counts: dict[str, int],
) -> str | None:
    if not any(severity_counts.values()):
        return None
    if promotion_blockers & {
        "amount_mismatches_present",
        "date_mismatches_present",
        "currency_mismatches_present",
        "line_type_mismatches_present",
        "missing_installments_present",
    }:
        return "prompt"
    if pattern_counts and set(pattern_counts) == {"safe_ocr_description_drift"}:
        return "scoring_policy"
    if "foreign_currency_marker_in_description" in pattern_counts:
        return "coalesce"
    return "prompt"


def _top_patterns(pattern_counts: dict[str, int]) -> list[dict[str, Any]]:
    return [
        {"pattern": pattern, "count": count}
        for pattern, count in sorted(
            pattern_counts.items(),
            key=lambda item: (-item[1], item[0]),
        )[:5]
    ]


def _line_sample(line: StatementLine) -> dict[str, Any]:
    return {
        "source_order": line.source_order,
        "date": _date_string(line.date),
        "description": line.description,
        "amount_minor": line.amount_minor,
        "currency": line.currency,
        "line_type": line.line_type,
        "installment": line.installment,
        "ledger_ready": line.ledger_ready,
        "warnings": line.warnings,
        "amount_selection_reason": line.amount_selection_reason,
        "amount_candidates": _amount_candidate_samples(line),
    }


def _amount_candidate_samples(line: StatementLine) -> list[dict[str, Any]]:
    return [
        {
            "role": candidate.role,
            "amount_minor": candidate.amount_minor,
            "currency": candidate.currency,
            "visible_text": candidate.visible_text,
            "column_label": candidate.column_label,
        }
        for candidate in line.amount_candidates[:8]
    ]


def _mismatch_transaction_context(
    *,
    expected_line: StatementLine,
    actual_line: StatementLine,
) -> dict[str, Any]:
    return {
        "expected_transaction_key": _statement_line_transaction_key(expected_line),
        "actual_transaction_key": _statement_line_transaction_key(actual_line),
        "expected_candidate_transaction": _compact_candidate_transaction(
            _candidate_transaction(expected_line)
        ),
        "actual_candidate_transaction": _compact_candidate_transaction(
            _candidate_transaction(actual_line)
        ),
    }


def _statement_line_transaction_key(line: StatementLine) -> dict[str, Any]:
    return {
        "transaction_date": _date_string(line.date),
        "merchant": line.description,
        "amount_minor": line.amount_minor,
        "currency": line.currency,
        "line_type": line.line_type,
        "installment": line.installment,
    }


def _compact_candidate_transaction(candidate: dict[str, Any] | None) -> dict[str, Any] | None:
    if candidate is None:
        return None
    return {
        "transaction_date": candidate.get("transaction_date"),
        "merchant": candidate.get("merchant"),
        "total_minor": candidate.get("total_minor"),
        "currency": candidate.get("currency"),
        "receipt_type": candidate.get("receipt_type"),
        "recurrence_kind": candidate.get("recurrence_kind"),
        "recurrence_interval": candidate.get("recurrence_interval"),
        "term_current": candidate.get("term_current"),
        "term_total": candidate.get("term_total"),
        "recurrence_label": candidate.get("recurrence_label"),
        "recurrence_source": candidate.get("recurrence_source"),
    }


def _case_findings(
    *,
    actual_source: StatementReportActualSource,
    transaction_fixture: StatementReportTransactionFixture,
    expected: StatementExtractionOutput,
    actual: StatementExtractionOutput,
    score: dict[str, Any],
    reconciliation: dict[str, Any],
) -> list[str]:
    findings: list[str] = []
    if actual_source == "mock-gemini":
        findings.append("mock_gemini_output_uses_expected_fixture")
    if actual_source == "live-gemini":
        findings.append("live_gemini_output_from_statement_run_manifest")
    if actual_source == "deterministic":
        findings.append("deterministic_statement_pdf_extractor_output")
    if transaction_fixture == "edge-cases":
        findings.append("synthetic_app_transaction_edge_cases_enabled")
    if not score["passed"]:
        findings.append("expected_vs_actual_statement_score_failed")
    if len(actual.lines) == 0 and len(expected.lines) > 0:
        findings.append("actual_output_has_no_normalized_statement_lines")
    if reconciliation["receipt_transactions_considered"] == 0:
        findings.append("no_local_receipt_transactions_in_statement_date_window")
    if reconciliation["counts"]["statement_only"] == len(actual.lines) and actual.lines:
        findings.append("all_actual_statement_lines_are_statement_only_against_local_db")
    if reconciliation["counts"]["matched"]:
        findings.append("matched_receipt_transactions_present")
    if reconciliation["counts"]["ambiguous"]:
        findings.append("ambiguous_receipt_match_present")
    if reconciliation["counts"]["receipt_only"]:
        findings.append("receipt_only_app_transactions_present")
    return findings


def _transactions_for_case(
    *,
    base_transactions: list[_ReceiptTransaction],
    output: StatementExtractionOutput,
    case_id: str,
    fixture: StatementReportTransactionFixture,
) -> list[_ReceiptTransaction]:
    if fixture == "none":
        return base_transactions
    return [
        *base_transactions,
        *_edge_case_transactions(output=output, case_id=case_id),
    ]


def _edge_case_transactions(
    *,
    output: StatementExtractionOutput,
    case_id: str,
) -> list[_ReceiptTransaction]:
    spend_lines = _distinct_spend_lines(output.lines)
    if not spend_lines:
        return []

    transactions: list[_ReceiptTransaction] = []
    case_slug = _slug(case_id)

    exact_line = spend_lines[0]
    transactions.append(
        _fixture_transaction(
            case_slug=case_slug,
            suffix="exact-match",
            line=exact_line,
            merchant=exact_line.description,
            amount_minor=exact_line.amount_minor,
            transaction_date=exact_line.date,
            fixture_kind="exact_match",
        )
    )

    if len(spend_lines) >= 2:
        fuzzy_line = spend_lines[1]
        amount_delta = 1 if _amount_tolerance(fuzzy_line.amount_minor) > 1 else 0
        transactions.append(
            _fixture_transaction(
                case_slug=case_slug,
                suffix="fuzzy-match",
                line=fuzzy_line,
                merchant=_fuzzy_fixture_merchant(fuzzy_line.description),
                amount_minor=fuzzy_line.amount_minor + amount_delta,
                transaction_date=_shift_date(fuzzy_line.date, days=1),
                fixture_kind="fuzzy_date_amount_merchant_match",
            )
        )

    if len(spend_lines) >= 3:
        ambiguous_line = spend_lines[2]
        for duplicate_index in (1, 2):
            transactions.append(
                _fixture_transaction(
                    case_slug=case_slug,
                    suffix=f"ambiguous-{duplicate_index}",
                    line=ambiguous_line,
                    merchant=ambiguous_line.description,
                    amount_minor=ambiguous_line.amount_minor,
                    transaction_date=ambiguous_line.date,
                    fixture_kind="ambiguous_duplicate_match",
                )
            )

    receipt_only_date = _receipt_only_date(output, fallback=spend_lines[0].date)
    transactions.append(
        _ReceiptTransaction(
            id=f"fixture:{case_slug}:receipt-only",
            ownership_scope_id="fixture-scope",
            transaction_date=receipt_only_date,
            merchant="APP ONLY TRANSACTION FIXTURE",
            total_minor=987_654_321,
            currency=output.statement.currency,
            receipt_type="scan",
            card_alias_id=None,
            merchant_user_edited_at=None,
            source="synthetic-edge-case",
            fixture_kind="receipt_only_app_transaction",
        )
    )
    return transactions


def _distinct_spend_lines(lines: list[StatementLine]) -> list[StatementLine]:
    seen: set[tuple[date | None, str, int, str]] = set()
    selected: list[StatementLine] = []
    for line in lines:
        if not line.ledger_ready or line.date is None or line.amount_minor <= 0:
            continue
        if line.line_type not in _STATEMENT_TRANSACTION_LINE_TYPES:
            continue
        key = (
            line.date,
            _normalize_merchant(line.description),
            line.amount_minor,
            line.currency,
        )
        if key in seen:
            continue
        seen.add(key)
        selected.append(line)
    return selected


def _fixture_transaction(
    *,
    case_slug: str,
    suffix: str,
    line: StatementLine,
    merchant: str,
    amount_minor: int,
    transaction_date: date | None,
    fixture_kind: str,
) -> _ReceiptTransaction:
    assert transaction_date is not None
    return _ReceiptTransaction(
        id=f"fixture:{case_slug}:{line.source_order}:{suffix}",
        ownership_scope_id="fixture-scope",
        transaction_date=transaction_date,
        merchant=merchant,
        total_minor=amount_minor,
        currency=line.currency,
        receipt_type="scan",
        card_alias_id=None,
        merchant_user_edited_at=None,
        source="synthetic-edge-case",
        fixture_kind=fixture_kind,
    )


def _fuzzy_fixture_merchant(description: str) -> str:
    words = description.split()
    if len(words) >= 2:
        return " ".join(words[:-1])
    return f"{description} fixture"


def _shift_date(value: date | None, *, days: int) -> date | None:
    return value + timedelta(days=days) if value is not None else None


def _receipt_only_date(output: StatementExtractionOutput, *, fallback: date | None) -> date:
    if output.statement.period_start is not None:
        return output.statement.period_start
    if fallback is not None:
        return fallback
    return date.today()


def _simulate_reconciliation(
    output: StatementExtractionOutput,
    transactions: list[_ReceiptTransaction],
) -> dict[str, Any]:
    window = _date_bounds(output)
    candidate_transactions = _transactions_in_window(transactions, window)
    claimed_ids: set[str] = set()
    ambiguous_ids: set[str] = set()
    outcomes: list[dict[str, Any]] = []

    for line in output.lines:
        matches = sorted(
            (
                match
                for transaction in candidate_transactions
                if transaction.id not in claimed_ids
                for match in [_score_line_candidate(line, transaction)]
                if match is not None
            ),
            key=lambda match: match.score,
            reverse=True,
        )
        if not matches:
            outcomes.append(_line_outcome(line, verdict="statement_only"))
            continue

        if len(matches) > 1 and matches[0].score - matches[1].score <= 0.05:
            ambiguous_ids.update(match.transaction.id for match in matches)
            outcomes.append(
                _line_outcome(
                    line,
                    verdict="ambiguous",
                    score=round(matches[0].score, 3),
                    reasons=[
                        "ambiguous_receipt_candidates",
                        f"candidate_count:{len(matches)}",
                    ],
                    matched_receipt=_transaction_payload(matches[0].transaction),
                    candidate_receipts=[
                        _transaction_payload(match.transaction) for match in matches[:5]
                    ],
                )
            )
            continue

        best = matches[0]
        claimed_ids.add(best.transaction.id)
        outcomes.append(
            _line_outcome(
                line,
                verdict="matched",
                score=round(best.score, 3),
                reasons=best.reasons,
                matched_receipt=_transaction_payload(best.transaction),
            )
        )

    excluded = claimed_ids | ambiguous_ids
    receipt_only = [
        _transaction_payload(transaction)
        for transaction in candidate_transactions
        if transaction.id not in excluded
    ]
    ignored_out_of_window = [
        _transaction_payload(transaction)
        for transaction in transactions
        if transaction not in candidate_transactions
    ]
    counts = {
        "matched": sum(1 for outcome in outcomes if outcome["verdict"] == "matched"),
        "statement_only": sum(1 for outcome in outcomes if outcome["verdict"] == "statement_only"),
        "receipt_only": len(receipt_only),
        "ambiguous": sum(1 for outcome in outcomes if outcome["verdict"] == "ambiguous"),
        "failed": 0,
        "candidate_transactions": sum(
            1 for outcome in outcomes if outcome.get("candidate_transaction") is not None
        ),
    }
    payload_examples = _payload_examples(outcomes=outcomes, receipt_only=receipt_only)
    return {
        "mode": "read_only_local_simulation",
        "note": (
            "Uses the normalized statement output selected for this report. "
            "No statement rows or reconciliation rows are written."
        ),
        "date_window": (
            {
                "start": _date_string(window[0]),
                "end": _date_string(window[1]),
            }
            if window is not None
            else None
        ),
        "receipt_transactions_available": len(transactions),
        "local_db_transactions_available": sum(
            1 for transaction in transactions if transaction.source == "local-db"
        ),
        "synthetic_transactions_available": sum(
            1 for transaction in transactions if transaction.source != "local-db"
        ),
        "receipt_transactions_considered": len(candidate_transactions),
        "synthetic_transactions_considered": sum(
            1 for transaction in candidate_transactions if transaction.source != "local-db"
        ),
        "receipt_transactions_ignored_out_of_window": len(ignored_out_of_window),
        "counts": counts,
        "payload_examples": payload_examples,
        "coverage_ratio": (
            round(counts["matched"] / len(output.lines), 4) if output.lines else 0.0
        ),
        "line_outcomes": outcomes,
        "receipt_only": receipt_only,
        "ignored_receipts_out_of_window": ignored_out_of_window,
    }


def _line_outcome(
    line: StatementLine,
    *,
    verdict: str,
    score: float | None = None,
    reasons: list[str] | None = None,
    matched_receipt: dict[str, Any] | None = None,
    candidate_receipts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    candidate = _candidate_transaction(line) if verdict == "statement_only" else None
    return {
        "source_order": line.source_order,
        "date": _date_string(line.date),
        "description": line.description,
        "amount_minor": line.amount_minor,
        "currency": line.currency,
        "line_type": line.line_type,
        "installment": line.installment,
        "ledger_ready": line.ledger_ready,
        "amount_selection_reason": line.amount_selection_reason,
        "amount_candidates": _amount_candidate_samples(line),
        "verdict": verdict,
        "score": score,
        "reasons": reasons or (["no_receipt_candidate"] if verdict == "statement_only" else []),
        "matched_receipt": matched_receipt,
        "candidate_receipts": candidate_receipts or [],
        "candidate_transaction": candidate,
    }


def _candidate_transaction(line: StatementLine) -> dict[str, Any] | None:
    if not line.ledger_ready or line.date is None or line.amount_minor <= 0:
        return None
    if line.line_type not in _STATEMENT_TRANSACTION_LINE_TYPES:
        return None
    merchant = line.description.strip() or "Unknown statement merchant"
    recurrence_fields = recurrence_fields_from_statement_installment(line.installment)
    return {
        "transaction_date": _date_string(line.date),
        "merchant": merchant,
        "store_category_source": "unknown",
        "total_minor": line.amount_minor,
        "gross_total_minor": line.amount_minor,
        "reconstructed_total_minor": line.amount_minor,
        "currency": line.currency,
        "receipt_type": "statement",
        "merchant_source": "ai",
        **recurrence_fields,
        "items": [
            {
                "name": _STATEMENT_CANDIDATE_ITEM_NAME,
                "qty": 1.0,
                "unit_price_minor": line.amount_minor,
                "total_price_minor": line.amount_minor,
                "category_source": "statement_unidentified",
                "is_flagged": True,
                "sort_order": 0,
            }
        ],
    }


def _payload_examples(
    *,
    outcomes: list[dict[str, Any]],
    receipt_only: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    examples: dict[str, list[dict[str, Any]]] = {
        "matched": [],
        "statement_only": [],
        "receipt_only": [],
        "ambiguous": [],
        "failed": [],
        "manual_review": [],
    }
    for outcome in outcomes:
        verdict = outcome["verdict"]
        if verdict == "matched" and outcome.get("matched_receipt"):
            _append_example(examples["matched"], _matched_payload_example(outcome))
        elif verdict == "statement_only":
            if outcome.get("candidate_transaction") is not None:
                _append_statement_only_example(
                    examples["statement_only"],
                    _statement_only_payload_example(outcome),
                )
            else:
                _append_example(examples["manual_review"], _manual_review_payload_example(outcome))
        elif verdict == "ambiguous":
            _append_example(examples["ambiguous"], _ambiguous_payload_example(outcome))
        elif verdict == "failed":
            _append_example(examples["failed"], _failed_payload_example(outcome))

    for transaction in receipt_only:
        _append_example(examples["receipt_only"], _receipt_only_payload_example(transaction))
    return examples


def _append_example(target: list[dict[str, Any]], example: dict[str, Any]) -> None:
    if len(target) < 2:
        target.append(example)


def _append_statement_only_example(target: list[dict[str, Any]], example: dict[str, Any]) -> None:
    candidate = example.get("candidate_transaction") or {}
    is_fixed_term = candidate.get("recurrence_kind") == "fixed_term"
    has_fixed_term = any(
        (existing.get("candidate_transaction") or {}).get("recurrence_kind") == "fixed_term"
        for existing in target
    )
    if len(target) < 2:
        target.append(example)
        return
    if is_fixed_term and not has_fixed_term:
        target[-1] = example


def _matched_payload_example(outcome: dict[str, Any]) -> dict[str, Any]:
    receipt = outcome["matched_receipt"]
    return {
        "kind": "matched_existing_transaction",
        "action": "link_existing_transaction",
        "statement_line": _statement_line_payload(outcome),
        "existing_transaction": receipt,
        "application_payload": {
            "action": "accept_match",
            "receipt_transaction_id": receipt["id"],
            "statement_line_source_order": outcome["source_order"],
            "match_score": outcome["score"],
            "reasons": outcome["reasons"],
        },
    }


def _statement_only_payload_example(outcome: dict[str, Any]) -> dict[str, Any]:
    return {
        "kind": "statement_only_create_candidate",
        "action": "prompt_user_to_create_transaction",
        "statement_line": _statement_line_payload(outcome),
        "candidate_transaction": outcome["candidate_transaction"],
        "application_payload": {
            "action": "create_statement_transaction",
            "candidate_transaction": outcome["candidate_transaction"],
        },
    }


def _receipt_only_payload_example(transaction: dict[str, Any]) -> dict[str, Any]:
    return {
        "kind": "receipt_only_app_transaction",
        "action": "review_unmatched_app_transaction",
        "existing_transaction": transaction,
        "application_payload": {
            "action": "keep_or_unlink_app_transaction",
            "receipt_transaction_id": transaction["id"],
            "reason": "no_statement_line_candidate",
        },
    }


def _ambiguous_payload_example(outcome: dict[str, Any]) -> dict[str, Any]:
    candidates = outcome.get("candidate_receipts") or []
    return {
        "kind": "ambiguous_match_resolution",
        "action": "prompt_user_to_resolve_match",
        "statement_line": _statement_line_payload(outcome),
        "candidate_transactions": candidates,
        "application_payload": {
            "action": "resolve_ambiguous_statement_match",
            "statement_line_source_order": outcome["source_order"],
            "candidate_transaction_ids": [candidate["id"] for candidate in candidates],
            "reasons": outcome["reasons"],
        },
    }


def _manual_review_payload_example(outcome: dict[str, Any]) -> dict[str, Any]:
    return {
        "kind": "statement_line_manual_review",
        "action": "prompt_user_to_review_statement_line",
        "statement_line": _statement_line_payload(outcome),
        "application_payload": {
            "action": "manual_review_statement_line",
            "statement_line_source_order": outcome["source_order"],
            "reason": "no_ledger_ready_candidate_transaction",
        },
    }


def _failed_payload_example(outcome: dict[str, Any]) -> dict[str, Any]:
    return {
        "kind": "failed_statement_line",
        "action": "surface_extraction_or_reconciliation_failure",
        "statement_line": _statement_line_payload(outcome),
        "application_payload": {
            "action": "manual_review_statement_line",
            "statement_line_source_order": outcome["source_order"],
            "reasons": outcome["reasons"],
        },
    }


def _statement_line_payload(outcome: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_order": outcome["source_order"],
        "date": outcome["date"],
        "description": outcome["description"],
        "amount_minor": outcome["amount_minor"],
        "currency": outcome["currency"],
        "line_type": outcome["line_type"],
        "installment": outcome.get("installment"),
        "amount_selection_reason": outcome.get("amount_selection_reason"),
        "amount_candidates": outcome.get("amount_candidates", []),
    }


def _score_line_candidate(
    line: StatementLine,
    transaction: _ReceiptTransaction,
) -> _CandidateMatch | None:
    if line.currency != transaction.currency:
        return None
    if line.date is None:
        return None

    date_delta = abs((transaction.transaction_date - line.date).days)
    if date_delta > settings.statement_reconciliation_date_tolerance_days:
        return None
    reasons = ["same_date" if date_delta == 0 else f"date_tolerance:{date_delta}d"]

    amount_delta = abs(transaction.total_minor - line.amount_minor)
    amount_tolerance = _amount_tolerance(line.amount_minor)
    if amount_delta > amount_tolerance:
        return None
    reasons.append("exact_amount" if amount_delta == 0 else f"amount_tolerance:{amount_delta}")

    merchant_score = _merchant_similarity(line.description, transaction.merchant)
    if merchant_score < settings.statement_reconciliation_merchant_similarity_threshold:
        return None
    reasons.append("exact_merchant" if merchant_score >= 0.999 else "fuzzy_merchant")

    date_score = 1 - (
        date_delta / max(settings.statement_reconciliation_date_tolerance_days, 1)
        if date_delta
        else 0
    )
    amount_score = 1 - (amount_delta / max(amount_tolerance, 1) if amount_delta else 0)
    score = (merchant_score * 0.4) + (amount_score * 0.3) + (date_score * 0.2)
    return _CandidateMatch(transaction=transaction, score=min(score, 1.0), reasons=reasons)


def _date_bounds(output: StatementExtractionOutput) -> tuple[date, date] | None:
    dates = [line.date for line in output.lines if line.date is not None]
    if output.statement.period_start is not None:
        dates.append(output.statement.period_start)
    if output.statement.period_end is not None:
        dates.append(output.statement.period_end)
    if not dates:
        return None
    tolerance = timedelta(days=settings.statement_reconciliation_date_tolerance_days)
    return min(dates) - tolerance, max(dates) + tolerance


def _transactions_in_window(
    transactions: list[_ReceiptTransaction],
    window: tuple[date, date] | None,
) -> list[_ReceiptTransaction]:
    if window is None:
        return transactions
    start, end = window
    return [
        transaction for transaction in transactions if start <= transaction.transaction_date <= end
    ]


def _amount_tolerance(amount_minor: int) -> int:
    ratio = settings.statement_reconciliation_amount_tolerance_ratio
    return max(1, math.ceil(abs(amount_minor) * ratio))


def _merchant_similarity(left: str, right: str) -> float:
    normalized_left = _normalize_merchant(left)
    normalized_right = _normalize_merchant(right)
    if not normalized_left or not normalized_right:
        return 0.0
    if normalized_left == normalized_right:
        return 1.0
    if normalized_left in normalized_right or normalized_right in normalized_left:
        return 0.92
    left_tokens = set(normalized_left.split())
    right_tokens = set(normalized_right.split())
    token_score = (
        len(left_tokens & right_tokens) / max(len(left_tokens | right_tokens), 1)
        if left_tokens and right_tokens
        else 0.0
    )
    sequence_score = SequenceMatcher(None, normalized_left, normalized_right).ratio()
    return max(token_score, sequence_score)


def _normalize_merchant(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    table = str.maketrans({char: " " for char in string.punctuation})
    words = ascii_value.translate(table).casefold().split()
    ignored = {"spa", "ltda", "srl", "sa", "cl", "com", "www"}
    return " ".join(word for word in words if word not in ignored)


async def _load_receipt_transactions_snapshot(
    *,
    transaction_scope_firebase_uid: str | None = None,
) -> tuple[list[_ReceiptTransaction], dict[str, Any]]:
    async with engine.connect() as connection:
        tables = await connection.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        if "transactions" not in tables:
            return [], _db_snapshot(
                tables,
                transactions_available=0,
                readable=False,
                transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            )

        columns = await _table_columns(connection, "transactions")
        required = {"id", "transaction_date", "merchant", "total_minor", "currency"}
        if not required.issubset(columns):
            return [], _db_snapshot(
                tables,
                transactions_available=0,
                readable=False,
                reason="transactions_table_missing_required_columns",
                transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            )
        scope_id = await _scope_id_for_firebase_uid(
            connection,
            tables=tables,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
        )
        if transaction_scope_firebase_uid and scope_id is None:
            return [], _db_snapshot(
                tables,
                transactions_available=0,
                readable=True,
                reason="transaction_scope_firebase_uid_not_found",
                transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            )
        if scope_id is not None and "ownership_scope_id" not in columns:
            return [], _db_snapshot(
                tables,
                transactions_available=0,
                readable=False,
                reason="transactions_table_missing_ownership_scope_id",
                transaction_scope_firebase_uid=transaction_scope_firebase_uid,
                transaction_scope_ownership_scope_id=scope_id,
            )

        select_columns = [
            "id",
            "transaction_date",
            "merchant",
            "total_minor",
            "currency",
            _optional_column(columns, "ownership_scope_id"),
            _optional_column(columns, "receipt_type"),
            _optional_column(columns, "card_alias_id"),
            _optional_column(columns, "merchant_user_edited_at"),
            _optional_column(columns, "prompt_version"),
        ]
        where_clauses = ["(receipt_type is null or receipt_type != 'statement')"]
        params: dict[str, Any] = {}
        if scope_id is not None:
            where_clauses.append("ownership_scope_id = :ownership_scope_id")
            params["ownership_scope_id"] = scope_id
        rows = (
            (
                await connection.execute(
                    text(
                        "select "
                        + ", ".join(select_columns)
                        + " from transactions "
                        + "where "
                        + " and ".join(where_clauses)
                        + " "
                        + "order by transaction_date, id"
                    ),
                    params,
                )
            )
            .mappings()
            .all()
        )
    transactions = [_transaction_from_row(row) for row in rows]
    return transactions, _db_snapshot(
        tables,
        transactions_available=len(transactions),
        readable=True,
        statement_lab_seed_transactions=sum(
            1
            for transaction in transactions
            if transaction.prompt_version
            and transaction.prompt_version.startswith(STATEMENT_LAB_SEED_PROMPT_PREFIX)
        ),
        transaction_scope_firebase_uid=transaction_scope_firebase_uid,
        transaction_scope_ownership_scope_id=scope_id,
        date_min=_date_string(
            min((transaction.transaction_date for transaction in transactions), default=None)
        ),
        date_max=_date_string(
            max((transaction.transaction_date for transaction in transactions), default=None)
        ),
    )


async def _scope_id_for_firebase_uid(
    connection: Any,
    *,
    tables: list[str],
    transaction_scope_firebase_uid: str | None,
) -> str | None:
    if not transaction_scope_firebase_uid:
        return None
    if "users" not in tables:
        return None
    columns = await _table_columns(connection, "users")
    if not {"firebase_uid", "ownership_scope_id"}.issubset(columns):
        return None
    row = (
        await connection.execute(
            text("select ownership_scope_id from users where firebase_uid = :firebase_uid limit 1"),
            {"firebase_uid": transaction_scope_firebase_uid},
        )
    ).first()
    return str(row[0]) if row is not None and row[0] else None


async def _table_columns(connection: Any, table_name: str) -> set[str]:
    rows = await connection.execute(text(f"pragma table_info({table_name})"))
    return {row[1] for row in rows.fetchall()}


def _optional_column(columns: set[str], name: str) -> str:
    return name if name in columns else f"null as {name}"


def _transaction_from_row(row: Any) -> _ReceiptTransaction:
    transaction_date = row["transaction_date"]
    if isinstance(transaction_date, str):
        transaction_date = date.fromisoformat(transaction_date)
    merchant_user_edited_at = row["merchant_user_edited_at"]
    return _ReceiptTransaction(
        id=str(row["id"]),
        ownership_scope_id=str(row["ownership_scope_id"]) if row["ownership_scope_id"] else None,
        transaction_date=transaction_date,
        merchant=str(row["merchant"]),
        total_minor=int(row["total_minor"]),
        currency=str(row["currency"]),
        receipt_type=str(row["receipt_type"]) if row["receipt_type"] else None,
        card_alias_id=str(row["card_alias_id"]) if row["card_alias_id"] else None,
        merchant_user_edited_at=(
            str(merchant_user_edited_at) if merchant_user_edited_at is not None else None
        ),
        prompt_version=str(row["prompt_version"]) if row["prompt_version"] else None,
        fixture_kind=(
            "statement_lab_seed"
            if row["prompt_version"]
            and str(row["prompt_version"]).startswith(STATEMENT_LAB_SEED_PROMPT_PREFIX)
            else None
        ),
    )


def _transaction_payload(transaction: _ReceiptTransaction) -> dict[str, Any]:
    return {
        "id": transaction.id,
        "ownership_scope_id": transaction.ownership_scope_id,
        "source": transaction.source,
        "fixture_kind": transaction.fixture_kind,
        "transaction_date": _date_string(transaction.transaction_date),
        "merchant": transaction.merchant,
        "total_minor": transaction.total_minor,
        "currency": transaction.currency,
        "receipt_type": transaction.receipt_type,
        "card_alias_id": transaction.card_alias_id,
        "merchant_user_edited_at": transaction.merchant_user_edited_at,
        "prompt_version": transaction.prompt_version,
    }


def _db_snapshot(
    tables: list[str],
    *,
    transactions_available: int,
    readable: bool,
    reason: str | None = None,
    statement_lab_seed_transactions: int = 0,
    transaction_scope_firebase_uid: str | None = None,
    transaction_scope_ownership_scope_id: str | None = None,
    date_min: str | None = None,
    date_max: str | None = None,
) -> dict[str, Any]:
    return {
        "url": _safe_database_url(settings.database_url),
        "readable": readable,
        "table_count": len(tables),
        "has_transactions_table": "transactions" in tables,
        "has_statements_table": "statements" in tables,
        "has_statement_lines_table": "statement_lines" in tables,
        "transactions_available": transactions_available,
        "statement_lab_seed_transactions": statement_lab_seed_transactions,
        "transactions_date_min": date_min,
        "transactions_date_max": date_max,
        "transaction_scope_firebase_uid": transaction_scope_firebase_uid,
        "transaction_scope_ownership_scope_id": transaction_scope_ownership_scope_id,
        "reason": reason,
    }


def _summary(case_reports: list[dict[str, Any]], db_snapshot: dict[str, Any]) -> dict[str, Any]:
    total_expected_lines = sum(case["expected"]["line_count"] for case in case_reports)
    total_actual_lines = sum(case["current_extraction"]["line_count"] for case in case_reports)
    synthetic_transactions = sum(
        case["reconciliation"]["synthetic_transactions_available"] for case in case_reports
    )
    synthetic_transactions_considered = sum(
        case["reconciliation"]["synthetic_transactions_considered"] for case in case_reports
    )
    reconciliation_counts = {
        "matched": 0,
        "statement_only": 0,
        "receipt_only": 0,
        "ambiguous": 0,
        "failed": 0,
        "candidate_transactions": 0,
    }
    for case in case_reports:
        counts = case["reconciliation"]["counts"]
        for key in reconciliation_counts:
            reconciliation_counts[key] += int(counts[key])
    diagnostics = _aggregate_failure_diagnostics(case_reports)
    return {
        "baselined_case_count": len(case_reports),
        "expected_line_count": total_expected_lines,
        "actual_output_line_count": total_actual_lines,
        "current_extraction_line_count": total_actual_lines,
        "current_extraction_passed_cases": sum(
            1
            for case in case_reports
            if case["current_extraction"]["score_against_expected"]["passed"]
        ),
        "current_extraction_failed_cases": sum(
            1
            for case in case_reports
            if not case["current_extraction"]["score_against_expected"]["passed"]
        ),
        "reconciliation_counts": reconciliation_counts,
        "database_transactions_available": db_snapshot["transactions_available"],
        "database_statement_lab_seed_transactions": db_snapshot.get(
            "statement_lab_seed_transactions", 0
        ),
        "synthetic_transactions_available": synthetic_transactions,
        "synthetic_transactions_considered": synthetic_transactions_considered,
        **diagnostics,
    }


def _aggregate_failure_diagnostics(case_reports: list[dict[str, Any]]) -> dict[str, Any]:
    field_counts = {field: 0 for field in _DIAGNOSTIC_FIELDS}
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    pattern_counts: dict[str, int] = {}
    downstream_impact: set[str] = set()
    promotion_blockers: set[str] = set()
    owners: list[str] = []
    mismatched_lines = 0
    blocking_mismatched_lines = 0
    mismatch_issues = 0
    line_count_delta = 0
    for case in case_reports:
        differences = case["current_extraction"]["differences"]
        mismatched_lines += int(differences.get("mismatch_count") or 0)
        blocking_mismatched_lines += int(differences.get("blocking_mismatch_count") or 0)
        mismatch_issues += int(differences.get("mismatch_issue_count") or 0)
        line_count_delta += int(differences.get("line_count_delta") or 0)
        for field, count in differences.get("field_mismatch_counts", {}).items():
            if field in field_counts:
                field_counts[field] += int(count)
        for severity, count in differences.get("severity_counts", {}).items():
            if severity in severity_counts:
                severity_counts[severity] += int(count)
        for pattern, count in differences.get("pattern_counts", {}).items():
            pattern_counts[pattern] = pattern_counts.get(pattern, 0) + int(count)
        downstream_impact.update(differences.get("downstream_impact", []))
        promotion_blockers.update(differences.get("promotion_blockers", []))
        owner = differences.get("recommended_owner")
        if owner:
            owners.append(str(owner))
    return {
        "failure_summary": {
            "line_count_delta": line_count_delta,
            "mismatched_lines": mismatched_lines,
            "blocking_mismatched_lines": blocking_mismatched_lines,
            "mismatch_issues": mismatch_issues,
            "field_mismatch_counts": field_counts,
            "severity_counts": severity_counts,
            "top_patterns": _top_patterns(pattern_counts),
        },
        "severity_counts": severity_counts,
        "downstream_impact": sorted(downstream_impact),
        "recommended_owner": _aggregate_recommended_owner(owners),
        "promotion_blockers": sorted(promotion_blockers),
    }


def _aggregate_recommended_owner(owners: list[str]) -> str | None:
    if not owners:
        return None
    for owner in ("prompt", "coalesce", "provider_ocr", "scoring_policy", "baseline_truth"):
        if owner in owners:
            return owner
    return owners[0]


def _aggregate_payload_examples(
    case_reports: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    aggregate: dict[str, list[dict[str, Any]]] = {
        "matched": [],
        "statement_only": [],
        "receipt_only": [],
        "ambiguous": [],
        "failed": [],
        "manual_review": [],
    }
    for case in case_reports:
        examples = case["reconciliation"].get("payload_examples", {})
        for key in aggregate:
            for example in examples.get(key, []):
                if len(aggregate[key]) >= 2:
                    break
                aggregate[key].append({"case_id": case["case_id"], **example})
    return aggregate


def _deterministic_comparison(
    case_reports: list[dict[str, Any]],
    comparison_reports: list[dict[str, Any]],
) -> dict[str, Any]:
    deterministic_extractors = [_comparison_entry(case) for case in case_reports]
    comparison_entries = [_comparison_entry(case) for case in comparison_reports]
    best_deterministic = _best_comparison_entry(deterministic_extractors)
    best_comparison = _best_comparison_entry(comparison_entries)
    recommendation = _promotion_recommendation(
        best_deterministic=best_deterministic,
        best_comparison=best_comparison,
    )
    return {
        "deterministic_extractors": deterministic_extractors,
        "comparison_extractors": comparison_entries,
        "best_deterministic": best_deterministic,
        "best_comparison": best_comparison,
        "promotion_recommendation": recommendation,
    }


def _comparison_entry(case: dict[str, Any]) -> dict[str, Any]:
    differences = case["current_extraction"]["differences"]
    field_counts = differences["field_mismatch_counts"]
    severity_counts = differences["severity_counts"]
    score = case["current_extraction"]["score_against_expected"]
    return {
        "case_id": case["case_id"],
        "case_variant_id": case.get("case_variant_id", case["case_id"]),
        "actual_source": case["current_extraction"]["actual_source"],
        "extractor": case["current_extraction"].get("extractor")
        or case["current_extraction"]["actual_source"],
        "passed": bool(score.get("passed")),
        "expected_line_count": case["expected"]["line_count"],
        "actual_line_count": case["current_extraction"]["line_count"],
        "line_count_delta": differences["line_count_delta"],
        "amount_mismatches": field_counts.get("amount_minor", 0),
        "description_mismatches": field_counts.get("description", 0),
        "line_type_mismatches": field_counts.get("line_type", 0),
        "date_mismatches": field_counts.get("date", 0),
        "currency_mismatches": field_counts.get("currency", 0),
        "critical_issues": severity_counts.get("critical", 0),
        "high_issues": severity_counts.get("high", 0),
        "mismatch_issues": differences["mismatch_issue_count"],
        "order_drift_count": differences["source_order_diagnostics"]["order_drift_count"],
        "reconciliation_counts": case["reconciliation"]["counts"],
        "promotion_blockers": differences["promotion_blockers"],
        "source_manifest_path": case["current_extraction"].get("source_manifest_path"),
    }


def _best_comparison_entry(entries: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not entries:
        return None
    return sorted(
        entries,
        key=lambda entry: (
            not entry["passed"],
            abs(int(entry["line_count_delta"])),
            int(entry["critical_issues"]),
            int(entry["amount_mismatches"]),
            int(entry["mismatch_issues"]),
        ),
    )[0]


def _promotion_recommendation(
    *,
    best_deterministic: dict[str, Any] | None,
    best_comparison: dict[str, Any] | None,
) -> str:
    if best_deterministic is None or int(best_deterministic["actual_line_count"]) == 0:
        return "insufficient_text_layer"
    if best_deterministic["passed"]:
        return "deterministic_primary_candidate"
    if best_comparison is not None and _entry_better(best_comparison, best_deterministic):
        return "gemini_fallback_needed"
    return "needs_layout_rule_iteration"


def _entry_better(left: dict[str, Any], right: dict[str, Any]) -> bool:
    return (
        bool(left["passed"]),
        -abs(int(left["line_count_delta"])),
        -int(left["critical_issues"]),
        -int(left["amount_mismatches"]),
        -int(left["mismatch_issues"]),
    ) > (
        bool(right["passed"]),
        -abs(int(right["line_count_delta"])),
        -int(right["critical_issues"]),
        -int(right["amount_mismatches"]),
        -int(right["mismatch_issues"]),
    )


def _safe_database_url(database_url: str) -> str:
    try:
        return make_url(database_url).render_as_string(hide_password=True)
    except Exception:
        return "<unparseable database url>"


def _execution_mode(actual_source: StatementReportActualSource) -> str:
    if actual_source == "mock-gemini":
        return "mock_gemini_from_expected_fixture_no_provider_call"
    if actual_source == "live-gemini":
        return "live_gemini_provider_manifest_no_provider_call"
    if actual_source == "deterministic":
        return "deterministic_pdf_extraction_no_gemini"
    return "codex_pdf_text_only_no_gemini"


def _report_artifacts(
    *,
    output_dir: Path,
    report_path: Path,
    markdown_path: Path,
    case_reports: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "artifact_dir": str(output_dir),
        "report_path": str(report_path),
        "markdown_path": str(markdown_path),
        "manifest_path": str(output_dir / "manifest.json"),
        "case_manifest_paths": [
            case["artifacts"]["manifest_path"]
            for case in case_reports
            if "manifest_path" in case["artifacts"]
        ],
        "case_artifact_files": {
            case.get("case_variant_id", case["case_id"]): case["artifacts"]
            for case in case_reports
        },
    }


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_optional_json(path: str | None) -> dict[str, Any] | None:
    if not path:
        return None
    json_path = Path(path)
    if not json_path.exists():
        return None
    return _load_json(json_path)


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )


def _json_value(value: Any) -> Any:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _json_default(value: object) -> str:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "case"


def _markdown_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    actual_source = str(report["actual_source"])
    transaction_fixture = str(report["transaction_fixture"])
    if actual_source == "mock-gemini":
        provider_note = (
            "- Gemini was not run. `mock-gemini` uses expected fixtures as simulated "
            "provider output."
        )
        extractor_note = (
            "- The actual output is simulated from expected fixtures so downstream scoring "
            "and reconciliation artifacts are populated."
        )
    elif actual_source == "live-gemini":
        provider_note = (
            "- Gemini was not run by this report. It reuses prior `statement-run` live "
            "provider manifest artifacts."
        )
        extractor_note = (
            "- The actual output is the normalized `processed_output.json` from the live "
            "Gemini run, scored against the expected fixture."
        )
    elif actual_source == "deterministic":
        provider_note = (
            "- Gemini was not run by this report. It reuses prior deterministic extractor "
            "manifest artifacts."
        )
        extractor_note = (
            "- The actual outputs are local PDF parser results, scored against the expected "
            "fixture and optionally compared with a prior live Gemini manifest."
        )
    else:
        provider_note = "- Gemini was not run by this report."
        extractor_note = (
            "- The current local statement extractor can inspect/decrypt/read PDF text, "
            "but it does not normalize statement lines yet."
        )
    cost_summary_note = (
        "- Per case `cost_summary.json`: provider-reported token/cost data copied from "
        "the live manifest."
        if actual_source == "live-gemini"
        else "- Per case `cost_summary.json`: zero-cost marker for no-provider execution."
    )
    lines = [
        "# Statement Expected Fixture Report",
        "",
        f"- Generated: `{report['generated_at']}`",
        f"- Execution mode: `{report['execution_mode']}`",
        f"- Actual source: `{actual_source}`",
        f"- Transaction fixture: `{transaction_fixture}`",
        f"- Baselined cases: `{summary['baselined_case_count']}`",
        f"- Expected statement lines: `{summary['expected_line_count']}`",
        f"- Actual normalized lines: `{summary['actual_output_line_count']}`",
        f"- Local receipt transactions available: `{summary['database_transactions_available']}`",
        f"- Statement-lab seed transactions available: "
        f"`{summary['database_statement_lab_seed_transactions']}`",
        f"- Synthetic transactions available: `{summary['synthetic_transactions_available']}`",
        *_markdown_deterministic_comparison(report),
        "",
        "## Findings",
        "",
        provider_note,
        extractor_note,
        "- Reconciliation is simulated from the normalized statement output selected "
        "for this report.",
        (
            "- Synthetic edge-case app transactions are overlaid in memory; no database rows "
            "are written."
            if transaction_fixture == "edge-cases"
            else "- No synthetic app transactions are overlaid."
        ),
        "- Statement-only spend lines include a candidate transaction payload with one flagged "
        "`Unidentified statement item`.",
        "",
        "## Case Summary",
        "",
        "| Case | Expected Lines | Current Lines | PDF Status | Compared | Matched | "
        "Statement Only | Receipt Only | Ambiguous | Candidate Transactions |",
        "| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for case in report["cases"]:
        score = case["current_extraction"]["score_against_expected"]
        counts = case["reconciliation"]["counts"]
        case_label = case.get("case_variant_id", case["case_id"])
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{case_label}`",
                    str(case["expected"]["line_count"]),
                    str(case["current_extraction"]["line_count"]),
                    f"`{case['current_extraction']['pdf_status']}`",
                    "`passed`" if score["passed"] else "`failed`",
                    str(counts["matched"]),
                    str(counts["statement_only"]),
                    str(counts["receipt_only"]),
                    str(counts["ambiguous"]),
                    str(counts["candidate_transactions"]),
                ]
            )
            + " |"
        )
    lines.extend(_markdown_failure_diagnostics(report))
    lines.extend(
        [
            "",
            "## Database Snapshot",
            "",
            f"- URL: `{report['database']['url']}`",
            f"- Transactions table readable: `{report['database']['readable']}`",
            f"- Transactions available: `{report['database']['transactions_available']}`",
            f"- Statement-lab seed transactions: "
            f"`{report['database'].get('statement_lab_seed_transactions', 0)}`",
            f"- Transaction scope Firebase UID: "
            f"`{report['database'].get('transaction_scope_firebase_uid')}`",
            f"- Transaction scope ownership scope: "
            f"`{report['database'].get('transaction_scope_ownership_scope_id')}`",
            f"- Transaction date range: `{report['database']['transactions_date_min']}` to "
            f"`{report['database']['transactions_date_max']}`",
            f"- Statement runtime tables present: `{report['database']['has_statements_table']}`",
            "",
            "## Generated Files",
            "",
            "- Top-level `manifest.json`: run summary and file index.",
            "- Top-level `report.json`: full machine-readable report.",
            "- Top-level `REPORT.md`: human-readable report.",
            "- Per case `pdf_text_extraction.json`: PDF status/text metadata without raw text.",
            (
            "- Per case `text_layer.json`, `layout_words.json`, and `candidate_rows.json`: "
                "deterministic PDF parser evidence."
                if actual_source == "deterministic"
                else "- Deterministic parser artifacts are not present in this report mode."
            ),
            (
                "- Per case `raw_output.json`: deterministic extractor-shaped output; no "
                "provider call was made."
                if actual_source == "deterministic"
                else "- Per case `raw_output.json`: provider-shaped output; simulated in "
                "`mock-gemini` mode and copied from the live manifest in `live-gemini` mode."
            ),
            "- Per case `processed_output.json`: normalized statement contract used downstream.",
            "- Per case `field_provenance.json`: field/source attribution for the statement stage.",
            "- Per case `score.json`: expected-vs-actual score and difference samples.",
            "- Per case `reconciliation.json`: bucket counts, line outcomes, and candidates.",
            "- Per case `payload_examples.json`: example app-facing payloads per outcome bucket.",
            cost_summary_note,
            "- Per case `manifest.json`: per-case artifact index.",
            "",
            "## Payload Examples",
            "",
            *_markdown_payload_example_lines(report.get("payload_examples", {})),
            "",
            "## Notes",
            "",
            "Full per-line outcomes are in per-case `reconciliation.json` and in top-level "
            "`report.json`.",
            "",
        ]
    )
    return "\n".join(lines)


def _markdown_deterministic_comparison(report: dict[str, Any]) -> list[str]:
    comparison = report.get("deterministic_comparison")
    if not isinstance(comparison, dict):
        return []
    lines = [
        "",
        "## Deterministic Comparison",
        "",
        f"- Promotion recommendation: `{comparison['promotion_recommendation']}`",
        "| Source | Extractor | Lines | Line Delta | Amount | Description | Type | "
        "Critical | Passed |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for entry in [
        *comparison.get("deterministic_extractors", []),
        *comparison.get("comparison_extractors", []),
    ]:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{entry['actual_source']}`",
                    f"`{entry['extractor']}`",
                    str(entry["actual_line_count"]),
                    str(entry["line_count_delta"]),
                    str(entry["amount_mismatches"]),
                    str(entry["description_mismatches"]),
                    str(entry["line_type_mismatches"]),
                    str(entry["critical_issues"]),
                    "`yes`" if entry["passed"] else "`no`",
                ]
            )
            + " |"
        )
    best = comparison.get("best_deterministic")
    if isinstance(best, dict):
        lines.append(
            f"- Best deterministic extractor: `{best['extractor']}` with "
            f"`{best['amount_mismatches']}` amount mismatches and "
            f"`{best['critical_issues']}` critical issues."
        )
    best_comparison = comparison.get("best_comparison")
    if isinstance(best_comparison, dict):
        lines.append(
            f"- Best comparison source: `{best_comparison['extractor']}` with "
            f"`{best_comparison['amount_mismatches']}` amount mismatches and "
            f"`{best_comparison['critical_issues']}` critical issues."
        )
    return lines


def _markdown_payload_example_lines(
    payload_examples: dict[str, list[dict[str, Any]]],
) -> list[str]:
    lines: list[str] = []
    for bucket in ("matched", "statement_only", "receipt_only", "ambiguous", "manual_review"):
        examples = payload_examples.get(bucket, [])
        if not examples:
            lines.append(f"- `{bucket}`: no example in this run.")
            continue
        example = _preferred_payload_example(bucket=bucket, examples=examples)
        payload = example["application_payload"]
        lines.append(
            f"- `{bucket}`: `{json.dumps(payload, sort_keys=True, default=_json_default)}`"
        )
    return lines


def _preferred_payload_example(
    *,
    bucket: str,
    examples: list[dict[str, Any]],
) -> dict[str, Any]:
    if bucket != "statement_only":
        return examples[0]
    for example in examples:
        candidate = example.get("candidate_transaction") or {}
        if candidate.get("recurrence_kind") == "fixed_term":
            return example
    return examples[0]


def _markdown_failure_diagnostics(report: dict[str, Any]) -> list[str]:
    if not report.get("promotion_blockers"):
        return [
            "",
            "## Why It Failed",
            "",
            "No promotion blockers were detected in this report.",
        ]
    failure_summary = report["failure_summary"]
    field_counts = failure_summary["field_mismatch_counts"]
    severity_counts = report["severity_counts"]
    lines = [
        "",
        "## Why It Failed",
        "",
        *(
            [
                "- Deterministic comparison has a passing extractor; aggregate blockers below "
                "come from non-selected extractor variants."
            ]
            if report.get("promotion_recommendation") == "deterministic_primary_candidate"
            else []
        ),
        f"- Recommended owner: `{report.get('recommended_owner') or 'none'}`",
        f"- Blocking mismatched lines: "
        f"`{failure_summary['blocking_mismatched_lines']}` of "
        f"`{report['summary']['actual_output_line_count']}` actual lines",
        "- Promotion blockers: "
        + ", ".join(f"`{blocker}`" for blocker in report["promotion_blockers"]),
        "- Field mismatch counts: "
        + (
            ", ".join(
                f"`{field}={count}`" for field, count in field_counts.items() if int(count)
            )
            or "`none`"
        ),
        "- Severity counts: "
        + ", ".join(
            f"`{severity}={count}`" for severity, count in severity_counts.items() if int(count)
        ),
        "",
        "### Downstream Impact",
        "",
    ]
    lines.extend(f"- {impact}" for impact in report.get("downstream_impact", []))
    lines.extend(
        [
            "",
            "### Failure Breakdown",
            "",
            "| Case | Amount | Description | Line Type | Date | Currency | Installment | "
            "Original Amount | Critical | High | Medium | Low |",
            "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for case in report["cases"]:
        differences = case["current_extraction"]["differences"]
        case_fields = differences["field_mismatch_counts"]
        case_severity = differences["severity_counts"]
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{case.get('case_variant_id', case['case_id'])}`",
                    str(case_fields.get("amount_minor", 0)),
                    str(case_fields.get("description", 0)),
                    str(case_fields.get("line_type", 0)),
                    str(case_fields.get("date", 0)),
                    str(case_fields.get("currency", 0)),
                    str(case_fields.get("installment", 0)),
                    str(case_fields.get("original_amount_minor", 0)),
                    str(case_severity.get("critical", 0)),
                    str(case_severity.get("high", 0)),
                    str(case_severity.get("medium", 0)),
                    str(case_severity.get("low", 0)),
                ]
            )
            + " |"
        )
    lines.extend(["", "### Line Comparison Policy", ""])
    alignment = _first_line_alignment(report)
    if alignment:
        lines.extend(
            [
                f"- Policy: `{alignment['policy']}`",
                f"- Coalesce: {alignment['coalesce']}",
                f"- Scoring: {alignment['scoring']}",
                f"- Risk: {alignment['risk']}",
            ]
        )
    else:
        lines.append("- No line-alignment metadata was present in this report.")
    source_order_diagnostics = _aggregate_source_order_diagnostics(report)
    lines.extend(
        [
            f"- Order drift matched pairs: `{source_order_diagnostics['order_drift_count']}`",
            f"- Unmatched expected lines: `{source_order_diagnostics['unmatched_expected_count']}`",
            f"- Unmatched actual lines: `{source_order_diagnostics['unmatched_actual_count']}`",
        ]
    )
    lines.extend(
        [
            "",
            "### Expected Vs Actual Values",
            "",
            *_markdown_value_table_note(report),
            "| Case | Transaction | Field | Expected Fixture | Actual Origin | "
            "Actual Value | Difference Summary | Match | Severity | Pattern | "
            "Expected Order | Actual Order |",
            "| --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | ---: | ---: |",
        ]
    )
    value_rows = 0
    for case in report["cases"]:
        differences = case["current_extraction"]["differences"]
        actual_origin = _markdown_actual_origin(case)
        for sample in differences.get("mismatches", differences.get("mismatch_samples", [])):
            if value_rows >= _MAX_MARKDOWN_VALUE_ROWS:
                break
            issues = sample.get("issues", [])
            issue_by_field = {issue.get("field"): issue for issue in issues}
            for field, values in sample.get("fields", {}).items():
                if value_rows >= _MAX_MARKDOWN_VALUE_ROWS:
                    break
                issue = issue_by_field.get(field) or (issues[0] if issues else {})
                expected_order = sample.get("matched_expected_source_order", sample["source_order"])
                actual_order = sample.get("matched_actual_source_order", "unmatched")
                lines.append(
                    "| "
                    + " | ".join(
                        [
                            f"`{case['case_id']}`",
                            _markdown_transaction_context(sample.get("transaction_context")),
                            f"`{field}`",
                            _markdown_value(values.get("expected")),
                            f"`{actual_origin}`",
                            _markdown_value(values.get("actual")),
                            _markdown_difference_summary(
                                expected=values.get("expected"),
                                actual=values.get("actual"),
                            ),
                            f"`{sample.get('match_score', '-')}`",
                            f"`{issue.get('severity', sample.get('severity', 'unknown'))}`",
                            f"`{issue.get('pattern', field)}`",
                            f"`{expected_order}`",
                            f"`{actual_order}`",
                        ]
                    )
                    + " |"
                )
                value_rows += 1
        if value_rows >= _MAX_MARKDOWN_VALUE_ROWS:
            break
    if value_rows == 0:
        lines.append("| - | - | - | - | - | - | - | - | - | - | - | - |")
    lines.extend(["", "### Top Mismatch Examples", ""])
    lines.extend(
        [
            "| Case | Source Order | Fields | Severity | Pattern | Difference Summary |",
            "| --- | ---: | --- | --- | --- | --- |",
        ]
    )
    top_rows = 0
    for case in report["cases"]:
        for sample in case["current_extraction"]["differences"]["mismatch_samples"][:8]:
            issues = sample.get("issues", [])
            issue = issues[0] if issues else {}
            fields = ", ".join(sample.get("fields", {}).keys())
            lines.append(
                "| "
                + " | ".join(
                    [
                        f"`{case['case_id']}`",
                        f"`{sample['source_order']}`",
                        _markdown_value(fields, max_length=64),
                        f"`{sample.get('severity', 'unknown')}`",
                        f"`{issue.get('pattern', fields)}`",
                        _markdown_value(issue.get("note", "field values differ")),
                    ]
                )
                + " |"
            )
            top_rows += 1
    if top_rows == 0:
        lines.append("| - | - | - | - | - | - |")
    return lines


def _aggregate_source_order_diagnostics(report: dict[str, Any]) -> dict[str, int]:
    order_drift_count = 0
    unmatched_expected_count = 0
    unmatched_actual_count = 0
    for case in report.get("cases", []):
        differences = case.get("current_extraction", {}).get("differences", {})
        diagnostics = differences.get("source_order_diagnostics", {})
        order_drift_count += int(diagnostics.get("order_drift_count") or 0)
        unmatched_expected_count += int(differences.get("missing_actual_count") or 0)
        unmatched_actual_count += int(differences.get("extra_actual_count") or 0)
    return {
        "order_drift_count": order_drift_count,
        "unmatched_expected_count": unmatched_expected_count,
        "unmatched_actual_count": unmatched_actual_count,
    }


def _markdown_value_table_note(report: dict[str, Any]) -> list[str]:
    field_difference_count = 0
    for case in report.get("cases", []):
        for sample in (
            case.get("current_extraction", {}).get("differences", {}).get("mismatches", [])
        ):
            field_difference_count += len(sample.get("fields", {}))
    if field_difference_count <= _MAX_MARKDOWN_VALUE_ROWS:
        return []
    return [
        f"_Showing first `{_MAX_MARKDOWN_VALUE_ROWS}` of `{field_difference_count}` field "
        "differences. See `report.json` for the complete mismatch list._",
        "",
    ]


def _markdown_transaction_context(context: Any) -> str:
    if not isinstance(context, dict):
        return "`unknown`"
    expected = context.get("expected_transaction_key") or {}
    actual = context.get("actual_transaction_key") or {}
    actual_candidate = context.get("actual_candidate_transaction") or {}
    expected_label = _transaction_context_label(expected)
    actual_label = _transaction_context_label(actual)
    candidate_total = actual_candidate.get("total_minor")
    candidate_suffix = f"; candidate total={candidate_total}" if candidate_total is not None else ""
    if expected_label == actual_label:
        text = f"expected/actual {expected_label}{candidate_suffix}"
    else:
        text = f"expected {expected_label}; actual {actual_label}{candidate_suffix}"
    return _markdown_value(text, max_length=128)


def _markdown_actual_origin(case: dict[str, Any]) -> str:
    extraction = case.get("current_extraction", {})
    actual_source = str(extraction.get("actual_source") or "actual")
    extractor = extraction.get("extractor")
    if actual_source == "live-gemini":
        return "Gemini"
    if actual_source == "mock-gemini":
        return "Mock Gemini"
    if actual_source == "deterministic":
        return f"Deterministic {extractor}" if extractor else "Deterministic"
    if actual_source == "current":
        return "Current PDF Text"
    return actual_source


def _transaction_context_label(value: dict[str, Any]) -> str:
    parts = [
        str(value.get("transaction_date") or "no-date"),
        str(value.get("merchant") or "no-merchant"),
        str(value.get("amount_minor") if value.get("amount_minor") is not None else "no-amount"),
        str(value.get("currency") or "no-currency"),
    ]
    installment = value.get("installment")
    if installment:
        parts.append(f"installment={installment}")
    return " ".join(parts)


def _markdown_value_delta(expected: Any, actual: Any) -> str:
    if isinstance(expected, int) and isinstance(actual, int):
        return _markdown_value(actual - expected)
    if isinstance(expected, str) and isinstance(actual, str):
        return _markdown_value("changed")
    if expected != actual:
        return _markdown_value("changed")
    return _markdown_value(0)


def _markdown_difference_summary(*, expected: Any, actual: Any) -> str:
    if expected == actual:
        return "`same`"
    if expected is None:
        return _markdown_value("different: expected missing")
    if actual is None:
        return _markdown_value("different: actual missing")
    if isinstance(expected, int) and isinstance(actual, int):
        delta = actual - expected
        sign = "+" if delta > 0 else ""
        return _markdown_value(f"different: {sign}{delta}")
    return _markdown_value("different: changed")


def _first_line_alignment(report: dict[str, Any]) -> dict[str, str] | None:
    for case in report.get("cases", []):
        alignment = case.get("current_extraction", {}).get("differences", {}).get("line_alignment")
        if alignment:
            return alignment
    return None


def _markdown_value(value: Any, *, max_length: int = 96) -> str:
    if value is None:
        text = "null"
    elif isinstance(value, str):
        text = value
    else:
        text = json.dumps(value, sort_keys=True, default=_json_default)
    text = " ".join(str(text).split())
    if len(text) > max_length:
        text = f"{text[: max_length - 1]}..."
    text = text.replace("|", "\\|")
    return f"`{text}`"


def _date_string(value: date | None) -> str | None:
    return value.isoformat() if value is not None else None
