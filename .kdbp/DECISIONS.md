# Architecture Decisions

| # | Date | Decision | Rationale | Alternatives Considered | Status | Review Trigger |
|---|------|----------|-----------|------------------------|--------|----------------|
| D1 | 2026-04-23 | P1 Scaffold tier = ent with Core.Obs→Scale + Deploy.Migration→Ent + Core.Error→Ent overrides | Structured log + metrics exporter baked at scaffold time (REQ-21 + U8); typed error handling foundational; migrate-first prevents runtime errors during deploy | Plain MVP scaffold (TIER_DRIFT against REQ-21); ship Obs in P5 only (duplicates infra) | active | Obs infra churns OR REQ-21 schema changes |
| D2 | 2026-04-23 | P2 FX = lazy read-through cache with PK+ON CONFLICT structural idempotency; integration tier override Data.Backup→Ent + Integration.Retry/Timeout→Ent | User model: per-pair-per-day cache triggered on transaction create, no daily cron needed; structural dedupe covers cold-start race at zero code cost | Daily batch cron (needs scheduler infra, out-of-scope); Redis SETNX dedupe (Scale overkill at scope-of-one); FX API write through no cache (N× external calls, cost+latency) | active | FX backfill/UPDATE path added OR external FX cost spikes |
| D3 | 2026-04-23 | P3 Auth tier = ent with MT.Row-isolation→RLS + Auth.RefreshToken→Ent rotating; CSRF stays MVP none | RLS load-bearing for SC-07/SC-08; ownership leak post-launch catastrophic; Firebase handles refresh rotation natively; bearer-token-only API immune to CSRF by design | WHERE tenant_id app-level (one missed query = leak); CSRF double-submit token (redundant for bearer); manual refresh endpoint (reinvents Firebase) | active | Cookie-based session added OR household multi-user MVP |
| D4 | 2026-04-23 | P4 Consent + DSR tier = ent baseline across 4 jurisdictions | Law 21.719 + GDPR + PIPEDA + CCPA/CPRA hard legal constraint, not ergonomics; audit event log required for DSR proof-of-processing | MVP `none` on audit (blocks per red-line); Scale immutable/WORM (overkill pre-launch) | active | New jurisdiction added OR enforcement action |
| D5 | 2026-04-23 | P5 Observability tier = ent with Core.Obs→Scale (REQ-21 exporter) | REQ-21 + U8 mandate structured logs + metric exporter at P1 exit; phase IS observability, exporter is the deliverable | MVP (TIER_DRIFT against REQ-21); defer to Phase 7 launch-hardening (breaks P1 exit-signal) | active | OTel/Prometheus replaced OR per-scan metric schema changes |
| D6 | 2026-04-23 | P6 Exit-signal smoke test tier = mvp | Happy-path E2E assertion only; no new infra, no new abstractions; proves P2–P5 integrate correctly per ROADMAP §Phase-1 exit signal | Ent with edge coverage (premature; edges land in per-feature phases later) | active | P1 REQ set expands |
| D7 | 2026-04-23 | ux-mockups P1 Design language + tokens tier = **ent** (escalated from mvp 2026-04-23) | Multi-theme runtime (not single-winner-lock) + port legacy 3 themes × light/dark + 3 new candidates + 4-screen stress test × 3 platform frames (desktop web / mobile web / native mobile) = load-bearing for every downstream phase; MVP single-winner premise invalidated by user clarification | Stay mvp (invalid premise — user wants runtime multi-theme, not locked winner) | accepted | Stress-test screens expand OR runtime theme count changes |
| D8 | 2026-04-23 | ux-mockups P2 Atomic components tier = mvp | Atoms simple; happy-path variants enough; state matrix belongs to P3 | Ent full states at atom level (duplicates P3) | accepted | P5-P12 atoms missing |
| D9 | 2026-04-23 | ux-mockups P3 Molecular components tier = ent | Load-bearing for 9 screen phases; full state matrix + WCAG AA prevents compounded rework | MVP happy-path only (forces P13 re-audit) | accepted | 3rd platform added |
| D10 | 2026-04-23 | ux-mockups P4 Flow map + REQ matrix tier = mvp | Living doc rewritten P5-P12; over-spec wastes effort | Ent upfront audit (premature) | accepted | P13 audit gaps |
| D11 | 2026-04-23 | ux-mockups P5 Auth + onboarding + consent tier = mvp | Mockup-only; hardening in backend phases; consent copy legal review is separate gate | Ent (out of scope for mockup deliverable) | accepted | Legal review flags copy |
| D12 | 2026-04-23 | ux-mockups P6 Core capture loop tier = mvp | Happy + 5 scan states cover surface; extended errors move to P12 | Ent (duplicates P12 scope) | accepted | Capture flow expands |
| D13 | 2026-04-23 | ux-mockups P7 Batch + statement flows tier = mvp | Happy + basic errors (credit warn, encrypted pw); reconciliation edges at P12 | Ent (duplicates P12) | accepted | Statement flow expands |
| D14 | 2026-04-23 | ux-mockups P8 History + items + insights tier = mvp | Standard list views | Ent (overkill for list patterns) | accepted | Data-view complexity spikes |
| D15 | 2026-04-23 | ux-mockups P9 Trends + reports tier = mvp | Chart composition; empty/loading chart states at P12 | Ent (duplicates P12 edge coverage) | accepted | New chart types added |
| D16 | 2026-04-23 | ux-mockups P10 Groups tier = mvp | 16 screens but each simple; split mid-phase if overwhelmed | Ent (no justification for 16 simple screens) | accepted | Group ownership model changes |
| D17 | 2026-04-23 | ux-mockups P11 Settings + profile tier = mvp | CRUD forms | Ent (no justification for CRUD) | accepted | New settings surface |
| D18 | 2026-04-23 | ux-mockups P12 Alerts + errors + offline tier = ent | Failure-mode surface drives reliability perception; aggregates extended edge states (permission denied, rate limited, session expired, payment failed, sync conflict, corruption recovery) | MVP (leaves handoff with undefined edge designs) | accepted | SCOPE tightens to happy-path ship |
| D19 | 2026-04-23 | ux-mockups P13 Handoff + index + audit tier = ent | Exit gate — REQ×screen audit + a11y pass + cross-screen consistency validates coverage claim; load-bearing for frontend phases | MVP handoff (broken coverage guarantee; frontend discovers gaps at impl time) | accepted | None — audit mandatory |
| D20 | 2026-04-24 | ux-mockups P1 T5 external render pass (6 themes × 4 stress × 3 platforms = 72 renders) superseded by direct production-surface authoring (14 desktop variants using locked tokens) | Production surfaces exercise tokens under real constraints (data density, responsive grids, component composition); stronger evidence than exploratory renders. `docs/mockups/STRESS-TEST-SPEC.md` retained as platform-frame reference. `docs/mockups/explorations/` stays empty with README noting supersession | Execute T5 MVS (18 renders) before building production surfaces (slower, validates less); defer T5 to P13 audit (too late, tokens already locked) | accepted | Theme count changes OR token structure breaks production surface |

<!-- Status: active / superseded / revisit -->
<!-- BEHAVIOR.md constraints reference decision IDs: "All integrations mocked (ref D1)" -->

---

## D1 — Phase 1 tier: ent (2026-04-23)

**Phase:** Scaffold + DB baseline
**Types:** deployment-release
**Tier chosen:** ent
**Prototype:** no
**Reason:** Foundational — structured logger + metrics exporter baked in at scaffold-time so REQ-21 + U8 instrumentation is ambient for all later phases, not bolted on. Migrate-first gated prevents runtime errors when schema + code deploy together.

### Sections rendered
- Core (always, all 4 dims)
- Deployment/Release: 2 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- deployment-release.Feature-flags — reason: no feature code yet at scaffold
- deployment-release.Canary — reason: no prod targets yet at scaffold

### Grade overrides
- Core.Error-handling: default MVP → **Ent** (typed + retry). Reason: foundational error-handling posture used by every later phase — retrofitting is painful.
- Core.Observability: default MVP → **Scale** (structured + metrics exporter). Reason: REQ-21 + U8 require metric exporter at P1 exit; wiring at scaffold time avoids retroactive log-format migrations.
- Deployment-release.Migration-order: default MVP → **Ent** (migrate-first gated). Reason: Alembic deploy hook — new code waits on migration-ready signal. Avoids the "old code runs against new schema" window.

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions at MVP)
- S × 2 (Core.Error ΔE→S, Deploy.Rollback ΔM→E)
- M × 1 (Deploy.Migration ΔE→S — expand/contract deferred)

Load-bearing items deferred:
- Core.Testing at MVP (happy-path only) — edges land per-feature phase later
- Deploy.Rollback-plan at MVP (`git revert`) — no prod yet; escalate before first cutover

### Review trigger
- Before first production cutover: escalate Deploy.Rollback to Ent (prev-image revert) + Deploy.Canary to Ent (% traffic)
- When observability infrastructure (OTel collector, log pipeline) changes

### Status
- accepted

---

## D2 — Phase 2 tier: ent (2026-04-23)

**Phase:** Money + currency + FX + i18n
**Types:** data, integration (revised from data, background-jobs)
**Tier chosen:** ent
**Prototype:** no
**Reason:** Financial-data backup red-line forces Ent; lazy FX model eliminates need for background-jobs section entirely. Retry + explicit timeout mandatory on transaction-create path.

### Type revision
Originally proposed `data, background-jobs` on assumption of daily scheduled FX fetch. User clarified actual model: lazy read-through cache, per-pair-per-day, triggered on first transaction of day in that currency. No scheduler. Revised types to `data, integration`.

### Sections rendered
- Core (always, all 4 dims)
- Data: all 4 dims
- Integration: all 4 dims (replacing Background-jobs)

### Dimensions suppressed (Layer 2 filter)
- None (all dimensions kept)

### Grade overrides
- Data.Backup/restore: default MVP `none` → **Ent** (daily snapshot). Reason: financial data red-line; `none` rejected by spec.
- Integration.Retry/backoff: default MVP `none` → **Ent** (exp backoff 3x). Reason: external FX APIs flake; retry preserves transaction-create path.
- Integration.Idempotency: default MVP `none` → **MVP-structural**. Reason: PK `(date, from_currency, to_currency)` + `INSERT ... ON CONFLICT DO NOTHING` + re-read yields winning row. Cold-start race of 2 simultaneous transactions results in ≤1 duplicate external call (<$0.001 at scope-of-one), no data corruption. Effective Ent-tier behavior at zero code cost.
- Integration.Timeout: default MVP `default` → **Ent** (explicit 3s + fail). Reason: transaction-create path cannot block on stalled external; fallback = reject with retry hint.

### Δ deferred by tier choice
- L × 3 (Core.Testing, Core.Abstractions, Data.Schema ΔM→E)
- M × 3 (Data.Migration ΔE→S, Integration.RateLimit ΔE→S, Integration.Retry ΔE→S)
- S × 2 (Core.Error ΔE→S, Integration.Timeout ΔE→S)

Load-bearing items deferred:
- Integration.Rate-limit at MVP (`hope`) — scope-of-one volume tolerates; escalate on first 429
- Data.Migration-safety at MVP — single-env dev deploy acceptable

### Review trigger
- FX backfill/UPDATE path added (structural idempotency breaks — escalate to job-ID dedupe Option B)
- External FX API bill exceeds budget (add Ent rate-limiting)
- Second FX provider added (side-effect-key dedupe Scale)

### Status
- accepted

---

## D3 — Phase 3 tier: ent (2026-04-23)

**Phase:** Identity + ownership scope + RLS
**Types:** auth-session, multi-tenant
**Tier chosen:** ent
**Prototype:** no
**Reason:** RLS correctness load-bearing for SC-07 (privacy by default) + SC-08 (sign-out isolation); ownership leak post-launch catastrophic. Bearer-token-only API design eliminates CSRF surface. Firebase covers refresh-token rotation natively.

### Sections rendered
- Core (always, all 4 dims)
- Auth/Session: 4 dims kept, 1 suppressed
- Multi-tenant: 3 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- auth-session.Multi-tab-sync — reason: backend lane, not client; client lanes (P3/P4 future) handle
- multi-tenant.Noisy-neighbor — reason: scope-of-one MVP, no tenant contention possible

### Grade overrides
- Auth.CSRF: MVP `none` **accepted** (not escalated). Reason: API-only service with `Authorization: Bearer <token>` headers; no cookies, no ambient credentials, no CSRF surface. Mobile naturally immune. Spec red-line satisfied per "API-only services with bearer-token auth" exemption.
- Auth.Refresh-token: default MVP long-lived → **Ent** rotating. Reason: Firebase Auth handles refresh-token rotation natively — zero code cost.
- Multi-tenant.Row-isolation: default MVP `WHERE tenant_id` → **Ent** RLS policy. Reason: app-level `WHERE` clauses are opt-in — one missed query = ownership leak. Postgres RLS keyed off `ownership_scope_id` with deny-by-default policy is defense-in-depth mandatory for SC-07/SC-08.

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions)
- M × 3 (Auth.TokenRefresh ΔE→S, Auth.SessionInvalidate ΔE→S, MT.AuthZ ΔE→S)
- S × 3 (Core.Error ΔE→S, Auth.CSRF ΔE→S, Auth.RefreshToken ΔE→S)

Load-bearing items deferred:
- MT.Audit-logging at Ent (event log) — immutable/WORM deferred to Scale for compliance hardening later
- MT.AuthZ at Ent (per-tenant RBAC) — ABAC/OPA deferred until roles proliferate

### Review trigger
- Cookie-based session introduced (escalate Auth.CSRF to Ent double-submit token)
- Household multi-user MVP activates (scope-of-one → scope-of-N; re-test RLS policies)
- Second tenant-class added (per-tenant rate-limit Noisy-neighbor becomes relevant)

### Status
- accepted

---

## D4 — Phase 4 tier: ent (2026-04-23)

**Phase:** Consent + processing register + DSR
**Types:** data, multi-tenant
**Tier chosen:** ent
**Prototype:** no
**Reason:** Four-jurisdiction compliance (Law 21.719 + GDPR + PIPEDA + CCPA/CPRA) is a hard legal constraint at MVP per SCOPE §9.4. Audit event log required to prove DSR processing.

### Sections rendered
- Core (always, all 4 dims)
- Data: 3 dims kept, 1 suppressed
- Multi-tenant: 3 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- data.Indexing — reason: few lookups, simple consent-by-user queries
- multi-tenant.Noisy-neighbor — reason: scope-of-one MVP

### Grade overrides
- None — baseline Ent across all kept dimensions

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions)
- M × 5 (Data.Schema/Migration/Backup ΔE→S; MT.AuthZ/Audit ΔE→S)
- S × 1 (Core.Error ΔE→S)

Load-bearing items deferred:
- MT.Audit-logging at Ent event-log — immutable/WORM Scale deferred until first audit

### Review trigger
- New jurisdiction added (re-scope DSR endpoint coverage)
- Regulatory enforcement action against similar-class service
- Audit log volume exceeds queryable threshold (escalate to immutable sink)

### Status
- accepted

---

## D5 — Phase 5 tier: ent with Obs→Scale override (2026-04-23)

**Phase:** Observability pipeline
**Types:** core-only
**Tier chosen:** ent (base) with Core.Observability upgraded to Scale
**Prototype:** no
**Reason:** REQ-21 + U8 mandate structured logs + metric exporter + per-scan metric columns at P1 exit. The phase IS observability — exporter is the deliverable, not a nice-to-have.

### Sections rendered
- Core (always, all 4 dims)

### Dimensions suppressed
- None

### Grade overrides
- Core.Observability: Ent → **Scale**. Reason: REQ-21 specifies per-scan metric columns (`llm_tokens_in`, `llm_tokens_out`, `llm_cost_usd`, `scan_duration_ms`, `llm_latency_ms`, `queue_wait_ms`, `thumbnail_gen_ms`) + structured logs + metric export. Core tier ladder: MVP `print/log` → Ent `structured` → Scale `+metrics+traces`. Metric exporter is Scale-tier dim — upgrade mandatory.

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions)
- S × 1 (Core.Error ΔE→S)

Load-bearing items deferred:
- Core.Testing happy-path — load eval + fuzz deferred to Scale (not needed at launch volume)
- Core.Abstractions 1-interface — strategy+DI Scale deferred until 3+ exporter backends

### Review trigger
- Metric schema REQ-21 changes
- OTel/Prometheus replaced with other backend
- Per-scan metric count exceeds cardinality budget

### Status
- accepted

---

## D6 — Phase 6 tier: mvp (2026-04-23)

**Phase:** Exit-signal smoke test
**Types:** core-only
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — happy-path E2E assertion, no new infra, no new abstractions. Proves P2–P5 integrate per ROADMAP §Phase-1 exit signal.

### Sections rendered
- Core (always, all 4 dims)

### Dimensions suppressed
- None

### Grade overrides
- None — all dims at MVP baseline

### Δ deferred by tier choice
- L × 2 (Core.Testing happy-path, Core.Abstractions inline) — deliberate; edge/load coverage lands in per-feature phases
- L × 1 (Core.Error fail-loud)
- M × 1 (Core.Observability print/log — phase uses existing P1 + P5 infra; no new log schema)

Load-bearing items deferred:
- None — smoke test is assertion-only; no production code surface

### Review trigger
- P1 REQ set expands
- Exit-signal definition changes in ROADMAP

### Status
- accepted

---

## Batch note — ux-mockups lane plan tier decisions (D7–D19)

**Scope:** All 13 phases of the ux-mockups lane plan created 2026-04-23.

**Domain note:** ux-mockups lane produces design deliverables (HTML mockups, tokens, flow walkthroughs, handoff docs) — not runtime code. The tier framework dimensions in `tier-section-index.md` (testing coverage, observability, scalability, data integrity, migration safety) are code-production-oriented and mostly moot for mockup artifacts. Per-phase matrix rendering was **batched** rather than rendered 13 times because nearly every design phase defaults to MVP with the same rationale. Where Ent is picked (P3, P12, P13), the reasoning is captured below. `--full-catalog` option remains available if mid-lane a phase warrants per-dimension scrutiny.

**Values alignment:**
- U2 (Plan Light, Build Real) — MVP default for 10 of 13 phases
- V5 (Prove It Works) — P13 audit tier = ent ensures evidence gate at lane exit

---

## D7 — ux-mockups P1 tier: ent (escalated from mvp 2026-04-23)

**Phase:** Design language + tokens
**Types:** `design-system`
**Tier:** ent | **Prototype:** no
**Reason (original mvp):** default MVP pick per U2. Theme exploration iterative; locking early premature. Tokens refine in P3 feedback loop.

### Tier escalation — 2026-04-23 (mid-phase, pre-exec)

- **From:** mvp → **To:** ent
- **Trigger:** user clarification + legacy investigation (mid-Phase-1, before any code shipped)
- **Root cause of escalation:** original D7 assumed single-theme-locked model (`pick winner → lock tokens`). User clarified + legacy `bmad/boletapp/docs/mockups/` evidence confirmed: gastify ships **runtime multi-theme** (Normal/Pro/Mono × light/dark = 6 variants alive in-app), not locked winner. Plus platform split expanded from 2 surfaces to **3 surfaces** (Desktop Web responsive / Mobile Web PWA limited / Native Mobile iOS+Android RN full). Plus stress-test methodology requires 4 screens × N themes × 3 platforms, not dashboard-only.
- **Reinstates dimensions:**
  - `design-system.Token-architecture` → Ent (multi-theme scheme with light/dark variants, not flat single-theme)
  - `design-system.Platform-frames` → Ent (3 platform conventions documented, not mobile-only)
  - `design-system.Stress-test-breadth` → Ent (4-screen stress test, not dashboard-only)
  - `design-system.State-matrix` → Ent (hero + variant states per screen per PLAN convention)
- **Reason (ent):** load-bearing for all downstream phases (P2 atoms, P3 molecules, P5–P12 screens) — a token-architecture mistake here propagates to 28+ screens. Legacy path proved the pattern works (boletapp `data-theme`+`data-mode` CSS strategy, 6 style prompts, 708-line gallery hub). Porting + extending is lower-risk than clean-slate rebuild.
- **Alternatives rejected:**
  - Stay MVP single-winner-lock → invalidated by user: screenshots show runtime multi-theme, not single choice
  - Clean-slate per original PLAN note → discards 28 legacy screens + 13 flows + 6 style prompts = ~$work already paid

**Sections reinstated:** design-system (was suppressed under MVP rationale, now active at Ent)
**Review trigger:** Escalate further (scale) only if cohort theme customization per REQ-27 surfaces OR native platforms diverge enough to require per-platform token forks.
**Status:** accepted

---

## D8 — ux-mockups P2 tier: mvp (2026-04-23)

**Phase:** Atomic components
**Types:** `design-system, ui-kit`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Atoms are simple — happy-path variants enough; state matrix belongs to P3 molecules.
**Review trigger:** Escalate if P5-P12 screens need atomic variants missing here.
**Status:** accepted

---

## D9 — ux-mockups P3 tier: ent (2026-04-23)

**Phase:** Molecular components
**Types:** `design-system, ui-kit`
**Tier:** ent | **Prototype:** no
**Reason:** Molecular components are load-bearing infra for P5-P12 (nine screen phases). Full state matrix (default/hover/active/focus/disabled/loading/error) + WCAG AA contrast verification pays off because every screen reuses these. Under-specifying here creates rework compounded nine times.
**Δ deferred vs MVP:** MVP molecules happy-path-only → would force re-audit at P13 to fill gaps. Enterprise now = audit-once.
**Review trigger:** Escalate to scale if we add a 3rd platform (e.g., desktop native) beyond web + mobile.
**Status:** accepted

---

## D10 — ux-mockups P4 tier: mvp (2026-04-23)

**Phase:** Flow map index + REQ×screen matrix
**Types:** `flows, index`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Living doc rewritten through P5-P12; over-spec at creation wastes effort.
**Review trigger:** P13 audit will reveal if index gaps blocked coverage verification.
**Status:** accepted

---

## D11 — ux-mockups P5 tier: mvp (2026-04-23)

**Phase:** Auth + onboarding + consent
**Types:** `user-facing, auth`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Mockup artifact only — real auth hardening happens in backend phases. Consent screens render 4 jurisdictions per REQ-20 but legal review of copy is a separate gate outside mockup tier.
**Status:** accepted

---

## D12 — ux-mockups P6 tier: mvp (2026-04-23)

**Phase:** Core capture loop
**Types:** `user-facing, capture, ai-agent`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Happy path + 5 scan states cover the critical surface; extended error/edge states moved to P12 (ent tier) where they get dedicated attention. REQ-26 QR/CAF boleta scoped as mode option inside Idle state per user direction.
**Status:** accepted

---

## D13 — ux-mockups P7 tier: mvp (2026-04-23)

**Phase:** Batch + statement flows
**Types:** `user-facing, capture, reconciliation`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Happy + basic error coverage (credit warning, encrypted pw). Sync conflict + reconciliation edge cases land in P12.
**Status:** accepted

---

## D14 — ux-mockups P8 tier: mvp (2026-04-23)

**Phase:** History + items + insights
**Types:** `user-facing, data-view`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Standard list views with established filter/sort/pagination patterns.
**Status:** accepted

---

## D15 — ux-mockups P9 tier: mvp (2026-04-23)

**Phase:** Trends + reports
**Types:** `user-facing, analytics, charts`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Chart composition exploration; multiple chart types covered but empty/loading/partial-data chart states move to P12.
**Status:** accepted

---

## D16 — ux-mockups P10 tier: mvp (2026-04-23)

**Phase:** Groups (shared expenses)
**Types:** `user-facing, multi-tenant`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Largest phase count (16 screens) but each screen simple. Mid-phase split into sub-waves allowed per plan risk table.
**Review trigger:** Split phase if mid-phase exec reveals screen count is blocking progress.
**Status:** accepted

---

## D17 — ux-mockups P11 tier: mvp (2026-04-23)

**Phase:** Settings + profile
**Types:** `user-facing, settings`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. CRUD forms with live-preview for preferences.
**Status:** accepted

---

## D18 — ux-mockups P12 tier: ent (2026-04-23)

**Phase:** Alerts + errors + offline states
**Types:** `user-facing, edge-cases`
**Tier:** ent | **Prototype:** no
**Reason:** Failure-mode surface is where users judge reliability. Happy-path-only mockups (pushed to P5-P11) hide the rough edges. This phase aggregates extended edge states — permission denied, rate limited, session expired, payment failed, sync conflict, data corruption recovery — in one place so the handoff engineer sees the complete failure taxonomy.
**Δ deferred vs MVP:** MVP errors cover only obvious states (offline, scan error) → handoff inherits undefined edge-state designs → frontend phases bake ad-hoc error handling.
**Review trigger:** Downgrade to mvp only if SCOPE tightens to happy-path MVP ship.
**Status:** accepted

---

## D19 — ux-mockups P13 tier: ent (2026-04-23)

**Phase:** Handoff + index hub + audit
**Types:** `documentation, validation`
**Tier:** ent | **Prototype:** no
**Reason:** Exit gate for all 12 prior phases. REQ×screen audit turns "we made mockups" into "we proved we covered SCOPE." MVP handoff (no audit, no a11y pass) = broken coverage guarantee — risk compounds because downstream frontend phases build from this deliverable.
**Δ deferred vs MVP:** MVP handoff HANDOFF.md-only, no audit → P12 output not verified complete → frontend phases discover gaps at implementation time.
**Review trigger:** None — audit tier is load-bearing for downstream frontend phases.
**Status:** accepted
