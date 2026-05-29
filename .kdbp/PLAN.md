# Active Plan — P7 Compliance + Launch Hardening

<!-- status: active -->
<!-- project_type: code -->
<!-- created: 2026-05-29 -->
<!-- last_updated: 2026-05-29 -->

## Goal

Implement P7: audited four-jurisdiction regulatory readiness (Law 21.719, GDPR, PIPEDA, CCPA/CPRA), consent-revocation propagation, scan quota graceful degradation, retention/TTL enforcement, schema-level monetization plumbing, and launch-hardening runbooks — so the launch gate's compliance and operational scaffolding is proven real, not just declared.

## Context

- Roadmap phase: P7 Compliance + Launch Hardening. Consolidates + audits REQ-20 (consent + processing register) and REQ-21 (observability); no new REQs.
- Depends on P1-P6 (all code-complete; P6 runtime closure pending the user's staging push per P34/P35).
- Foundation from P1 already ships: ConsentRecord / ProcessingRegister / AuditEvent models (migration 004), DSR endpoints (`backend/app/api/privacy.py`: data-access / rectification / erasure / portability), consent service (`backend/app/services/consent.py`), observability (MetricsRegistry + structlog + `/metrics`), and `CreditBalance` (migration 003). P7 audits, hardens, and fills the gaps.
- **Monetization scope is SCHEMA-ONLY** per SCOPE §9.2: "Paid from launch; pricing mechanism deferred to a separate ADR." P7 adds plan-tier schema + billing-hook seams + per-plan credit wiring — NOT a real billing-provider integration.
- Latest migration head: 022. P7 adds new migrations from 023.

## Environment Gate Standard

Runtime-gated P7 items must close against deployed staging evidence before the roadmap phase fully closes. Per the active roadmap drive, code + schema + local gates are development evidence; the operational drills (cutover, load test, paid-Gemini pre-commit) are DEFERRED to PENDING and run during the user's staging session.

- Compliance logic (DSR endpoints, consent propagation, retention) must have backend tests proving behavior + ownership/jurisdiction isolation.
- Quota graceful degradation must prove (in unit tests) that a quota-throttle path yields a `queued` scan state, never a 5xx.
- Monetization plumbing must prove plan-tier schema + per-plan credit semantics in tests; no live payment provider.
- Deferred (runtime): load test to real quota throttle, retention scheduled-job execution on staging, paid Gemini tier pre-commit, cutover/DR drill. These fold into the launch staging session.

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | DSR completeness + four-jurisdiction audit | `compliance, api, multi-tenant, test` | Add processing-register read, single-consent withdrawal (GDPR Art 7(3)), scoped audit-event read, withdrawn_at distinction; validate all four DSR rights end-to-end with jurisdiction-aware tests. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 2 | Consent-revocation propagation | `compliance, persistence, analytics, multi-tenant` | Wire consent revocation to downstream unflag/suppress (AI-processing revocation unflags AI-derived state; cohort/aggregate surfaces honor revocation); revocation-aware recompute seam for P9. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 3 | Scan quota graceful degradation | `api, worker, resilience, test` | Add a `queued` scan state + credit/quota pre-check so a quota-throttle path enqueues instead of 5xx; classify quota vs rate-limit; per-error-code metrics. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 4 | Retention / TTL enforcement | `compliance, data-migration, jobs, test` | Retention service that deletes/anonymizes data older than `ProcessingRegister.retention_period`; invokable management entrypoint; audit-trail retention policy; tests. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Monetization plumbing (schema-level) | `data-migration, persistence, billing-seam, test` | Plan-tier schema (SubscriptionPlan/plan tier on scope) + billing-hook interface seam + per-plan credit allocation/deduction wiring. No live provider (pricing ADR deferred). Migration 023+. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Launch hardening + readiness packet | `docs, runbook, observability, test` | DPO / disaster-recovery / incident-response / security runbooks; consolidate PRODUCTION-CHECKLIST; consent/DSR + per-error observability counters; P7 exit-gate evidence packet. Cutover drill + paid-Gemini pre-commit + load test = deferred runtime. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec written by /gabe-execute; Review/Commit/Push auto-ticked. A phase is complete when all four columns are ✅. -->
<!-- Roadmap drive: code + local gates close Exec/Review/Commit; Push + operational drills are user-run (staging). -->

## Phase Details

### Phase 1 — DSR completeness + four-jurisdiction audit
```yaml
phase: 1
types: [compliance, api, multi-tenant, test]
phase_tier: ent
requirements: [REQ-20]
```
Audit + complete the data-subject-rights surface. Add: `GET /privacy/processing-register` (read the active processing purposes relevant to the caller), `POST /privacy/consent/{purpose}/revoke` (single-consent withdrawal, GDPR Art 7(3)), scoped audit-event read for the caller's own events, and a `withdrawn_at` vs `revoked_at` distinction on ConsentRecord. Prove all four rights (access/rectification/erasure/portability) end-to-end with tests asserting jurisdiction tagging + ownership isolation + audit logging.

### Phase 2 — Consent-revocation propagation
```yaml
phase: 2
types: [compliance, persistence, analytics, multi-tenant]
phase_tier: ent
requirements: [REQ-20]
```
Make consent revocation propagate downstream: revoking AI-processing consent unflags/suppresses AI-derived flags and excludes the user from aggregate/cohort surfaces; add a revocation-aware recompute seam (consumed later by P9). Tests prove revocation removes the user from aggregates and that re-grant restores eligibility.

### Phase 3 — Scan quota graceful degradation
```yaml
phase: 3
types: [api, worker, resilience, test]
phase_tier: ent
requirements: [REQ-21]
```
On extraction-LLM quota throttle, scans enter a `queued` state instead of failing 5xx (mirrors the statement queue path). Add a credit/quota pre-check, distinguish QUOTA_EXCEEDED (queue) from RATE_LIMIT (retry), and add per-error-code metrics counters. Tests simulate quota exhaustion and assert no 5xx + `queued` state.

### Phase 4 — Retention / TTL enforcement
```yaml
phase: 4
types: [compliance, data-migration, jobs, test]
phase_tier: ent
requirements: [REQ-20]
```
A retention service deletes or anonymizes data older than the declared `ProcessingRegister.retention_period`, exposed via an invokable management entrypoint (CLI/script) for the scheduler. Define audit-trail retention separately. Tests prove expired test data is removed and in-window data is retained.

### Phase 5 — Monetization plumbing (schema-level)
```yaml
phase: 5
types: [data-migration, persistence, billing-seam, test]
phase_tier: ent
requirements: []
```
Schema-level monetization only (SCOPE §9.2 — pricing mechanism deferred to ADR). Add plan-tier schema (a `plan` on ownership scope or a SubscriptionPlan table), a billing-hook interface seam (no live provider), and per-plan credit allocation/deduction wiring (decouple the hardcoded 50-credit default). Migration 023+. Tests prove plan-tier credit semantics + credit deduction on scan.

### Phase 6 — Launch hardening + readiness packet
```yaml
phase: 6
types: [docs, runbook, observability, test]
phase_tier: ent
requirements: [REQ-20, REQ-21]
```
Author DPO, disaster-recovery, incident-response, and security runbooks; consolidate the go/no-go PRODUCTION-CHECKLIST; add consent/DSR + per-error observability counters; compile the P7 exit-gate evidence packet mapping each exit-signal element to evidence. Cutover drill, paid-Gemini tier pre-commit, and the quota load test are deferred runtime items.

## Current Phase

Phase 4: Retention / TTL enforcement.

(Phase 1 closed smaller than scoped — audit of `backend/app/api/consent.py` found single-consent revoke, audit-event read, and processing-register read ALREADY shipped + tested. Phase 1's real delta was the `withdrawn_at` user-withdrawal-vs-system-revocation distinction + 3 tests. The initial Explore inventory had missed `api/consent.py`.)

## Dependencies

- All phases build on P1's consent/observability foundation (migration 004) + P6's analytics surface.
- Phase 2 (cohort recompute seam) is consumed by P9.
- Phase 5 migration follows the 022 head.
- Phase 6 consolidates evidence from Phases 1-5.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-building monetization beyond SCOPE's schema-only mandate | medium | Hard-stop at schema + hooks; no live provider; pricing mechanism stays in the deferred ADR. |
| Retention deletion is irreversible | high | Anonymize-where-audit-required (per D4 soft-delete); test on fixtures only; management entrypoint is opt-in, never auto-runs in tests. |
| Consent-revocation propagation accidentally deletes shared/scope data | high | Propagation is user-scoped; reuse the P6 personal-flag isolation pattern; ownership tests. |
| Quota degradation masks real failures | medium | Only QUOTA_EXCEEDED queues; other errors still surface; per-error-code metrics keep it observable. |
| Runtime drills (load test, cutover) can't run locally | expected | Deferred to the user's staging session per the drive policy; documented in the exit-gate packet. |

## Notes

- Monetization pricing mechanism is a separate ADR (SCOPE §9.2/§14) — explicitly out of P7 scope beyond schema plumbing.
- P6 runtime closure (P34/P35) proceeds in parallel during the user's staging session; it does not block P7 code.
- iOS runtime lane remains deferred (D47/P31).
