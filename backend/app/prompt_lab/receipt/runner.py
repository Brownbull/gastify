"""Prompt lab execution path using production scan components."""

from __future__ import annotations

import json
import mimetypes
import re
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Literal

from pydantic_ai.exceptions import ModelHTTPError

from app.agents.categorization import categorize_items
from app.agents.extraction import extract_receipt
from app.config import settings
from app.prompt_lab.cache import (
    build_processed_cache_key,
    build_raw_cache_key,
    read_cache,
    sha256_bytes,
    write_cache,
)
from app.prompt_lab.costs import build_cost_summary
from app.prompt_lab.paths import LATEST_RESULTS_ROOT, ensure_workspace
from app.prompt_lab.receipt.adapter import load_expected_receipt
from app.prompt_lab.receipt.provenance import build_field_provenance
from app.prompt_lab.receipt.scoring import score_prompt_run
from app.prompt_lab.run_ids import next_serial_run_id
from app.schemas.scan import (
    CategorizationResult,
    GeminiExtractionResult,
    MathReconciliationVerdict,
    RawGeminiExtractionResult,
)
from app.services.coalesce import coalesce_extraction
from app.services.image import compress_receipt_image
from app.services.math_gate import reconcile

if TYPE_CHECKING:
    from pathlib import Path

    from app.prompt_lab.receipt.adapter import ExpectedReceipt
    from app.prompt_lab.receipt.cases import PromptCase

PromptLabStage = Literal["raw", "processed", "both"]


def prepare_image(case: PromptCase, *, raw_image: bool = False) -> tuple[bytes, str, bytes, str]:
    raw_bytes = case.image_path.read_bytes()
    if raw_image:
        content_type = mimetypes.guess_type(case.image_path.name)[0] or "application/octet-stream"
        return raw_bytes, content_type, raw_bytes, content_type
    compressed = compress_receipt_image(raw_bytes)
    return (
        raw_bytes,
        mimetypes.guess_type(case.image_path.name)[0] or "image/jpeg",
        (compressed.main.data),
        compressed.main.content_type,
    )


async def run_case(
    case: PromptCase,
    *,
    environment: str = "local",
    extraction_prompt_id: str | None = None,
    categorization_prompt_id: str | None = None,
    model: str | None = None,
    live: bool = False,
    cache_only: bool = False,
    bypass_cache: bool = False,
    raw_image: bool = False,
    stage: PromptLabStage = "both",
    postprocess: bool = True,
    results_root: Path = LATEST_RESULTS_ROOT,
    run_id: str | None = None,
) -> dict[str, Any]:
    """Run one prompt case and write a result manifest packet."""
    ensure_workspace()
    extraction_prompt_id = extraction_prompt_id or settings.receipt_extraction_prompt_id
    categorization_prompt_id = categorization_prompt_id or settings.item_categorization_prompt_id
    model_name = model or settings.gemini_model
    raw_bytes, raw_content_type, processed_bytes, processed_content_type = prepare_image(
        case,
        raw_image=raw_image,
    )
    expected = _load_expected(case)
    raw_image_hash = sha256_bytes(raw_bytes)
    processed_image_hash = sha256_bytes(processed_bytes)
    scan_context = expected.scan_context if expected else {}
    raw_cache_key = build_raw_cache_key(
        raw_image_hash=raw_image_hash,
        processed_image_hash=processed_image_hash,
        model=model_name,
        extraction_prompt_id=extraction_prompt_id,
        scan_context=scan_context,
    )
    processed_cache_key = build_processed_cache_key(
        raw_image_hash=raw_image_hash,
        processed_image_hash=processed_image_hash,
        model=model_name,
        extraction_prompt_id=extraction_prompt_id,
        categorization_prompt_id=categorization_prompt_id,
        scan_context=scan_context,
    )

    if not bypass_cache:
        processed_cached = read_cache(processed_cache_key)
        if processed_cached is not None and postprocess and stage != "raw":
            packet = _packet_from_processed_cache(
                case,
                processed_cached,
                environment=environment,
                raw_cache_key=raw_cache_key,
                processed_cache_key=processed_cache_key,
                model_name=model_name,
                raw_image=raw_image,
            )
            return _write_manifest(packet, results_root=results_root, run_id=run_id)

        raw_cached = read_cache(raw_cache_key)
        if raw_cached is not None:
            return await _packet_from_raw_cache(
                case,
                raw_cached,
                environment=environment,
                raw_cache_key=raw_cache_key,
                processed_cache_key=processed_cache_key,
                model_name=model_name,
                extraction_prompt_id=extraction_prompt_id,
                categorization_prompt_id=categorization_prompt_id,
                raw_image=raw_image,
                expected=expected,
                stage=stage,
                postprocess=postprocess,
                cache_only=cache_only,
                results_root=results_root,
                run_id=run_id,
            )

    if cache_only:
        packet = _base_packet(
            case,
            environment=environment,
            raw_cache_key=raw_cache_key,
            processed_cache_key=processed_cache_key,
            model_name=model_name,
            extraction_prompt_id=extraction_prompt_id,
            categorization_prompt_id=categorization_prompt_id,
            raw_image=raw_image,
            status="missing-cache",
        )
        packet["evidence_label"] = "prompt-lab-cache-miss"
        return _write_manifest(packet, results_root=results_root, run_id=run_id)

    if not live:
        packet = _base_packet(
            case,
            environment=environment,
            raw_cache_key=raw_cache_key,
            processed_cache_key=processed_cache_key,
            model_name=model_name,
            extraction_prompt_id=extraction_prompt_id,
            categorization_prompt_id=categorization_prompt_id,
            raw_image=raw_image,
            status="dry-run",
        )
        packet["image"] = {
            "raw_content_type": raw_content_type,
            "processed_content_type": processed_content_type,
            "raw_size_bytes": len(raw_bytes),
            "processed_size_bytes": len(processed_bytes),
        }
        packet["evidence_label"] = "prompt-lab-render-only"
        return _write_manifest(packet, results_root=results_root, run_id=run_id)

    agent_model = _agent_model(model_name)
    try:
        extraction = await extract_receipt(
            processed_bytes,
            processed_content_type,
            model=agent_model,
            prompt_id=extraction_prompt_id,
        )
    except ModelHTTPError as exc:
        return _write_manifest(
            _packet_from_provider_error(
                case,
                exc,
                environment=environment,
                raw_cache_key=raw_cache_key,
                processed_cache_key=processed_cache_key,
                model_name=model_name,
                extraction_prompt_id=extraction_prompt_id,
                categorization_prompt_id=categorization_prompt_id,
                raw_image=raw_image,
                stage_name="extraction",
            ),
            results_root=results_root,
            run_id=run_id,
        )
    raw_extraction = RawGeminiExtractionResult.model_validate(
        (extraction.raw_extraction or extraction.extraction).model_dump()
    )
    raw_payload = {
        "raw_output": {"extraction": raw_extraction.model_dump(mode="json")},
        "usage": {"extraction": _dataclass_dict(extraction.usage)},
        "prompt_identity": {
            "extraction_prompt_id": extraction.prompt_id,
            "extraction_prompt_version": extraction.prompt_version,
            "model_name": agent_model,
        },
    }
    raw_cache_path = write_cache(raw_cache_key, raw_payload)

    if not postprocess or stage == "raw":
        raw_usage = {"extraction": _dataclass_dict(extraction.usage)}
        packet = _base_packet(
            case,
            environment=environment,
            raw_cache_key=raw_cache_key,
            processed_cache_key=processed_cache_key,
            model_name=model_name,
            extraction_prompt_id=extraction_prompt_id,
            categorization_prompt_id=categorization_prompt_id,
            raw_image=raw_image,
            status="raw-completed",
        )
        packet.update(raw_payload)
        packet["field_provenance"] = build_field_provenance(
            raw_extraction=raw_extraction,
            processed_extraction=None,
        )
        packet["cost_summary"] = build_cost_summary(
            model_name=agent_model,
            usage=raw_usage,
        )
        packet["raw_cache_path"] = str(raw_cache_path)
        packet["evidence_label"] = "prompt-lab-ai-quality-raw"
        return _write_manifest(packet, results_root=results_root, run_id=run_id)

    try:
        categorization = await categorize_items(
            extraction.extraction.line_items,
            extraction.extraction.merchant_name,
            extraction.extraction.currency_code,
            model=agent_model,
            prompt_id=categorization_prompt_id,
        )
    except ModelHTTPError as exc:
        packet = _packet_from_provider_error(
            case,
            exc,
            environment=environment,
            raw_cache_key=raw_cache_key,
            processed_cache_key=processed_cache_key,
            model_name=model_name,
            extraction_prompt_id=extraction_prompt_id,
            categorization_prompt_id=categorization_prompt_id,
            raw_image=raw_image,
            stage_name="categorization",
        )
        packet.update(raw_payload)
        packet["field_provenance"] = build_field_provenance(
            raw_extraction=raw_extraction,
            processed_extraction=None,
        )
        packet["cost_summary"] = build_cost_summary(
            model_name=agent_model,
            usage={"extraction": _dataclass_dict(extraction.usage)},
        )
        packet["raw_cache_path"] = str(raw_cache_path)
        return _write_manifest(packet, results_root=results_root, run_id=run_id)
    verdict = reconcile(extraction.extraction)
    score = score_prompt_run(
        expected=expected,
        extraction=extraction.extraction,
        categorization=categorization.result,
        verdict=verdict,
        raw_extraction=raw_extraction,
    )
    score_dict = score.to_dict()
    usage_payload = {
        "extraction": _dataclass_dict(extraction.usage),
        "categorization": _dataclass_dict(categorization.usage),
    }
    processed_payload = {
        "raw_output": raw_payload["raw_output"],
        "processed_output": {
            "extraction": extraction.extraction.model_dump(mode="json"),
            "categorization": categorization.result.model_dump(mode="json"),
            "verdict": verdict.model_dump(mode="json"),
        },
        "usage": usage_payload,
        "prompt_identity": {
            "extraction_prompt_id": extraction.prompt_id,
            "extraction_prompt_version": extraction.prompt_version,
            "categorization_prompt_id": categorization.prompt_id,
            "categorization_prompt_version": categorization.prompt_version,
            "model_name": agent_model,
        },
        "score": score_dict,
        "field_provenance": build_field_provenance(
            raw_extraction=raw_extraction,
            processed_extraction=extraction.extraction,
            categorization=categorization.result,
            verdict=verdict,
            score=score_dict,
        ),
        "cost_summary": build_cost_summary(
            model_name=agent_model,
            usage=usage_payload,
        ),
    }
    processed_cache_path = write_cache(processed_cache_key, processed_payload)
    packet = _base_packet(
        case,
        environment=environment,
        raw_cache_key=raw_cache_key,
        processed_cache_key=processed_cache_key,
        model_name=model_name,
        extraction_prompt_id=extraction_prompt_id,
        categorization_prompt_id=categorization_prompt_id,
        raw_image=raw_image,
        status="completed" if score.passed else "threshold-failed",
    )
    packet.update(processed_payload)
    packet["raw_cache_path"] = str(raw_cache_path)
    packet["processed_cache_path"] = str(processed_cache_path)
    packet["evidence_label"] = "prompt-lab-ai-quality"
    return _write_manifest(packet, results_root=results_root, run_id=run_id)


async def _packet_from_raw_cache(
    case: PromptCase,
    cached: dict[str, Any],
    *,
    environment: str,
    raw_cache_key: str,
    processed_cache_key: str,
    model_name: str,
    extraction_prompt_id: str,
    categorization_prompt_id: str,
    raw_image: bool,
    expected: ExpectedReceipt | None,
    stage: PromptLabStage,
    postprocess: bool,
    cache_only: bool,
    results_root: Path,
    run_id: str | None,
) -> dict[str, Any]:
    raw_extraction = RawGeminiExtractionResult.model_validate(
        cached.get("raw_output", {})["extraction"]
    )
    packet = _base_packet(
        case,
        environment=environment,
        raw_cache_key=raw_cache_key,
        processed_cache_key=processed_cache_key,
        model_name=model_name,
        extraction_prompt_id=extraction_prompt_id,
        categorization_prompt_id=categorization_prompt_id,
        raw_image=raw_image,
        status="raw-completed-from-cache",
    )
    packet.update(cached)
    packet["evidence_label"] = "prompt-lab-ai-quality-raw-cached"

    if not postprocess or stage == "raw":
        return _write_manifest(packet, results_root=results_root, run_id=run_id)

    processed = coalesce_extraction(raw_extraction)
    if cache_only:
        categorization = CategorizationResult(assignments=[])
        categorization_usage: dict[str, int | float] = {
            "input_tokens": 0,
            "output_tokens": 0,
            "latency_ms": 0,
        }
    else:
        agent_model = _agent_model(model_name)
        try:
            categorization_output = await categorize_items(
                processed.line_items,
                processed.merchant_name,
                processed.currency_code,
                model=agent_model,
                prompt_id=categorization_prompt_id,
            )
        except ModelHTTPError as exc:
            packet = _packet_from_provider_error(
                case,
                exc,
                environment=environment,
                raw_cache_key=raw_cache_key,
                processed_cache_key=processed_cache_key,
                model_name=model_name,
                extraction_prompt_id=extraction_prompt_id,
                categorization_prompt_id=categorization_prompt_id,
                raw_image=raw_image,
                stage_name="categorization",
            )
            packet.update(cached)
            return _write_manifest(packet, results_root=results_root, run_id=run_id)
        categorization = categorization_output.result
        categorization_usage = _dataclass_dict(categorization_output.usage)
    verdict = reconcile(processed)
    score = score_prompt_run(
        expected=expected,
        extraction=processed,
        categorization=categorization,
        verdict=verdict,
        raw_extraction=raw_extraction,
    )
    score_dict = score.to_dict()
    usage_payload = {
        **dict(cached.get("usage", {})),
        "categorization": categorization_usage,
    }
    processed_payload = {
        "processed_output": {
            "extraction": processed.model_dump(mode="json"),
            "categorization": categorization.model_dump(mode="json"),
            "verdict": verdict.model_dump(mode="json"),
        },
        "usage": usage_payload,
        "score": score_dict,
        "field_provenance": build_field_provenance(
            raw_extraction=raw_extraction,
            processed_extraction=processed,
            categorization=categorization,
            verdict=verdict,
            score=score_dict,
        ),
        "cost_summary": build_cost_summary(
            model_name=_agent_model(model_name),
            usage=usage_payload,
        ),
    }
    packet.update(processed_payload)
    if cache_only:
        packet["processed_replay_cacheable"] = False
    else:
        processed_cache_path = write_cache(processed_cache_key, {**cached, **processed_payload})
        packet["processed_cache_path"] = str(processed_cache_path)
    packet["status"] = (
        "completed-from-raw-cache" if score.passed else "threshold-failed-from-raw-cache"
    )
    packet["evidence_label"] = "prompt-lab-ai-quality-processed-from-raw-cache"
    return _write_manifest(packet, results_root=results_root, run_id=run_id)


def _packet_from_processed_cache(
    case: PromptCase,
    cached: dict[str, Any],
    *,
    environment: str,
    raw_cache_key: str,
    processed_cache_key: str,
    model_name: str,
    raw_image: bool,
) -> dict[str, Any]:
    normalized = cached["processed_output"]
    extraction = GeminiExtractionResult.model_validate(normalized["extraction"])
    categorization = CategorizationResult.model_validate(normalized["categorization"])
    verdict = MathReconciliationVerdict.model_validate(normalized["verdict"])
    raw_payload = cached.get("raw_output", {}).get("extraction")
    raw_extraction = RawGeminiExtractionResult.model_validate(raw_payload) if raw_payload else None
    score = score_prompt_run(
        expected=_load_expected(case),
        extraction=extraction,
        categorization=categorization,
        verdict=verdict,
        raw_extraction=raw_extraction,
    )
    packet = _base_packet(
        case,
        environment=environment,
        raw_cache_key=raw_cache_key,
        processed_cache_key=processed_cache_key,
        model_name=model_name,
        extraction_prompt_id=cached.get("prompt_identity", {}).get(
            "extraction_prompt_id",
            settings.receipt_extraction_prompt_id,
        ),
        categorization_prompt_id=cached.get("prompt_identity", {}).get(
            "categorization_prompt_id",
            settings.item_categorization_prompt_id,
        ),
        raw_image=raw_image,
        status="completed-from-cache" if score.passed else "threshold-failed-from-cache",
    )
    packet.update(cached)
    packet["score"] = score.to_dict()
    if "field_provenance" not in packet and raw_payload:
        packet["field_provenance"] = build_field_provenance(
            raw_extraction=raw_extraction,
            processed_extraction=extraction,
            categorization=categorization,
            verdict=verdict,
            score=packet["score"],
        )
    if "cost_summary" not in packet:
        packet["cost_summary"] = build_cost_summary(
            model_name=_agent_model(model_name),
            usage=dict(cached.get("usage", {})),
        )
    packet["evidence_label"] = "prompt-lab-ai-quality-cached"
    return packet


def _load_expected(case: PromptCase) -> ExpectedReceipt | None:
    if case.baseline_path is None:
        return None
    return load_expected_receipt(case.baseline_path, case_id=case.id)


def _packet_from_provider_error(
    case: PromptCase,
    error: ModelHTTPError,
    *,
    environment: str,
    raw_cache_key: str,
    processed_cache_key: str,
    model_name: str,
    extraction_prompt_id: str,
    categorization_prompt_id: str,
    raw_image: bool,
    stage_name: str,
) -> dict[str, Any]:
    packet = _base_packet(
        case,
        environment=environment,
        raw_cache_key=raw_cache_key,
        processed_cache_key=processed_cache_key,
        model_name=model_name,
        extraction_prompt_id=extraction_prompt_id,
        categorization_prompt_id=categorization_prompt_id,
        raw_image=raw_image,
        status="provider-error",
    )
    packet["evidence_label"] = "prompt-lab-provider-error"
    packet["provider_error"] = {
        "stage": stage_name,
        "status_code": error.status_code,
        "model_name": error.model_name,
        "body": error.body,
    }
    return packet


def _base_packet(
    case: PromptCase,
    *,
    environment: str,
    raw_cache_key: str,
    processed_cache_key: str,
    model_name: str,
    extraction_prompt_id: str,
    categorization_prompt_id: str,
    raw_image: bool,
    status: str,
) -> dict[str, Any]:
    return {
        "case_id": case.id,
        "case_image": str(case.image_path),
        "baseline_path": str(case.baseline_path) if case.baseline_path else None,
        "baseline_status": case.baseline_status,
        "document_type": "receipt",
        "environment": environment,
        "model": model_name,
        "prompt_identity": {
            "extraction_prompt_id": extraction_prompt_id,
            "categorization_prompt_id": categorization_prompt_id,
            "model_name": model_name,
        },
        "raw_cache_key": raw_cache_key,
        "processed_cache_key": processed_cache_key,
        "raw_image_mode": raw_image,
        "runtime_equivalent": not raw_image,
        "status": status,
        "generated_at": datetime.now(UTC).isoformat(),
        "runtime_evidence_note": (
            "Prompt lab evidence is AI-quality evidence only; S23 staging proof remains required."
        ),
    }


def _write_manifest(
    packet: dict[str, Any],
    *,
    results_root: Path,
    run_id: str | None = None,
) -> dict[str, Any]:
    prompt_id = packet.get("prompt_identity", {}).get("extraction_prompt_id")
    if not prompt_id:
        prompt_id = settings.receipt_extraction_prompt_id
    prompt_root = results_root / packet["environment"] / prompt_id
    if run_id:
        batch_run_id = _slug(run_id)
        packet["artifact_layout"] = "run-folder-v1"
        packet["batch_run_id"] = batch_run_id
        packet_dir = prompt_root / batch_run_id / _slug(packet["case_id"])
    else:
        case_run_id = next_serial_run_id(prompt_root, f"receipt-{packet['case_id']}")
        packet["artifact_layout"] = "legacy-flat-v1"
        packet_dir = prompt_root / case_run_id
    packet_dir.mkdir(parents=True, exist_ok=True)

    _write_optional_artifact(packet, packet_dir, "raw_output", "raw_output.json")
    _write_optional_artifact(packet, packet_dir, "processed_output", "processed_output.json")
    _write_optional_artifact(packet, packet_dir, "field_provenance", "field_provenance.json")
    _write_optional_artifact(packet, packet_dir, "cost_summary", "cost_summary.json")
    _write_optional_artifact(packet, packet_dir, "score", "score.json")

    manifest_path = packet_dir / "manifest.json"
    packet["artifact_dir"] = str(packet_dir)
    packet["manifest_path"] = str(manifest_path)
    manifest_path.write_text(
        json.dumps(packet, indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )
    return packet


def _write_optional_artifact(
    packet: dict[str, Any],
    packet_dir: Path,
    key: str,
    filename: str,
) -> None:
    if key not in packet:
        return
    path = packet_dir / filename
    path.write_text(
        json.dumps(packet[key], indent=2, sort_keys=True, default=_json_default),
        encoding="utf-8",
    )
    packet[f"{key}_path"] = str(path)


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
