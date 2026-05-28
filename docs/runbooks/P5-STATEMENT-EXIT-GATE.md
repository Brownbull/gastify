# P5 Statement Exit Gate

Last updated: 2026-05-28

This packet ties together the Phase 7 statement reconciliation proof chain. It
records only commands, counts, and artifact paths. Raw PDFs, credentials, local
SQLite data, extracted statement text, prompt-lab caches, and live provider
artifacts remain ignored/private.

## Runtime Decision

- Known statement layouts use deterministic PyMuPDF parsing first.
- Unknown readable text-layer statements use Gemini profile fallback.
- Gemini fallback is promoted with caveats for runtime fallback use; strict
  prompt-lab diagnostics remain separate from the transaction-safety gate.
- Statement-created transaction candidates stay uncategorized and use one
  flagged `Unidentified statement item`.
- Upload-level AI-processing consent is required per statement scan.
- iOS runtime proof is deferred by D47/P31; Web desktop and Android/S23 are the
  P5 runtime gates.

## Deployed Evidence

| Area | Artifact | Result | What It Proves |
|---|---|---:|---|
| Backend fixture gate | `tests/mobile/results/runs/staging-e2e/20260528-phase7-exit-s23/p5-statement-fixture-backend/manifest.json` | passed | Railway `staging-e2e` readiness, migration `021`, statement upload, fixture extraction, reconciliation, one matched line, one statement-only line, app-only bucket, and 20-day receipt-history bucket verification. |
| Backend cross-stage cleanup gate | `tests/mobile/results/runs/staging-e2e/20260528-phase7-cleanup-d/p5-statement-fixture-backend/manifest.json` | passed | A different stage id reused the shared app-only fixture and all 20 shared receipt-history rows (`created=0`, `reused=20`), keeping the receipt-only bucket stable after `20260528-phase7-cleanup-c`. |
| Web desktop journey | `.tmp/staging-e2e/web-statement/20260527T194301Z-phase5-web-statement/manifest.json` | passed | Deployed web route with routed deployed `staging-e2e` API: statement upload, per-scan consent, progress, reconciliation buckets, statement-only candidate, and transaction creation. |
| Android S23 journey | `tests/mobile/results/runs/staging-e2e/20260528-phase7-exit-s23/attempts/145857Z/p5-phase6-statement-reconciliation-active/manifest.json` | passed | Samsung S23 PDF picker, consent, deployed upload/progress, coverage, matched/statement-only/app-only bucket drilldown, statement-only transaction creation success, sign-out, and clean reauth state. |

Latest S23 screenshot packet:

- `01-phase6-signed-in-home.png`
- `02-phase6-statement-entry.png`
- `03-phase6-pdf-selected.png`
- `04-phase6-statement-progress.png`
- `05-phase6-reconciliation-buckets.png`
- `06-phase6-app-only-transactions.png`
- `07-phase6-statement-only-candidates.png`
- `08-phase6-after-candidate-action.png`
- `09-phase6-signed-out.png`
- `10-phase6-reauthenticated-clean-statements.png`

## Phase 7 Backend Gate Counts

From `20260528-phase7-cleanup-d`:

| Field | Value |
|---|---:|
| `result_status` | `passed` |
| `readiness_status` | `ok` |
| `migration_current` / `migration_head` | `021` / `021` |
| `line_count` | `2` |
| `matched_count` | `1` |
| `statement_only_count` | `1` |
| `receipt_only_count` | `111` |
| `coverage_ratio` | `0.5` |
| `receipt_history_scope` | `shared-v1` |
| `receipt_history_days` | `20` |
| `receipt_history_created_count` | `0` |
| `receipt_history_reused_count` | `20` |
| `receipt_history_receipt_only_verified` | `true` |

From the previous cross-stage cleanup run `20260528-phase7-cleanup-c`:

| Field | Value |
|---|---:|
| `result_status` | `passed` |
| `fixture_scope` | `shared-v1` |
| `created_receipt_only_transaction` | `true` |
| `receipt_history_scope` | `shared-v1` |
| `receipt_history_days` | `20` |
| `receipt_history_created_count` | `0` |
| `receipt_history_reused_count` | `20` |
| `receipt_history_receipt_only_verified` | `true` |
| `receipt_only_count` | `111` |

## Edge Coverage Matrix

| Edge | Primary Proof | Notes |
|---|---|---|
| Encrypted PDF missing password | `backend/tests/test_statements.py`, `backend/tests/test_statement_worker.py`, `backend/tests/test_statement_routing.py` | Upload/worker/routing return explicit `password_required` before extraction/provider work. |
| Encrypted PDF wrong password | `backend/tests/test_statements.py`, `backend/tests/test_statement_worker.py`, `backend/tests/test_statement_routing.py` | Upload/worker/routing return explicit `password_invalid`. |
| Invalid PDF | `backend/tests/test_statements.py` | Invalid bytes are rejected without storing a statement record. |
| Duplicate upload idempotency | `backend/tests/test_statements.py` plus deployed fixture rerun | Duplicate upload returns the existing statement; fixture app-only and 20-day rows are find-or-create in a shared deterministic namespace so new stage ids do not inflate the bucket. |
| Extraction failure | `backend/tests/test_statement_worker.py` | Empty/no-normalization and provider-error paths become explicit failed states without persisted lines. |
| No matches | `backend/tests/test_statement_reconciliation.py` | Produces statement-only and receipt-only buckets. |
| Ambiguous matches | `backend/tests/test_statement_reconciliation.py` | Duplicate receipt candidates become an ambiguous verdict. |
| Archived alias | `backend/tests/test_statement_reconciliation.py` | Reconciliation still matches stored transaction alias ids even when alias is archived. |
| User-edited transaction precedence | `backend/tests/test_statement_reconciliation.py` | Reconciliation does not overwrite user-edited transaction fields. |
| Non-ledger-ready fallback rows | `backend/tests/test_statement_reconciliation.py` | Ambiguous financial evidence remains auditable but does not create a transaction candidate. |
| Payment-like statement rows | `backend/tests/test_statement_reconciliation.py` | Payment/negative rows remain in statement-only audit output without create candidates. |
| SSE stream | `backend/tests/test_statement_stream.py` | Statement SSE streams ordered progress, requires token, handles auth failure, and replays terminal events for late subscribers. |
| WebSocket stream | `backend/tests/test_statement_stream.py` | Statement WebSocket streams progress and closes on auth/not-found failures. |
| Web sign-out cleanup | `web/src/routes/-statements.test.tsx` and deployed web proof | Statement state clears across sign-out; consent resets after successful upload. |
| Android sign-out cleanup | `mobile/src/screens/__tests__/StatementsScreen.test.tsx` and S23 proof | S23 reauth returns to a clean statement screen with no stale reconciliation panel. |

## Verification Commands

Current Phase 7 local results:

| Gate | Result |
|---|---:|
| `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` | pass |
| `bash -n scripts/staging/run-s23-phase6-statement-gate.sh scripts/staging/run-statement-fixture-gate.py tests/mobile/scripts/seed-statement-fixture.sh tests/mobile/scripts/run-maestro.sh` | pass |
| `cd backend && uv run ruff check app tests` | pass |
| `cd backend && uv run ruff format --check .` | pass |
| `cd backend && uv run mypy app/ --no-error-summary` | pass |
| `cd backend && uv run pytest tests/ -x --tb=line -q` | 648 passed, 2 skipped |
| `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_reconciliation.py tests/test_statement_routing.py tests/test_statement_stream.py tests/test_statements.py -q` | 59 passed |
| `cd web && npm run lint` | pass, 33 existing Fast Refresh warnings |
| `cd web && npx tsc -b` | pass |
| `cd web && npm test -- --run` | 25 passed |
| `cd mobile && npm run typecheck` | pass |
| `cd mobile && npm test -- --runInBand` | 116 passed |
| `cd mobile && npm run check:expo-config` | pass |
| `git diff --check` | pass |

Local focused gates:

```bash
python3 -m py_compile scripts/staging/run-statement-fixture-gate.py
bash -n scripts/staging/run-s23-phase6-statement-gate.sh \
  scripts/staging/run-statement-fixture-gate.py \
  tests/mobile/scripts/seed-statement-fixture.sh \
  tests/mobile/scripts/run-maestro.sh
cd backend && uv run ruff check ../scripts/staging/run-statement-fixture-gate.py
cd backend && uv run pytest \
  tests/test_statement_worker.py \
  tests/test_statement_reconciliation.py \
  tests/test_statement_routing.py \
  tests/test_statement_stream.py \
  tests/test_statements.py -q
```

Deployed backend gate:

```bash
cd backend
uv run python ../scripts/staging/run-statement-fixture-gate.py \
  --api-base-url "$GASTIFY_STAGING_E2E_API_BASE_URL" \
  --stage-id 20260528-phase7-cleanup-d \
  --seed-fixture-transactions \
  --seed-20-day-receipt-history \
  --require-three-buckets
```

Android S23 gate:

```bash
GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app \
GASTIFY_MOBILE_STAGE_ID=20260528-phase7-exit-s23 \
MAESTRO_DEVICE_ID=RFCW90N4BYP \
bash scripts/staging/run-s23-phase6-statement-gate.sh
```
