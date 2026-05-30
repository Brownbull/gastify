# Active Plan — P9 Cohort Benchmarking (DP-engineered)

<!-- status: active -->
<!-- project_type: code -->
<!-- created: 2026-05-29 -->
<!-- last_updated: 2026-05-29 -->

## Goal

Implement P9 (REQ-27): a consent-gated cohort-comparison capability — a user who opts in sees their spend in a category compared against an anonymized cohort baseline, engineered for privacy: k ≥ 20 membership floor, ε ≤ 1 differential-privacy noise, sensitive-category suppression, and revocation-aware recompute (no cached-cohort leak).

## Context

- Roadmap phase: P9 Cohort Benchmarking. Post-MVP (override-01). Depends on P1 (consent), P6 (analytics), P7 (compliance audit + the `is_cohort_eligible` recompute seam built in P7 Phase 2).
- The P7 seam `app/services/consent_propagation.is_cohort_eligible(db, user_id, scope_id)` derives cohort membership LIVE from granted `data_sharing` consent — so revocation immediately drops a user (no cached membership = no stale-cohort leak). P9 consumes it.
- The taxonomy carries `is_sensitive` on categories (StoreCategory/ItemCategory) — used for sensitive-category suppression.
- Standing drive decision: code-complete + local gates; the deployed multi-user cohort run (50 synthetic profiles, bar-chart UI) is runtime-deferred. The DP engine + aggregation + suppression + revocation logic are the testable core.

## Environment Gate Standard

Code + local gates close Exec/Review/Commit. Deferred to runtime/staging: the 50-synthetic-profile deployed cohort run + the client bar-chart UI + the live revocation-recompute proof.

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | DP cohort engine + consent-gated aggregation | `analytics, privacy, dp, multi-tenant, test` | A differential-privacy cohort aggregator: k≥20 membership floor (suppress below), ε≤1 Laplace mechanism over clamped contributions (seedable RNG for tests), sensitive-category suppression, and membership derived live from `is_cohort_eligible` (revocation-aware, no cached membership). | scale | high | ✅ | ✅ | ✅ | ✅ |
| 2 | P9 exit-gate evidence packet | `docs, test` | Map the REQ-27 exit signal (k-floor, ε≤1 noise, suppression, revocation removes a user, no cached-cohort leak) to local evidence; document the deferred runtime (50-profile deployed run + bar-chart UI). | scale | medium | ✅ | ✅ | ✅ | ✅ |

## Phase Details

### Phase 1 — DP cohort engine + consent-gated aggregation
```yaml
phase: 1
types: [analytics, privacy, dp, multi-tenant, test]
phase_tier: scale
requirements: [REQ-27]
```
`app/services/cohort.py`:
- `cohort_baseline(contributions, *, epsilon, k_floor=20, cap, rng) -> CohortStat | None` — returns None if `len(contributions) < k_floor` (k-anonymity suppression); else clamps each contribution to `[0, cap]` (bounds sensitivity), computes a DP-noised sum via the Laplace mechanism (scale = `cap / epsilon`, sampled from the injected RNG for deterministic tests), and divides by the member count → a DP mean. `epsilon ≤ 1` enforced.
- Sensitive-category suppression: never aggregate a category flagged `is_sensitive`.
- `build_cohort_comparison(db, *, ownership_scope_id, user_id, period, ...)` — assembles the cohort from users who are currently `is_cohort_eligible` (live consent → revocation-aware, no cached membership), per non-sensitive category, returning the user's own spend alongside the DP cohort baseline (or a suppressed marker).
- Tests: k-floor suppression (<20 → None), sensitive-category suppression, clamping (bounds an outlier's influence), deterministic noise (injected RNG → exact assert) + zero-noise path, ε validation, revocation removes a member (eligible set shrinks), no result references a non-eligible user.

### Phase 2 — P9 exit-gate evidence packet
```yaml
phase: 2
types: [docs, test]
phase_tier: scale
requirements: [REQ-27]
```
`docs/runbooks/P9-COHORT-EXIT-GATE.md` mapping the REQ-27 exit signal to local evidence; document deferred runtime (50-synthetic-profile deployed cohort run, bar-chart client UI, live revocation-recompute proof).

## Current Phase

P9 plan is **local-complete** — both phases Exec ✅ Review ✅ Commit ✅. Push ⬜ pending the user's staging push + deferred runtime (50-synthetic-profile deployed cohort run + bar-chart client UI + live revocation-recompute proof, per `docs/runbooks/P9-COHORT-EXIT-GATE.md`; count-DP hardening tracked as PENDING P37).

**P9 is the final roadmap phase — the entire P6→P9 roadmap drive is now local-complete.**

## Dependencies
- Phase 1 reuses P7's `is_cohort_eligible` seam + the taxonomy `is_sensitive` flag + P6 insights data.
- Phase 2 consolidates Phase 1.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Incorrect DP (under-noised → privacy leak) | high | Clamp contributions to bound sensitivity; Laplace scale = cap/ε with ε≤1 enforced; unit-test the noise with a deterministic RNG; document the privacy budget. |
| k-floor bypass (small cohort → re-identification) | high | Hard k≥20 floor returns a suppressed marker (None), tested; suppression applied before any value is computed/returned. |
| Sensitive-category exposure | high | Skip `is_sensitive` categories entirely; tested. |
| Stale cohort after revocation | high | Membership derived live from `is_cohort_eligible` (no cached set); tested that a revoked user is absent. |
| Over-scoping into the deployed cohort run | medium | Code + DP math + suppression + revocation are local-testable; the 50-profile deployed run + UI are runtime-deferred. |

## Notes
- P9 is `scale` tier (DP + k-anonymity + suppression is its own sub-architecture per the roadmap); the engine is built defensively with the privacy floor enforced before any aggregate is exposed.
- The bar-chart client surface + the deployed multi-user run are runtime-deferred (consistent with the drive); this plan delivers the privacy-engineered backend core.
