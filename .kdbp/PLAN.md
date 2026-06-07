# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

P16 — Compliance + Launch Hardening: audited four-jurisdiction regulatory readiness (Chile Law 21.719, GDPR, PIPEDA, CCPA/CPRA) + paid Gemini tier + monetization plumbing live + a rehearsed launch-incident runbook — proving the compliance/operational scaffolding dropped across P1–P15 is real, not theoretical.

## Context

- **Maturity:** mvp (project) — but P16 is the launch gate, so every phase is tiered **ent** (data-safety + compliance rigor; escalation reasons logged in DECISIONS D83–D87).
- **Domain:** Chilean smart expense tracker; markets from day 1 = Chile + LATAM + EU + US + Canada (four privacy regimes — the compliance need is real, not aspirational).
- **Created:** 2026-06-07
- **Last Updated:** 2026-06-07 (P16 plan authored. Replaces the completed Reports v2 plan — archived `.kdbp/archive/completed_PLAN_2026-06-07_reports-v2.md`. ROADMAP §3 Phase 7. Consolidates + AUDITS REQ-20 (consent + processing register) + REQ-21 (observability); no new REQs — this is a validation + hardening phase. The five phases map to the ROADMAP exit signals a–e. Erasure-vs-group-data policy locked in D82 rev 3 (account deletion = TOTAL erasure + VOID affected group-period stats via a tombstone; leaving a group = the only keep-vs-delete CHOICE; no recompute; self-attested at Phase 5 per D88). Folds in PENDING P36 (concurrency-naive billing), P37 (un-noised DP cohort count → sensitive-category suppression), P59 (invite rate-limit). The live-PG RLS proof (test_rls_postgres.py + test_group_isolation.py in CI, was P32) is a ready compliance-audit artifact.)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Data-Subject Rights (DSR) | VALIDATE the 4 existing rights (privacy.py); change erasure to HARD-DELETE + PII-free audit event (D89, amends D4); add the D82 group void/tombstone. Exit signal (a). | ent | med | 🔄 | ⬜ | ⬜ | ⬜ |
| 2 | Consent + Retention (validate) | VALIDATE retention.py TTLs (90d/6y) + consent live-derivation (revoke is instant — no cascade); per D89 transactions are hard-deleted on erasure (audit event retained). Exit signals (b)+(d). | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | LLM quota-throttle degradation | Mock-provider forced-throttle flag (D89) → load test → all scans enter `queued`, no 5xx. Exit signal (c). | ent | med-high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Monetization plumbing | ENFORCE billing.py credits in the scan flow + harden P36 concurrency; keep NullBillingHook, no provider (D89). | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | 4-jurisdiction audit + go/no-go | Compliance audit (reuse the live-PG RLS proof + P1–4 evidence), incident-runbook rehearsal, go/no-go checklist signed. Exit signal (e). | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->

## Phase Details

### Phase 1 — Data-Subject Rights (DSR)

```yaml
phase: 1
types: [auth, data, user-facing, compliance]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Auth, User-facing]
suppressed_dims_count: 0
decisions_entry: D83
```

- **Tier chosen:** ent — irreversible erasure + legally-mandated data export across four regimes; getting it wrong leaks or fails to delete personal data.
- **Scope (validate + gap, D89):** the four DSR rights ALREADY EXIST in `app/api/privacy.py` (access / rectification / erasure / portability) — VALIDATE them end-to-end on a test user. The NEW work: (1) per D89, change erasure from anonymize-in-place to **HARD-DELETE** the user's own data (profile / transactions / items / images) + keep ONLY the PII-free `dsr_erasure` audit event ("shred + log"; amends D4, whose audit-event requirement is preserved); (2) add the D82 group **void/tombstone**. Reuse the P1 consent/processing register + ownership-scope.
- **Erasure-vs-group (D82 rev 3):** two triggers — **account deletion** is TOTAL (hard-delete own + revoke/void shared copies → VOID affected group-period stats via tombstone + notice "left the application"; no choice); **leaving a group** (keep account) is the only CHOICE — keep the shared copies (stats unchanged) or delete them (→ void affected stats + notice). Same void mechanism, different trigger. Self-attested at Phase 5 (D88).
- **Runtime evidence:** a Playwright/API journey running each of the four rights on a throwaway test user against deployed staging-e2e; a two-user fixture proving (a) account deletion voids the affected group-period stats with the notice, and (b) group-leave honors the keep-vs-delete choice.

### Phase 2 — Consent cascade + Retention TTL

```yaml
phase: 2
types: [data, data-migration, compliance, scheduled-job]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Migration]
suppressed_dims_count: 0
decisions_entry: D84
```

- **Tier chosen:** ent — data-lifecycle correctness; a wrong TTL deletes financial records a jurisdiction mandates keeping, or fails to purge expired data.
- **Scope (validate, D89):** consent eligibility is ALREADY LIVE-DERIVED from `ConsentRecord` (`consent_propagation.py`) so revocation is honored INSTANTLY — VALIDATE no cached downstream surface needs active invalidation (no cascade expected). `retention.py` ALREADY declares the TTLs (scans 90d, audit ~6y) + a scheduled job — VALIDATE each window vs the four regimes (Phase-5 checklist) and confirm the purge runs. Per D89, update `retention.py`'s "transactions never deleted — anonymized via DSR" note: transactions are now HARD-DELETED on erasure (only the audit event is retained).
- **Runtime evidence:** revoke consent on a test user → assert eligibility flips instantly (live-derived); seed past-TTL test data → run the retention job → assert deletion; on staging first.

### Phase 3 — LLM quota-throttle degradation

```yaml
phase: 3
types: [integration, resilience, observability]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Integration, Observability]
suppressed_dims_count: 0
decisions_entry: D85
```

- **Tier chosen:** ent — the no-5xx-under-throttle guarantee is a launch-day reliability promise; the paid Gemini tier introduces real quota limits.
- **Scope:** a load test drives the extraction-LLM service to quota throttle; all scans gracefully enter `queued`, zero 5xx; observability shows the throttle + queue depth. Needs a way to **simulate** quota throttle in staging-e2e (mock Gemini, D76) — a forced-throttle test hook.
- **Runtime evidence:** the load test against deployed staging-e2e backend; capture status codes (no 5xx) + the queued-scan states + the observability signal.

### Phase 4 — Monetization plumbing

```yaml
phase: 4
types: [data, billing, concurrency]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D86
```

- **Tier chosen:** ent — financial primitives; the existing billing is concurrency-naive (P36), and double-charging / lost-tier-updates under concurrency is a money bug.
- **Scope (enforce + harden, D89):** `billing.py` ALREADY has plan tiers + per-plan scan credits + a `NullBillingHook` (no-op). The gaps: ENFORCE the credits in the live scan flow (currently defined but unenforced) + harden the concurrency-naive primitives (P36) with proper locking/idempotency. Keep `NullBillingHook` — NO real payment provider this phase (a separate later phase). Paid-tier LLM pre-commit gating ties to Phase 3.
- **Runtime evidence:** concurrent billing-hook integration test (the live PG harness) proving no double-apply; staging proof of the plan-tier schema.

### Phase 5 — 4-jurisdiction audit + go/no-go

```yaml
phase: 5
types: [compliance, observability, audit]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Observability]
suppressed_dims_count: 0
decisions_entry: D87
```

- **Tier chosen:** ent — the launch sign-off; the audit must be rigorous enough to stake a four-jurisdiction launch on. Lightest phase in new code (validation + documentation + rehearsal).
- **Scope:** the four-jurisdiction compliance audit consolidating the evidence from P1–P4 + the live-PG RLS proof + the consent/processing register; rehearse the launch-day incident runbook; produce + **self-attest (D88)** the documented 4-jurisdiction DSR + retention checklist as the go/no-go gate (each right + obligation per regime mapped to the concrete implementation — evidence-backed, not a bare claim). Staging evidence first; production journey smoke needs a separate cutover/test-data approval.
- **Runtime evidence:** the self-attested 4-jurisdiction checklist (D88) + the runbook-rehearsal artifact (a simulated incident walked end-to-end).

## Current Phase

Phase 1: Data-Subject Rights (DSR)

## Dependencies

- All five phases build on **P1 (Foundation)** — the consent/processing register + ownership-scope + observability scaffolding this phase validates.
- **Phase 5 (audit)** depends on Phases 1–4 — it audits their evidence + signs the gate.
- **Phase 2 (consent cascade)** relates to **Phase 1** (consent records feed erasure/rectification) and to **P37** (cohort-unflag).
- **Phase 4 (billing)** ties to **Phase 3** (paid-tier LLM pre-commit gating).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Erasure of shared-group data — legal "erasure" vs the group's data integrity (D74 content-lock) | high | D82 rev 3: account-delete is total (void affected stats); group-leave is a keep-vs-delete choice; void via tombstone (no recompute treadmill); self-attested at Phase 5 (D88) |
| Retention deletion vs jurisdictions that MANDATE minimum retention of financial records | high | Phase 2 reconciles per-data-class TTL across the four regimes; a DECISIONS entry + self-attestation (D88); conservative default (keep when in doubt) |
| Forcing the LLM quota throttle in staging (mock Gemini, D76) | medium | Phase 3 adds a forced-throttle test hook in the mock provider |
| Monetization scope creep (full billing vs plumbing) | medium | Plumbing only per the ROADMAP — schema tiers + hooks, no billing UI; folds P36 concurrency fix |
| Self-attested compliance (no external counsel, D88) carries residual liability — heaviest under GDPR | medium-high | ACCEPTED MVP posture (D88): evidence-backed checklist, not a bare claim; review trigger = engage counsel before EU scale / special-category volume / when budget allows |

## Notes

- **Scaffolding discovery (D89):** P16 is largely VALIDATE-AND-FILL-GAPS, not build-from-scratch — the DSR rights (`app/api/privacy.py`), retention TTLs (`retention.py`), billing plumbing (`billing.py` + `NullBillingHook`), and live-derived consent (`consent_propagation.py`) already exist. The real NEW work: the Phase-1 erasure **hard-delete** change (D89, amends D4) + the D82 group **void/tombstone**; the Phase-3 mock throttle hook; the Phase-4 credit **enforcement** + P36 concurrency fix. This is why the phase complexities dropped (high → med) even though the structure stayed 5 phases.
- All compliance answers in this plan are engineering's defensible read, NOT legal advice; the four regimes differ on definitions (anonymization, minimum retention). Per D88 the final policy is **self-attested** against a documented 4-jurisdiction checklist at Phase 5 (no external counsel) — a deliberate MVP posture with the residual liability accepted + a review trigger to engage counsel before EU scale.
- B2 convention holds: every user-facing/backend slice is gated on deployed-staging-e2e runtime proofs before promote; favor the live-PG test harness + adversarial review for the data-safety phases.
- Tier note: 5× ent is heavy by the over-scope heuristic — intentional here because P16 IS the rigor/validation gate; Phase 5 is the lightest (no new risky code).

## Review Artifacts

- HTML review artifact: `docs/gabe/plans/2026-06-07-p16-compliance-launch/index.html`
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- **Phase 1 (DSR):** Playwright/API journey running all four rights on a throwaway test user vs deployed staging-e2e; two-user fixture proving erasure revokes group visibility. Artifacts → `tests/.../results`.
- **Phase 2 (consent/retention):** consent-revoke → cohort-unflag assertion; past-TTL seed → retention-job → deletion assertion. Staging first.
- **Phase 3 (throttle):** load test vs deployed staging-e2e; status-code capture (no 5xx) + queued-scan states + observability signal.
- **Phase 4 (billing):** concurrent billing-hook test on the live-PG harness (no double-apply) + staging plan-tier schema proof.
- **Phase 5 (go/no-go):** signed readiness checklist + incident-runbook rehearsal artifact.
