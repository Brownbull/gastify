# Performance SLOs & Baseline Harness — A.20

Phase A prereq A.20. Captures current Firestore-stack performance BEFORE cutover so the new Postgres stack is measured against a real baseline.

Cross-references: A.9 (endpoint shapes), A.10 (indexing strategy), A.13 (RLS performance), A.16 (restore drill), A.21 (staging replay target), SCOPE SCs.

---

## SLO Definitions (from SCOPE)

| SLO | Flow | Target | Measurement |
|-----|------|--------|-------------|
| SC-01 | Receipt scan: submission → visible in History | P95 ≤ 30s | `scan_event` terminal timestamp − upload timestamp |
| SC-02 | App open → top-5 dashboard visible | P95 ≤ 20s | Navigation start → DOMContentLoaded + first meaningful paint |
| SC-04 | Statement upload → bucket reconciliation visible | P95 ≤ 2min | Upload timestamp → reconciliation_matches visible in UI |

---

## Critical-Flow Scenarios

The load harness exercises these flows with realistic payloads:

| # | Scenario | Endpoint(s) | SCOPE | Notes |
|---|----------|-------------|-------|-------|
| 1 | Receipt scan submission | `POST /v1/scans` + SSE `/v1/scans/$id/events` | REQ-01 / SC-01 | Measures end-to-end including Gemini latency |
| 2 | Dashboard cold load | `GET /v1/auth/me` + `GET /v1/transactions?limit=50` + `GET /v1/analytics/top-categories` | SC-02 | Entry path; measures total API roundtrip |
| 3 | Monthly view load | `GET /v1/transactions?date_from&date_to` + analytics endpoints | REQ-06 / SC-02 | Filtered list with aggregations |
| 4 | Statement upload + reconciliation | `POST /v1/statements/import` + `POST /v1/reconciliation/run` | REQ-07/08 / SC-04 | Heaviest batch operation |
| 5 | Authenticated list pagination | `GET /v1/transactions?cursor=...&limit=50` (5 sequential pages) | SC-02 | Validates cursor-pagination under A.10 indexing |
| 6 | DSR endpoints | `GET /v1/privacy/export` + `POST /v1/privacy/erasure` (test account) | REQ-20 | Validates erasure + portability under load |

---

## Harness Tool: k6

k6 chosen as default (Go-based, scriptable in JS, built-in metrics aggregation, CI-friendly JSON output). Artillery or Locust are acceptable substitutes.

### Directory Structure

```
scripts/perf/
├── scenarios/
│   ├── scan-submission.js          # Scenario 1
│   ├── dashboard-cold-load.js      # Scenario 2
│   ├── monthly-view-load.js        # Scenario 3
│   ├── statement-reconciliation.js # Scenario 4
│   ├── list-pagination.js          # Scenario 5
│   └── dsr-endpoints.js            # Scenario 6
├── helpers/
│   ├── auth.js                     # Firebase token acquisition
│   └── assertions.js               # SLO threshold checks
├── run-baseline.sh                 # Run all scenarios, output JSON
├── run-replay.sh                   # Replay against staging (A.21)
└── explain-check.sql               # EXPLAIN ANALYZE index-scan assertions
```

### Example Scenario Shape

```javascript
// scripts/perf/scenarios/dashboard-cold-load.js
import http from 'k6/http';
import { check } from 'k6';
import { getAuthToken } from '../helpers/auth.js';

export const options = {
  vus: 10,
  duration: '5m',
  thresholds: {
    'http_req_duration{scenario:dashboard}': ['p(95)<20000'], // SC-02: 20s P95
  },
};

export default function () {
  const token = getAuthToken();
  const headers = { Authorization: `Bearer ${token}` };

  const me = http.get(`${__ENV.BASE_URL}/v1/auth/me`, { headers });
  check(me, { 'auth/me 200': (r) => r.status === 200 });

  const txns = http.get(`${__ENV.BASE_URL}/v1/transactions?limit=50`, { headers });
  check(txns, { 'transactions 200': (r) => r.status === 200 });

  const top = http.get(`${__ENV.BASE_URL}/v1/analytics/top-categories?n=5`, { headers });
  check(top, { 'top-categories 200': (r) => r.status === 200 });
}
```

---

## Baseline Capture

**Capture P50 / P95 / P99** against current production for ≥1 representative week. Output stored at:

```
docs/rebuild/perf/baseline-2026-MM.json
```

Versioned per quarter so seasonal patterns are visible.

### Output Format

```json
{
  "captured_at": "2026-05-10T00:00:00Z",
  "duration_days": 7,
  "target": "production (Firestore stack)",
  "scenarios": {
    "dashboard-cold-load": {
      "p50_ms": 1200,
      "p95_ms": 3500,
      "p99_ms": 8000,
      "slo_target_ms": 20000,
      "slo_pass": true
    },
    "scan-submission": {
      "p50_ms": 8000,
      "p95_ms": 22000,
      "p99_ms": 28000,
      "slo_target_ms": 30000,
      "slo_pass": true
    }
  }
}
```

---

## Replay Against Staging (Gate Cutover-Ready)

At Gate Cutover-Ready, `run-replay.sh` executes all scenarios against the staging Postgres stack (A.21).

### Regression Thresholds

| Regression | Action |
|------------|--------|
| ≤20% on all SC-bound flows | Pass — cutover proceeds |
| >20% on any SC-bound flow | Cutover veto trigger — investigate and fix before re-run |
| >50% on any SC-bound flow | Gate Cutover-Ready CANNOT pass under any signoff |

### Continuous Baseline During Cutover

Harness runs nightly against staging during Phase E.2 dual-write. Drift alerts route through A.13 alerting webhook.

---

## Indexing-Strategy Guard

The harness includes a query-plan check via `EXPLAIN ANALYZE` over RLS-bound list reads under `app_user`.

```sql
-- scripts/perf/explain-check.sql
-- Run as app_user with SET app.current_scope_id = '<test_scope>';

-- Must show "Index Scan" not "Seq Scan"
EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE ownership_scope_id = (SELECT auth.uid())
ORDER BY transaction_date DESC, id DESC
LIMIT 50;

-- Same for items aggregated view
EXPLAIN ANALYZE
SELECT item_category_id, COUNT(*), SUM(total_price_minor)
FROM line_items li
JOIN transactions t ON li.transaction_id = t.id
WHERE t.ownership_scope_id = (SELECT auth.uid())
GROUP BY item_category_id
ORDER BY SUM(total_price_minor) DESC
LIMIT 20;
```

A `Seq Scan` regression on any RLS-bound list query is its own veto trigger — indicates missing index or RLS policy defeating the planner.

---

## Abort Criteria

Performance baseline failure does NOT block Phase A completion — it blocks Gate Cutover-Ready. The harness infrastructure (scripts, SLO definitions, directory structure) is the Phase A deliverable. Actual baseline data capture happens when production has enough traffic to be representative.
