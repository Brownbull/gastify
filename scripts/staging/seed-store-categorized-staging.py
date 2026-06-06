#!/usr/bin/env python3
"""Seed STORE-categorized transactions into the deployed staging-e2e e2e-user data.

The existing staging-e2e fixtures are item-categorized but NOT store-categorized, so
the report-detail "By store" breakdown is empty (the store cross-walk tree has no
roots). This seeds a spread of transactions across recent months WITH a store category
(`store_category_id`) AND items (so the full Industry -> Store-type -> Family -> Item
cross-walk populates), giving the quarter/year + month "By store" breakdowns real data.

Staging-only data tool (mirrors run-insights-api-gate.py): signs in as the e2e user via
the Firebase REST API, resolves store/item category keys -> UUIDs from the reference
endpoints, then POSTs the transactions and verifies the store tree is non-empty.

Usage:
  GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging-e2e.up.railway.app \
    uv run python scripts/staging/seed-store-categorized-staging.py [--env-file ../mobile/.env]
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

# Reuse the statement-gate's Firebase sign-in + env helpers (already battle-tested).
_spec = importlib.util.spec_from_file_location(
    "stmt_gate", str(ROOT / "scripts" / "staging" / "run-statement-fixture-gate.py")
)
assert _spec and _spec.loader
_gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_gate)

# Marks the seeded transactions so a re-run can clean them up (idempotent).
SEED_MARKER = "(store-seed)"

# (merchant, store-type L2 key, [(item name, item L4 key, item total_minor), ...]).
# Amounts are in CLP minor, sized so each receipt is ~150k-200k CLP (~$170-$220 once
# the report converts CLP→the reporting currency) — comparable to the real item data,
# so "By store" is a meaningful share rather than a sliver next to uncategorized spend.
STORE_TEMPLATES: list[tuple[str, str, list[tuple[str, str, int]]]] = [
    (
        "Supermercado Lider",
        "Supermarket",
        [
            ("Verduras", "Produce", 92000),
            ("Leche y huevos", "DairyEggs", 58000),
            ("Pan", "BreadPastry", 34000),
        ],
    ),
    ("Restaurant La Plaza", "Restaurant", [("Almuerzo ejecutivo", "PreparedFood", 175000)]),
    (
        "Panaderia San Jose",
        "Bakery",
        [("Marraquetas", "BreadPastry", 68000), ("Pasteles", "BreadPastry", 82000)],
    ),
    (
        "Carniceria Don Pedro",
        "Butcher",
        [("Carne molida", "MeatSeafood", 124000), ("Pollo", "MeatSeafood", 71000)],
    ),
    (
        "Minimarket Esquina",
        "Minimarket",
        [("Bebidas", "Beverages", 90000), ("Snacks", "Snacks", 62000)],
    ),
    ("Botilleria Central", "LiquorStore", [("Vino reserva", "Beverages", 148000)]),
]

# Spread across Jan-May 2026 → Q1 (Jan-Mar) + Q2 (Apr-May) get store data. The current
# month (June, today is the 6th) is skipped so nothing is future-dated.
SEED_DAYS = [(m, d) for m in range(1, 6) for d in (6, 16, 26)]


def _cleanup_prior_seed(client: Any, base: str, token: str) -> int:
    """Delete previously-seeded store-seed transactions so re-runs don't pile up.

    Collects ALL matching ids in a full cursor sweep FIRST, then deletes — deleting
    mid-sweep would shift the cursor and skip rows.
    """
    headers = {"Authorization": f"Bearer {token}"}
    ids: list[str] = []
    cursor: str | None = None
    for _ in range(40):  # bounded sweep (≤ 8000 rows at limit=200)
        params: dict[str, Any] = {"limit": 200}
        if cursor:
            params["cursor"] = cursor
        r = client.get(f"{base}/api/v1/transactions", headers=headers, params=params)
        if r.status_code != 200:
            break
        body = r.json()
        ids.extend(
            t["id"] for t in body.get("data", []) if SEED_MARKER in (t.get("merchant") or "")
        )
        cursor = body.get("cursor")
        if not cursor:
            break
    removed = 0
    for tid in ids:
        d = client.delete(f"{base}/api/v1/transactions/{tid}", headers=headers)
        if d.status_code in (200, 204):
            removed += 1
    return removed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--api-base-url",
        default=os.getenv("GASTIFY_STAGING_E2E_API_BASE_URL")
        or os.getenv("GASTIFY_STAGING_API_BASE_URL"),
    )
    parser.add_argument("--env-file", default=str(ROOT / "mobile" / ".env"))
    parser.add_argument("--currency", default="CLP")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    base = _gate.require(args.api_base_url, "api-base-url")
    env = _gate.load_env_file(Path(args.env_file))
    api_key = _gate.read_firebase_api_key(ROOT / "mobile" / "google-services.json")
    email = _gate.require(
        env.get("EXPO_PUBLIC_E2E_AUTH_EMAIL") or env.get("E2E_AUTH_EMAIL"), "email"
    )
    password = _gate.require(
        env.get("EXPO_PUBLIC_E2E_AUTH_PASSWORD") or env.get("E2E_AUTH_PASSWORD"), "password"
    )
    token = _gate.sign_in(api_key, email=email, password=password)["idToken"]

    import httpx

    with httpx.Client(timeout=30.0) as client:
        store_map = _reference_map(client, base, token, "store-categories")
        item_map = _reference_map(client, base, token, "item-categories")
        print(f"resolved {len(store_map)} store + {len(item_map)} item categories")

        if not args.dry_run:
            removed = _cleanup_prior_seed(client, base, token)
            print(f"cleaned up {removed} prior store-seed transactions")

        created = 0
        for i, (month, day) in enumerate(SEED_DAYS):
            merchant, store_key, items = STORE_TEMPLATES[i % len(STORE_TEMPLATES)]
            store_id = store_map.get(store_key)
            if store_id is None:
                print(f"  skip {store_key}: not in taxonomy")
                continue
            payload: dict[str, Any] = {
                "transaction_date": date(2026, month, day).isoformat(),
                "merchant": f"{merchant} {SEED_MARKER}",
                "store_category_id": store_id,
                "store_category_source": "ai",
                "total_minor": sum(t for _, _, t in items),
                "currency": args.currency,
                "receipt_type": "scan",
                "items": [
                    {
                        "name": name,
                        "total_price_minor": total,
                        "item_category_id": item_map.get(item_key),
                        "category_source": "ai",
                    }
                    for name, item_key, total in items
                ],
            }
            if args.dry_run:
                amount = payload["total_minor"] / 100
                print(f"  DRY {payload['transaction_date']} {store_key} ${amount:.2f}")
                continue
            resp = client.post(
                f"{base}/api/v1/transactions",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            if resp.status_code not in (200, 201):
                print(f"  FAIL {store_key}: {resp.status_code} {resp.text[:90]}")
                continue
            created += 1

        print(f"created {created} store-categorized transactions")

        # Verify: the store cross-walk tree now has roots for Q1 + Q2 2026.
        for period in ("2026-Q1", "2026-Q2"):
            r = client.get(
                f"{base}/api/v1/insights/tree",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "period": period,
                    "dimension": "transaction_category",
                    "currency": args.currency,
                },
            )
            roots = r.json().get("roots", []) if r.status_code == 200 else []
            labels = [n["label"] for n in roots]
            print(f"  /tree {period} By-store roots: {len(roots)} {labels}")
        return 0


def _reference_map(client: Any, base: str, token: str, kind: str) -> dict[str, str]:
    r = client.get(f"{base}/api/v1/reference/{kind}", headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return {row["key"]: row["id"] for row in r.json()}


if __name__ == "__main__":
    sys.exit(main())
