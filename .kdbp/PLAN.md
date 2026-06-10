# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

P16 — Compliance + Launch Hardening: audited four-jurisdiction regulatory readiness (Chile Law 21.719, GDPR, PIPEDA, CCPA/CPRA) + paid Gemini tier + monetization plumbing live + a rehearsed launch-incident runbook — proving the compliance/operational scaffolding dropped across P1–P15 is real, not theoretical.

## Context

- **Maturity:** mvp (project) — but P16 is the launch gate, so every phase is tiered **ent** (data-safety + compliance rigor; escalation reasons logged in DECISIONS D83–D87).
- **Domain:** Chilean smart expense tracker; markets from day 1 = Chile + LATAM + EU + US + Canada (four privacy regimes — the compliance need is real, not aspirational).
- **Created:** 2026-06-07
- **Last Updated:** 2026-06-10 (Phase 1 DSR COMPLETE + LIVE IN PRODUCTION — all four gates ✅ (Exec/Review/Commit/Push); promoted staging→main @ migration 036. Pre-promote 64-agent adversarial review found + FIXED 2 CRITICAL erasure bugs the staging proof missed (de-membership no-op on PG; erasure-not-total — now hard-deletes the full personal-scope surface) + 4 more; re-proven with a member_count 2→1 roster check on real Postgres. **ROADMAP REVISION 2026-06-10:** applied D90 (compliance-phase review-rigor — observable-state gates + adversarial review pre-promote, binding for Phases 2–5); expanded Phase 2 retention scope to the full erasure surface; reframed P69–P72 as Phase-5 go/no-go fix-or-accept items; Phase 5 checklist now enumerates the erasure/void evidence. — Earlier (2026-06-07): Phase 1 Exec ✅ — T1–T6: 4 rights validated, erasure HARD-DELETE (D89), D82 group void/tombstone (migration 035) + account-delete void + group-leave keep-vs-delete choice; staging-e2e proof GREEN at migration 035. P16 plan authored. Replaces the completed Reports v2 plan — archived `.kdbp/archive/completed_PLAN_2026-06-07_reports-v2.md`. ROADMAP §3 Phase 7. Consolidates + AUDITS REQ-20 (consent + processing register) + REQ-21 (observability); no new REQs — this is a validation + hardening phase. The five phases map to the ROADMAP exit signals a–e. Erasure-vs-group-data policy locked in D82 rev 3 (account deletion = TOTAL erasure + VOID affected group-period stats via a tombstone; leaving a group = the only keep-vs-delete CHOICE; no recompute; self-attested at Phase 5 per D88). Folds in PENDING P36 (concurrency-naive billing), P37 (un-noised DP cohort count → sensitive-category suppression), P59 (invite rate-limit). The live-PG RLS proof (test_rls_postgres.py + test_group_isolation.py in CI, was P32) is a ready compliance-audit artifact.)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Data-Subject Rights (DSR) | VALIDATE the 4 existing rights (privacy.py); change erasure to HARD-DELETE + PII-free audit event (D89, amends D4); add the D82 group void/tombstone. Exit signal (a). | ent | med | ✅ | ✅ | ✅ | ✅ |
| 2 | Consent + Retention (validate) | VALIDATE retention.py TTLs (90d/6y) + consent live-derivation (revoke is instant — no cascade); per D89 transactions are hard-deleted on erasure (audit event retained). Exit signals (b)+(d). | ent | med | ✅ | ✅ | ✅ | ✅ |
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
- **Scope (validate, D89):** consent eligibility is ALREADY LIVE-DERIVED from `ConsentRecord` (`consent_propagation.py`) so revocation is honored INSTANTLY — VALIDATE no cached downstream surface needs active invalidation (no cascade expected). `retention.py` ALREADY declares the TTLs (scans 90d, audit ~6y) + a scheduled job — VALIDATE each window vs the four regimes (Phase-5 checklist) and confirm the purge runs. Per D89, update `retention.py`'s "transactions never deleted — anonymized via DSR" note: transactions are now HARD-DELETED on erasure (only the audit event is retained). **(B, 2026-06-10 — Phase-1 expanded the erasure surface):** erasure now hard-deletes the FULL personal-scope set — transactions/items/images/flags **plus statements (+lines+recon), card_aliases, scans, notifications, merchant/category mappings, credit_balances** (`delete_user_personal_data`). Phase 2's retention/TTL validation MUST reconcile against this full set: build the per-data-class matrix of {erasure-deletes-it vs retention-job-purges-it vs jurisdiction-mandates-keeping-it} across ALL these tables, not just transactions, and confirm no table is both never-erased AND never-purged (silent hoarding) nor mandated-keep-but-deleted.
- **Runtime evidence (per D90 — observable-state gates):** revoke consent on a test user → assert eligibility flips instantly (live-derived) AND assert the OBSERVABLE downstream surface (e.g. the cohort/eligibility query result), not just the response flag; seed past-TTL rows across the full data-class set → run the retention job → assert the ROWS are gone (count = 0 in the DB), not just a job-success response; on real Postgres / deployed staging first, never SQLite-only.

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
- **Runtime evidence (per D90 — observable-state gates):** the load test against deployed staging-e2e backend; assert OBSERVABLE state — the actual `queued` scan ROWS in the DB (count matches the throttled load) + the observability metric (throttle/queue-depth on `/metrics`), in addition to the no-5xx status codes. A 200 response alone doesn't prove the scan was genuinely queued vs silently dropped.

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
- **Runtime evidence (per D90 — observable-state gates):** concurrent billing-hook integration test (the live PG harness) proving no double-apply — assert the credit-balance ROW after N concurrent decrements equals `start − N` exactly (the observable counter), NOT the hook's return value (which is the code reporting on itself — the exact Phase-1 trap); staging proof of the plan-tier schema + an enforced-credit scan (a credit-exhausted scope is actually blocked, observed in the DB).

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
- **(E, 2026-06-10) The checklist MUST enumerate the Phase-1 erasure/void evidence as concrete line items:** the FULL personal-scope erasure surface (`delete_user_personal_data` — every table named in Phase 2), the D82 group void/tombstone mechanism (migrations 035 + **036 append-only**), the PII-free `dsr_erasure` audit + the consent/audit IP/user-agent scrub, and the de-membership-on-Postgres proof (member_count 2→1). Each maps to its proving test/gate, not a bare claim.
- **(C, 2026-06-10) The go/no-go MUST resolve the open DSR/void/retention residuals — fix-or-accept, never silent.** From Phase 1: **P69** (void leaks through gravity-baseline + partial series buckets), **P70** (no live-PG erasure regression test), **P71** (admin-removal erasure recourse), **P72** (portability of group shares — GDPR Art 20). From Phase 2's data-retention validation (see `docs/runbooks/P16-DATA-RETENTION-MATRIX.md`): the **financial-record min-retention vs hard-delete tension** (THE sharpest item, D87-flagged — document per regime WHY no statutory hold binds a personal tracker + decide the business-tier case), **P74** (consent-record keep-forever TTL), **P75** (firebase_uid re-identification residue), **P76** (DSR proof-retention window bound), **P77** (cohort OUTPUT consumer when P9 ships), **P78** (audit_events append-only claim vs no trigger), **P79** (processing-register declared TTLs vs enforced). Each records EITHER a fix (with proof) OR an explicit accepted-residual with per-jurisdiction rationale. A self-attestation (D88) that hides a known gap is not defensible.
- **(D, 2026-06-10 — per D90) Pre-promote adversarial review required.** The cumulative launch surface gets a multi-agent adversarial review (find → adversarially verify → completeness critic) before the production go/no-go, not single-pass — Phase 1 proved single-pass + a green staging gate both miss CRITICALs.
- **Runtime evidence (per D90 — observable-state gates):** the self-attested 4-jurisdiction checklist (D88) with each right/obligation linked to OBSERVABLE-state proof (row-level, RLS-path, on real Postgres); the runbook-rehearsal artifact (a simulated incident walked end-to-end); the adversarial-review record; and the explicit P69–P72 fix-or-accept dispositions.

## Current Phase

Phase 2: Consent + Retention (validate)

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
| **A CRITICAL hides in a "validate-only" phase** (Phase 1 PROVED this: its staging gate passed GREEN while 2 CRITICAL erasure bugs were live — the gate asserted response counters, not DB state) | high | **D90 (binding):** compliance/data-safety gates assert OBSERVABLE state (rows/rosters/RLS-path on real Postgres), not response payloads; each compliance phase gets a multi-agent adversarial review pre-promote. Phases 2 (retention deletion) + 4 (billing concurrency) are the same trap class. |

## Notes

- **Scaffolding discovery (D89):** P16 is largely VALIDATE-AND-FILL-GAPS, not build-from-scratch — the DSR rights (`app/api/privacy.py`), retention TTLs (`retention.py`), billing plumbing (`billing.py` + `NullBillingHook`), and live-derived consent (`consent_propagation.py`) already exist. The real NEW work: the Phase-1 erasure **hard-delete** change (D89, amends D4) + the D82 group **void/tombstone**; the Phase-3 mock throttle hook; the Phase-4 credit **enforcement** + P36 concurrency fix. This is why the phase complexities dropped (high → med) even though the structure stayed 5 phases.
- All compliance answers in this plan are engineering's defensible read, NOT legal advice; the four regimes differ on definitions (anonymization, minimum retention). Per D88 the final policy is **self-attested** against a documented 4-jurisdiction checklist at Phase 5 (no external counsel) — a deliberate MVP posture with the residual liability accepted + a review trigger to engage counsel before EU scale.
- B2 convention holds: every user-facing/backend slice is gated on deployed-staging-e2e runtime proofs before promote; favor the live-PG test harness + adversarial review for the data-safety phases.
- Tier note: 5× ent is heavy by the over-scope heuristic — intentional here because P16 IS the rigor/validation gate; Phase 5 is the lightest (no new risky code).
- **Phase-1 review-rigor learning (D90, 2026-06-10):** the "validate-and-fill-gaps" framing (D89) is true but DANGEROUS — Phase 1's staging gate passed while 2 CRITICALs (de-membership no-op on PG; erasure-not-total) were live, because it asserted response counters not DB state; a 64-agent adversarial review caught them pre-promote. Every remaining phase now carries D90's observable-state-gate + adversarial-review-before-promote rule. The deferred P69–P72 (void-completeness in derived figures, live-PG erasure test, admin-removal recourse, portability of group copies) are reframed as Phase-5 go/no-go fix-or-accept items, not loose backlog.

## Review Artifacts

- HTML review artifact: `docs/gabe/plans/2026-06-07-p16-compliance-launch/index.html`
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

> **All gates honor D90:** assert OBSERVABLE system state (rows/rosters/RLS-path on real Postgres), not just response payloads; each compliance phase gets a multi-agent adversarial review before promote.

- **Phase 1 (DSR):** ✅ DONE + in production — DSR gate 4/4 on deployed staging-e2e @ migration 036 incl. the `member_count 2→1` roster check (de-membership proven on real Postgres); 64-agent adversarial review fixed 2 CRITICALs pre-promote. Artifacts → `tests/mobile/results/runs/staging-e2e/…/dsr-api-gate`.
- **Phase 2 (consent/retention):** consent-revoke → assert the observable eligibility/cohort query flips (not just the flag); past-TTL seed across the FULL data-class set → retention-job → assert rows count = 0 in the DB. Real Postgres / staging first.
- **Phase 3 (throttle):** load test vs deployed staging-e2e; assert the actual `queued` scan rows + the `/metrics` throttle/queue-depth signal, in addition to no-5xx status codes.
- **Phase 4 (billing):** concurrent billing-hook test on the live-PG harness — assert the credit-balance ROW = `start − N` after N concurrent decrements (not the hook return) + an enforced-credit scan is observably blocked.
- **Phase 5 (go/no-go):** signed readiness checklist (each right→observable-state proof) + incident-runbook rehearsal artifact + the pre-promote adversarial-review record + the explicit P69–P72 fix-or-accept dispositions.
