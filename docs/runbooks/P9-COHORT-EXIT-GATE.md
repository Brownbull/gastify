# P9 Cohort Benchmarking (DP) — Exit Gate Evidence Packet

> Roadmap phase **P9** (REQ-27): consent-gated, privacy-engineered cohort
> comparison. Post-MVP (override-01). Compiled 2026-05-29 — the FINAL phase of
> the P6→P9 roadmap drive.

## Status

| Track | State |
|-------|-------|
| DP cohort engine (k-floor + Laplace ε≤1 + clamping) (Ph1) | ✅ code-complete, tested |
| Sensitive-category suppression (Ph1) | ✅ code-complete, tested |
| Revocation-aware membership (live consent, no cache) (Ph1) | ✅ code-complete, tested |
| P9 exit-gate evidence packet (Ph2) | ✅ this packet |
| 50-synthetic-profile deployed cohort run | ⏸ deferred (operational) |
| Bar-chart client UI (web + mobile) | ⏸ deferred (operational) |
| Live revocation-recompute proof on staging | ⏸ deferred (operational) |

## Exit-signal element → evidence

ROADMAP §Phase 9 exit signal: *"Test cohort of 50 synthetic user profiles
loaded. User in cohort opts in, sees grocery spend vs the cohort baseline (a
single bar chart). One user revokes; within a recompute cycle their data is
absent from the next aggregation. No cached-cohort query returns their data
post-revocation."*

| Element | Local evidence | Runtime closure |
|---------|----------------|-----------------|
| Opt-in gates cohort participation | `eligible_cohort_member_ids` derives membership from granted `data_sharing` consent; `test_cohort_membership_tracks_live_consent` | deployed 50-profile run (deferred) |
| Cohort baseline vs user spend | `compare_to_cohort` returns `user_spend_minor` + a DP `CohortStat`; `test_compare_returns_baseline_for_valid_cohort` | bar-chart UI (deferred) |
| k ≥ 20 floor (no small-cohort re-identification) | `cohort_baseline` returns None below `K_ANONYMITY_FLOOR=20`; `test_k_floor_suppresses_small_cohort` | — |
| ε ≤ 1 DP noise | Laplace mechanism, scale = cap/ε, ε≤1 enforced; clamping bounds sensitivity; `test_laplace_noise_is_applied_deterministically`, `test_clamping_bounds_outlier_influence`, `test_epsilon_must_be_within_budget` | — |
| Sensitive-category suppression | `compare_to_cohort` suppresses `category_is_sensitive`; `test_compare_suppresses_sensitive_category` | — |
| Revocation removes a user within a recompute | membership is derived LIVE (no cached set) → next call excludes a revoked user; `test_cohort_membership_tracks_live_consent` (grant→present, revoke→absent) | live staging proof (deferred) |
| No cached-cohort leak post-revocation | by construction — there is no cached membership; every aggregation recomputes the eligible set from current consent | — |

## Local gate sweep (2026-05-29)
- Backend `uv run pytest`: **717 passed, 2 skipped**. mypy clean. ruff clean.
- DP noise is deterministically unit-tested via an injected RNG (exact mean assertions for the zero-noise and fixed-noise paths).

## Deferred (operational — launch staging session)
- Load 50 synthetic consented profiles; run the cohort aggregation against deployed staging.
- Build the bar-chart client surface (web + mobile) consuming `compare_to_cohort`.
- Live revocation-recompute proof: revoke one member → confirm absence from the next aggregation and that no cached query returns their data.
- Privacy-budget accounting across repeated queries (composition) — a Scale-tier follow-up if cohort queries become frequent.
