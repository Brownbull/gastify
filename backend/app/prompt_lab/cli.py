"""Receipt prompt lab CLI."""
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
from app.prompt_lab.adapter import load_expected_receipt
from app.prompt_lab.batch_report import write_batch_report
from app.prompt_lab.cases import get_case, list_cases
from app.prompt_lab.costs import estimate_cost_usd
from app.prompt_lab.import_legacy import import_legacy_cases
from app.prompt_lab.runner import run_case
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
                run_id=args.run_id,
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


def _packet_failed(packet: dict[str, Any]) -> bool:
    status = str(packet.get("status", ""))
    return status.startswith("threshold-failed") or status in {"provider-error"}
