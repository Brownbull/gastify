"""Statement Gemini prompt-lab runner."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from decimal import Decimal
from io import BytesIO
from typing import TYPE_CHECKING, Any

from pydantic_ai.exceptions import ModelHTTPError
from pypdf import PdfReader, PdfWriter

from app.agents.statement_extraction import (
    extract_statement_with_gemini,
    extract_statement_with_gemini_evidence,
    infer_statement_layout_profile_with_gemini,
)
from app.config import settings
from app.prompt_lab.costs import build_cost_summary
from app.prompt_lab.paths import LATEST_RESULTS_ROOT, ensure_workspace
from app.prompt_lab.run_ids import next_serial_run_id
from app.prompt_lab.statement.cache import (
    build_statement_cache_key,
    read_statement_cache,
    sha256_bytes,
    sha256_file,
    write_statement_cache,
)
from app.prompt_lab.statement.cases import StatementCase, inspect_pdf, load_issuer_password
from app.prompt_lab.statement.provenance import build_statement_field_provenance
from app.prompt_lab.statement.report import (
    _line_differences,
    _load_receipt_transactions_snapshot,
    _simulate_reconciliation,
    _transactions_for_case,
)
from app.prompt_lab.statement.scoring import score_statement_output
from app.prompts import get_prompt, prompt_text_hash
from app.schemas.statement import (
    StatementExtractionOutput,
    StatementInfo,
    StatementProcessingMetadata,
)
from app.schemas.statement_profile import StatementLayoutProfile
from app.services.statement_coalesce import coalesce_statement_output
from app.services.statement_pdf_evidence import extract_statement_pdf_evidence
from app.services.statement_profile_fallback import (
    apply_statement_layout_profile,
    build_statement_compact_evidence,
    compact_evidence_hash,
    compact_evidence_provider_hash,
    compact_evidence_provider_payload,
)

StatementGeminiInputMode = str
DEFAULT_STATEMENT_GEMINI_INPUT_MODE = "profile-rows"

if TYPE_CHECKING:
    from pathlib import Path

    from app.prompts.definitions import PromptDefinition


async def run_statement_case(
    case: StatementCase,
    *,
    prompt_id: str | None = None,
    model: str | None = None,
    live: bool = False,
    cache_only: bool = False,
    bypass_cache: bool = False,
    credentials_root: Path | None = None,
    results_root: Path = LATEST_RESULTS_ROOT,
    run_id: str | None = None,
    artifact_dir: Path | None = None,
    transaction_scope_firebase_uid: str | None = None,
    gemini_input: StatementGeminiInputMode = DEFAULT_STATEMENT_GEMINI_INPUT_MODE,
) -> dict[str, Any]:
    """Run one statement prompt-lab case and write its artifact packet."""
    ensure_workspace()
    prompt = _prompt_for_input_mode(gemini_input=gemini_input, prompt_id=prompt_id)
    model_name = model or settings.gemini_model
    agent_model = _agent_model(model_name)
    expected = _load_expected(case)
    prepared = _prepare_pdf_input(case, credentials_root=credentials_root)
    if prepared["status"] == "readable" and gemini_input in {"pymupdf-evidence", "profile-rows"}:
        prepared["pdf_evidence"] = extract_statement_pdf_evidence(
            case.pdf_path,
            password=_password_for_case(case, credentials_root),
        ).provider_payload()
        prepared["evidence_status"] = prepared["pdf_evidence"]["status"]
        if gemini_input == "profile-rows":
            compact = build_statement_compact_evidence(prepared["pdf_evidence"])
            compact_provider = compact_evidence_provider_payload(compact)
            prepared["compact_evidence"] = compact.model_dump(mode="json")
            prepared["compact_profile_evidence"] = _legacy_v1_profile_rows_provider_payload(
                prepared["compact_evidence"]
            )
            prepared["compact_provider_evidence"] = compact_provider
            prepared["compact_evidence_sha256"] = compact_evidence_hash(compact)
            prepared["compact_provider_evidence_sha256"] = compact_evidence_provider_hash(compact)
            prepared["legacy_compact_evidence_sha256"] = _legacy_v1_compact_evidence_hash(
                prepared["compact_evidence"]
            )
            prepared["evidence_sha256"] = prepared["legacy_compact_evidence_sha256"]
        else:
            prepared["compact_evidence"] = None
            prepared["compact_profile_evidence"] = None
            prepared["compact_provider_evidence"] = None
            prepared["compact_evidence_sha256"] = None
            prepared["compact_provider_evidence_sha256"] = None
            prepared["legacy_compact_evidence_sha256"] = None
            prepared["evidence_sha256"] = sha256_bytes(
                json.dumps(
                    prepared["pdf_evidence"],
                    sort_keys=True,
                    ensure_ascii=False,
                ).encode("utf-8")
            )
    else:
        prepared["pdf_evidence"] = None
        prepared["compact_evidence"] = None
        prepared["compact_profile_evidence"] = None
        prepared["compact_provider_evidence"] = None
        prepared["compact_evidence_sha256"] = None
        prepared["compact_provider_evidence_sha256"] = None
        prepared["legacy_compact_evidence_sha256"] = None
        prepared["evidence_sha256"] = None
        prepared["evidence_status"] = None
    expected_hash = sha256_file(case.expected_path) if case.expected_path else None
    cache_key = build_statement_cache_key(
        raw_pdf_hash=prepared["raw_pdf_sha256"],
        provider_pdf_hash=prepared["provider_pdf_sha256"],
        gemini_input_mode=gemini_input,
        evidence_hash=prepared["evidence_sha256"],
        model=model_name,
        prompt_id=prompt.id,
        prompt_kind=prompt.kind,
        encrypted_input=bool(prepared["is_encrypted"]),
        decrypted_for_provider=bool(prepared["decrypted_for_provider"]),
        expected_fixture_hash=expected_hash,
        expected_fixture_id=str(case.expected_path) if case.expected_path else None,
    )
    legacy_cache_key = None
    if gemini_input == "profile-rows" and prepared.get("legacy_compact_evidence_sha256"):
        legacy_cache_key = build_statement_cache_key(
            raw_pdf_hash=prepared["raw_pdf_sha256"],
            provider_pdf_hash=prepared["provider_pdf_sha256"],
            gemini_input_mode=gemini_input,
            evidence_hash=prepared["legacy_compact_evidence_sha256"],
            model=model_name,
            prompt_id=prompt.id,
            prompt_kind=prompt.kind,
            encrypted_input=bool(prepared["is_encrypted"]),
            decrypted_for_provider=bool(prepared["decrypted_for_provider"]),
            expected_fixture_hash=expected_hash,
            expected_fixture_id=str(case.expected_path) if case.expected_path else None,
        )
    base = _base_packet(
        case,
        prompt_id=prompt.id,
        prompt_version=prompt.version,
        prompt_hash=prompt_text_hash(prompt),
        model_name=model_name,
        agent_model=agent_model,
        statement_cache_key=cache_key,
        gemini_input_mode=gemini_input,
        pdf_evidence=prepared["pdf_evidence"],
        compact_evidence=prepared["compact_evidence"],
        compact_provider_evidence=prepared["compact_provider_evidence"],
        pdf_input=_sanitized_pdf_input(prepared),
        expected_path=str(case.expected_path) if case.expected_path else None,
        status="initializing",
    )

    if prepared["status"] != "readable":
        return await _write_completed_packet(
            base,
            raw=None,
            processed=_status_output(case, prepared),
            usage={},
            status=str(prepared["status"]),
            evidence_label="statement-prompt-lab-pdf-preflight",
            results_root=results_root,
            run_id=run_id,
            artifact_dir=artifact_dir,
            expected=expected,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            source="pdf_preflight",
        )

    if not bypass_cache:
        cached = read_statement_cache(cache_key)
        if cached is None and legacy_cache_key:
            cached = read_statement_cache(legacy_cache_key)
        if cached is not None:
            source = "gemini_cached_output"
            if gemini_input == "profile-rows" and cached.get("layout_profile"):
                layout_profile = StatementLayoutProfile.model_validate(cached["layout_profile"])
                compact = build_statement_compact_evidence(
                    {
                        **dict(prepared["pdf_evidence"]),
                        "status": prepared.get("evidence_status") or "readable",
                    }
                )
                application = apply_statement_layout_profile(
                    compact_evidence=compact,
                    layout_profile=layout_profile,
                    issuer_hint=case.issuer,
                    prompt_id=prompt.id,
                    model_name=agent_model,
                    fallback_warnings=[],
                )
                base["layout_profile"] = layout_profile.model_dump(mode="json")
                base["profile_application"] = {
                    "status": application.extraction.pdf_status,
                    "line_count": len(application.extraction.lines),
                    "unresolved_row_count": len(application.unresolved_rows),
                    "warnings": application.warnings,
                }
                base["unresolved_rows"] = [
                    row.model_dump(mode="json") for row in application.unresolved_rows
                ]
                raw = StatementExtractionOutput.model_validate(application.extraction.model_dump())
                source = "gemini_cached_profile_application"
            else:
                raw = StatementExtractionOutput.model_validate(
                    cached.get("raw_output", {}).get("extraction", {})
                )
            processed = coalesce_statement_output(
                raw,
                issuer_hint=case.issuer,
                prompt_id=prompt.id,
                model_name=agent_model,
                page_count=prepared["page_count"],
            )
            packet = await _write_completed_packet(
                base,
                raw=raw,
                processed=processed,
                usage=dict(cached.get("usage", {})),
                status="completed-from-cache",
                evidence_label="statement-prompt-lab-ai-quality-cached",
                results_root=results_root,
                run_id=run_id,
                artifact_dir=artifact_dir,
                expected=expected,
                transaction_scope_firebase_uid=transaction_scope_firebase_uid,
                source=source,
            )
            packet["statement_cache_path"] = cached.get("statement_cache_path")
            return packet

    if cache_only:
        return await _write_completed_packet(
            base,
            raw=None,
            processed=None,
            usage={},
            status="missing-cache",
            evidence_label="statement-prompt-lab-cache-miss",
            results_root=results_root,
            run_id=run_id,
            artifact_dir=artifact_dir,
            expected=expected,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            source="cache_miss",
        )

    if not live:
        return await _write_completed_packet(
            base,
            raw=None,
            processed=None,
            usage={},
            status="dry-run",
            evidence_label="statement-prompt-lab-render-only",
            results_root=results_root,
            run_id=run_id,
            artifact_dir=artifact_dir,
            expected=expected,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            source="dry_run",
        )

    if (
        gemini_input in {"pymupdf-evidence", "profile-rows"}
        and prepared.get("evidence_status") != "readable"
    ):
        return await _write_completed_packet(
            base,
            raw=None,
            processed=_status_output(
                case,
                {
                    **prepared,
                    "status": "insufficient_text_layer",
                },
            ),
            usage={},
            status="insufficient_text_layer",
            evidence_label="statement-prompt-lab-profile-evidence-preflight"
            if gemini_input == "profile-rows"
            else "statement-prompt-lab-pdf-evidence-preflight",
            results_root=results_root,
            run_id=run_id,
            artifact_dir=artifact_dir,
            expected=expected,
            transaction_scope_firebase_uid=transaction_scope_firebase_uid,
            source="pdf_evidence_preflight",
        )

    try:
        if gemini_input == "profile-rows":
            profile_result = await infer_statement_layout_profile_with_gemini(
                dict(prepared["compact_profile_evidence"]),
                model=agent_model,
                prompt_id=prompt.id,
            )
            compact = build_statement_compact_evidence(
                {
                    **dict(prepared["pdf_evidence"]),
                    "status": prepared.get("evidence_status") or "readable",
                }
            )
            application = apply_statement_layout_profile(
                compact_evidence=compact,
                layout_profile=profile_result.layout_profile,
                issuer_hint=case.issuer,
                prompt_id=profile_result.prompt_id,
                model_name=profile_result.model_name,
                fallback_warnings=[],
            )
            base["layout_profile"] = profile_result.layout_profile.model_dump(mode="json")
            base["profile_application"] = {
                "status": application.extraction.pdf_status,
                "line_count": len(application.extraction.lines),
                "unresolved_row_count": len(application.unresolved_rows),
                "warnings": application.warnings,
            }
            base["unresolved_rows"] = [
                row.model_dump(mode="json") for row in application.unresolved_rows
            ]
            raw = StatementExtractionOutput.model_validate(application.extraction.model_dump())
            usage = {"layout_profile": _dataclass_dict(profile_result.usage)}
            prompt_identity = {
                "prompt_id": profile_result.prompt_id,
                "prompt_version": profile_result.prompt_version,
                "model_name": profile_result.model_name,
            }
        elif gemini_input == "pymupdf-evidence":
            extraction_result = await extract_statement_with_gemini_evidence(
                dict(prepared["pdf_evidence"]),
                model=agent_model,
                prompt_id=prompt.id,
            )
            raw = StatementExtractionOutput.model_validate(
                extraction_result.raw_extraction.model_dump()
            )
            usage = {"extraction": _dataclass_dict(extraction_result.usage)}
            prompt_identity = {
                "prompt_id": extraction_result.prompt_id,
                "prompt_version": extraction_result.prompt_version,
                "model_name": extraction_result.model_name,
            }
        else:
            extraction_result = await extract_statement_with_gemini(
                bytes(prepared["provider_pdf_bytes"]),
                model=agent_model,
                prompt_id=prompt.id,
            )
            raw = StatementExtractionOutput.model_validate(
                extraction_result.raw_extraction.model_dump()
            )
            usage = {"extraction": _dataclass_dict(extraction_result.usage)}
            prompt_identity = {
                "prompt_id": extraction_result.prompt_id,
                "prompt_version": extraction_result.prompt_version,
                "model_name": extraction_result.model_name,
            }
    except ModelHTTPError as exc:
        return _write_packet(
            _provider_error_packet(base, exc),
            results_root=results_root,
            run_id=run_id,
            artifact_dir=artifact_dir,
        )
    except Exception as exc:  # noqa: BLE001 - prompt-lab must persist provider failure packets.
        return _write_packet(
            _provider_error_packet(base, exc),
            results_root=results_root,
            run_id=run_id,
            artifact_dir=artifact_dir,
        )

    raw_payload = {
        "document_type": "credit_card_statement",
        "provider": "gemini",
        "input_mode": gemini_input,
        "extraction": raw.model_dump(mode="json"),
        "prompt_identity": prompt_identity,
    }
    cache_payload = {
        "raw_output": raw_payload,
        "usage": usage,
        "prompt_identity": raw_payload["prompt_identity"],
        "gemini_input_mode": gemini_input,
        "pdf_evidence_summary": _pdf_evidence_summary(prepared["pdf_evidence"]),
        "compact_evidence_summary": _compact_evidence_summary(prepared["compact_evidence"]),
        "compact_provider_evidence_summary": _compact_evidence_summary(
            prepared["compact_provider_evidence"]
        ),
        "layout_profile": base.get("layout_profile"),
        "profile_application": base.get("profile_application"),
        "schema_version": "statement-prompt-lab.v1",
    }
    cache_path = write_statement_cache(cache_key, cache_payload)
    cache_payload["statement_cache_path"] = str(cache_path)
    processed = coalesce_statement_output(
        raw,
        issuer_hint=case.issuer,
        prompt_id=prompt.id,
        model_name=agent_model,
        page_count=prepared["page_count"],
    )
    packet = await _write_completed_packet(
        base,
        raw=raw,
        processed=processed,
        usage=usage,
        status=None,
        evidence_label="statement-prompt-lab-ai-quality",
        results_root=results_root,
        run_id=run_id,
        artifact_dir=artifact_dir,
        expected=expected,
        transaction_scope_firebase_uid=transaction_scope_firebase_uid,
        source="gemini_provider_output",
    )
    packet["statement_cache_path"] = str(cache_path)
    return packet


def _prepare_pdf_input(
    case: StatementCase,
    *,
    credentials_root: Path | None,
) -> dict[str, Any]:
    raw_bytes = case.pdf_path.read_bytes()
    raw_hash = sha256_bytes(raw_bytes)
    local_password = _password_for_case(case, credentials_root)
    metadata = inspect_pdf(case.pdf_path, password=local_password)
    payload: dict[str, Any] = {
        "case_id": case.id,
        "issuer": case.issuer,
        "filename": case.pdf_path.name,
        "relative_path": case.relative_path,
        "raw_pdf_sha256": raw_hash,
        "provider_pdf_sha256": raw_hash,
        "size_bytes": len(raw_bytes),
        "provider_size_bytes": len(raw_bytes),
        "page_count": metadata.page_count,
        "is_encrypted": metadata.is_encrypted,
        "password_source_exists": bool(local_password),
        "status": metadata.status,
        "decrypted_for_provider": False,
        "provider_pdf_bytes": raw_bytes,
    }
    if metadata.status != "readable":
        payload["provider_pdf_bytes"] = b""
        payload["provider_pdf_sha256"] = ""
        payload["provider_size_bytes"] = 0
        return payload
    if metadata.is_encrypted:
        decrypted = _decrypt_pdf_bytes(case.pdf_path, local_password or "")
        payload["provider_pdf_bytes"] = decrypted
        payload["provider_pdf_sha256"] = sha256_bytes(decrypted)
        payload["provider_size_bytes"] = len(decrypted)
        payload["decrypted_for_provider"] = True
    return payload


def _decrypt_pdf_bytes(path: Path, password: str) -> bytes:
    reader = PdfReader(str(path))
    reader.decrypt(password)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def _password_for_case(case: StatementCase, credentials_root: Path | None) -> str | None:
    if credentials_root is not None:
        return load_issuer_password(credentials_root.expanduser().resolve() / case.issuer)
    return load_issuer_password(case.pdf_path.parent)


async def _write_completed_packet(
    packet: dict[str, Any],
    *,
    raw: StatementExtractionOutput | None,
    processed: StatementExtractionOutput | None,
    usage: dict[str, dict[str, Any]],
    status: str | None,
    evidence_label: str,
    results_root: Path,
    run_id: str | None,
    artifact_dir: Path | None,
    expected: StatementExtractionOutput | None,
    transaction_scope_firebase_uid: str | None,
    source: str,
) -> dict[str, Any]:
    score = _score_packet(expected=expected, actual=processed, status=status)
    if status is None:
        status = "completed" if score.get("passed") else "threshold-failed"
    transactions, db_snapshot = await _load_receipt_transactions_snapshot(
        transaction_scope_firebase_uid=transaction_scope_firebase_uid
    )
    reconciliation = (
        _simulate_reconciliation(
            processed,
            _transactions_for_case(
                base_transactions=transactions,
                output=processed,
                case_id=str(packet["case_id"]),
                fixture="none",
            ),
        )
        if processed is not None
        else _empty_reconciliation(db_snapshot)
    )
    packet.update(
        {
            "status": status,
            "evidence_label": evidence_label,
            "raw_output": _raw_output(raw=raw, status=status, source=source),
            "processed_output": _processed_output(processed=processed, status=status),
            "field_provenance": build_statement_field_provenance(
                raw=raw,
                processed=processed,
                source=source,
            ),
            "score": score,
            "reconciliation": reconciliation,
            "payload_examples": reconciliation["payload_examples"],
            "cost_summary": build_cost_summary(
                model_name=str(packet["prompt_identity"]["model_name"]),
                usage=usage,
            ),
            "database": db_snapshot,
            "failure_owner": _failure_owner(status=status, score=score),
        }
    )
    return _write_packet(
        packet,
        results_root=results_root,
        run_id=run_id,
        artifact_dir=artifact_dir,
    )


def _base_packet(
    case: StatementCase,
    *,
    prompt_id: str,
    prompt_version: str,
    prompt_hash: str,
    model_name: str,
    agent_model: str,
    statement_cache_key: str,
    gemini_input_mode: str,
    pdf_evidence: dict[str, Any] | None,
    compact_evidence: dict[str, Any] | None,
    compact_provider_evidence: dict[str, Any] | None,
    pdf_input: dict[str, Any],
    expected_path: str | None,
    status: str,
) -> dict[str, Any]:
    return {
        "case_id": case.id,
        "issuer": case.issuer,
        "case_pdf": str(case.pdf_path),
        "expected_path": expected_path,
        "baseline_status": case.baseline_status,
        "document_type": "credit_card_statement",
        "model": model_name,
        "prompt_identity": {
            "prompt_id": prompt_id,
            "prompt_version": prompt_version,
            "prompt_hash": prompt_hash,
            "model_name": agent_model,
        },
        "statement_cache_key": statement_cache_key,
        "gemini_input_mode": gemini_input_mode,
        "pdf_evidence": pdf_evidence,
        "pdf_evidence_summary": _pdf_evidence_summary(pdf_evidence),
        "compact_evidence": compact_evidence,
        "compact_evidence_summary": _compact_evidence_summary(compact_evidence),
        "compact_provider_evidence": compact_provider_evidence,
        "compact_provider_evidence_summary": _compact_evidence_summary(compact_provider_evidence),
        "pdf_input": pdf_input,
        "status": status,
        "generated_at": datetime.now(UTC).isoformat(),
        "runtime_equivalent": False,
        "runtime_evidence_note": (
            "Statement prompt-lab evidence is provider-quality evidence only; "
            "staging-e2e runtime and S23 gates remain separate."
        ),
    }


def _provider_error_packet(packet: dict[str, Any], error: Exception) -> dict[str, Any]:
    provider_error: dict[str, Any] = {
        "stage": "statement_extraction",
        "error_type": type(error).__name__,
        "message": str(error),
    }
    if isinstance(error, ModelHTTPError):
        provider_error.update(
            {
                "status_code": error.status_code,
                "model_name": error.model_name,
                "body": error.body,
            }
        )
    packet.update(
        {
            "status": "provider-error",
            "evidence_label": "statement-prompt-lab-provider-error",
            "provider_error": provider_error,
            "raw_output": {
                "document_type": "credit_card_statement",
                "provider": "gemini",
                "provider_call": "failed",
                "error": provider_error,
            },
            "processed_output": {
                "document_type": "credit_card_statement",
                "normalization_stage": "not_run",
                "statement_extraction": None,
            },
            "field_provenance": build_statement_field_provenance(
                raw=None,
                processed=None,
                source="provider_error",
            ),
            "cost_summary": build_cost_summary(
                model_name=str(packet["prompt_identity"]["model_name"]),
                usage={},
            ),
            "score": {
                "passed": False,
                "failure_owner": "provider",
                "reason": "provider_error",
            },
            "reconciliation": _empty_reconciliation({}),
            "payload_examples": _empty_payload_examples(),
            "failure_owner": "provider",
        }
    )
    return packet


def _status_output(case: StatementCase, prepared: dict[str, Any]) -> StatementExtractionOutput:
    pdf_status = prepared["status"]
    if pdf_status == "insufficient_text_layer":
        pdf_status = "extraction_failed"
    return StatementExtractionOutput(
        pdf_status=pdf_status,
        statement=StatementInfo(issuer=case.issuer),
        lines=[],
        processing=StatementProcessingMetadata(
            provider="gemini",
            prompt_id=settings.statement_extraction_prompt_id,
            model_name=None,
            page_count=prepared["page_count"],
            warnings=[str(prepared["status"])],
        ),
    )


def _load_expected(case: StatementCase) -> StatementExtractionOutput | None:
    if case.expected_path is None or not case.expected_path.exists():
        return None
    return StatementExtractionOutput.model_validate_json(
        case.expected_path.read_text(encoding="utf-8")
    )


def _score_packet(
    *,
    expected: StatementExtractionOutput | None,
    actual: StatementExtractionOutput | None,
    status: str | None,
) -> dict[str, Any]:
    if expected is None:
        return {
            "passed": False,
            "reason": "missing_expected_fixture",
            "failure_owner": "expected_fixture_gap",
        }
    if actual is None:
        return {
            "passed": False,
            "reason": status or "no_processed_output",
            "failure_owner": _failure_owner(status=status or "no_processed_output", score={}),
        }
    score = score_statement_output(expected=expected, actual=actual)
    score["differences"] = _line_differences(expected=expected, actual=actual)
    score["failure_owner"] = _failure_owner(status=status or "completed", score=score)
    return score


def _raw_output(
    *,
    raw: StatementExtractionOutput | None,
    status: str,
    source: str,
) -> dict[str, Any]:
    if raw is None:
        return {
            "document_type": "credit_card_statement",
            "provider": "gemini",
            "provider_call": "skipped",
            "status": status,
            "source": source,
        }
    return {
        "document_type": "credit_card_statement",
        "provider": "gemini",
        "provider_call": "completed",
        "source": source,
        "extraction": raw.model_dump(mode="json"),
    }


def _processed_output(
    *,
    processed: StatementExtractionOutput | None,
    status: str,
) -> dict[str, Any]:
    return {
        "document_type": "credit_card_statement",
        "normalization_stage": "statement_coalesce_v1" if processed is not None else "not_run",
        "status": status,
        "statement_extraction": processed.model_dump(mode="json") if processed else None,
        "coalesce": {
            "status": "completed" if processed is not None else "skipped",
            "candidate_transactions_created": False,
        },
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
        "payload_examples": _empty_payload_examples(),
        "coverage_ratio": 0.0,
        "line_outcomes": [],
        "receipt_only": [],
        "ignored_receipts_out_of_window": [],
    }


def _empty_payload_examples() -> dict[str, list[dict[str, Any]]]:
    return {
        "matched": [],
        "statement_only": [],
        "receipt_only": [],
        "ambiguous": [],
        "failed": [],
        "manual_review": [],
    }


def _failure_owner(*, status: str, score: dict[str, Any]) -> str | None:
    if score.get("passed"):
        return None
    if status == "provider-error":
        return "provider"
    if status in {"password_required", "password_invalid", "extraction_failed"}:
        return "pdf_or_credential"
    if score.get("reason") == "missing_expected_fixture":
        return "expected_fixture_gap"
    differences = score.get("differences", {})
    if isinstance(differences, dict) and differences.get("line_count_delta"):
        return "prompt_or_provider"
    if status in {"dry-run", "missing-cache"}:
        return "not_provider_quality_evidence"
    return "prompt_or_coalesce"


def _write_packet(
    packet: dict[str, Any],
    *,
    results_root: Path,
    run_id: str | None,
    artifact_dir: Path | None = None,
) -> dict[str, Any]:
    prompt_id = str(packet.get("prompt_identity", {}).get("prompt_id") or "statement-extraction")
    if artifact_dir is None:
        batch_parent = results_root / "statements" / "gemini" / prompt_id
        batch_run_id = _slug(
            run_id or next_serial_run_id(batch_parent, f"statement-gemini-{packet['case_id']}")
        )
        packet_dir = batch_parent / batch_run_id / _slug(str(packet["case_id"]))
    else:
        batch_run_id = _slug(run_id or artifact_dir.name)
        packet_dir = artifact_dir
    packet_dir.mkdir(parents=True, exist_ok=True)
    packet["artifact_layout"] = "statement-gemini-run-folder-v1"
    packet["batch_run_id"] = batch_run_id
    packet["artifact_dir"] = str(packet_dir)

    _write_artifact(packet, packet_dir, "pdf_input", "pdf_input.json")
    _write_artifact(packet, packet_dir, "pdf_evidence", "pdf_evidence.json")
    _write_artifact(packet, packet_dir, "compact_evidence", "compact_evidence.json")
    _write_artifact(
        packet,
        packet_dir,
        "compact_provider_evidence",
        "compact_provider_evidence.json",
    )
    _write_artifact(packet, packet_dir, "layout_profile", "layout_profile.json")
    _write_artifact(packet, packet_dir, "profile_application", "profile_application.json")
    _write_artifact(packet, packet_dir, "unresolved_rows", "unresolved_rows.json")
    _write_artifact(packet, packet_dir, "raw_output", "raw_output.json")
    _write_artifact(packet, packet_dir, "processed_output", "processed_output.json")
    _write_artifact(packet, packet_dir, "field_provenance", "field_provenance.json")
    _write_artifact(packet, packet_dir, "score", "score.json")
    _write_artifact(packet, packet_dir, "reconciliation", "reconciliation.json")
    _write_artifact(packet, packet_dir, "payload_examples", "payload_examples.json")
    _write_artifact(packet, packet_dir, "cost_summary", "cost_summary.json")

    manifest_path = packet_dir / "manifest.json"
    packet["manifest_path"] = str(manifest_path)
    manifest_path.write_text(
        json.dumps(packet, indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )
    return packet


def _write_artifact(packet: dict[str, Any], packet_dir: Path, key: str, filename: str) -> None:
    if key not in packet:
        return
    path = packet_dir / filename
    path.write_text(
        json.dumps(packet[key], indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )
    packet[f"{key}_path"] = str(path)


def _sanitized_pdf_input(prepared: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in prepared.items()
        if key
        not in {
            "provider_pdf_bytes",
            "pdf_evidence",
            "compact_evidence",
            "compact_profile_evidence",
            "compact_provider_evidence",
        }
    }


def _pdf_evidence_summary(evidence: dict[str, Any] | None) -> dict[str, Any] | None:
    if evidence is None:
        return None
    return {
        "schema_version": evidence.get("schema_version"),
        "input_mode": evidence.get("input_mode"),
        "status": evidence.get("status"),
        "page_count": evidence.get("page_count"),
        "raw_text_sha256": evidence.get("raw_text_sha256"),
        "text_char_count": evidence.get("text_char_count"),
        "text_line_count": evidence.get("text_line_count"),
        "word_count": evidence.get("word_count"),
        "row_count": evidence.get("row_count"),
        "warnings": evidence.get("warnings", []),
    }


def _compact_evidence_summary(evidence: dict[str, Any] | None) -> dict[str, Any] | None:
    if evidence is None:
        return None
    return {
        "schema_version": evidence.get("schema_version"),
        "input_mode": evidence.get("input_mode"),
        "status": evidence.get("status"),
        "page_count": evidence.get("page_count"),
        "raw_text_sha256": evidence.get("raw_text_sha256"),
        "text_char_count": evidence.get("text_char_count"),
        "text_line_count": evidence.get("text_line_count"),
        "row_count": evidence.get("row_count"),
        "candidate_row_count": evidence.get("candidate_row_count"),
        "provider_row_count": evidence.get("provider_row_count"),
        "compact_evidence_sha256": sha256_bytes(
            json.dumps(evidence, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ),
        "warnings": evidence.get("warnings", []),
    }


def _legacy_v1_compact_evidence_hash(evidence: dict[str, Any]) -> str:
    legacy = _legacy_v1_profile_rows_provider_payload(evidence)
    return sha256_bytes(json.dumps(legacy, sort_keys=True, ensure_ascii=False).encode("utf-8"))


def _legacy_v1_profile_rows_provider_payload(evidence: dict[str, Any]) -> dict[str, Any]:
    legacy = dict(evidence)
    legacy["schema_version"] = "statement-compact-evidence.v1"
    return legacy


def _prompt_for_input_mode(*, gemini_input: str, prompt_id: str | None) -> PromptDefinition:
    if gemini_input == "profile-rows":
        return get_prompt(
            settings.statement_layout_profile_prompt_id,
            kind="statement-layout-profile",
        )
    return get_prompt(
        prompt_id or settings.statement_extraction_prompt_id,
        kind="statement-extraction",
    )


def _dataclass_dict(value: object) -> dict[str, Any]:
    return dict(value.__dict__)


def _agent_model(model_name: str) -> str:
    if ":" in model_name:
        return model_name
    return f"google-gla:{model_name}"


def _slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "case"


def _json_default(value: object) -> str:
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")
