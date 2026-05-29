#!/usr/bin/env python3
"""Run a deployed staging insights API fixture gate."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlencode

import httpx

from app.services.insights_fixtures import P6_INSIGHTS_SEED_CORPUS, P6_PRIMARY_SCOPE_ID

ROOT_DIR = Path(__file__).resolve().parents[2]
MOBILE_DIR = ROOT_DIR / "mobile"
FIXTURE_CURRENCY = "USD"
FIXTURE_SCOPE = "p6-insights-shared-v1"
FLAG_MUTATION_FIXTURE_ID = "primary-2026-03-restaurant"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed P6 insight transactions through a deployed API and verify rollups."
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
        default=os.getenv("GASTIFY_INSIGHTS_STAGE_ID") or os.getenv("GASTIFY_MOBILE_STAGE_ID"),
        help="Optional grouped run id. Defaults to a timestamped P6 insights id.",
    )
    parser.add_argument("--timeout-s", type=int, default=60)
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
        values[key.strip()] = value.strip().strip('"').strip("'")
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
) -> None:
    response = client.request(method, url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()


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


def fixture_merchant(base: str) -> str:
    return f"{base} [{FIXTURE_SCOPE}]"


def reference_map(rows: dict[str, Any] | list[Any]) -> dict[str, str]:
    if not isinstance(rows, list):
        raise RuntimeError(f"Expected reference list, got: {rows}")
    return {
        str(row["key"]): str(row["id"])
        for row in rows
        if isinstance(row, dict) and row.get("key") and row.get("id")
    }


def find_existing_fixture_transaction(
    client: httpx.Client,
    *,
    api_base_url: str,
    token: str,
    transaction_date: str,
    merchant: str,
) -> list[dict[str, Any]]:
    existing = request_json(
        client,
        "GET",
        f"{api_base_url}/api/v1/transactions?"
        + urlencode(
            {
                "date_from": transaction_date,
                "date_to": transaction_date,
                "merchant": merchant,
            }
        ),
        token=token,
    )
    if not isinstance(existing, dict):
        return []
    return [row for row in existing.get("data", []) if isinstance(row, dict)]


def seed_fixture_transactions(
    client: httpx.Client,
    *,
    api_base_url: str,
    token: str,
    store_categories: dict[str, str],
    item_categories: dict[str, str],
) -> list[dict[str, Any]]:
    seeded: list[dict[str, Any]] = []
    for row in P6_INSIGHTS_SEED_CORPUS:
        if row.ownership_scope_id != P6_PRIMARY_SCOPE_ID:
            continue
        merchant = fixture_merchant(row.merchant)
        transaction_date = row.transaction_date.isoformat()
        for existing in find_existing_fixture_transaction(
            client,
            api_base_url=api_base_url,
            token=token,
            transaction_date=transaction_date,
            merchant=merchant,
        ):
            request_no_content(
                client,
                "DELETE",
                f"{api_base_url}/api/v1/transactions/{existing['id']}",
                token=token,
            )

        payload = {
            "transaction_date": transaction_date,
            "merchant": merchant,
            "store_category_id": store_categories[row.store_category_key],
            "store_category_source": row.store_category_source,
            "total_minor": row.analytics_total_minor,
            "currency": FIXTURE_CURRENCY,
            "receipt_type": row.receipt_type,
            "items": [
                {
                    "name": item.name,
                    "total_price_minor": item.analytics_total_minor,
                    "item_category_id": item_categories[item.item_category_key],
                    "category_source": "user" if item.flag_kind else "ai",
                    "is_flagged": item.flag_kind is not None,
                    "sort_order": index,
                }
                for index, item in enumerate(row.items)
            ],
        }
        created = request_json(
            client,
            "POST",
            f"{api_base_url}/api/v1/transactions",
            token=token,
            json=payload,
        )
        transaction_id = created.get("id") if isinstance(created, dict) else None
        detail = (
            request_json(
                client,
                "GET",
                f"{api_base_url}/api/v1/transactions/{transaction_id}",
                token=token,
            )
            if transaction_id
            else {}
        )
        detail_items = detail.get("items", []) if isinstance(detail, dict) else []
        seeded.append(
            {
                "fixture_id": row.fixture_id,
                "transaction_id": transaction_id,
                "transaction_date": transaction_date,
                "merchant": merchant,
                "total_minor": row.analytics_total_minor,
                "currency": FIXTURE_CURRENCY,
                "items": [
                    {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "total_price_minor": item.get("total_price_minor"),
                    }
                    for item in detail_items
                    if isinstance(item, dict)
                ],
            }
        )
    return seeded


def assert_insights_response(payload: dict[str, Any]) -> None:
    if payload.get("currency") != FIXTURE_CURRENCY:
        raise RuntimeError(f"Unexpected currency: {payload.get('currency')}")
    if payload.get("total_spend_minor") != 276_500:
        raise RuntimeError(f"Unexpected total_spend_minor: {payload.get('total_spend_minor')}")
    top_transaction_keys = [
        row.get("category_key") for row in payload.get("top_transaction_categories", [])
    ]
    expected_transaction_keys = [
        "Supermarket",
        "Restaurant",
        "GasStation",
        "SubscriptionService",
        "BookStore",
    ]
    if top_transaction_keys != expected_transaction_keys:
        raise RuntimeError(f"Unexpected transaction categories: {top_transaction_keys}")
    top_item_keys = [row.get("category_key") for row in payload.get("top_item_categories", [])]
    expected_item_keys = ["MeatSeafood", "Snacks", "PreparedFood", "Pantry", "Produce"]
    if top_item_keys != expected_item_keys:
        raise RuntimeError(f"Unexpected item categories: {top_item_keys}")
    gravity = [
        (row.get("category_key"), row.get("direction"))
        for row in payload.get("gravity_centers", [])
    ]
    expected_gravity = [
        ("Supermarket", "growth"),
        ("Snacks", "growth"),
        ("ServiceCharge", "shrink"),
    ]
    if gravity != expected_gravity:
        raise RuntimeError(f"Unexpected gravity centers: {gravity}")


def assert_flagged_insights_response(payload: dict[str, Any]) -> None:
    if payload.get("currency") != FIXTURE_CURRENCY:
        raise RuntimeError(f"Unexpected flagged currency: {payload.get('currency')}")
    if payload.get("total_spend_minor") != 231_500:
        raise RuntimeError(
            f"Unexpected flagged total_spend_minor: {payload.get('total_spend_minor')}"
        )
    excluded_items = payload.get("excluded_items")
    expected_excluded = [
        {
            "flag_kind": "special_case",
            "total_minor": 80_000,
            "currency": FIXTURE_CURRENCY,
            "item_count": 2,
        }
    ]
    if excluded_items != expected_excluded:
        raise RuntimeError(f"Unexpected flagged excluded_items: {excluded_items}")
    top_item_keys = [row.get("category_key") for row in payload.get("top_item_categories", [])]
    if "PreparedFood" in top_item_keys:
        raise RuntimeError(f"Flagged item still present in top item categories: {top_item_keys}")


def find_seeded_fixture_item(
    seeded: list[dict[str, Any]],
    *,
    fixture_id: str,
) -> tuple[str, str]:
    for row in seeded:
        if row.get("fixture_id") != fixture_id:
            continue
        transaction_id = row.get("transaction_id")
        items = row.get("items")
        if not isinstance(transaction_id, str) or not isinstance(items, list) or not items:
            break
        item = items[0]
        if isinstance(item, dict) and isinstance(item.get("id"), str):
            return transaction_id, str(item["id"])
    raise RuntimeError(f"Seeded fixture item not found for {fixture_id}")


def assert_flag_visible_in_transaction_detail(payload: dict[str, Any], *, item_id: str) -> None:
    for item in payload.get("items", []):
        if not isinstance(item, dict) or item.get("id") != item_id:
            continue
        if item.get("flags") != ["special_case"]:
            raise RuntimeError(f"Flagged item did not expose current-user flags: {item}")
        if item.get("is_flagged") is not True:
            raise RuntimeError(f"Flagged item did not preserve is_flagged=true: {item}")
        return
    raise RuntimeError(f"Flagged item {item_id} missing from transaction detail")


def main() -> None:
    args = parse_args()
    api_base_url = require(args.api_base_url, "API base URL").rstrip("/")
    stage_id = args.stage_id or f"{datetime.now(UTC):%Y%m%dT%H%M%SZ}-p6-insights-api-gate"
    result_dir = args.result_root / "runs" / args.result_env / stage_id / "p6-insights-api-gate"
    latest_dir = args.result_root / "latest" / args.result_env / "p6-insights-api-gate"

    env_values = load_env_file(args.env_file)
    email = require(
        env_values.get("EXPO_PUBLIC_E2E_AUTH_EMAIL") or env_values.get("GASTIFY_MOBILE_E2E_EMAIL"),
        "staging E2E email",
    )
    password = require(
        env_values.get("EXPO_PUBLIC_E2E_AUTH_PASSWORD")
        or env_values.get("GASTIFY_MOBILE_E2E_PASSWORD"),
        "staging E2E password",
    )
    api_key = read_firebase_api_key(args.google_services)
    auth = sign_in(api_key, email=email, password=password)
    token = str(auth["idToken"])

    manifest: dict[str, Any] = {
        "schema": "p6-insights-api-gate.v1",
        "stage_id": stage_id,
        "result_status": "started",
        "api_base_url": api_base_url,
        "result_env": args.result_env,
        "fixture_scope": FIXTURE_SCOPE,
        "currency": FIXTURE_CURRENCY,
        "git_rev": git_value("rev-parse", "HEAD"),
        "git_branch": git_value("branch", "--show-current"),
        "started_at": datetime.now(UTC).isoformat(),
    }

    try:
        with httpx.Client(timeout=args.timeout_s) as client:
            readiness = request_json(client, "GET", f"{api_base_url}/api/v1/health/ready")
            json_write(result_dir / "readiness.json", readiness)
            store_categories = reference_map(
                request_json(client, "GET", f"{api_base_url}/api/v1/reference/store-categories")
            )
            item_categories = reference_map(
                request_json(client, "GET", f"{api_base_url}/api/v1/reference/item-categories")
            )
            seeded = seed_fixture_transactions(
                client,
                api_base_url=api_base_url,
                token=token,
                store_categories=store_categories,
                item_categories=item_categories,
            )
            json_write(result_dir / "seeded-transactions.json", seeded)
            insights = request_json(
                client,
                "GET",
                f"{api_base_url}/api/v1/insights/monthly?period=2026-03&currency={FIXTURE_CURRENCY}",
                token=token,
            )
            if not isinstance(insights, dict):
                raise RuntimeError(f"Unexpected insights response: {insights}")
            assert_insights_response(insights)
            json_write(result_dir / "insights-response.json", insights)

            transaction_id, item_id = find_seeded_fixture_item(
                seeded,
                fixture_id=FLAG_MUTATION_FIXTURE_ID,
            )
            flag_update = request_json(
                client,
                "PUT",
                f"{api_base_url}/api/v1/transactions/{transaction_id}/items/{item_id}/flags",
                token=token,
                json={"flags": ["special_case"]},
            )
            if not isinstance(flag_update, dict):
                raise RuntimeError(f"Unexpected flag update response: {flag_update}")
            assert_flag_visible_in_transaction_detail(flag_update, item_id=item_id)
            json_write(result_dir / "flag-update-response.json", flag_update)

            flagged_detail = request_json(
                client,
                "GET",
                f"{api_base_url}/api/v1/transactions/{transaction_id}",
                token=token,
            )
            if not isinstance(flagged_detail, dict):
                raise RuntimeError(f"Unexpected flagged detail response: {flagged_detail}")
            assert_flag_visible_in_transaction_detail(flagged_detail, item_id=item_id)
            json_write(result_dir / "transaction-detail-after-flag.json", flagged_detail)

            flagged_insights = request_json(
                client,
                "GET",
                f"{api_base_url}/api/v1/insights/monthly?period=2026-03&currency={FIXTURE_CURRENCY}",
                token=token,
            )
            if not isinstance(flagged_insights, dict):
                raise RuntimeError(f"Unexpected flagged insights response: {flagged_insights}")
            assert_flagged_insights_response(flagged_insights)
            json_write(result_dir / "insights-after-flag-response.json", flagged_insights)
            manifest.update(
                {
                    "result_status": "passed",
                    "seeded_transaction_count": len(seeded),
                    "top_transaction_count": len(insights.get("top_transaction_categories", [])),
                    "top_item_count": len(insights.get("top_item_categories", [])),
                    "gravity_center_count": len(insights.get("gravity_centers", [])),
                    "flag_mutation_verified": True,
                    "flagged_fixture_id": FLAG_MUTATION_FIXTURE_ID,
                    "flagged_total_spend_minor": flagged_insights.get("total_spend_minor"),
                    "flagged_excluded_items": flagged_insights.get("excluded_items"),
                    "completed_at": datetime.now(UTC).isoformat(),
                }
            )
    except Exception as exc:
        manifest.update(
            {
                "result_status": "failed",
                "error": str(exc),
                "completed_at": datetime.now(UTC).isoformat(),
            }
        )
        json_write(result_dir / "manifest.json", manifest)
        json_write(latest_dir / "manifest.json", manifest)
        raise

    json_write(result_dir / "manifest.json", manifest)
    json_write(latest_dir / "manifest.json", manifest)
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
