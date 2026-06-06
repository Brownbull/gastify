#!/usr/bin/env python3
"""Give the deployed staging-e2e e2e-user transactions a "By store" breakdown.

The existing staging-e2e fixtures are item-categorized but NOT store-categorized, so
the Reports v2 report-detail "By store" breakdown is empty (the store cross-walk tree
has no roots). Two modes:

  (default)     SEED  — POST a spread of NEW store-categorized transactions across
                        Jan-May 2026 (with items, full Industry/Store-type/Family/Item
                        cross-walk). Use when a period has no real data to categorize.
  --backfill    BACKFILL — set `store_category_id` on the EXISTING store-uncategorized
                        rows (derived from the merchant), so the breakdown reflects the
                        real data instead of a synthetic sliver next to "Other". Also
                        removes any prior synthetic "(store-seed)" rows first.

Staging-only data tool (mirrors run-insights-api-gate.py): signs in as the e2e user via
the Firebase REST API, resolves store/item category keys -> UUIDs from the reference
endpoints, then writes via the transactions API and verifies the store tree.

Usage (from backend/, env var points at the deployed staging-e2e API):
  GASTIFY_STAGING_E2E_API_BASE_URL=https://...up.railway.app \
    uv run python ../scripts/staging/seed-store-categorized-staging.py [--backfill] [--dry-run]
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import os
import sys
from collections import Counter
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

# Marks the SEEDED transactions so a re-run can clean them up (idempotent).
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

# Merchant keyword → store-type L2 key (substring match on the lowercased merchant).
# Real Chilean retail names map to the obvious store-type; everything else falls
# through to the per-transaction spread below.
_MERCHANT_KEYWORDS: list[tuple[tuple[str, ...], str]] = [
    (
        ("supermerc", "jumbo", "lider", "tottus", "santa isabel", "unimarc", "acuenta"),
        "Supermarket",
    ),
    (("minimarket", "minimercado", "almacen"), "Minimarket"),
    (("panaderia", "bakery", "pasteleria"), "Bakery"),
    (("carniceria", "butcher", "carnes"), "Butcher"),
    (("restaurant", "resto", "cafe", "cafeteria", "comida", "pizzeria"), "Restaurant"),
    (("botilleria", "liquor", "vinoteca"), "LiquorStore"),
    (("utility", "enel", "aguas", "metrogas", "cge"), "UtilityCompany"),
]

# Fallback for generic/test merchants ("Phase5 S23 Journey", "Receipt History Fixture",
# "Unknown"). Weighted toward food retail since the items are groceries. Picked by a
# deterministic hash of the transaction id, so generic merchants SPREAD across types
# (a varied breakdown) yet the assignment is reproducible + idempotent.
_FALLBACK_STORES: list[str] = (
    ["Supermarket"] * 5
    + ["Minimarket"] * 3
    + ["Bakery"] * 2
    + ["Butcher"] * 2
    + ["Restaurant"] * 2
    + ["LiquorStore"]
)


def _derive_store_key(merchant: str, txn_id: str) -> str:
    """Map a transaction to a store-type L2 key: merchant keyword first, else a
    deterministic per-transaction spread."""
    low = (merchant or "").lower()
    for needles, store in _MERCHANT_KEYWORDS:
        if any(n in low for n in needles):
            return store
    h = int(hashlib.sha1(txn_id.encode()).hexdigest(), 16)
    return _FALLBACK_STORES[h % len(_FALLBACK_STORES)]


_SWEEP_PAGES = 60  # ≤ 12000 rows at limit=200


def _sweep_transactions(client: Any, base: str, token: str) -> list[dict[str, Any]]:
    """Full cursor sweep of the e2e user's transactions (bounded). Warns rather than
    silently truncating if a page errors or the page cap is hit — a partial sweep would
    leave rows unprocessed by cleanup/backfill."""
    headers = {"Authorization": f"Bearer {token}"}
    rows: list[dict[str, Any]] = []
    cursor: str | None = None
    complete = False
    for _ in range(_SWEEP_PAGES):
        params: dict[str, Any] = {"limit": 200}
        if cursor:
            params["cursor"] = cursor
        r = client.get(f"{base}/api/v1/transactions", headers=headers, params=params)
        if r.status_code != 200:
            print(f"  WARN: sweep stopped early (HTTP {r.status_code}) — partial {len(rows)} rows")
            break
        body = r.json()
        rows.extend(body.get("data", []))
        cursor = body.get("cursor")
        if not cursor:
            complete = True
            break
    if not complete and rows and cursor:
        print(f"  WARN: transaction sweep hit the {_SWEEP_PAGES}-page cap — list may be truncated")
    return rows


def _cleanup_prior_seed(client: Any, base: str, token: str) -> int:
    """Delete previously-SEEDED "(store-seed)" rows so re-runs don't pile up.

    Sweeps ALL ids first, then deletes — deleting mid-sweep would shift the cursor and
    skip rows.
    """
    headers = {"Authorization": f"Bearer {token}"}
    ids = [
        t["id"]
        for t in _sweep_transactions(client, base, token)
        if SEED_MARKER in (t.get("merchant") or "")
    ]
    removed = 0
    for tid in ids:
        d = client.delete(f"{base}/api/v1/transactions/{tid}", headers=headers)
        if d.status_code in (200, 204):
            removed += 1
    return removed


def backfill_existing(
    client: Any, base: str, token: str, store_map: dict[str, str]
) -> dict[str, Any]:
    """Set store_category_id on EXISTING store-uncategorized rows, derived from the
    merchant. Only touches rows with no store category; content-locked/shared rows that
    reject the PATCH are skipped (counted), not fatal."""
    headers = {"Authorization": f"Bearer {token}"}
    targets = [
        t
        for t in _sweep_transactions(client, base, token)
        if not t.get("store_category_id") and SEED_MARKER not in (t.get("merchant") or "")
    ]
    done = 0
    by_store: Counter[str] = Counter()
    fail_codes: Counter[int] = Counter()  # 409 = expected (shared/content-locked); else investigate
    for t in targets:
        key = _derive_store_key(t.get("merchant") or "", t["id"])
        store_id = store_map.get(key) or store_map.get("Supermarket")
        if store_id is None:
            fail_codes[0] += 1  # no store id resolved at all
            continue
        # PATCH a content-locked field (store_category_id): the handler treats it as a
        # user edit (forces source="user", stamps store_category_user_edited_at) and
        # rejects with 409 if the row is shared to a group (D74) — those are skipped.
        # TransactionUpdate has no store_category_source field, so we send only the id.
        resp = client.patch(
            f"{base}/api/v1/transactions/{t['id']}",
            headers=headers,
            json={"store_category_id": store_id},
        )
        if resp.status_code in (200, 201):
            done += 1
            by_store[key] += 1
        else:
            fail_codes[resp.status_code] += 1
    return {
        "targets": len(targets),
        "done": done,
        "skipped": sum(fail_codes.values()),
        "fail_codes": dict(fail_codes),
        "by_store": dict(by_store),
    }


def _validate_store_keys(store_map: dict[str, str]) -> None:
    """Surface taxonomy drift: warn if any store-type key the tool can emit is missing
    from the live taxonomy (it would otherwise silently fall back to Supermarket)."""
    needed = (
        {store for _, store in _MERCHANT_KEYWORDS}
        | set(_FALLBACK_STORES)
        | {store for _, store, _ in STORE_TEMPLATES}
    )
    missing = sorted(k for k in needed if k not in store_map)
    if missing:
        print(
            f"  WARN: store keys missing from taxonomy (would fall back to Supermarket): {missing}"
        )


def _verify_store_tree(client: Any, base: str, token: str, currency: str) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    for period in ("2026-Q1", "2026-Q2", "2026-05"):
        r = client.get(
            f"{base}/api/v1/insights/tree",
            headers=headers,
            params={"period": period, "dimension": "transaction_category", "currency": currency},
        )
        body = r.json() if r.status_code == 200 else {}
        roots = body.get("roots", [])
        labels = [n["label"] for n in roots]
        print(f"  /tree {period} By-store roots: {len(roots)} {labels}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--api-base-url",
        default=os.getenv("GASTIFY_STAGING_E2E_API_BASE_URL")
        or os.getenv("GASTIFY_STAGING_API_BASE_URL"),
    )
    parser.add_argument("--env-file", default=str(ROOT / "mobile" / ".env"))
    parser.add_argument("--currency", default="CLP")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="Categorize EXISTING rows by merchant (and remove prior synthetic seeds) "
        "instead of seeding new ones.",
    )
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
        _validate_store_keys(store_map)

        if args.backfill:
            if args.dry_run:
                targets = [
                    t
                    for t in _sweep_transactions(client, base, token)
                    if not t.get("store_category_id")
                    and SEED_MARKER not in (t.get("merchant") or "")
                ]
                preview: Counter[str] = Counter(
                    _derive_store_key(t.get("merchant") or "", t["id"]) for t in targets
                )
                print(f"DRY backfill: {len(targets)} uncategorized rows → {dict(preview)}")
                return 0
            removed = _cleanup_prior_seed(client, base, token)
            print(f"removed {removed} synthetic store-seed rows")
            result = backfill_existing(client, base, token, store_map)
            print(
                f"backfill: {result['done']}/{result['targets']} categorized, "
                f"{result['skipped']} skipped — fail codes {result['fail_codes']} "
                f"(409 = shared/content-locked, expected; anything else = investigate)"
            )
            print(f"  by store-type: {result['by_store']}")
            _verify_store_tree(client, base, token, args.currency)
            return 0

        # --- SEED mode (default) ---
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
        _verify_store_tree(client, base, token, args.currency)
        return 0


def _reference_map(client: Any, base: str, token: str, kind: str) -> dict[str, str]:
    r = client.get(f"{base}/api/v1/reference/{kind}", headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return {row["key"]: row["id"] for row in r.json()}


if __name__ == "__main__":
    sys.exit(main())
