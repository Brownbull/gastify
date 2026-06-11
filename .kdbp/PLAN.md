# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Statement-matching hardening + ledger usability: lock matched transactions (the statement is external truth), port the useful legacy ledger filters + add source/matched filters (scan vs statement vs manual; matched vs not), build the manual-entry UI over the already-complete API, and prove the full statement journey end-to-end with screenshots.

## Context

- **Maturity:** mvp; Phase 1 ent-ish (data-integrity semantics).
- **Created:** 2026-06-11
- **Last Updated:** 2026-06-11 (grounding: receipt_type ALREADY distinguishes scan|manual|statement|import; POST /transactions ALREADY takes merchant/date/time/country/city/items — manual entry needs only UI; list API has date/category/merchant/currency/card_alias filters — missing source+matched; legacy bar = temporal+category+location+active-count+clear. DESIGN NOTE: current reconciliation deliberately matches AROUND user edits (test_reconcile_respects_user_edited_transaction_fields) — lock-on-match inverts that for matched rows per user decision; statement deletion = the natural unlock.)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Lock-on-match | Matched transactions (MATCHED verdict exists) refuse content edits + delete (409 naming the rule; D74's lock pattern, distinct message). Batch ops too. Statement deletion unlocks (verdicts go with the run). Contracts incl. the unlock path. | ent | med | ✅ | ✅ | ✅ | ✅ |
| 2 | Ledger filters | API: source (receipt_type) + matched (bool) params on the list; web: a filter bar (date range, category, merchant, source, matched; active-count + clear-all per legacy) with stable testids. Contracts + types regen. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 3 | Manual entry UI | A functional "Add transaction" form over the EXISTING POST: merchant, date, time, place (country/city), items one-by-one (total auto-sum), receipt_type=manual. Mappings/learning apply on later edits as usual. e2e: create → appears in ledger → filter source=manual finds it. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 4 | Statement journey proof | The full e2e with screenshots: upload statement → reconcile → matched txn badge (have) → EDIT REFUSED (locked) → filters isolate matched / scan-only / statement-only → delete statement → unlocked again. | mvp | med | 🔄 | ⬜ | ⬜ | ⬜ |

## Current Phase

Phase 4: Statement journey proof

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Lock-on-match strands rows if unmatching is impossible | high | statement deletion cascades verdicts → unlock; contract-test the full cycle |
| The matched check adds a query to every PATCH/DELETE | low | single EXISTS on an indexed column, only when content fields change |
| Filter params bloat the list endpoint | low | two optional params; same WHERE pattern as existing filters |
