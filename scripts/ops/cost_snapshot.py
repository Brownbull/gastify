#!/usr/bin/env python3
"""Fetch Gastify Gemini cost estimates and Railway resource usage.

The default path is intentionally dependency-light: it reads local prompt-lab
artifacts, queries Railway Postgres through `railway run`, and asks Railway for
metrics. Exact Google billed spend is opt-in through a BigQuery billing export.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.llm_costs import PRICING_SOURCE_URL, PRICING_VERIFIED_ON, money  # noqa: E402

DEFAULT_RAILWAY_ENVIRONMENT = "staging"
DEFAULT_RAILWAY_DB_SERVICES = ("Postgres", "Postgres-67_W")
DEFAULT_GOOGLE_BILLING_FILTER_REGEX = r"(gemini|generative ai)"
PROMPT_LAB_COST_ROOT = REPO_ROOT / "prompt-testing" / "results" / "latest" / "local"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Report Gastify Gemini app-cost estimates and Railway usage."
    )
    parser.add_argument(
        "--since",
        default="24h",
        help="Window start as relative duration (24h, 7d, 30m) or ISO timestamp.",
    )
    parser.add_argument(
        "--until",
        default=None,
        help="Optional ISO timestamp window end. Defaults to now.",
    )
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    parser.add_argument(
        "--google-billing-table",
        default=None,
        help="Optional Cloud Billing BigQuery table as project.dataset.table.",
    )
    parser.add_argument(
        "--google-billing-project",
        default=None,
        help="Optional Google Cloud project for the BigQuery client.",
    )
    parser.add_argument(
        "--google-billing-filter-regex",
        default=DEFAULT_GOOGLE_BILLING_FILTER_REGEX,
        help="Case-insensitive regex applied to service + SKU descriptions.",
    )
    parser.add_argument(
        "--railway-environment",
        default=DEFAULT_RAILWAY_ENVIRONMENT,
        help="Railway environment to query.",
    )
    parser.add_argument(
        "--railway-db-service",
        action="append",
        dest="railway_db_services",
        help="Railway Postgres service to query. Repeatable.",
    )
    parser.add_argument("--skip-prompt-lab", action="store_true")
    parser.add_argument("--skip-railway-db", action="store_true")
    parser.add_argument("--skip-railway-metrics", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    now = datetime.now(UTC)
    until_at = parse_time_window_end(args.until, now)
    since_at = parse_time_window_start(args.since, until_at)
    warnings: list[str] = []

    prompt_lab = (
        empty_prompt_lab_summary("skipped")
        if args.skip_prompt_lab
        else aggregate_prompt_lab_costs(
            REPO_ROOT,
            since_at=since_at,
            until_at=until_at,
            warnings=warnings,
        )
    )
    railway_db = (
        empty_railway_db_summary("skipped")
        if args.skip_railway_db
        else aggregate_railway_db_costs(
            since_at=since_at,
            until_at=until_at,
            environment=args.railway_environment,
            services=tuple(args.railway_db_services or DEFAULT_RAILWAY_DB_SERVICES),
            warnings=warnings,
        )
    )
    railway_metrics = (
        {"status": "skipped", "services": [], "totals": {}}
        if args.skip_railway_metrics
        else fetch_railway_metrics(
            environment=args.railway_environment,
            since=args.since,
            until=args.until,
            warnings=warnings,
        )
    )
    gemini_billing = query_google_billing(
        table=args.google_billing_table,
        project=args.google_billing_project,
        filter_regex=args.google_billing_filter_regex,
        since_at=since_at,
        until_at=until_at,
        warnings=warnings,
    )

    snapshot = {
        "generated_at": now.isoformat(),
        "window": {
            "since": args.since,
            "since_at": since_at.isoformat(),
            "until_at": until_at.isoformat(),
        },
        "gemini_app_estimate": {
            "pricing": {
                "source_url": PRICING_SOURCE_URL,
                "verified_on": PRICING_VERIFIED_ON,
                "cost_basis": "provider_reported_tokens_estimated_cost",
            },
            "prompt_lab": prompt_lab,
            "railway_databases": railway_db,
            "totals": combine_app_estimate_totals(prompt_lab, railway_db),
        },
        "gemini_billing": gemini_billing,
        "railway_metrics": railway_metrics,
        "warnings": warnings,
    }

    if args.json:
        print(json.dumps(snapshot, indent=2, sort_keys=True))
    else:
        print(render_human(snapshot))
    return 0


def parse_time_window_end(value: str | None, now: datetime) -> datetime:
    if not value:
        return now
    parsed = parse_iso_datetime(value)
    if parsed is None:
        raise SystemExit(f"Invalid --until value: {value}")
    return parsed


def parse_time_window_start(value: str, until_at: datetime) -> datetime:
    relative = re.fullmatch(r"(\d+)(m|h|d|w)", value.strip().lower())
    if relative:
        amount = int(relative.group(1))
        unit = relative.group(2)
        delta = {
            "m": timedelta(minutes=amount),
            "h": timedelta(hours=amount),
            "d": timedelta(days=amount),
            "w": timedelta(weeks=amount),
        }[unit]
        return until_at - delta
    parsed = parse_iso_datetime(value)
    if parsed is None:
        raise SystemExit(f"Invalid --since value: {value}")
    return parsed


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    candidate = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def aggregate_prompt_lab_costs(
    root: Path,
    *,
    since_at: datetime,
    until_at: datetime,
    warnings: list[str],
) -> dict[str, Any]:
    cost_root = root / "prompt-testing" / "results" / "latest" / "local"
    totals = empty_totals()
    by_model: dict[str, dict[str, Any]] = {}
    included_paths: list[str] = []
    skipped_before_window = 0
    skipped_after_window = 0
    missing_manifest_timestamp = 0

    if not cost_root.exists():
        warnings.append(f"Prompt-lab cost root not found: {relative_path(cost_root)}")
        return {
            "status": "unavailable",
            "root": str(cost_root),
            "files": 0,
            "cases": 0,
            "totals": stringify_totals(totals),
            "by_model": {},
            "included_paths": [],
        }

    for path in sorted(cost_root.rglob("cost_summary.json")):
        payload = load_json(path)
        generated_at = generated_at_for_cost_summary(path)
        if generated_at is None:
            missing_manifest_timestamp += 1
        elif generated_at < since_at:
            skipped_before_window += 1
            continue
        elif generated_at >= until_at:
            skipped_after_window += 1
            continue

        cost_totals = payload.get("totals", {}) if isinstance(payload, dict) else {}
        input_tokens = int(cost_totals.get("input_tokens") or 0)
        output_tokens = int(cost_totals.get("output_tokens") or 0)
        total_tokens = int(cost_totals.get("total_tokens") or input_tokens + output_tokens)
        cost_usd = decimal_from(cost_totals.get("cost_usd"))
        add_totals(totals, input_tokens, output_tokens, total_tokens, cost_usd)

        model = str(payload.get("normalized_model_name") or payload.get("model_name") or "unknown")
        model_summary = by_model.setdefault(model, {"files": 0, "totals": empty_totals()})
        model_summary["files"] += 1
        add_totals(model_summary["totals"], input_tokens, output_tokens, total_tokens, cost_usd)
        included_paths.append(relative_path(path))

    if missing_manifest_timestamp:
        warnings.append(
            "Some prompt-lab cost summaries lacked manifest timestamps and were included "
            f"without window filtering: {missing_manifest_timestamp}"
        )

    return {
        "status": "ok",
        "root": relative_path(cost_root),
        "files": len(included_paths),
        "cases": len(included_paths),
        "skipped_before_window": skipped_before_window,
        "skipped_after_window": skipped_after_window,
        "missing_manifest_timestamp": missing_manifest_timestamp,
        "totals": stringify_totals(totals),
        "by_model": stringify_nested_totals(by_model),
        "included_paths": included_paths,
    }


def generated_at_for_cost_summary(path: Path) -> datetime | None:
    manifest_path = path.with_name("manifest.json")
    if not manifest_path.exists():
        return None
    payload = load_json(manifest_path)
    if not isinstance(payload, dict):
        return None
    generated = parse_iso_datetime(str(payload.get("generated_at") or ""))
    return generated


def aggregate_railway_db_costs(
    *,
    since_at: datetime,
    until_at: datetime,
    environment: str,
    services: tuple[str, ...],
    warnings: list[str],
) -> dict[str, Any]:
    service_results: list[dict[str, Any]] = []
    totals = empty_totals()
    total_transactions = 0
    llm_transactions = 0

    for service in services:
        result = run_railway_db_query(
            service=service,
            environment=environment,
            since_at=since_at,
            until_at=until_at,
        )
        if result.get("status") != "ok":
            warnings.append(
                "Railway DB cost query failed for "
                f"{service}: {result.get('reason', 'unknown error')}"
            )
            service_results.append(result)
            continue
        service_results.append(result)
        service_totals = result["totals"]
        add_totals(
            totals,
            int(service_totals["input_tokens"]),
            int(service_totals["output_tokens"]),
            int(service_totals["total_tokens"]),
            decimal_from(service_totals["cost_usd"]),
        )
        total_transactions += int(result.get("transactions", 0))
        llm_transactions += int(result.get("llm_transactions", 0))

    status = (
        "ok" if any(service.get("status") == "ok" for service in service_results) else "unavailable"
    )
    return {
        "status": status,
        "environment": environment,
        "services": service_results,
        "transactions": total_transactions,
        "llm_transactions": llm_transactions,
        "totals": stringify_totals(totals),
    }


def run_railway_db_query(
    *,
    service: str,
    environment: str,
    since_at: datetime,
    until_at: datetime,
) -> dict[str, Any]:
    railway_cmd = resolve_railway_base_command()
    if railway_cmd is None:
        return {"status": "unavailable", "service": service, "reason": "railway CLI not available"}

    command = [
        *railway_cmd,
        "run",
        "--service",
        service,
        "--environment",
        environment,
        "--",
        "uv",
        "run",
        "python",
        "-c",
        railway_db_inline_script(),
        since_at.isoformat(),
        until_at.isoformat(),
    ]
    completed = subprocess.run(
        command,
        cwd=BACKEND_DIR,
        text=True,
        capture_output=True,
        timeout=60,
        check=False,
    )
    if completed.returncode != 0:
        return {
            "status": "unavailable",
            "service": service,
            "reason": f"railway run exited {completed.returncode}",
        }
    try:
        payload = json.loads(completed.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError) as exc:
        return {
            "status": "unavailable",
            "service": service,
            "reason": f"invalid railway DB JSON: {exc}",
        }
    payload["service"] = service
    return payload


def railway_db_inline_script() -> str:
    return r'''
import asyncio
from datetime import datetime
import json
import os
import sys

import asyncpg

SQL = """
SELECT
    COUNT(*)::int AS transactions,
    COUNT(*) FILTER (
        WHERE COALESCE(llm_tokens_in, 0) > 0
           OR COALESCE(llm_tokens_out, 0) > 0
           OR llm_cost_usd IS NOT NULL
    )::int AS llm_transactions,
    COALESCE(SUM(llm_tokens_in), 0)::bigint AS input_tokens,
    COALESCE(SUM(llm_tokens_out), 0)::bigint AS output_tokens,
    COALESCE(SUM(llm_cost_usd), 0)::text AS cost_usd,
    MIN(created_at)::text AS first_created_at,
    MAX(created_at)::text AS last_created_at
FROM transactions
WHERE created_at >= $1::timestamptz
  AND created_at < $2::timestamptz
"""


async def main():
    url = (
        os.getenv("DATABASE_PUBLIC_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("GASTIFY_DATABASE_URL")
    )
    if not url:
        print(json.dumps({"status": "unavailable", "reason": "missing database URL"}))
        return
    conn = await asyncpg.connect(url)
    since_at = datetime.fromisoformat(sys.argv[1])
    until_at = datetime.fromisoformat(sys.argv[2])
    try:
        row = await conn.fetchrow(SQL, since_at, until_at)
    finally:
        await conn.close()
    input_tokens = int(row["input_tokens"] or 0)
    output_tokens = int(row["output_tokens"] or 0)
    print(
        json.dumps(
            {
                "status": "ok",
                "transactions": int(row["transactions"] or 0),
                "llm_transactions": int(row["llm_transactions"] or 0),
                "totals": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": input_tokens + output_tokens,
                    "cost_usd": str(row["cost_usd"] or "0"),
                },
                "first_created_at": row["first_created_at"],
                "last_created_at": row["last_created_at"],
            },
            sort_keys=True,
        )
    )


asyncio.run(main())
'''


def fetch_railway_metrics(
    *,
    environment: str,
    since: str,
    until: str | None,
    warnings: list[str],
) -> dict[str, Any]:
    metrics_cmd = resolve_railway_metrics_command()
    if metrics_cmd is None:
        warnings.append("Railway metrics command is unavailable.")
        return {"status": "unavailable", "services": [], "totals": {}}

    command = [*metrics_cmd, "--all", "--environment", environment, "--since", since, "--json"]
    if until:
        command.extend(["--until", until])
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        timeout=60,
        check=False,
    )
    if completed.returncode != 0:
        warnings.append(f"Railway metrics command exited {completed.returncode}.")
        return {"status": "unavailable", "services": [], "totals": {}}
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        warnings.append(f"Railway metrics returned invalid JSON: {exc}")
        return {"status": "unavailable", "services": [], "totals": {}}
    return summarize_railway_metrics(payload)


def summarize_railway_metrics(payload: dict[str, Any]) -> dict[str, Any]:
    services = []
    totals = {
        "memory_current_mb": 0.0,
        "volume_current_mb": 0.0,
        "volume_limit_mb": 0.0,
        "network_egress_mb": 0.0,
        "network_ingress_mb": 0.0,
    }
    for service in payload.get("services", []):
        memory = service.get("memory") or {}
        network = service.get("network") or {}
        volumes = service.get("volumes") or []
        service_volumes = []
        for volume in volumes:
            current_mb = float(volume.get("current_mb") or 0.0)
            limit_mb = float(volume.get("limit_mb") or 0.0)
            totals["volume_current_mb"] += current_mb
            totals["volume_limit_mb"] += limit_mb
            service_volumes.append(
                {
                    "name": volume.get("name"),
                    "mount_path": volume.get("mount_path"),
                    "current_mb": current_mb,
                    "limit_mb": limit_mb,
                    "utilization_pct": percent(current_mb, limit_mb),
                }
            )
        memory_current = float(memory.get("current_mb") or 0.0)
        totals["memory_current_mb"] += memory_current
        totals["network_egress_mb"] += float(network.get("egress_mb") or 0.0)
        totals["network_ingress_mb"] += float(network.get("ingress_mb") or 0.0)
        services.append(
            {
                "id": service.get("id"),
                "name": service.get("name"),
                "cpu": service.get("cpu") or {},
                "memory": {
                    "current_mb": memory_current,
                    "limit_mb": float(memory.get("limit_mb") or 0.0),
                    "utilization_pct": float(memory.get("utilization_pct") or 0.0),
                },
                "network": {
                    "egress_mb": float(network.get("egress_mb") or 0.0),
                    "ingress_mb": float(network.get("ingress_mb") or 0.0),
                },
                "volumes": service_volumes,
            }
        )
    totals["volume_utilization_pct"] = percent(
        totals["volume_current_mb"],
        totals["volume_limit_mb"],
    )
    return {
        "status": "ok",
        "project": payload.get("project"),
        "environment": payload.get("environment"),
        "window": payload.get("window") or {},
        "services": services,
        "totals": round_floats(totals),
    }


def query_google_billing(
    *,
    table: str | None,
    project: str | None,
    filter_regex: str,
    since_at: datetime,
    until_at: datetime,
    warnings: list[str],
) -> dict[str, Any]:
    if not table:
        return {
            "status": "not_configured",
            "reason": "pass --google-billing-table to query Cloud Billing export",
        }

    try:
        bigquery = import_bigquery()
    except ImportError:
        warnings.append(
            "google-cloud-bigquery is not installed in this environment; "
            "exact Google billing was skipped."
        )
        return {"status": "unavailable", "reason": "missing google-cloud-bigquery"}

    query = build_google_billing_query(table)
    client = bigquery.Client(project=project)
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("since_at", "TIMESTAMP", since_at),
            bigquery.ScalarQueryParameter("until_at", "TIMESTAMP", until_at),
            bigquery.ScalarQueryParameter("filter_regex", "STRING", filter_regex.lower()),
        ]
    )
    try:
        rows = list(client.query(query, job_config=job_config).result())
    except Exception as exc:  # pragma: no cover - provider/client failures vary.
        warnings.append(f"Google billing query failed: {type(exc).__name__}")
        return {"status": "unavailable", "reason": "query failed"}

    items = []
    gross_total = Decimal("0")
    credit_total = Decimal("0")
    net_total = Decimal("0")
    for row in rows:
        gross = decimal_from(row.gross_cost)
        credits = decimal_from(row.credits)
        net = decimal_from(row.net_cost)
        gross_total += gross
        credit_total += credits
        net_total += net
        items.append(
            {
                "project_id": row.project_id,
                "service": row.service,
                "sku": row.sku,
                "currency": row.currency,
                "gross_cost": money(gross),
                "credits": money(credits),
                "net_cost": money(net),
            }
        )

    return {
        "status": "ok",
        "table": table,
        "filter_regex": filter_regex,
        "rows": items,
        "totals": {
            "gross_cost": money(gross_total),
            "credits": money(credit_total),
            "net_cost": money(net_total),
        },
    }


def import_bigquery() -> Any:
    from google.cloud import bigquery

    return bigquery


def build_google_billing_query(table: str) -> str:
    if "`" in table:
        raise ValueError("BigQuery table name cannot contain backticks")
    return f"""
SELECT
  project.id AS project_id,
  service.description AS service,
  sku.description AS sku,
  currency,
  SUM(cost) AS gross_cost,
  SUM(IFNULL((SELECT SUM(credit.amount) FROM UNNEST(credits) AS credit), 0)) AS credits,
  SUM(cost) + SUM(IFNULL((SELECT SUM(credit.amount) FROM UNNEST(credits) AS credit), 0)) AS net_cost
FROM `{table}`
WHERE usage_start_time >= @since_at
  AND usage_start_time < @until_at
  AND REGEXP_CONTAINS(LOWER(CONCAT(service.description, " ", sku.description)), @filter_regex)
GROUP BY project_id, service, sku, currency
ORDER BY net_cost DESC
""".strip()


def combine_app_estimate_totals(
    prompt_lab: dict[str, Any], railway_db: dict[str, Any]
) -> dict[str, Any]:
    totals = empty_totals()
    for source in (prompt_lab, railway_db):
        source_totals = source.get("totals") or {}
        add_totals(
            totals,
            int(source_totals.get("input_tokens") or 0),
            int(source_totals.get("output_tokens") or 0),
            int(source_totals.get("total_tokens") or 0),
            decimal_from(source_totals.get("cost_usd")),
        )
    return stringify_totals(totals)


def resolve_railway_metrics_command() -> list[str] | None:
    for base in (["railway"], ["npx", "-y", "@railway/cli@latest"]):
        completed = subprocess.run(
            [*base, "metrics", "--help"],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
        if completed.returncode == 0:
            return [*base, "metrics"]
    return None


def resolve_railway_base_command() -> list[str] | None:
    for base in (["railway"], ["npx", "-y", "@railway/cli@latest"]):
        completed = subprocess.run(
            [*base, "--version"],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
        if completed.returncode == 0:
            return base
    return None


def render_human(snapshot: dict[str, Any]) -> str:
    app = snapshot["gemini_app_estimate"]
    totals = app["totals"]
    prompt = app["prompt_lab"]
    db = app["railway_databases"]
    billing = snapshot["gemini_billing"]
    railway = snapshot["railway_metrics"]

    lines = [
        "Gastify Cost Usage Snapshot",
        f"Window: {snapshot['window']['since_at']} to {snapshot['window']['until_at']}",
        "",
        "Gemini app estimate",
        f"  Total: {tokens_line(totals)}",
        f"  Prompt lab: {prompt.get('cases', 0)} cases, {tokens_line(prompt.get('totals', {}))}",
        (
            "  Railway DB: "
            f"{db.get('llm_transactions', 0)} LLM transactions, {tokens_line(db.get('totals', {}))}"
        ),
        "",
        "Google billing",
        f"  Status: {billing.get('status')}",
    ]
    if billing.get("status") == "ok":
        billing_totals = billing.get("totals", {})
        lines.append(
            "  Net billed cost: "
            f"${billing_totals.get('net_cost', '0')} "
            f"(gross ${billing_totals.get('gross_cost', '0')}, "
            f"credits ${billing_totals.get('credits', '0')})"
        )
    else:
        lines.append(f"  Reason: {billing.get('reason', 'not available')}")

    lines.extend(["", "Railway metrics", f"  Status: {railway.get('status')}"])
    if railway.get("status") == "ok":
        lines.append(
            f"  Project/environment: {railway.get('project')} / {railway.get('environment')}"
        )
        for service in railway.get("services", []):
            memory = service.get("memory", {})
            lines.append(
                "  "
                f"{service.get('name')}: memory {memory.get('current_mb', 0):.1f} MB "
                f"({memory.get('utilization_pct', 0):.1f}%)"
            )
            for volume in service.get("volumes", []):
                lines.append(
                    "    volume "
                    f"{volume.get('name')}: {volume.get('current_mb', 0):.1f}/"
                    f"{volume.get('limit_mb', 0):.1f} MB "
                    f"({volume.get('utilization_pct', 0):.1f}%)"
                )

    if snapshot["warnings"]:
        lines.extend(["", "Warnings"])
        lines.extend(f"  - {warning}" for warning in snapshot["warnings"])

    return "\n".join(lines)


def tokens_line(totals: dict[str, Any]) -> str:
    return (
        f"{int(totals.get('total_tokens') or 0):,} tokens "
        f"({int(totals.get('input_tokens') or 0):,} in / "
        f"{int(totals.get('output_tokens') or 0):,} out), "
        f"${totals.get('cost_usd', '0')}"
    )


def empty_prompt_lab_summary(status: str) -> dict[str, Any]:
    return {
        "status": status,
        "root": relative_path(PROMPT_LAB_COST_ROOT),
        "files": 0,
        "cases": 0,
        "totals": stringify_totals(empty_totals()),
        "by_model": {},
        "included_paths": [],
    }


def empty_railway_db_summary(status: str) -> dict[str, Any]:
    return {
        "status": status,
        "environment": DEFAULT_RAILWAY_ENVIRONMENT,
        "services": [],
        "transactions": 0,
        "llm_transactions": 0,
        "totals": stringify_totals(empty_totals()),
    }


def empty_totals() -> dict[str, Any]:
    return {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "cost_usd": Decimal("0"),
    }


def add_totals(
    totals: dict[str, Any],
    input_tokens: int,
    output_tokens: int,
    total_tokens: int,
    cost_usd: Decimal,
) -> None:
    totals["input_tokens"] += input_tokens
    totals["output_tokens"] += output_tokens
    totals["total_tokens"] += total_tokens
    totals["cost_usd"] += cost_usd


def stringify_totals(totals: dict[str, Any]) -> dict[str, Any]:
    return {
        "input_tokens": int(totals.get("input_tokens") or 0),
        "output_tokens": int(totals.get("output_tokens") or 0),
        "total_tokens": int(totals.get("total_tokens") or 0),
        "cost_usd": money(decimal_from(totals.get("cost_usd"))),
    }


def stringify_nested_totals(payload: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {
        key: {**value, "totals": stringify_totals(value["totals"])}
        for key, value in sorted(payload.items())
    }


def decimal_from(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def relative_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def percent(current: float, limit: float) -> float:
    if limit <= 0:
        return 0.0
    return round((current / limit) * 100, 3)


def round_floats(payload: dict[str, float]) -> dict[str, float]:
    return {key: round(value, 6) for key, value in payload.items()}


if __name__ == "__main__":
    raise SystemExit(main())
