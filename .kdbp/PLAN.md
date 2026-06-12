# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Implement the RATE-LIMIT-PLAN's mvp + ent tiers (docs/runbooks/RATE-LIMIT-PLAN.md ranked table): the D96 tier/quota system (the real-money guard), the user-keyed limiter infrastructure + interim statement cap, and the nine Enterprise abuse-hardening limits. Scale-tier items (rows 11-16) are explicitly DEFERRED (tracked by P86, narrowed to scale on completion).

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Limiter infra + statement stopgap | User-keyed key_func (get_auth_context stashes request.state.user_id; falls back to IP) + per-resource key helper; interim POST /statements cap 5/day/user (★2); contract test asserting 429 + Retry-After shape. | mvp | low-med | ✅ | ✅ | ✅ | ✅ |
| 2 | D96 tier/quota system (★1) | users.tier (free/premium, manual flag until payments); MONTHLY usage counters keyed (user, feature, YYYY-MM) — the month key rotates naturally, so no reset job and no rollover BY CONSTRUCTION; limits from tier: scan credits 20/60, statements 0/3, batch 0/3; free-tier 403 on statements (+batch when it gates); replaces the P16 P4 balance semantics with the monthly model (atomic deduct pattern kept); minimal functional quota display (credits left) web+mobile — visual rides the overhaul. NOTE: tier gates are product 403s, NOT limiter 429s — they stay testable in staging-e2e where GASTIFY_RATE_LIMIT_ENABLED=false. MOBILE quota display moved to Phase 5 (rides the 429-UX mobile pass). | mvp | high | ✅ | ✅ | ✅ | ✅ |
| 3 | ENT HIGH limits (rows 2-4) | Group leave 3/day per-group + 6/h+20/day user; join +20/day/user; consent toggles 10/day SHARED grant+revoke; erasure 2/day; portability+data-access 4/h SHARED export budget. Contract tests each (12 in test_rate_limit). | ent | med | ✅ | ✅ | 🔄 | ⬜ |
| 4 | ENT MED limits (rows 5-9) | Per-transaction edit cap 30/h (per-resource key) + 300 mutations/h/user; batch-delete 10 calls/h + 1000 deleted rows/day (app-side counter); manual create 60/h + 500/day; share 30/h + 200/day; group create 10/day; invite generation 10/h per group. Contract tests each. | ent | med-high | ✅ | ✅ | 🔄 | ⬜ |
| 5 | 429 UX + proofs (row 10) | Web + mobile map 429 + Retry-After to a friendly retry toast (shared error path); e2e proof of the free-tier statement 403 + a quota-exhaustion path on staging-e2e (tier gates, not limiter); S23 spot-check of the mobile toast path. | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |

## Current Phase

Phase 5: 429 UX + proofs (row 10)