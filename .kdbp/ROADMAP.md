---
name: gastify
version: 1.3
created_at: 2026-04-22
last_changed_at: 2026-05-28
status: finalized v1.3
derived_from: SCOPE.md v1
granularity: fine
phase_count: 15
---

# ROADMAP — Gastify

> **Derived from `.kdbp/SCOPE.md`.** Medium-inertia. Updates on any `/gabe-scope-change` (addition, pivot, addition-of-phase, removal-of-phase) or on phase completion.
> Status: **finalized v1.3** (2026-05-28). Phase status reconciled after P5 completion; P6 is the next active roadmap phase.

## §1 How to read this file

- **Inertia.** SCOPE is the premise (low-change). ROADMAP is the phase plan (changes as phases complete, split, or insert). Individual tasks + implementation detail live in PLAN (high-change).
- **Granularity.** 9 phases, fine-grained. Each phase covers 1–5 REQs with a tight goal. A phase's goal is the user-visible or architecturally-visible milestone it delivers.
- **Order is dependency-driven, not priority-driven.** What must exist before the next thing can run.
- **Parallel-able.** Multiple phases can run concurrently where shown in §4. The dependency graph is the ground truth, the phase table below is a reading order.
- **Tool wording follows SCOPE §9.0.** Category constraints are hard; specific tool names are suggestions-as-of-2026-04-22 owned by ADRs. When a phase goal or exit signal names a technology class (e.g., "vision LLM", "managed identity provider"), the current suggested implementation is in SCOPE §9.1.
- **Taxonomy prompt boundary.** The four-level taxonomy is L1 `Industry` (es: `Rubro`), L2 `Business Type` (es: `Giro`), L3 `Family` (es: `Familia`), L4 `Category` (es: `Categoría`). AI prompts may assign only L2 transaction/store categories and L4 item categories. L1 and L3 are deterministic parent groups used later for statistics, filters, drill-downs, and UI grouping. All canonical keys and level names are English; Spanish labels/translations are required from day zero.

## §2 Phase Table (at-a-glance)

| # | Phase | Goal | Depends on | Parallel with | REQs | Status |
|---|---|---|---|---|---|---|
| P1 | **Foundation** | Backend scaffold + identity + ownership-scope + money/FX + consent/processing register + observability — the stage on which everything else stands. | — | — | REQ-15, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-22 | completed |
| P2 | **Receipt Scan Pipeline** | Photo → two-stage vision-LLM extraction → math-gate → L4 item categorization + L2 transaction categorization → persisted transaction with USD shadow. Dual-transport scan-progress streaming. | P1 | — | REQ-01, REQ-02, REQ-03, REQ-04, REQ-12 | completed |
| P3 | **Web Portal MVP** | Responsive static SPA — auth, receipt scan flow, transaction ledger, manual edits with `user_edited_at`, sign-out isolation. | P1, P2 | P4 | REQ-05 (web slice), REQ-13, REQ-14 (web), REQ-23 | completed |
| P4 | **Mobile App MVP** | Single cross-platform codebase with Android-first runtime proof for the current desktop/dev roadmap cycle. Native camera, bidirectional streaming, native keystore, sign-out isolation. iOS runtime lane deferred post-roadmap. | P1, P2 | P3 | REQ-05 (mobile slice), REQ-13, REQ-14 (mobile), REQ-24, REQ-25 | completed |
| P5 | **Statement Reconciliation + Cards** | PDF statement upload → extraction → match against existing receipts → 3-bucket view + coverage metric. Card alias CRUD (no PCI). | P2 | P6 | REQ-07, REQ-08, REQ-09 | completed |
| P6 | **Insights + Item Flags** | Monthly view with deterministic taxonomy rollups (L2 transaction categories and L4 item categories grouped through L1/L3), gravity-center detection, item urgency/special-case flag with personal-only scope enforcement. | P2 | P5 | REQ-06, REQ-10, REQ-11 | active |
| P10 | **Settings + Profile + Themes** | Settings screen (profile, preferences, themes, consent UI, data export, account actions). 3 color themes × light/dark ported from legacy. Web + mobile. | P6 | P11, P12 | Feature parity | pending |
| P11 | **Batch Ops + Category Management** | Multi-select transaction list + batch update/delete. Category/merchant learned-data management (view/edit/delete). | P10 | P12 | Feature parity | pending |
| P12 | **Batch Scanning** | Multi-receipt capture with image queue + batch review before save. Reuses single-scan pipeline per receipt. | P2 | P11 | Feature parity | pending |
| P13 | **Dashboard + Charts/Trends** | Rich home dashboard (treemap/category breakdown). Trends view with charts (donut, bar, line) + drill-down + period navigation. | P10 | P14 | Feature parity | pending |
| P14 | **Items View + Reports** | Dedicated cross-transaction item search. Weekly/monthly report cards with spending summaries and charts. | P13 | — | Feature parity | pending |
| P15 | **Notification Center** | In-app notification view (list, read/unread, mark-read, delete). Backend notification hooks. | P2 | — | Feature parity | pending |
| P16 | **Compliance + Launch Hardening** | Four-jurisdiction regulatory readiness validated (Law 21.719, GDPR, PIPEDA, CCPA/CPRA) + launch infra + cutover drill. Paid-tier LLM pre-commit in place. Monetization plumbing live. | P1–P15 | — | Consolidates + audits REQ-20, REQ-21 | pending |
| P17 | **Structured-Boleta Shortcut** | Chilean electronic-boleta QR/CAF parser bypasses the vision LLM for structured receipts — cuts per-scan cost on SII-Resolution-52/2026 electronic boletas. Nice-to-have, post-MVP. | P2, P16 | P18 | REQ-26 | pending |
| P18 | **Cohort Benchmarking (DP-engineered)** | Consent-gated cohort aggregation with k ≥ 20 floor, ε ≤ 1 DP noise, sensitive-category suppression, revocation-aware recompute. Unlocks SC-11 / JTBD-05. Post-MVP. | P1, P6, P16 | P17 | REQ-27 | pending |

## §3 Phase Detail

### Phase 1 — Foundation {#phase-1}

**Goal.** A running API + database with identity, ownership scopes, money representation, FX infrastructure, consent plumbing, and observability — so every later phase builds on invariants that are impossible to get wrong retroactively.

**Why now.** Research §2.2 (Law 21.719 at MVP, not phase N+1), §2.4 (`ownership_scope` day 1), §2.5 (integer-minor-units). Foundation items are cheap now and catastrophic later. Every other phase depends on this one.

**Covers REQs.** REQ-15 (ownership_scope), REQ-16 (Firebase auth + JIT), REQ-17 (integer-minor-units), REQ-18 (FX snapshot + USD shadow), REQ-19 (currency + locale registry), REQ-20 (consent + processing register — four-jurisdiction), REQ-21 (observability), REQ-22 (i18n infra).

**Exit signal.** A smoke test signs in (JIT-provisions a scope-of-one user), writes a transaction with a currency other than the primary, reads back the USD shadow at the FX rate captured that day, and asserts the consent-audit endpoint returns one record.

**Depends on.** —
**Parallel with.** —

---

### Phase 2 — Receipt Scan Pipeline {#phase-2}

**Goal.** A user uploads a receipt photo. Within 30 seconds at P95, it is a persisted transaction with a validated L2 transaction/store category and line-items mapped to validated L4 item categories, math-reconciliation-gated, USD-shadowed, ownership-scope-keyed, and observable end-to-end.

**Why now.** SC-01 is Gastify's core differentiator — nothing works without this. The two-stage extraction (vision → text-only categorize) is the defense against prompt injection (research §2.1); the math-reconciliation gate (REQ-12) catches hallucinations before they corrupt the ledger.

**Covers REQs.** REQ-01 (submission), REQ-02 (two-stage worker), REQ-03 (four-level taxonomy with prompt assignment limited to L2/L4 and deterministic L1/L3 rollups), REQ-04 (dual streaming), REQ-12 (math gate).

**Exit signal.** 10 test receipts (mixed CLP/USD, Spanish + English, 5–40 items, 2 adversarial with embedded prompt-injection attempts, 1 math-inconsistent) processed end-to-end. All 8 benign receipts land as correct transactions with L2/L4 categories; both adversarial receipts produce safe output; the math-inconsistent receipt routes to review instead of landing. L1/L3 groups are derived deterministically from the reference taxonomy, not generated by prompts. Prompt-lab runs provide AI-quality/prompt-promotion evidence only. Streaming events delivered in order on both transport types. Local mocks are not sufficient: runtime closure requires Railway/Postgres staging evidence, deterministic fixture proof where applicable, and live Gemini smoke for the provider path.

**Depends on.** P1.
**Parallel with.** —

---

### Phase 3 — Web Portal MVP {#phase-3}

**Goal.** A first-time user signs in on a laptop or mobile browser, scans a receipt via file upload, sees the scan progress stream, opens their transaction, edits one field, signs out, and has no authenticated data reachable from the browser afterward.

**Why now.** Web is the highest-bandwidth surface for the first end-to-end user journey (keyboard + large screen). Proves the receipt flow before the mobile build. SC-08 (sign-out isolation) is E2E-tested here.

**Covers REQs.** REQ-05 (ledger API, web slice), REQ-13 (user-edit precedence), REQ-14 (web sign-out eviction), REQ-23 (responsive web portal).

**Exit signal.** Web E2E journey green (framework per §9.1): sign in → scan receipt → watch streaming events → see transaction → edit merchant name → assert `user_edited_at` set → sign out → re-open tab → no cached account data fetchable. Runtime closure requires browser-level evidence against the Railway staging SPA/API; local or static checks alone are not sufficient.

**Depends on.** P1, P2.
**Parallel with.** P4.

---

### Phase 4 — Mobile App MVP {#phase-4}

**Goal.** A first-time user installs the Android development/internal app, signs in with their managed-auth account, scans a receipt with the device camera, sees the scan progress stream over the mobile transport, opens their transaction, edits one field, signs out, and has no authenticated data reachable via the device keystore or app storage afterward. iOS runtime testing is officially deferred until after the roadmap is implemented.

**Why now.** The native mobile surface is where the majority of scan-capture happens in the wild (phone camera > laptop upload). Establishes the managed mobile build + OTA pipeline + native capability parity with web. Closes the loop on all 3 client surfaces for SC-08.

**Covers REQs.** REQ-05 (ledger API, mobile slice), REQ-13 (user-edit precedence, shared with P3), REQ-14 (mobile sign-out eviction on the Android proof lane; iOS runtime proof deferred), REQ-24 (cross-platform mobile app), REQ-25 (push notifications registration).

**Exit signal.** Mobile E2E journey green (framework per §9.1) on Android physical hardware: sign in → camera scan → streaming events → transaction view → edit → sign out → assert platform-keystore cleared + no cached API data. Runtime closure requires artifact-backed staging evidence; local mocks and unit tests alone are not sufficient. iOS simulator/device proof is not a P4 blocker and is tracked as the deferred iOS runtime lane.

**Depends on.** P1, P2.
**Parallel with.** P3.

---

### Phase 5 — Statement Reconciliation + Cards {#phase-5}

**Goal.** A user uploads a credit card statement PDF, registers the card alias if new, watches the extraction + reconciliation progress, and sees every statement line bucketed (matched / statement-only / receipt-only) with a coverage percentage for the period.

**Why now.** SC-04 is the second-differentiator and closes the coverage gap from §2 problem statement. Needs P2's worker infrastructure and the two ingestion modes share streaming + categorization code paths.

**Covers REQs.** REQ-07 (statement upload + extraction), REQ-08 (reconciliation engine + coverage), REQ-09 (card alias CRUD).

**Exit signal.** A user with 20 days of receipt scans uploads their monthly statement. Reconciliation runs, coverage metric reads (for example) "72% of statement spend has a matched receipt," and the user can drill into the 28% bucket to find one forgotten subscription and one charge-they-don't-remember. Runtime closure requires Railway staging evidence for Postgres, file/media handling, worker behavior, and user-visible reconciliation results.

**Depends on.** P2.
**Parallel with.** P6.

---

### Phase 6 — Insights + Item Flags {#phase-6}

**Goal.** A user opens the app on any client, sees their top categories for the current month in ≤ 20 seconds app-open-to-visible, drills between L1/L2 transaction-category rollups and L3/L4 item-category rollups derived deterministically from canonical taxonomy parents, reads the gravity-center ranking showing which categories are growing or shrinking vs. their baseline, and flags one item as "special-case" — which disappears from all aggregate views while staying in their transaction record.

**Why now.** Insight is where the scanned data turns into behavior change. Uses P2's data stream + depends on having a few weeks of transactions accumulated (i.e., runs alongside P5 rather than after).

**Covers REQs.** REQ-06 (monthly analytics view), REQ-10 (gravity-center detection), REQ-11 (item flag + personal-only scope enforcement).

**Exit signal.** Test user with 3 months of seeded transactions opens the monthly view. Top-5 renders within 20 seconds using deterministic L1/L2 and L3/L4 rollups from canonical parent relationships. Gravity-center list shows at least one growth category. User flags one line item; re-renders analytics, the item is excluded from aggregates but still visible on the transaction detail. Runtime closure requires staging evidence for seeded multiuser data, cache behavior, and deployed client rendering.

**Depends on.** P2.
**Parallel with.** P5.

---

### Phase 7 — Compliance + Launch Hardening {#phase-7}

**Goal.** Audited readiness for four-jurisdiction regulatory compliance (Law 21.719, GDPR, PIPEDA, CCPA/CPRA), paid Gemini tier active, monetization plumbing (billing hooks, plan tiers at schema level) live, launch-day incident runbook rehearsed.

**Why now.** The launch gate. Every earlier phase has dropped its compliance and operational scaffolding; this phase asserts that scaffolding is real — data-subject-rights endpoints work, consent records are queryable, sensitive-category suppression holds in aggregation surfaces, scan-queued graceful degradation works under quota throttle.

**Covers REQs.** Consolidates and audits REQ-20 (consent + processing register) + REQ-21 (observability) across all prior phases. No new REQs — this is a validation + hardening phase.

**Exit signal.** (a) A data-subject-rights request (access/rectification/erasure/portability) can be serviced end-to-end on a test user. (b) Consent revocation triggers downstream cohort-unflag. (c) A load test drives the extraction-LLM service to quota throttle — all scans gracefully enter `queued` state, no 5xx. (d) Retention policy deletes test data older than declared TTL. (e) Go/no-go readiness checklist signed. Launch hardening must use staging evidence first; production journey smoke needs a separate cutover/test-data approval.

**Depends on.** P1, P2, P3, P4, P5, P6.
**Parallel with.** —

---

### Phase 8 — Structured-Boleta Shortcut {#phase-8}

**Goal.** For electronic Chilean boletas (SII Resolution 52/2026, effective May 1 2026) that carry a QR/CAF code, Gastify detects the code, parses the structured payload directly, and produces a transaction without calling the vision LLM. Vision pipeline remains the default for paper/photo receipts.

**Why now.** Post-MVP, nice-to-have. User explicitly classified as non-MVP at Checkpoint 2 follow-up. Dramatically cuts per-scan cost for Chilean users long-tail. Parallel with P9 (both late-phase, independent).

**Covers REQs.** REQ-26.

**Exit signal.** A Chilean user uploading a post-May-2026 electronic boleta with a valid QR code sees a transaction produced in < 3 seconds with 0 extraction-LLM tokens consumed. Paper-receipt path unchanged.

**Depends on.** P2 (for worker infrastructure), P7 (to ship).
**Parallel with.** P9.

---

### Phase 9 — Cohort Benchmarking (DP-engineered) {#phase-9}

**Goal.** A user who opts in (explicit consent flow, revocable) sees their spending in any category compared against an anonymized cohort of ≥ 20 similar households, with DP noise floor ε ≤ 1, sensitive-category suppression enforced, and no cached-cohort leak on revocation.

**Why now.** Post-MVP — override-01. Requires user base to accumulate (k ≥ 20 is a hard gate; ship too early = empty cohorts and product silence). The DP + k-anonymity + suppression sub-architecture is its own work package.

**Covers REQs.** REQ-27. Depends on REQ-20 consent infrastructure already shipped in P1/P7.

**Exit signal.** Test cohort of 50 synthetic user profiles loaded. User in cohort opts in, sees their grocery spend compared to the cohort baseline (a single bar chart). One user revokes; within a recompute cycle, their data is absent from the next aggregation. No cached-cohort query returns their data post-revocation.

**Depends on.** P1 (consent), P6 (analytics infrastructure), P7 (compliance audit).
**Parallel with.** P8.

---

### Deferred — iOS Runtime Lane {#deferred-ios-runtime}

**Status.** Officially deferred until after the P1-P9 roadmap is implemented.

**Goal.** Bring the existing Expo/React Native mobile app through iOS simulator or device runtime proof after the Android-first roadmap is complete.

**Scope.** iOS EAS/dev-client build, TestFlight/internal distribution if needed, native keychain/cache eviction proof, and the same sign in → scan → stream → transaction → edit → sign out journey used by the Android Phase 5 gate.

**Exit signal.** Artifact-backed iOS runtime packet proves the current mobile journey on an attached simulator/device, including native camera or gallery media selection, WebSocket progress, transaction edit, sign-out isolation, and no stale authenticated data after reauth.

**Depends on.** P1-P9 and Android Phase 5 closure.

---

## §4 Dependency Graph

```mermaid
graph LR
  P1[P1 Foundation]
  P2[P2 Scan Pipeline]
  P3[P3 Web Portal MVP]
  P4[P4 Mobile App MVP]
  P5[P5 Statement Reconciliation]
  P6[P6 Insights + Flags]
  P7[P7 Compliance + Launch]
  P8[P8 QR/CAF Shortcut]
  P9[P9 Cohort Benchmarking]
  IOS[Deferred iOS Runtime Lane]

  P1 --> P2
  P2 --> P3
  P2 --> P4
  P2 --> P5
  P2 --> P6
  P1 --> P3
  P1 --> P4
  P3 --> P7
  P4 --> P7
  P5 --> P7
  P6 --> P7
  P7 --> P8
  P7 --> P9
  P1 --> P9
  P6 --> P9
  P8 --> IOS
  P9 --> IOS

  P3 -.parallel.- P4
  P5 -.parallel.- P6
  P8 -.parallel.- P9
  P4 -.deferred.- IOS
```

**Critical path:** P1 → P2 → (P3 ∥ P4 ∥ P5 ∥ P6) → P7 → launch. Post-launch: P8 ∥ P9. Post-roadmap: deferred iOS runtime lane.

## §5 Coverage Matrix (REQ × Phase)

| REQ | Phase |
|---|---|
| REQ-01 | P2 |
| REQ-02 | P2 |
| REQ-03 | P2 |
| REQ-04 | P2 |
| REQ-05 | P3 + P4 (client-slice each; single backend in P2) |
| REQ-06 | P6 |
| REQ-07 | P5 |
| REQ-08 | P5 |
| REQ-09 | P5 |
| REQ-10 | P6 |
| REQ-11 | P6 |
| REQ-12 | P2 |
| REQ-13 | P3 + P4 |
| REQ-14 | P3 (web) + P4 (mobile) |
| REQ-15 | P1 |
| REQ-16 | P1 |
| REQ-17 | P1 |
| REQ-18 | P1 |
| REQ-19 | P1 |
| REQ-20 | P1 (schema) + P7 (audit) |
| REQ-21 | P1 (schema) + P7 (audit) |
| REQ-22 | P1 |
| REQ-23 | P3 |
| REQ-24 | P4 |
| REQ-25 | P4 |
| REQ-26 | P8 |
| REQ-27 | P9 |

**27 / 27 REQs mapped to a phase.** No orphans.

**Coverage note:** REQ-05 + REQ-13 + REQ-14 each appear under two phases — this is deliberate. The backend slice ships in P2/P3; the client slice ships in P3 (web) and P4 (mobile). At finalize, these are represented as single REQs with phase-pair ownership — not duplicates.

## §6 Roadmap Change Log

| Date | Version | Change |
|---|---|---|
| 2026-06-02 | v1.4 | Inserted P10-P15 (feature parity with legacy BoletApp) before launch gate. P7→P16, P8→P17, P9→P18. Write-first ordering: settings/themes → batch ops → batch scan → dashboard/charts → items/reports → notifications. Groups deferred. New critical path: P6 → P10-P15 → P16 (launch). |
| 2026-05-24 | v1.2 | deferred iOS runtime testing until after P1-P9; P4/Phase 5 closes on Android physical hardware for the current roadmap cycle. |
| 2026-05-19 | v1.1 | clarified four-level taxonomy usage: prompts assign only L2/L4; L1/L3 are deterministic reporting groups with English canonical keys and Spanish labels from day zero. |
| 2026-04-22 | v1 | init — derived from SCOPE.md v1. 9 phases (granularity = fine). 27 REQs mapped; no orphans. Critical path P1 → P2 → (P3∥P4∥P5∥P6) → P7 → launch. Post-launch: P8 ∥ P9. |
