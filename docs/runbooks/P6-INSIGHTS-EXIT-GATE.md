# P6 Insights — Exit Gate Evidence Packet

> Roadmap phase **P6 — Insights + Item Flags** (REQ-06, REQ-10, REQ-11).
> This packet maps each element of the P6 roadmap exit signal to its evidence.
> Compiled 2026-05-29 during the code-complete + defer-runtime roadmap drive.

## Status

| Track | State |
|-------|-------|
| Backend analytics + item-flag persistence | ✅ code-complete, locally green |
| Web insights + flag review flow | ✅ code-complete, locally green |
| Android insights + flag review flow | ✅ code-complete, locally green |
| Deployed-staging browser proof | ⏸ **deferred** → PENDING P34 |
| Samsung S23 staging-e2e proof | ⏸ **deferred** → PENDING P35 |
| App-open-to-top-5 ≤ 20s performance timing | ⏸ **deferred** (needs deployed staging) |
| iOS runtime lane | ⏸ deferred post-roadmap (D47 / P31) |

Deferrals are per explicit user direction for this drive: implement to
code-complete + local gates, defer deployed-staging / device / performance
runtime proof to PENDING. They fold into a single staging session the user
runs after pushing `origin/staging`.

## Local gate sweep (2026-05-29)

| Surface | Command | Result |
|---------|---------|--------|
| Backend | `cd backend && uv run pytest -q` | 668 passed, 2 skipped |
| Web | `cd web && npx tsc -b && npm test` | tsc clean · vitest 35 passed |
| Mobile | `cd mobile && npm run typecheck && npm test` | tsc clean · jest 27 suites / 125 passed |

828 tests across the P6 surface, all green.

## Exit-signal element → evidence

The roadmap exit signal (ROADMAP §Phase 6): *"Test user with 3 months of
seeded transactions opens the monthly view. Top-5 renders within 20 seconds
using deterministic L1/L2 and L3/L4 rollups from canonical parent
relationships. Gravity-center list shows at least one growth category. User
flags one line item; re-renders analytics, the item is excluded from
aggregates but still visible on the transaction detail."*

| Exit-signal element | Local evidence | Runtime closure |
|---------------------|----------------|-----------------|
| 3 months of seeded transactions | `backend/app/services/insights_fixtures.py` deterministic corpus; `_seed_p6_database` in `backend/tests/test_insights_engine.py` | seed against staging Postgres (deferred) |
| Top-5 by deterministic L1/L2 + L3/L4 rollups from canonical parents | `test_monthly_insights_api_returns_owner_scoped_seeded_rollups` asserts top-5 transaction + item categories and parent grouping | deployed render (deferred) |
| Gravity-center list shows ≥1 growth | same test asserts `("Supermarket","growth")` + a shrink control | deployed render (deferred) |
| Flag one item → excluded from aggregates, still on transaction detail | `test_item_flag_api_excludes_item_from_monthly_insights`, `test_monthly_insights_excludes_urgency_flagged_item`, `test_update_item_flags_are_visible_and_clearable` | web + S23 journeys (deferred) |
| Personal-only flag scope (no cross-user leak) | `test_update_item_flags_is_owner_scoped`, `test_detail_only_exposes_current_users_item_flags` | — (proven at API layer) |
| Aggregate refresh after a flag change | backend `test_monthly_insights_cache_fingerprint_reflects_item_flag_changes`; web `useUpdateItemFlags` invalidates `insightsKeys.all` (`useInsights.test.tsx`); mobile equivalent (`useInsights.test.tsx`) | deployed cache behavior (deferred) |
| Sign-out / no stale analytics | web `queryClient.clear` eviction test; mobile `clearMobileSession` → `queryClient.clear()` | deployed sign-out journey (deferred) |
| App-open-to-top-5 ≤ 20s | — | **deferred** — measure on deployed staging |
| `.kdbp/REVIEW.md` approves P6, iOS deferred | per-phase reviews all APPROVE (Ph3 94/100, Ph4 98/100, Ph5 100/100) in `.kdbp/reviews-archive/`; iOS deferred (P31) | — |

## Deployed-staging runbook (for the user, when pushing)

1. `git push origin main:staging` → GitHub Actions CI green.
2. Railway staging autodeploys `origin/staging` (migration 022 + insights/flag routes).
3. Seed ≥3 months for ≥2 ownership scopes; run
   `python scripts/staging/run-insights-api-gate.py` against the staging API
   (verifies item-flag mutation + aggregate refresh + transaction-detail
   persistence against deployed Postgres + RLS) → closes P34.
4. Web browser journey: monthly top-5, gravity rows, flag mutation, aggregate
   exclusion, transaction-detail persistence, sign-out cleanup.
5. Samsung S23 staging-e2e (Maestro) for the same journey with grouped stage
   artifacts → closes P35.
6. Record app-open-to-top-5 timing; assert ≤ 20s.
7. Promote `origin/staging` → `origin/main`.

When 3–6 are captured, P6 Push ticks ✅ and the roadmap P6 phase closes fully.
