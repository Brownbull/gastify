# P6 Insights Contract

This document records the Phase 1 contract for roadmap P6: monthly insights,
gravity-center detection, and item flags.

## Contract Shape

Backend schemas live in `backend/app/schemas/insights.py`.

The first response contract is `MonthlyInsightsResponse` with:

- `top_transaction_categories`: L2 transaction/store category rollups grouped by
  deterministic L1 parent.
- `top_item_categories`: L4 item category rollups grouped by deterministic L3
  parent.
- `gravity_centers`: growth/shrink rows against the trailing baseline.
- `excluded_items`: aggregate exclusion totals for user-private item flags.

Prompts must not emit L1 or L3 category keys. L1 and L3 are derived from the
canonical taxonomy parent relationships.

## Seed Corpus

The deterministic Phase 1 seed corpus lives in
`backend/app/services/insights_fixtures.py`.

It covers:

- three months of primary-user transactions: January, February, and March 2026;
- a second ownership scope to prove future isolation checks;
- receipt-sourced and statement-sourced transactions;
- a user-edited store category;
- one USD source transaction with deterministic CLP reporting totals and USD
  shadow identity;
- one special-case flagged item that must be excluded from aggregates while its
  transaction remains visible;
- growth and shrink controls for gravity-center output.

## Locked Expected Output

`P6_MARCH_EXPECTED_INSIGHTS` is the March 2026 target for Phase 2.

Current locked totals:

| Field | Expected |
|---|---:|
| Total included spend | CLP 276,500 |
| Included item count | 8 |
| Transactions in period | 7 |
| Excluded special-case spend | CLP 35,000 |

Top transaction categories:

| Rank | L2 Category | Total |
|---:|---|---:|
| 1 | Supermarket | CLP 180,000 |
| 2 | Restaurant | CLP 45,000 |
| 3 | GasStation | CLP 24,000 |
| 4 | SubscriptionService | CLP 18,000 |
| 5 | BookStore | CLP 9,500 |

Top item categories:

| Rank | L4 Category | Total |
|---:|---|---:|
| 1 | MeatSeafood | CLP 60,000 |
| 2 | Snacks | CLP 50,000 |
| 3 | PreparedFood | CLP 45,000 |
| 4 | Pantry | CLP 40,000 |
| 5 | Produce | CLP 30,000 |

Gravity centers:

| Dimension | Category | Direction | Ratio |
|---|---|---|---:|
| transaction_category | Supermarket | growth | 1.76 |
| item_category | Snacks | growth | 1.67 |
| item_category | ServiceCharge | shrink | 0.44 |

## Phase 2 Obligation

The runtime rollup engine should compute the same March response from the seed
corpus before any web or Android UI depends on the analytics API.

Mixed-currency rows should contribute their deterministic reporting-currency
minor units to the CLP monthly response while preserving the transaction's USD
shadow fields for cross-currency stability checks.

## Phase 2 Runtime API

Phase 2 promotes the contract through an authenticated backend route:

```text
GET /api/v1/insights/monthly?period=YYYY-MM&currency=CLP
```

Runtime behavior:

- `period` is required and must be a valid `YYYY-MM` month.
- `currency` is optional; when absent, the API uses the authenticated user's
  default currency.
- Results are ownership-scoped through the normal Firebase-auth dependency.
- The service computes transaction L2 rollups, item L4 rollups, special-case
  item exclusions, and gravity centers from persisted transactions.
- A process-local cache is guarded by a database fingerprint covering the
  requested month plus the trailing baseline window, so transaction or item
  edits invalidate stale monthly output.

## Phase 4 Runtime API — series + drill-down tree (D68/D69/D77, P66)

D68/D69 added two more authenticated, ownership-scoped insights routes; D77 generalized
their `period` from month-only to month/quarter/year; P66 added an optional per-node
sparkline series to the tree.

```text
GET /api/v1/insights/series?from_month=YYYY-MM&to_month=YYYY-MM&granularity=week|month|quarter|year&currency=CLP
GET /api/v1/insights/tree?period=YYYY-MM|YYYY-Qn|YYYY&dimension=transaction_category|item_category&include_series=false&currency=CLP
```

- `/series` (D68): one additive range read bucketed by `granularity` into a spend
  time-series — the O(1)-request replacement for a client fan-out of N monthly calls.
  Each point carries `period`, `period_start/end`, `total_spend_minor`, and
  `transaction_count`, using the same post-exclusion `included_total_minor` as
  `/monthly`. Zero-spend buckets are emitted so the line shows gaps.
- `/tree` (D69): the full untruncated drill-down category tree for one `period` +
  `dimension`. `transaction_category` yields the 4-level Industry → Store-type →
  Item-family → Item store cross-walk; `item_category` the 2-level Family → Item tree.
  Fetched once; the client expands it in memory (zero round-trips per drill).
- `period` (D77): both `/tree` and `/monthly` accept `YYYY-MM` (month), `YYYY-Qn`
  (quarter), or `YYYY` (year); a malformed key returns 422. Month behavior is unchanged.
  Gravity centers remain a single-month-vs-baseline signal (omitted for quarter/year).
- `include_series` (P66, `/tree` only): when `true`, each top-level (root) node carries
  a within-period sub-bucket spend `series` (a single month → ISO weeks; quarter/year →
  calendar months) for the report-detail trend sparklines. Off by default to keep the
  tree lean for the dashboard/trends consumers that only drill.
- All routes are ownership-scoped through the Firebase-auth dependency and accept an
  optional `group_id` to analyze a group scope you belong to.

## Phase 3 Item Flag Semantics

Phase 3 promotes item flags from fixture-only `is_flagged` compatibility into a
user-private mutation contract:

```text
PUT /api/v1/transactions/{transaction_id}/items/{item_id}/flags
```

Runtime behavior:

- Request body is `{"flags": ["urgency" | "special_case"]}`; an empty list
  clears the current user's flags for that item.
- Flags are stored in `transaction_item_flags` with explicit `user_id` and
  `ownership_scope_id`; the source transaction item remains unchanged.
- Transaction detail still returns the item and exposes the current user's
  `flags`; `is_flagged` is true when either legacy item state or current-user
  flags are present.
- Monthly insights exclude current-user flagged items from aggregates while
  preserving their totals in `excluded_items`.
- The monthly insights cache fingerprint includes current-user item flags, so
  flag create/update/remove operations invalidate stale aggregate output.
- Privacy erasure HARD-DELETES the erasing user's transactions, items, images, and
  flag rows (D89, amends D4); only a scrubbed User shell + the PII-free `dsr_erasure`
  audit event survive. (Earlier behavior anonymized the rows in place.)

## Staging API Gate

The deployed Phase 2 proof is the ignored artifact packet produced by:

```bash
cd backend
uv run python ../scripts/staging/run-insights-api-gate.py \
  --api-base-url https://gastify-api-staging-e2e-staging.up.railway.app
```

The gate signs in with the local staging E2E Firebase credentials, seeds the P6
fixture corpus through the deployed `/transactions` API using a deterministic
fixture merchant scope, fetches `/insights/monthly`, verifies the locked top
transaction categories, item categories, gravity-center rows, and total spend.
For Phase 3 and later it also flags one seeded transaction item through the
deployed item-flag endpoint, verifies the flag remains visible in transaction
detail, re-fetches `/insights/monthly`, and verifies the flagged item is
excluded from aggregate spend while reported in `excluded_items`.

The gate writes its manifest under
`tests/mobile/results/runs/<env>/<stage-id>/`.
