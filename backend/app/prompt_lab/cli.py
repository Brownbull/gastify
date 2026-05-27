"""Prompt-lab CLI for receipt and statement lanes."""
# ruff: noqa: E402

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from app.env_files import load_backend_env_files

load_backend_env_files()

from app.config import settings
from app.prompt_lab.costs import estimate_cost_usd
from app.prompt_lab.paths import LATEST_RESULTS_ROOT
from app.prompt_lab.receipt.adapter import load_expected_receipt
from app.prompt_lab.receipt.batch_report import write_batch_report
from app.prompt_lab.receipt.cases import get_case, list_cases
from app.prompt_lab.receipt.import_legacy import import_legacy_cases
from app.prompt_lab.receipt.runner import run_case
from app.prompt_lab.run_ids import next_serial_run_id, slug_run_id
from app.prompt_lab.statement.batch_report import write_statement_batch_report
from app.prompt_lab.statement.cases import (
    extract_statement_text,
    get_statement_case,
    import_statement_corpus,
    list_statement_cases,
    write_statement_extraction_packet,
)
from app.prompt_lab.statement.deterministic import run_statement_deterministic_case
from app.prompt_lab.statement.fallback_calibration import run_statement_fallback_calibration
from app.prompt_lab.statement.report import write_statement_expected_report
from app.prompt_lab.statement.runner import run_statement_case
from app.prompt_lab.statement.seed_db import (
    DEFAULT_STATEMENT_SEED_FIREBASE_UID,
    DEFAULT_STATEMENT_SEED_PROFILE,
    seed_statement_lab_transactions,
)
from app.prompt_lab.statement.suite import (
    DEFAULT_STATEMENT_SUITE_APPROACHES,
    DEFAULT_STATEMENT_SUITE_CASE_IDS,
    run_statement_suite,
)
from app.prompts import get_prompt, prompt_text_hash


def main(argv: list[str] | None = None) -> int:
    parser = _parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except KeyError as exc:
        parser.exit(2, f"{exc}\n")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.prompt_lab")
    subparsers = parser.add_subparsers(required=True)

    import_parser = subparsers.add_parser("import-legacy")
    import_parser.add_argument("--source", required=True, type=Path)
    import_parser.add_argument("--force", action="store_true")
    import_parser.set_defaults(func=_import_legacy)

    list_parser = subparsers.add_parser("list-cases")
    list_parser.add_argument("--json", action="store_true")
    list_parser.set_defaults(func=_list_cases)

    statement_import_parser = subparsers.add_parser("statement-import")
    statement_import_parser.add_argument("--source", required=True, type=Path)
    statement_import_parser.add_argument("--force", action="store_true")
    statement_import_parser.set_defaults(func=_statement_import)

    statement_list_parser = subparsers.add_parser("statement-list")
    statement_list_parser.add_argument("--json", action="store_true")
    statement_list_parser.set_defaults(func=_statement_list)

    statement_extract_parser = subparsers.add_parser("statement-extract")
    statement_extract_parser.add_argument("--case", dest="case_id", required=True)
    statement_extract_parser.add_argument("--password")
    statement_extract_parser.add_argument("--credentials-root", type=Path)
    statement_extract_parser.add_argument(
        "--run-id",
        help=(
            "Group extraction artifacts under this folder. When omitted, a sortable "
            "YYYYMMDDTHHMMSSZ-001-label run id is generated."
        ),
    )
    statement_extract_parser.add_argument(
        "--no-source-text",
        action="store_true",
        help="Write only metadata, warnings, and text hashes; omit raw statement text.",
    )
    statement_extract_parser.set_defaults(func=_statement_extract)

    statement_report_parser = subparsers.add_parser("statement-report")
    statement_report_parser.add_argument(
        "--run-id",
        help=(
            "Write report under prompt-testing/results/latest/statements/<run-id>/. "
            "When omitted, a sortable YYYYMMDDTHHMMSSZ-001-label run id is generated."
        ),
    )
    statement_report_parser.add_argument("--credentials-root", type=Path)
    statement_report_parser.add_argument(
        "--actual-source",
        choices=["current", "mock-gemini", "live-gemini", "deterministic"],
        default="current",
        help=(
            "Use current text-only extraction, simulate Gemini from expected fixtures, "
            "compare prior live Gemini manifests, or compare deterministic extractor manifests."
        ),
    )
    statement_report_parser.add_argument(
        "--manifest",
        action="append",
        type=Path,
        help="Prior statement-run manifest to compare when --actual-source live-gemini.",
    )
    statement_report_parser.add_argument(
        "--deterministic-manifest",
        action="append",
        type=Path,
        help="Prior statement-deterministic-run manifest when --actual-source deterministic.",
    )
    statement_report_parser.add_argument(
        "--comparison-manifest",
        action="append",
        type=Path,
        help="Optional prior live Gemini manifest to include as comparison only.",
    )
    statement_report_parser.add_argument(
        "--transaction-fixture",
        choices=["none", "edge-cases"],
        default="none",
        help=(
            "Overlay read-only synthetic app transactions for "
            "match/ambiguous/receipt-only coverage."
        ),
    )
    statement_report_parser.add_argument(
        "--transaction-scope-firebase-uid",
        help=(
            "Restrict local DB transaction matching to the ownership scope for this "
            "Firebase UID, for example local-user."
        ),
    )
    statement_report_parser.set_defaults(func=_statement_report)

    statement_seed_parser = subparsers.add_parser("statement-seed-db")
    statement_seed_parser.add_argument(
        "--firebase-uid",
        default=DEFAULT_STATEMENT_SEED_FIREBASE_UID,
        help="Local bootstrap Firebase UID whose ownership scope receives seed rows.",
    )
    statement_seed_parser.add_argument(
        "--profile",
        default=DEFAULT_STATEMENT_SEED_PROFILE,
        help="Seed profile name recorded in prompt_version.",
    )
    statement_seed_parser.set_defaults(func=_statement_seed_db)

    statement_run_parser = subparsers.add_parser("statement-run")
    statement_run_parser.add_argument("--case", dest="case_id")
    statement_run_parser.add_argument("--live", action="store_true")
    statement_run_parser.add_argument("--cache-only", action="store_true")
    statement_run_parser.add_argument(
        "--bypass-cache",
        action="store_true",
        help="Ignore statement cache and force a fresh live provider call.",
    )
    statement_run_parser.add_argument("--limit", type=int)
    statement_run_parser.add_argument("--run-id")
    statement_run_parser.add_argument("--credentials-root", type=Path)
    statement_run_parser.add_argument("--model", default=settings.gemini_model)
    statement_run_parser.add_argument("--prompt", default=settings.statement_extraction_prompt_id)
    statement_run_parser.add_argument(
        "--gemini-input",
        choices=["profile-rows", "pymupdf-evidence", "pdf"],
        default="profile-rows",
        help=(
            "Gemini input mode. Defaults to compact row profile fallback; "
            "`pymupdf-evidence` and `pdf` are explicit debug/comparison modes."
        ),
    )
    statement_run_parser.add_argument("--confirm-live-cost", action="store_true")
    statement_run_parser.add_argument(
        "--transaction-scope-firebase-uid",
        help="Restrict reconciliation simulation to this local ownership scope.",
    )
    statement_run_parser.set_defaults(func=_statement_run)

    statement_deterministic_parser = subparsers.add_parser("statement-deterministic-run")
    statement_deterministic_parser.add_argument("--case", dest="case_id", required=True)
    statement_deterministic_parser.add_argument(
        "--extractor",
        action="append",
        choices=["pypdf", "pymupdf"],
        default=[],
        help="Deterministic extractor to run. May be repeated; defaults to both.",
    )
    statement_deterministic_parser.add_argument("--run-id")
    statement_deterministic_parser.add_argument("--credentials-root", type=Path)
    statement_deterministic_parser.add_argument(
        "--transaction-scope-firebase-uid",
        help="Restrict reconciliation simulation to this local ownership scope.",
    )
    statement_deterministic_parser.set_defaults(func=_statement_deterministic_run)

    statement_suite_parser = subparsers.add_parser("statement-suite-run")
    statement_suite_parser.add_argument(
        "--case",
        dest="case_ids",
        action="append",
        help="Statement case id. May be repeated; defaults to the 4-case suite.",
    )
    statement_suite_parser.add_argument(
        "--approach",
        action="append",
        choices=["auto", "pymupdf", "gemini"],
        help="Approach to run. May be repeated; defaults to pymupdf and gemini.",
    )
    statement_suite_parser.add_argument("--run-id")
    statement_suite_parser.add_argument("--credentials-root", type=Path)
    statement_suite_parser.add_argument("--model", default=settings.gemini_model)
    statement_suite_parser.add_argument("--prompt", default=settings.statement_extraction_prompt_id)
    statement_suite_parser.add_argument(
        "--gemini-input",
        choices=["profile-rows", "pymupdf-evidence", "pdf"],
        default="profile-rows",
        help=(
            "Gemini approach input mode. Defaults to compact row profile fallback; "
            "`pymupdf-evidence` and `pdf` are explicit debug/comparison modes."
        ),
    )
    statement_suite_parser.add_argument("--gemini-live", action="store_true")
    statement_suite_parser.add_argument("--cache-only", action="store_true")
    statement_suite_parser.add_argument(
        "--bypass-cache",
        action="store_true",
        help="For the Gemini approach, ignore statement cache and force a fresh provider call.",
    )
    statement_suite_parser.add_argument("--confirm-live-cost", action="store_true")
    statement_suite_parser.add_argument(
        "--transaction-scope-firebase-uid",
        help="Restrict reconciliation simulation to this local ownership scope.",
    )
    statement_suite_parser.set_defaults(func=_statement_suite_run)

    statement_fallback_parser = subparsers.add_parser("statement-fallback-calibrate")
    statement_fallback_parser.add_argument(
        "--case",
        dest="case_ids",
        action="append",
        help="Statement case id. May be repeated; defaults to the 4-case calibration set.",
    )
    statement_fallback_parser.add_argument("--run-id")
    statement_fallback_parser.add_argument("--credentials-root", type=Path)
    statement_fallback_parser.add_argument("--model", default=settings.gemini_model)
    statement_fallback_parser.add_argument(
        "--prompt",
        default=settings.statement_extraction_prompt_id,
    )
    statement_fallback_parser.add_argument(
        "--gemini-input",
        choices=["profile-rows", "pymupdf-evidence", "pdf"],
        default="profile-rows",
        help=(
            "Fallback calibration input mode. Defaults to compact row profile fallback; "
            "`pymupdf-evidence` and `pdf` are explicit debug/comparison modes."
        ),
    )
    statement_fallback_parser.add_argument("--live", action="store_true")
    statement_fallback_parser.add_argument("--cache-only", action="store_true")
    statement_fallback_parser.add_argument(
        "--bypass-cache",
        action="store_true",
        help=(
            "Ignore statement cache and force fresh Gemini calls. This is the default "
            "effective policy for --live calibration unless --cache-only or --from-manifest "
            "is used."
        ),
    )
    statement_fallback_parser.add_argument("--confirm-live-cost", action="store_true")
    statement_fallback_parser.add_argument(
        "--from-manifest",
        action="append",
        type=Path,
        help="Reuse an existing statement-run manifest without a provider call.",
    )
    statement_fallback_parser.add_argument(
        "--transaction-scope-firebase-uid",
        help="Restrict reconciliation simulation to this local ownership scope.",
    )
    statement_fallback_parser.set_defaults(func=_statement_fallback_calibrate)

    statement_batch_parser = subparsers.add_parser("statement-batch-report")
    statement_batch_parser.add_argument("--manifest", action="append", required=True, type=Path)
    statement_batch_parser.add_argument("--output-dir", required=True, type=Path)
    statement_batch_parser.add_argument("--label", default="statement-live")
    statement_batch_parser.set_defaults(func=_statement_batch_report)

    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--json", action="store_true")
    validate_parser.set_defaults(func=_validate)

    render_parser = subparsers.add_parser("render")
    render_parser.add_argument("--prompt", required=True)
    render_parser.set_defaults(func=_render)

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--case", dest="case_id")
    run_parser.add_argument("--environment", default=settings.environment)
    run_parser.add_argument("--extraction-prompt", default=settings.receipt_extraction_prompt_id)
    run_parser.add_argument(
        "--categorization-prompt",
        default=settings.item_categorization_prompt_id,
    )
    run_parser.add_argument("--model", default=settings.gemini_model)
    run_parser.add_argument("--live", action="store_true")
    run_parser.add_argument("--cache-only", action="store_true")
    run_parser.add_argument(
        "--bypass-cache",
        action="store_true",
        help="Ignore raw and processed caches and force a fresh live provider call.",
    )
    run_parser.add_argument("--raw-image", action="store_true")
    run_parser.add_argument("--stage", choices=["raw", "processed", "both"], default="both")
    run_parser.add_argument("--no-postprocess", action="store_true")
    run_parser.add_argument("--limit", type=int)
    run_parser.add_argument(
        "--run-id",
        help=(
            "Group all case artifacts for this execution under one folder, "
            "for example latest/local/<prompt>/<run-id>/<case>/."
        ),
    )
    run_parser.add_argument("--confirm-live-cost", action="store_true")
    run_parser.set_defaults(func=_run)

    compare_parser = subparsers.add_parser("compare")
    compare_parser.add_argument("--case", dest="case_id", required=True)
    compare_parser.add_argument("--candidate-prompt", required=True)
    compare_parser.add_argument("--baseline-prompt", default=settings.receipt_extraction_prompt_id)
    compare_parser.set_defaults(func=_compare)

    analyze_parser = subparsers.add_parser("analyze")
    analyze_parser.add_argument("--results", type=Path)
    analyze_parser.set_defaults(func=_analyze)

    batch_parser = subparsers.add_parser("batch-report")
    batch_parser.add_argument("--manifest", action="append", required=True, type=Path)
    batch_parser.add_argument("--output-dir", required=True, type=Path)
    batch_parser.add_argument("--label", default="six-case")
    batch_parser.set_defaults(func=_batch_report)
    return parser


def _import_legacy(args: argparse.Namespace) -> int:
    manifest = import_legacy_cases(args.source, force=args.force)
    print(json.dumps(manifest["summary"], indent=2, sort_keys=True))
    return 0


def _list_cases(args: argparse.Namespace) -> int:
    cases = list_cases()
    payload = [
        {
            "id": case.id,
            "image": case.relative_path,
            "baseline_status": case.baseline_status,
            "baseline_path": str(case.baseline_path) if case.baseline_path else None,
        }
        for case in cases
    ]
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for case in payload:
            print(f"{case['id']}\t{case['baseline_status']}\t{case['image']}")
    return 0


def _statement_import(args: argparse.Namespace) -> int:
    manifest = import_statement_corpus(args.source, force=args.force)
    print(json.dumps(manifest["summary"], indent=2, sort_keys=True))
    return 0


def _statement_list(args: argparse.Namespace) -> int:
    cases = list_statement_cases()
    payload = [
        {
            "id": case.id,
            "issuer": case.issuer,
            "pdf": case.relative_path,
            "baseline_status": case.baseline_status,
            "baseline_path": str(case.expected_path) if case.expected_path else None,
        }
        for case in cases
    ]
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for case in payload:
            print(f"{case['id']}\t{case['baseline_status']}\t{case['pdf']}")
    return 0


def _statement_extract(args: argparse.Namespace) -> int:
    case = get_statement_case(args.case_id)
    run_id = _resolve_statement_run_id(
        args.run_id,
        f"statement-codex-preflight-{case.id}",
    )
    packet = extract_statement_text(
        case,
        password=args.password,
        credentials_root=args.credentials_root,
        include_source_text=not args.no_source_text,
    )
    manifest = write_statement_extraction_packet(
        case,
        packet,
        run_id=run_id,
    )
    print(
        json.dumps(
            {
                "case_id": manifest["case_id"],
                "status": manifest["status"],
                "processing": manifest["processing"],
                "contains_raw_statement_text": manifest["contains_raw_statement_text"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 1 if packet.extraction.pdf_status != "readable" else 0


def _statement_report(args: argparse.Namespace) -> int:
    if args.manifest and args.actual_source != "live-gemini":
        raise SystemExit("statement-report --manifest requires --actual-source live-gemini")
    if args.actual_source == "live-gemini" and not args.manifest:
        raise SystemExit("statement-report --actual-source live-gemini requires --manifest")
    if args.deterministic_manifest and args.actual_source != "deterministic":
        raise SystemExit(
            "statement-report --deterministic-manifest requires --actual-source deterministic"
        )
    if args.actual_source == "deterministic" and not args.deterministic_manifest:
        raise SystemExit(
            "statement-report --actual-source deterministic requires --deterministic-manifest"
        )
    if args.comparison_manifest and args.actual_source != "deterministic":
        raise SystemExit(
            "statement-report --comparison-manifest is only supported for deterministic"
        )
    run_id = _resolve_statement_run_id(
        args.run_id,
        f"statement-{args.actual_source}-report",
    )
    manifest = asyncio.run(
        write_statement_expected_report(
            run_id=run_id,
            credentials_root=args.credentials_root,
            actual_source=args.actual_source,
            transaction_fixture=args.transaction_fixture,
            transaction_scope_firebase_uid=args.transaction_scope_firebase_uid,
            manifest_paths=args.manifest,
            deterministic_manifest_paths=args.deterministic_manifest,
            comparison_manifest_paths=args.comparison_manifest,
        )
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


def _statement_seed_db(args: argparse.Namespace) -> int:
    manifest = asyncio.run(
        seed_statement_lab_transactions(
            firebase_uid=args.firebase_uid,
            profile=args.profile,
        )
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


def _statement_run(args: argparse.Namespace) -> int:
    if args.bypass_cache and args.cache_only:
        raise SystemExit("statement-run --bypass-cache cannot be combined with --cache-only")
    if args.bypass_cache and not args.live:
        raise SystemExit("statement-run --bypass-cache requires --live")
    if args.live:
        _guard_statement_live_run(args)

    cases = [get_statement_case(args.case_id)] if args.case_id else list_statement_cases()
    if args.limit is not None:
        cases = cases[: args.limit]

    run_id = _resolve_statement_run_id(
        args.run_id,
        _statement_run_label(args),
        parent=LATEST_RESULTS_ROOT
        / "statements"
        / "gemini"
        / str(args.prompt or settings.statement_extraction_prompt_id),
    )
    packets = [
        asyncio.run(
            run_statement_case(
                case,
                prompt_id=args.prompt,
                model=args.model,
                live=args.live,
                cache_only=args.cache_only,
                bypass_cache=args.bypass_cache,
                credentials_root=args.credentials_root,
                run_id=run_id,
                transaction_scope_firebase_uid=args.transaction_scope_firebase_uid,
                gemini_input=args.gemini_input,
            )
        )
        for case in cases
    ]
    print(json.dumps(_statement_run_summary(packets), indent=2, sort_keys=True))
    return 1 if any(_statement_packet_failed(packet) for packet in packets) else 0


def _statement_deterministic_run(args: argparse.Namespace) -> int:
    case = get_statement_case(args.case_id)
    run_id = _resolve_statement_run_id(
        args.run_id,
        f"statement-deterministic-{case.id}",
    )
    packets = asyncio.run(
        run_statement_deterministic_case(
            case,
            extractors=args.extractor or ["pypdf", "pymupdf"],
            credentials_root=args.credentials_root,
            run_id=run_id,
            transaction_scope_firebase_uid=args.transaction_scope_firebase_uid,
        )
    )
    print(json.dumps(_statement_deterministic_summary(packets), indent=2, sort_keys=True))
    return 0 if any(packet.get("score", {}).get("passed") for packet in packets) else 1


def _statement_suite_run(args: argparse.Namespace) -> int:
    approaches = args.approach or DEFAULT_STATEMENT_SUITE_APPROACHES
    case_ids = args.case_ids or DEFAULT_STATEMENT_SUITE_CASE_IDS
    if "gemini" in approaches and args.gemini_live and not args.confirm_live_cost:
        estimate = _estimated_statement_fallback_cost(len(case_ids), args.model)
        raise SystemExit(
            "statement-suite-run --gemini-live requires --confirm-live-cost "
            f"(max displayed estimate: ${estimate:.4f} for {len(case_ids)} case(s))"
        )
    if args.bypass_cache and not args.gemini_live:
        raise SystemExit("statement-suite-run --bypass-cache requires --gemini-live")
    if args.gemini_live and args.cache_only:
        raise SystemExit("statement-suite-run --gemini-live cannot be combined with --cache-only")

    manifest = asyncio.run(
        run_statement_suite(
            case_ids=case_ids,
            approaches=approaches,
            run_id=args.run_id,
            credentials_root=args.credentials_root,
            transaction_scope_firebase_uid=args.transaction_scope_firebase_uid,
            gemini_live=args.gemini_live,
            gemini_cache_only=args.cache_only,
            bypass_cache=args.bypass_cache,
            model=args.model,
            prompt_id=args.prompt,
            gemini_input=args.gemini_input,
        )
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


def _statement_fallback_calibrate(args: argparse.Namespace) -> int:
    case_ids = args.case_ids or DEFAULT_STATEMENT_SUITE_CASE_IDS
    from_manifest = args.from_manifest or []
    if args.from_manifest and (args.live or args.cache_only or args.bypass_cache):
        raise SystemExit(
            "statement-fallback-calibrate --from-manifest cannot be combined with "
            "--live, --cache-only, or --bypass-cache"
        )
    if args.live and args.cache_only:
        raise SystemExit("statement-fallback-calibrate --live cannot be combined with --cache-only")
    if args.bypass_cache and args.cache_only:
        raise SystemExit(
            "statement-fallback-calibrate --bypass-cache cannot be combined with --cache-only"
        )
    if args.bypass_cache and not args.live:
        raise SystemExit("statement-fallback-calibrate --bypass-cache requires --live")
    if args.live and not args.confirm_live_cost:
        estimate = _estimated_statement_fallback_cost(len(case_ids), args.model)
        raise SystemExit(
            "statement-fallback-calibrate --live requires --confirm-live-cost "
            f"(max displayed estimate: ${estimate:.4f} for {len(case_ids)} case(s))"
        )
    if not args.live and not args.cache_only and not from_manifest:
        raise SystemExit(
            "statement-fallback-calibrate requires --live, --cache-only, or --from-manifest"
        )

    effective_bypass_cache = (
        bool(args.bypass_cache) or (bool(args.live) and not bool(args.cache_only))
    )
    manifest = asyncio.run(
        run_statement_fallback_calibration(
            case_ids=case_ids,
            run_id=args.run_id,
            credentials_root=args.credentials_root,
            transaction_scope_firebase_uid=args.transaction_scope_firebase_uid,
            live=args.live,
            cache_only=args.cache_only,
            bypass_cache=effective_bypass_cache,
            from_manifest_paths=from_manifest,
            model=args.model,
            prompt_id=args.prompt,
            gemini_input=args.gemini_input,
        )
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


def _statement_batch_report(args: argparse.Namespace) -> int:
    summary = write_statement_batch_report(
        manifest_paths=args.manifest,
        output_dir=args.output_dir,
        label=args.label,
    )
    print(
        json.dumps(
            {
                "status": "written",
                "summary_path": summary["summary_path"],
                "analysis_path": summary["analysis_path"],
                "case_count": summary["case_count"],
                "total_cost_usd": summary["totals"]["cost_usd"],
                "promotion_decision": summary["promotion_decision"]["decision"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


def _validate(args: argparse.Namespace) -> int:
    cases = list_cases()
    invalid: list[dict[str, str]] = []
    for case in cases:
        if case.baseline_path is None:
            continue
        try:
            load_expected_receipt(case.baseline_path, case_id=case.id)
        except Exception as exc:  # noqa: BLE001 - CLI reports all invalid baselines.
            invalid.append({"case_id": case.id, "error": str(exc)})

    summary = {
        "total_cases": len(cases),
        "baselined": sum(1 for case in cases if case.expected_path),
        "fixture_baselined": sum(1 for case in cases if case.fixture_path),
        "unbaselined": sum(1 for case in cases if case.baseline_path is None),
        "invalid": invalid,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 1 if invalid else 0


def _render(args: argparse.Namespace) -> int:
    prompt = get_prompt(args.prompt)
    payload = {
        "id": prompt.id,
        "kind": prompt.kind,
        "version": prompt.version,
        "status": prompt.status,
        "text_hash": prompt_text_hash(prompt),
        "system_prompt": prompt.system_prompt,
        "user_prompt": prompt.user_prompt,
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def _run(args: argparse.Namespace) -> int:
    if args.bypass_cache and args.cache_only:
        raise SystemExit("run --bypass-cache cannot be combined with --cache-only")
    if args.bypass_cache and not args.live:
        raise SystemExit("run --bypass-cache requires --live")
    if args.live:
        _guard_live_run(args)

    cases = [get_case(args.case_id)] if args.case_id else list_cases()
    if args.live or args.limit is not None:
        cases = cases[: args.limit]

    run_id = _resolve_receipt_run_id(args)
    packets = [
        asyncio.run(
            run_case(
                case,
                environment=args.environment,
                extraction_prompt_id=args.extraction_prompt,
                categorization_prompt_id=args.categorization_prompt,
                model=args.model,
                live=args.live,
                cache_only=args.cache_only,
                bypass_cache=args.bypass_cache,
                raw_image=args.raw_image,
                stage=args.stage,
                postprocess=not args.no_postprocess,
                run_id=run_id,
            )
        )
        for case in cases
    ]
    print(json.dumps(_run_summary(packets), indent=2, sort_keys=True))
    return 1 if any(_packet_failed(packet) for packet in packets) else 0


def _compare(args: argparse.Namespace) -> int:
    baseline = get_prompt(args.baseline_prompt, kind="receipt-extraction")
    candidate = get_prompt(args.candidate_prompt, kind="receipt-extraction")
    payload = {
        "case_id": args.case_id,
        "baseline_prompt": baseline.id,
        "candidate_prompt": candidate.id,
        "baseline_hash": prompt_text_hash(baseline),
        "candidate_hash": prompt_text_hash(candidate),
        "status": "comparison-defined",
        "next": "Run both prompts with `run --live --limit ... --confirm-live-cost`.",
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def _analyze(args: argparse.Namespace) -> int:
    results = args.results
    if results is None or not results.exists():
        print(json.dumps({"status": "no-results", "groups": {}}, indent=2, sort_keys=True))
        return 0
    manifests = sorted(results.rglob("manifest.json")) if results.is_dir() else [results]
    groups: dict[str, int] = {}
    for manifest in manifests:
        payload = json.loads(manifest.read_text(encoding="utf-8"))
        key = str(payload.get("status", "unknown"))
        groups[key] = groups.get(key, 0) + 1
    print(json.dumps({"status": "analyzed", "groups": groups}, indent=2, sort_keys=True))
    return 0


def _batch_report(args: argparse.Namespace) -> int:
    summary = write_batch_report(
        manifest_paths=args.manifest,
        output_dir=args.output_dir,
        label=args.label,
    )
    print(
        json.dumps(
            {
                "status": "written",
                "summary_path": summary["summary_path"],
                "analysis_path": summary["analysis_path"],
                "case_count": summary["case_count"],
                "total_cost_usd": summary["totals"]["cost_usd"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


def _guard_live_run(args: argparse.Namespace) -> None:
    if args.cache_only:
        raise SystemExit("run --live cannot be combined with --cache-only")
    if args.limit is None or args.limit < 1:
        raise SystemExit("run --live requires --limit N")
    if not args.confirm_live_cost:
        estimate = _estimated_cost(args.limit, args.model)
        raise SystemExit(
            "run --live requires --confirm-live-cost "
            f"(max displayed estimate: ${estimate:.4f} for {args.limit} case(s))"
        )


def _guard_statement_live_run(args: argparse.Namespace) -> None:
    if args.cache_only:
        raise SystemExit("statement-run --live cannot be combined with --cache-only")
    if not args.case_id and (args.limit is None or args.limit < 1):
        raise SystemExit("statement-run --live requires --case or --limit N")
    if not args.confirm_live_cost:
        limit = args.limit if args.limit is not None else 1
        estimate = _estimated_statement_fallback_cost(limit, args.model)
        raise SystemExit(
            "statement-run --live requires --confirm-live-cost "
            f"(max displayed estimate: ${estimate:.4f} for {limit} case(s))"
        )


def _estimated_statement_fallback_cost(limit: int, model_name: str) -> float:
    """Return a conservative statement fallback prompt-lab live-call estimate.

    Validated profile-rows fallback evidence averaged about 96.6k tokens and
    $0.0101 per statement across the 7-case suite. The live guard uses a higher
    per-case budget so the confirmation text is not lower than the observed
    high-cost CMR cases.
    """
    cost = estimate_cost_usd(
        input_tokens=160_000 * limit,
        output_tokens=5_000 * limit,
        model_name=model_name,
    )
    return float(cost)


def _estimated_cost(limit: int, model_name: str) -> float:
    cost = estimate_cost_usd(
        input_tokens=50_000 * limit,
        output_tokens=5_000 * limit,
        model_name=model_name,
    )
    return float(cost)


def _run_summary(packets: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "count": len(packets),
        "statuses": [packet["status"] for packet in packets],
        "manifest_paths": [packet["manifest_path"] for packet in packets],
        "evidence_label": "prompt-lab-ai-quality",
    }


def _statement_run_summary(packets: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "count": len(packets),
        "statuses": [packet["status"] for packet in packets],
        "manifest_paths": [packet["manifest_path"] for packet in packets],
        "evidence_label": "statement-prompt-lab-ai-quality",
    }


def _statement_deterministic_summary(packets: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "count": len(packets),
        "gemini_called": False,
        "statuses": [packet["status"] for packet in packets],
        "manifest_paths": [packet["manifest_path"] for packet in packets],
        "evidence_label": "statement-deterministic-pdf-extraction",
        "extractors": [
            {
                "case_id": packet.get("case_id"),
                "extractor": packet.get("extractor"),
                "status": packet.get("status"),
                "line_count": len(
                    packet.get("processed_output", {})
                    .get("statement_extraction", {})
                    .get("lines", [])
                ),
                "passed": packet.get("score", {}).get("passed"),
                "manifest_path": packet.get("manifest_path"),
            }
            for packet in packets
        ],
    }


def _packet_failed(packet: dict[str, Any]) -> bool:
    status = str(packet.get("status", ""))
    return status.startswith("threshold-failed") or status in {"provider-error"}


def _statement_packet_failed(packet: dict[str, Any]) -> bool:
    status = str(packet.get("status", ""))
    return status.startswith("threshold-failed") or status in {
        "provider-error",
        "password_required",
        "password_invalid",
        "extraction_failed",
    }


def _resolve_statement_run_id(
    explicit_run_id: str | None,
    label: str,
    *,
    parent: Path | None = None,
) -> str:
    if explicit_run_id:
        return explicit_run_id
    return next_serial_run_id(parent or LATEST_RESULTS_ROOT / "statements", label)


def _resolve_receipt_run_id(args: argparse.Namespace) -> str:
    if args.run_id:
        return args.run_id
    prompt_id = str(args.extraction_prompt or settings.receipt_extraction_prompt_id)
    parent = LATEST_RESULTS_ROOT / str(args.environment) / prompt_id
    return next_serial_run_id(parent, _receipt_run_label(args))


def _statement_run_label(args: argparse.Namespace) -> str:
    if args.live and args.bypass_cache:
        mode = "live-no-cache"
    elif args.live:
        mode = "live"
    elif args.cache_only:
        mode = "cache-only"
    else:
        mode = "dry-run"
    case_label = (
        str(args.case_id).replace("/", "-")
        if args.case_id
        else f"{args.limit or 'all'}-cases"
    )
    return f"statement-{mode}-{case_label}"


def _receipt_run_label(args: argparse.Namespace) -> str:
    if args.live and args.bypass_cache:
        mode = "live-no-cache"
    elif args.live:
        mode = "live"
    elif args.cache_only:
        mode = "cache-only"
    else:
        mode = "dry-run"
    case_label = (
        str(args.case_id).replace("/", "-")
        if args.case_id
        else f"{args.limit or 'all'}-cases"
    )
    stage_label = f"{mode}-{args.stage}"
    if args.no_postprocess:
        stage_label = f"{stage_label}-no-postprocess"
    if args.raw_image:
        stage_label = f"{stage_label}-raw-image"
    return slug_run_id(f"receipt-{stage_label}-{case_label}")
