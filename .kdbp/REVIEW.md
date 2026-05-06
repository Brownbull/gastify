# Active Review — Phase 3: Identity + ownership scope + RLS

<!-- schema: 1.1 -->
<!-- source: codex/gpt-5 (inbox) + claude/opus-4-6 (blind + triage) -->
<!-- target: Phase 3 per PLAN.md (Review=⬜, Exec=🔄) + P2 USD-shadow second pass -->
<!-- maturity: enterprise -->
<!-- created: 2026-05-06T15:30:00Z -->
<!-- status: resolved -->

## Summary

Branch `rebuild/be-phase-01` reviewed for Phase 3 (Identity + ownership scope + RLS) and a targeted second pass over the Phase 2 FX/USD-shadow integration. Cross-agent review: Codex/gpt-5 inbox pass (6 findings) + Claude/opus-4-6 blind pass (8 findings) — union consolidation yielded 8 unique findings (6 strict matches + 2 Claude-only).

**Verdict:** APPROVE
**Confidence:** 90 / 100 (was 20 pre-triage; +70 from fixing all 8 findings via option [3] Fix all including Scale)
**Coverage:** MEDIUM — 52 tests pass, but PostgreSQL RLS is not exercised (SQLite tests verify app-level scope filtering with real cross-scope data)
**Findings:** 8 total (1 CRITICAL, 4 HIGH, 2 MEDIUM, 1 LOW) — all resolved
**Resolution:** 8 fixed / 0 deferred / 0 dismissed

## Findings

| # | Status | Severity | Finding | File | Churn | Fix Cost | Defer Risk | Maturity Gate | Escalation | Sources |
|---|--------|----------|---------|------|-------|----------|------------|---------------|------------|---------|
| 1 | RESOLVED | CRITICAL | JIT provisioning inserts RLS-protected rows before `app.ownership_scope_id` is set — PostgreSQL + FORCE RLS blocks new sign-ins after migration 003 | `backend/app/auth/deps.py:48` | ✅ STABLE | S | AUTH OUTAGE — P(high), Impact(high) | Enterprise | — | codex + claude |
| 2 | RESOLVED | HIGH | `test_rls.py` uses phantom UUID checks (random uuid4) — proves "missing row = 404" not "scope isolation works". No real cross-scope data seeded | `backend/tests/test_rls.py:33` | ✅ STABLE | M | OWNERSHIP LEAK REGRESSION MISSED — P(high), Impact(high) | Enterprise | — | codex + claude |
| 3 | RESOLVED | HIGH | FX outage silently creates non-USD transactions with NULL USD-shadow — contradicts D2 ent contract (reject + retry hint) | `backend/app/api/transactions.py:196` | ✅ STABLE | S | FINANCIAL REPORTING GAP — P(high), Impact(high) | Enterprise | — | codex + claude |
| 4 | RESOLVED | HIGH | PATCH endpoint: updating transaction_date/total_minor/currency leaves stale amount_usd_minor/fx_rate_to_usd | `backend/app/api/transactions.py:286` | ✅ STABLE | M | STALE MONEY DATA — P(high), Impact(high) | Enterprise | — | codex + claude |
| 5 | RESOLVED | MEDIUM | Migration 003 creates credit_balances but doesn't backfill for existing ownership scopes before enabling RLS | `backend/alembic/versions/003_credits_and_rls.py:21` | ✅ STABLE | S | EXISTING ACCOUNTS MISS CREDITS — P(medium), Impact(moderate) | Enterprise | — | codex + claude |
| 6 | RESOLVED | LOW | Unused `postgresql` import in migration 002 — ruff F401 | `backend/alembic/versions/002_fx_rates.py:9` | ✅ STABLE | S | CI LINT FAILURE — P(certain), Impact(low) | MVP | — | codex + claude |
| 7 | RESOLVED | HIGH | Firebase `verify_id_token` is synchronous — blocks async event loop on every authenticated request | `backend/app/auth/firebase.py:22` | ✅ STABLE | S | EVENT LOOP STALL — P(high), Impact(moderate) | Scale | — | claude |
| 8 | RESOLVED | MEDIUM | JIT credit balance test only checks HTTP 200 — doesn't verify credit row actually exists with correct initial balance (50 credits) | `backend/tests/test_rls.py:102` | ✅ STABLE | S | UNTESTED INVARIANT — P(medium), Impact(moderate) | Enterprise | — | claude |

## Fixes Applied

| # | Fix | File(s) |
|---|-----|---------|
| 1 | Added SET LOCAL `app.ownership_scope_id` inside JIT try block after flushing scope, BEFORE inserting into RLS-protected tables (ownership_scope_members, credit_balances). Dialect-guarded for SQLite compatibility. | `backend/app/auth/deps.py` |
| 2 | Full rewrite: seeded a real second ownership scope with real transactions via `other_scope_txn_id` fixture. All cross-scope tests now verify against real data, not phantom UUIDs. Added `test_list_excludes_other_scope`. | `backend/tests/test_rls.py` |
| 3 | Changed FX failure from graceful degradation (201 + NULL) to rejection (503 + "retry later") per D2 ent contract. Added autouse `_mock_external_fx` fixture in conftest.py to prevent cascade failures. | `backend/app/api/transactions.py`, `backend/tests/conftest.py`, `backend/tests/test_fx.py` |
| 4 | Added USD-shadow recomputation in PATCH when money fields change. Create rejects on FX failure; PATCH gracefully nulls stale data (transaction already exists). | `backend/app/api/transactions.py` |
| 5 | Added backfill INSERT before RLS enable loop — seeds credit_balances for any existing ownership scopes missing a row. | `backend/alembic/versions/003_credits_and_rls.py` |
| 6 | Removed unused `from sqlalchemy.dialects import postgresql` import. | `backend/alembic/versions/002_fx_rates.py` |
| 7 | Wrapped synchronous `verify_id_token` in `asyncio.to_thread` to avoid blocking the event loop. | `backend/app/auth/firebase.py` |
| 8 | Enhanced test to query DB directly and verify credit row exists with `scan_credits == 50`. | `backend/tests/test_rls.py` |

## Review Confidence

Score: **90 / 100** (was 20 pre-triage; +70 from fixing all 8 findings)

| If you fix... | Findings resolved | Projected | Delta |
|---------------|-------------------|-----------|-------|
| All CRITICAL + HIGH | 5 of 8 | 80 / 100 | +60 |
| All MVP gate | 1 of 8 | 22 / 100 | +2 |
| All Enterprise gate | 7 of 8 | 88 / 100 | +68 |
| All (incl. Scale) | 8 of 8 | 90 / 100* | +70 |

*Ceiling 90 due to MEDIUM coverage modifier (-5) and LOW PostgreSQL RLS coverage modifier (-5). SQLite tests verify app-level isolation with real cross-scope data but not Postgres RLS policies.

**Interpretation:** 90 = "Ship with confidence." All findings resolved. Coverage gap is structural (SQLite vs PostgreSQL in tests) and tracked — real RLS verification happens in staging with actual PostgreSQL.

## Plan Alignment

Goal:         Deliver P1 Foundation backend
Phase [3/6]:  Identity + ownership scope + RLS — Firebase token-verify, JIT provision, ownership scope + RLS policies, scan-credit balance

Alignment: DRIFTED
  On-scope P3 files changed: auth/deps.py, models/credit.py, 003_credits_and_rls.py, tests/test_rls.py
  Adjacent P2 second-pass: api/transactions.py, services/fx.py, models/fx.py, i18n.py, 002_fx_rates.py, tests/test_fx.py, tests/conftest.py

Drift rationale: branch carries P2 and P3 work together. Findings #3, #4, #6, #7 are P2 second-pass; #1, #2, #5, #8 are P3 defects.

## Test Results

- **52 / 52 tests passing** (was 51 before; +1 test_list_excludes_other_scope)
- **Coverage: MEDIUM** (cross-scope isolation proven with real data; RLS exercised at app level not DB level)
- **Ruff: clean** (check + format)

## Verdict

**APPROVE** — all 8 findings resolved. No CRITICAL, HIGH, MEDIUM, or LOW findings remain. Confidence score 90/100 exceeds the 70+ ship threshold for Enterprise tier. Coverage gap (SQLite vs PostgreSQL) is structural and non-blocking.

## Triage Log

- **Option chosen:** [3] Fix all including Scale (all 8 findings)
- **Fixes applied:** #1 (SET LOCAL before RLS inserts), #2 (real cross-scope test data), #3 (FX rejection + autouse mock), #4 (PATCH USD-shadow recompute), #5 (credit backfill), #6 (unused import), #7 (asyncio.to_thread), #8 (credit balance DB verification)
- **Deferred:** none
- **Post-triage lint fixes:** E501 line length (2 sites), B904 `raise from` chain
- **Sources:** codex/gpt-5 inbox (6 findings) + claude/opus-4-6 blind (8 findings) — 6 strict matches corroborated, 2 Claude-only (#7 asyncio.to_thread, #8 credit test verification)
