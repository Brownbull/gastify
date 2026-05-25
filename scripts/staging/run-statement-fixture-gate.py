#!/usr/bin/env python3
"""Run a deployed staging-e2e statement PDF upload/reconciliation fixture gate."""

from __future__ import annotations

import argparse
import io
import json
import os
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import httpx
from pypdf import PdfWriter

ROOT_DIR = Path(__file__).resolve().parents[2]
MOBILE_DIR = ROOT_DIR / "mobile"
FIXTURE_CURRENCY = "USD"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Upload a generated statement PDF to deployed staging-e2e and verify "
            "fixture extraction and reconciliation."
        )
    )
    parser.add_argument(
        "--api-base-url",
        default=os.getenv("GASTIFY_STAGING_E2E_API_BASE_URL")
        or os.getenv("GASTIFY_STAGING_API_BASE_URL"),
        help="Deployed API base URL. Defaults to GASTIFY_STAGING_E2E_API_BASE_URL.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(os.getenv("GASTIFY_MOBILE_ENV_FILE", str(MOBILE_DIR / ".env.staging"))),
        help="Mobile staging env file containing the E2E email/password.",
    )
    parser.add_argument(
        "--google-services",
        type=Path,
        default=MOBILE_DIR / "google-services.json",
        help="Android Firebase google-services.json used to read the web API key.",
    )
    parser.add_argument(
        "--result-root",
        type=Path,
        default=ROOT_DIR / "tests" / "mobile" / "results",
        help="Ignored test result root.",
    )
    parser.add_argument(
        "--result-env",
        default=os.getenv("GASTIFY_RESULT_ENV")
        or os.getenv("GASTIFY_ARTIFACT_ENV")
        or "staging-e2e",
        help="Result environment folder.",
    )
    parser.add_argument(
        "--stage-id",
        default=os.getenv("GASTIFY_STATEMENT_STAGE_ID") or os.getenv("GASTIFY_MOBILE_STAGE_ID"),
        help="Optional grouped run id. Defaults to a timestamped P5 statement id.",
    )
    parser.add_argument("--timeout-s", type=int, default=90)
    parser.add_argument("--poll-interval-s", type=float, default=1.0)
    parser.add_argument(
        "--seed-fixture-transactions",
        action="store_true",
        help="Seed one matching receipt transaction plus one receipt-only transaction via the API.",
    )
    parser.add_argument(
        "--require-three-buckets",
        action="store_true",
        help="Fail unless matched, statement-only, and receipt-only buckets are all present.",
    )
    return parser.parse_args()


def load_env_file(path: Path) -> dict[str, str]:
    if not path.exists() and path.name == ".env.staging":
        fallback = path.with_name(".env")
        if fallback.exists():
            path = fallback
    if not path.exists():
        raise SystemExit(f"Missing env file: {path}")

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        values[key.strip()] = value
    return values


def require(value: str | None, label: str) -> str:
    if value:
        return value
    raise SystemExit(f"Missing required {label}.")


def read_firebase_api_key(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing Firebase config: {path}")
    config = json.loads(path.read_text(encoding="utf-8"))
    clients = config.get("client") or []
    for client in clients:
        for api_key in client.get("api_key") or []:
            current_key = api_key.get("current_key")
            if current_key:
                return str(current_key)
    raise SystemExit(f"No Firebase API key found in {path}")


def sign_in(api_key: str, *, email: str, password: str) -> dict[str, Any]:
    response = httpx.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=30,
    )
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise SystemExit(f"Firebase sign-in returned unexpected payload: {body}")
    if not body.get("idToken") or not body.get("localId"):
        raise SystemExit(f"Firebase sign-in failed: {body.get('error', {}).get('message', body)}")
    return cast("dict[str, Any]", body)


def generated_pdf_bytes(stage_id: str) -> bytes:
    buffer = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=144, height=144)
    writer.add_metadata(
        {
            "/Title": "Gastify P5 statement fixture",
            "/Subject": f"Generated staging-e2e statement upload fixture {stage_id}",
        }
    )
    writer.write(buffer)
    return buffer.getvalue()


def git_value(*args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args],
            cwd=ROOT_DIR,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def request_json(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    token: str | None = None,
    **kwargs: Any,
) -> dict[str, Any] | list[Any]:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = client.request(method, url, headers=headers, **kwargs)
    response.raise_for_status()
    body = response.json()
    if isinstance(body, (dict, list)):
        return body
    raise RuntimeError(f"Unexpected JSON response: {body}")


def request_no_content(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    token: str,
    **kwargs: Any,
) -> None:
    response = client.request(
        method,
        url,
        headers={"Authorization": f"Bearer {token}"},
        **kwargs,
    )
    response.raise_for_status()


def seed_fixture_transactions(
    client: httpx.Client,
    *,
    api_base_url: str,
    token: str,
    stage_id: str,
) -> dict[str, Any]:
    existing = request_json(
        client,
        "GET",
        (
            f"{api_base_url}/api/v1/transactions"
            "?date_from=2026-05-03&date_to=2026-05-03&merchant=Supermercado%20Fixture"
        ),
        token=token,
    )
    deleted: list[str] = []
    if isinstance(existing, dict):
        for transaction in existing.get("data", []):
            if (
                isinstance(transaction, dict)
                and transaction.get("merchant", "").casefold() == "supermercado fixture"
                and transaction.get("total_minor") == 19_990
                and transaction.get("currency") == FIXTURE_CURRENCY
            ):
                transaction_id = str(transaction["id"])
                request_no_content(
                    client,
                    "DELETE",
                    f"{api_base_url}/api/v1/transactions/{transaction_id}",
                    token=token,
                )
                deleted.append(transaction_id)

    matching = request_json(
        client,
        "POST",
        f"{api_base_url}/api/v1/transactions",
        token=token,
        json={
            "transaction_date": "2026-05-03",
            "merchant": "Supermercado Fixture",
            "total_minor": 19_990,
            "currency": FIXTURE_CURRENCY,
            "receipt_type": "scan",
        },
    )
    receipt_only = request_json(
        client,
        "POST",
        f"{api_base_url}/api/v1/transactions",
        token=token,
        json={
            "transaction_date": "2026-05-06",
            "merchant": f"Receipt Only Fixture {stage_id}",
            "total_minor": 7_777,
            "currency": FIXTURE_CURRENCY,
            "receipt_type": "scan",
        },
    )
    return {
        "deleted_existing_match_ids": deleted,
        "matching_transaction": matching,
        "receipt_only_transaction": receipt_only,
    }


def main() -> int:
    args = parse_args()
    api_base_url = require(args.api_base_url, "API base URL").rstrip("/")
    env_values = load_env_file(args.env_file)
    email = require(
        os.getenv("EXPO_PUBLIC_E2E_AUTH_EMAIL")
        or os.getenv("GASTIFY_MOBILE_E2E_EMAIL")
        or env_values.get("EXPO_PUBLIC_E2E_AUTH_EMAIL")
        or env_values.get("GASTIFY_MOBILE_E2E_EMAIL"),
        "staging E2E email",
    )
    password = require(
        os.getenv("EXPO_PUBLIC_E2E_AUTH_PASSWORD")
        or os.getenv("GASTIFY_MOBILE_E2E_PASSWORD")
        or env_values.get("EXPO_PUBLIC_E2E_AUTH_PASSWORD")
        or env_values.get("GASTIFY_MOBILE_E2E_PASSWORD"),
        "staging E2E password",
    )

    stage_id = args.stage_id or f"{datetime.now(UTC):%Y%m%dT%H%M%SZ}-p5-statement-fixture"
    run_dir = args.result_root / "runs" / args.result_env / stage_id
    result_dir = run_dir / "p5-statement-fixture-backend"
    latest_dir = args.result_root / "latest" / args.result_env / "p5-statement-fixture-backend"
    result_dir.mkdir(parents=True, exist_ok=True)

    started_at = datetime.now(UTC)
    git_status = git_value("status", "--short")
    manifest: dict[str, Any] = {
        "schema": "statement-fixture-gate.v1",
        "result_layout": "backend-stage-run-folder-v1",
        "run_id": stage_id,
        "result_environment": args.result_env,
        "api_base_url": api_base_url,
        "generated_at": started_at.isoformat(),
        "result_dir": str(result_dir.relative_to(ROOT_DIR)),
        "git_rev": git_value("rev-parse", "--short", "HEAD"),
        "git_dirty_file_count": len(git_status.splitlines()) if git_status else 0,
    }

    try:
        api_key = read_firebase_api_key(args.google_services)
        auth_result = sign_in(api_key, email=email, password=password)
        token = str(auth_result["idToken"])
        manifest["auth_verified"] = True

        with httpx.Client(timeout=30) as client:
            readiness = request_json(client, "GET", f"{api_base_url}/api/v1/health/ready")
            json_write(result_dir / "readiness.json", readiness)
            if not isinstance(readiness, dict) or readiness.get("status") != "ok":
                raise RuntimeError(f"Readiness failed: {readiness}")

            if args.seed_fixture_transactions:
                seeded = seed_fixture_transactions(
                    client,
                    api_base_url=api_base_url,
                    token=token,
                    stage_id=stage_id,
                )
                json_write(result_dir / "seeded-transactions.json", seeded)
                manifest["seeded_fixture_transactions"] = True
            else:
                manifest["seeded_fixture_transactions"] = False

            pdf_bytes = generated_pdf_bytes(stage_id)
            upload = request_json(
                client,
                "POST",
                f"{api_base_url}/api/v1/statements",
                token=token,
                files={"file": ("p5-statement-fixture.pdf", pdf_bytes, "application/pdf")},
            )
            json_write(result_dir / "upload-response.json", upload)
            if not isinstance(upload, dict):
                raise RuntimeError(f"Unexpected upload response: {upload}")
            statement = upload["statement"]
            statement_id = statement["id"]

            deadline = time.monotonic() + args.timeout_s
            final_statement: dict[str, Any] = statement
            while time.monotonic() < deadline:
                current = request_json(
                    client,
                    "GET",
                    f"{api_base_url}/api/v1/statements/{statement_id}",
                    token=token,
                )
                if not isinstance(current, dict):
                    raise RuntimeError(f"Unexpected statement response: {current}")
                final_statement = current
                if current.get("status") in {
                    "extracted",
                    "completed",
                    "password_required",
                    "password_invalid",
                    "failed",
                }:
                    break
                time.sleep(args.poll_interval_s)

            json_write(result_dir / "final-statement.json", final_statement)
            if final_statement.get("status") not in {"extracted", "completed"}:
                raise RuntimeError(f"Statement did not extract/reconcile: {final_statement}")

            lines = request_json(
                client,
                "GET",
                f"{api_base_url}/api/v1/statements/{statement_id}/lines",
                token=token,
            )
            json_write(result_dir / "lines.json", lines)
            if not isinstance(lines, list) or len(lines) != 2:
                raise RuntimeError(f"Expected 2 fixture lines, got: {lines}")

            descriptions = {line.get("description") for line in lines if isinstance(line, dict)}
            if {"SUPERMERCADO FIXTURE", "PAGO RECIBIDO"} - descriptions:
                raise RuntimeError(f"Unexpected fixture line descriptions: {descriptions}")

            reconciliation = request_json(
                client,
                "GET",
                f"{api_base_url}/api/v1/statements/{statement_id}/reconciliation",
                token=token,
            )
            json_write(result_dir / "reconciliation.json", reconciliation)
            if not isinstance(reconciliation, dict):
                raise RuntimeError(f"Unexpected reconciliation response: {reconciliation}")
            run = reconciliation.get("run")
            if not isinstance(run, dict) or run.get("total_statement_lines") != 2:
                raise RuntimeError(f"Unexpected reconciliation run: {reconciliation}")
            if args.require_three_buckets and not (
                run.get("matched_count", 0) >= 1
                and run.get("statement_only_count", 0) >= 1
                and run.get("receipt_only_count", 0) >= 1
            ):
                raise RuntimeError(f"Expected three reconciliation buckets: {run}")

            manifest.update(
                {
                    "result_status": "passed",
                    "statement_id": statement_id,
                    "statement_status": final_statement.get("status"),
                    "line_count": len(lines),
                    "reconciliation_status": run.get("status"),
                    "matched_count": run.get("matched_count"),
                    "statement_only_count": run.get("statement_only_count"),
                    "receipt_only_count": run.get("receipt_only_count"),
                    "ambiguous_count": run.get("ambiguous_count"),
                    "coverage_ratio": run.get("coverage_ratio"),
                    "readiness_status": readiness.get("status"),
                    "migration_status": readiness.get("migration_status"),
                    "migration_current": readiness.get("migration_current"),
                    "migration_head": readiness.get("migration_head"),
                }
            )
    except Exception as exc:
        manifest.update({"result_status": "failed", "error": str(exc)})
        json_write(result_dir / "manifest.json", manifest)
        sync_latest(run_dir, result_dir, latest_dir, args.result_root, args.result_env, manifest)
        raise

    json_write(result_dir / "manifest.json", manifest)
    sync_latest(run_dir, result_dir, latest_dir, args.result_root, args.result_env, manifest)
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


def sync_latest(
    run_dir: Path,
    result_dir: Path,
    latest_dir: Path,
    result_root: Path,
    result_env: str,
    manifest: dict[str, Any],
) -> None:
    run_manifest = {
        "schema": "statement-fixture-gate-run.v1",
        "result_layout": "backend-stage-run-folder-v1",
        "run_id": manifest["run_id"],
        "result_environment": result_env,
        "run_dir": str(run_dir.relative_to(ROOT_DIR)),
        "result_dir": str(result_dir.relative_to(ROOT_DIR)),
        "updated_at": datetime.now(UTC).isoformat(),
        "api_base_url": manifest["api_base_url"],
        "git_rev": manifest.get("git_rev"),
        "git_dirty_file_count": manifest.get("git_dirty_file_count"),
        "result_status": manifest.get("result_status"),
    }
    json_write(run_dir / "run-manifest.json", run_manifest)

    if latest_dir.exists():
        for child in latest_dir.iterdir():
            if child.is_dir():
                import shutil

                shutil.rmtree(child)
            else:
                child.unlink()
    latest_dir.mkdir(parents=True, exist_ok=True)
    for source in result_dir.iterdir():
        target = latest_dir / source.name
        target.write_bytes(source.read_bytes())

    latest_env = result_root / "latest" / result_env
    latest_env.mkdir(parents=True, exist_ok=True)
    json_write(latest_env / "run-manifest.json", run_manifest)
    (latest_env / "CURRENT_RUN.txt").write_text(str(manifest["run_id"]) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
