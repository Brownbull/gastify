# Queued Plan — Backend P1 Foundation

<!-- status: queued — activate when UX mockups plan (.kdbp/PLAN.md) reaches P13 handoff -->
<!-- To activate: rename this file to .kdbp/PLAN.md (archive the UX plan first) -->

## Goal

Deliver P1 Foundation backend — FastAPI + Postgres with identity, ownership scope, money/FX, consent, observability, i18n infra — passing the P1 exit-signal smoke test (REQ-15 through REQ-22).

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — multi-currency, four-jurisdiction compliance, AI receipt scanning (Chile + LATAM + EU + US + Canada)
- **ROADMAP phase:** P1 Foundation (no dependencies — P1 root)
- **Covers REQs:** REQ-15, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-22
- **Authored:** 2026-04-23
- **Status:** queued (UX mockups plan active; activate this after P13 ships)

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Scaffold + DB baseline | `deployment-release` | FastAPI app, uv env, pytest/ruff, alembic init, Postgres connect, structured logger + metrics exporter baseline, CI smoke | ent (Obs→scale) | low | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Money + currency + FX + i18n | `data, integration` | Integer-minor-units convention, `currencies` table (10 codes), `fx_rates` write-once with lazy read-through cache, USD-shadow compute, i18n string registry (es/en/pt) | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Identity + ownership scope + RLS | `auth-session, multi-tenant` | Firebase token-verify middleware, JIT user provision, `ownership_scope` + `ownership_scope_members` tables, RLS policies keyed off scope, initial scan-credit balance | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Consent + processing register + DSR | `data, multi-tenant` | `consent_records` + `processing_register` tables, per-purpose consent API, access/rectification/erasure/portability endpoints (Law 21.719 + GDPR + PIPEDA + CCPA/CPRA), audit event log | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Observability pipeline | `core-only` | Per-scan metric columns, metric exporter endpoint (OTel/Prometheus-compatible), U8 cost/latency baseline | ent (Obs→scale) | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Exit-signal smoke test | `core-only` | Integration E2E: JIT sign-in → transaction in non-primary currency → read USD shadow → consent-audit returns 1 record | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state -->
<!-- Tier values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->

## Phase Details

### Phase 1 — Scaffold + DB baseline

```yaml
phase: 1
types: [deployment-release]
phase_tier: ent
prototype: false
dim_overrides:
  - section: Core
    dim: Observability
    tier: scale
    reason: REQ-21 + U8 mandate structured logger + metrics exporter at scaffold time
sections_considered: [Core, Deployment/Release]
suppressed_dims_count: 2
decisions_entry: D1
```

- **Types:** `deployment-release`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Deployment/Release
- **Suppressed dimensions:** 2 (Deploy.Feature-flags, Deploy.Canary — scaffold phase, no feature code, no prod targets yet)
- **Grade overrides:**
  - Core.Error-handling: default MVP → **Ent** (typed exceptions + retry — foundational posture for all later phases)
  - Core.Observability: default MVP → **Scale** (structured logger + metrics exporter baked in at scaffold for REQ-21 + U8)
  - Deploy.Migration-order: default MVP → **Ent** (migrate-first gated — Alembic deploy hook, not deploy-then-migrate)
- **Trade-offs accepted:** See D1

### Phase 2 — Money + currency + FX + i18n

```yaml
phase: 2
types: [data, integration]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Integration]
suppressed_dims_count: 0
decisions_entry: D2
```

- **Types:** `data, integration` (revised from `data, background-jobs` — no daily cron; lazy read-through cache on transaction create)
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Data, Integration
- **Suppressed dimensions:** 0 on Core/Data; Integration has none suppressed
- **Grade overrides:**
  - Data.Backup/restore: default MVP `none` → **Ent** (daily snapshot — financial data red-line)
  - Integration.Retry/backoff: default MVP → **Ent** (exp backoff 3x — FX API flake)
  - Integration.Idempotency: default MVP → **MVP-structural** (PK `(date, from, to)` + `ON CONFLICT DO NOTHING` + re-read covers cold-start race at zero code cost; effective Ent via structural invariant)
  - Integration.Timeout: default MVP → **Ent** (explicit 3s + fail — transaction-create path can't block on stalled external)
- **FX architecture:** Lazy read-through cache per REQ-18. Transaction create looks up `fx_rates(today, from, USD)`. Miss → call external FX API → insert with ON CONFLICT → re-read → compute USD shadow. No scheduled daily job.
- **Trade-offs accepted:** See D2

### Phase 3 — Identity + ownership scope + RLS

```yaml
phase: 3
types: [auth-session, multi-tenant]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Auth/Session, Multi-tenant]
suppressed_dims_count: 2
decisions_entry: D3
```

- **Types:** `auth-session, multi-tenant`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Auth/Session, Multi-tenant
- **Suppressed dimensions:** 2 (Auth.Multi-tab-sync — backend lane not client; MT.Noisy-neighbor — scope-of-one MVP)
- **Grade overrides:**
  - Auth.CSRF: MVP `none` **accepted** (bearer-token-only API, no cookies — spec red-line satisfied; escalation trigger: cookie-based session added)
  - Auth.Refresh-token: default MVP long-lived → **Ent** rotating (Firebase native, zero code cost)
  - MT.Row-isolation: default MVP `WHERE tenant_id` → **Ent** RLS policy (Postgres RLS keyed off `ownership_scope_id`, deny-by-default)
- **Trade-offs accepted:** See D3

### Phase 4 — Consent + processing register + DSR

```yaml
phase: 4
types: [data, multi-tenant]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Multi-tenant]
suppressed_dims_count: 2
decisions_entry: D4
```

- **Types:** `data, multi-tenant`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Data, Multi-tenant
- **Suppressed dimensions:** 2 (Data.Indexing — few lookups; MT.Noisy-neighbor — scope-of-one)
- **Grade overrides:** None — baseline Ent across all kept dimensions
- **Compliance surface:** Law 21.719 (Chile) + GDPR (EU) + PIPEDA (Canada) + CCPA/CPRA (US/California). DSR endpoints cover access, rectification, erasure, portability. Audit event log at Ent tier; immutable/WORM deferred to Scale.
- **Trade-offs accepted:** See D4

### Phase 5 — Observability pipeline

```yaml
phase: 5
types: [core-only]
phase_tier: ent
prototype: false
dim_overrides:
  - section: Core
    dim: Observability
    tier: scale
    reason: REQ-21 + U8 mandate exporter is the deliverable; phase IS observability
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D5
```

- **Types:** core-only
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dimensions:** 0
- **Grade overrides:**
  - Core.Observability: Ent → **Scale** (REQ-21 + U8 mandate structured logs + metric exporter + per-scan metrics. Phase IS observability — exporter is the deliverable.)
- **Deliverables:** Per-scan metric columns (`llm_tokens_in`, `llm_tokens_out`, `llm_cost_usd`, `scan_duration_ms`, `llm_latency_ms`, `queue_wait_ms`, `thumbnail_gen_ms` per REQ-21). Metric exporter endpoint. P1 establishes baseline; P2 Receipt Scan Pipeline emits into it.
- **Trade-offs accepted:** See D5

### Phase 6 — Exit-signal smoke test

```yaml
phase: 6
types: [core-only]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D6
```

- **Types:** core-only
- **Tier:** mvp
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dimensions:** 0
- **Grade overrides:** None — happy-path E2E assertion
- **Assertion chain:** sign in via Firebase JIT → user row + ownership_scope-of-one provisioned → write transaction in CLP → USD shadow computed via lazy FX fetch → read back `amount_usd_minor` + `fx_rate_to_usd` + `fx_captured_at` → consent-audit endpoint returns ≥1 record. All P1 REQs proven end-to-end.
- **Trade-offs accepted:** See D6

## Current Phase

Phase 1: Scaffold + DB baseline

## Dependencies

- P2 needs P1 (app + DB scaffold)
- P3 needs P1 (app + DB scaffold); parallel with P2
- P4 needs P3 (consent rows key off user/scope)
- P5 needs P1 (structured logger baseline from P1; per-scan metrics + exporter added here)
- P6 needs P2 + P3 + P4 + P5 (exit-signal assertion spans all)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Firebase dev project not provisioned blocks P3 | high | Provision in P1; fail fast on missing env vars at startup |
| RLS policy ownership leak (SC-07/SC-08 foundation) | critical | Ent tier on P3; deny-by-default + per-policy test; pg `test_rls` fixture |
| DSR endpoint scope insufficient across 4 jurisdictions | critical | Ent tier on P4; legal-review checklist before merge; erasure-soft-delete review |
| External FX API outage blocks transaction create | medium | Ent-tier retry + 3s timeout; fallback = reject with retry-hint; P5 statement path can backfill |
| Integer-minor-units violated by later phases | medium | DB CHECK constraint + app validator at schema layer |
| Structured log schema evolves across phases | low | Fixed schema contract written in P1; enforced via typed logger wrapper |
| Cookie-based session added later silently breaks CSRF posture | medium | PENDING item — `/gabe-assess` gate on any session/cookie addition |
| FX backfill path (UPDATE fx_rates) breaks structural idempotency | medium | PENDING item — escalate to job-ID dedupe before any UPDATE lands |

## Pending (activate with the plan)

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|
| P1 | 2026-04-23 | gabe-plan (D3) | CSRF escalation trigger: if cookie-based session is introduced (e.g., HTTP-only cookie for refresh-token XSS defense), Auth.CSRF must escalate from MVP `none` to Ent double-submit token. Bearer-only API currently immune. | .kdbp/DECISIONS.md#D3 | mvp | medium | high | 0 | open |
| P2 | 2026-04-23 | gabe-plan (D2) | FX backfill escalation trigger: if any code path adds UPDATE to `fx_rates` (e.g., statement-reconciliation backfill of corrected rates), structural PK+ON-CONFLICT idempotency breaks down. Escalate BG-jobs.Idempotency to Ent (job-ID dedupe Option B) before merging the UPDATE path. | .kdbp/DECISIONS.md#D2 | mvp | medium | medium | 0 | open |

## Notes

- Client-side concerns (SPA i18n consumption, mobile refresh-token storage, sign-out cache eviction) land after backend P1 — sequence TBD when UX mockup handoff is in hand.
- P1 Exit signal per ROADMAP §Phase-1: smoke test signs in (JIT scope-of-one), writes transaction non-primary currency, reads USD shadow at captured FX rate, consent-audit endpoint returns one record. Phase 6 encodes exactly this.
- Tier distribution: mvp×1, ent×5, scale×0. Two phases have Scale-grade overrides on Obs dim (P1.Obs + P5.Obs) justified by REQ-21 + U8.

## Plan Creation Log (preserved)

- **2026-04-23 04:45 — PLAN CREATED:** 6 phases | medium-high complexity | mvp maturity. TIERS: mvp×1, ent×5, scale×0. 10 grade overrides, 8 suppressed dims. DECISIONS D1→D6. PENDING P1, P2 (CSRF + FX backfill escalation triggers).
- **2026-04-23 01:50 — PLAN RETROFIT to spec v7.1:** +Types col, +6 YAML blocks per phase, P1+P5 Tier-cell `ent (Obs→scale)` notation. Zero LLM calls (overrides already explicit in D1+D5). Zero tier decisions changed.
- **2026-04-23 — lane rollback:** Plan migrated from `.kdbp/lanes/p1-backend/PLAN.md` (lane branch) → `.kdbp/archive/queued_backend-p1.md` (queued). Backend work parked until UX mockup plan ships.
