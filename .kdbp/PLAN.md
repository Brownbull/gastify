# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Migrate the **Playful Geometric** design system from `design-lab/` into the live `web/` app — view-only, incremental, single light theme: recolor all 721 inline `var(--*)` at W1, then port the geometric grammar + components/screens phase-by-phase, each shipped with Playwright proof. Data layer (TanStack Query, `api.ts`, i18n, firebase, stores) stays untouched.

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — AI receipt scanning, multi-currency analytics, responsive web PWA (rebuild of BoletApp)
- **Created:** 2026-06-25
- **Last Updated:** 2026-06-29
- **Confirmed decisions:** D-A = full adoption (sequenced) · D-B = single theme, defer dark · D-C = incremental, phase-by-phase. Reference: `docs/mockups/WEB-MIGRATION.md`, `docs/mockups/HANDOFF.md`.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | W1 · Token foundation | Port `shared/design-tokens.ts` → web `tokens.css`; add Tailwind `@theme inline` gt-* block; swap warm `:root` for Playful Geometric; re-point compat aliases `--text/--text-muted/--border` (342 of 721 uses); collapse to single theme + drop the 3-theme×dark switcher UI (D-B); wire `check:token-classes` into web CI. Outcome: 721 inline vars recolor, gt-* available, nothing renders broken. | mvp | low-med | ✅ | ✅ | ✅ | ✅ |
| 2 | W2 · App shell + navigation | Port AppScaffold/Nav → 4-tab BottomNav (Inicio·Compras·Gastos·Historial) + ScanFab (DM-5) + AppHeader + Perfil-avatar menu + framed surface, adapted to TanStack Router (tabs = `<Link>`); replace `AppLayout`; resolve the 11→4 IA (homes for statements/groups/notifications/reports/trends/items inside tabs/Perfil); port shell atoms. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 3 | W3 · Settings + Notifications | Lowest-risk screens; port `SettingsScreen` (+ subviews as needed) and `NotificationsScreen`; establish the screen-port playbook + first batch of atoms/molecules. | mvp | low-med | ✅ | ✅ | ✅ | ✅ |
| 4 | W4 · Transactions (list+detail+new) | PurchasesScreen (list+filters), TransactionDetail (DM-7 decomposition: MerchantHeader, ItemRow/ItemGroup, TransactionTotal, PaymentChip…), NewTransaction (manual entry); core daily-use, wired to existing hooks. | mvp | med-high | ✅ | ✅ | ✅ | ✅ |
| 5 | W5 · Items browse | `items` route ↔ ItemsBrowse/History; product search across receipts + infinite scroll + filters. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 6 | W6 · Scan (single+batch+statements) | Multi-step SSE-driven scan flow (mode chooser → capture → processing → review → save), statement upload → reconcile → confirm, StatementsList; preserve real EventSource + StatementReconciliationPanel; full state + error coverage. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 7 | W7 · Analytics — trends + spending | Heaviest port: SpendingScreen (donut/treemap/sankey), CategoryDetail, `trends` route; recharts → design-lab hand-built donut/treemap + ECharts Sankey; drill + count-up interactions (DM-10); responsive + a11y. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 8 | W8 · Reports | `reports` route ↔ ReportCard/ReportDetail/ReportViewer; DM-34 static point-in-time snapshots, 4 timeframes (weekly/monthly/quarterly/annual). | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 9 | W9 · Groups | Groups, GroupDetail, InviteJoin, ShareTransactions; multi-user surfaces wired to existing group hooks. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 10 | W10 · Dashboard (index) | HomeScreen: month treemap/trend + gravity-center insights; the landing screen — done last so every component exists. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 11 | Wf · Cleanup + visual-regression sweep | Remove dead warm-palette CSS + theme switcher + superseded web components; full Playwright visual-regression across routes × (mobile/desktop); update e2e; confirm `check:token-classes` in CI. | ent | med-high | ✅ | ✅ | ✅ | ⬜ |
| 12 | DF1 · Shell overlay foundation | **Epic 2: Design Fidelity (D100).** Added the AppLayout overlay slot: desktop = `absolute inset-0` over content pane (SideNav stays), mobile = `fixed inset-0` full-frame, on web's `lg:` breakpoint; z-scale documented (header 20 < bottomnav 30 < fab 40 < overlay 45 < menu 50; FAB hidden when overlay active); route-driven via `OVERLAY_ROUTES`. **Proven by routing `/settings` + `/settings/*` through the slot** (better, more-visible proof than ReportDetailOverlay; that re-point moves to DF2 reports). Ref: `docs/mockups/STATE-FIDELITY-PLAN.md`. | ent | med-high | ✅ | ⬜ | ✅ | ⬜ |
| 13 | DF2 · Inline re-skins | Rebuild Dashboard `/`, Trends `/trends`, Groups list + GroupDetailPanel, Items `/items` to the design-lab screen designs — inline (nav-framed), local drill/expand state kept. Pure visual grammar vs real data + side-by-side acceptance per screen. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 14 | DF3 · Route-backed overlays (no SSE) | Transaction detail `/transactions/$id`, New `/transactions/new`, Invite `/invite/$token` → full-surface route overlays; add the unsaved-changes guard (new + statement upload). Prove deep-link / back-button / share survive. | ent | med-high | ⬜ | ⬜ | ⬜ | ⬜ |
| 15 | DF4 · Settings + Notifications overlays | Route `/settings` + `/settings/*` and `/notifications` through the overlay slot (notifications full-surface from avatar). Folds in the already-built settings hub + 6 subviews; verify per-subview deep-link + reload. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 16 | DF5 · SSE families (one at a time) | Scan `/scan` → Batch `/scan-batch` → Statements `/statements` through the overlay slot, one at a time; each proves EventSource lifetime + retry/backoff + queue/Blob-URL + cache-invalidation cleanup on unmount. Highest risk, last. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 17 | DF6 · Filter → URL promotions | Promote transactions-list extra filters, items filter+cursor, notifications cursor to validated URL search params (resumable deep-links). | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 18 | SL · Scan location intelligence | **New track: Scan Intelligence (D103).** A scan reads its purchase country/city and stores it on the transaction, reconciled against the user's settings default. Backend DONE + prompt-lab proven (extraction, 4-case reconciliation, dataset, persist, 6 live scans CL/US/UK/FR). Remaining: **backend `/locations` endpoint**, the **prompt promotion strategy** (full prompt-lab baseline pass of the location candidate → confirm no extraction regression → formalize promotion), and the **frontend** Scanning country/city selectors + foreign indicator. See Phase Details. | ent | high | 🔄 | ⬜ | 🔄 | ⬜ |

<!-- Epic 1 (Web Migration W1–Wf) delivered the token/grammar layer; Wf Push (PR #15) is PARKED pending the DF epic. Epic 2 (Design Fidelity DF1–DF6, D100) rebuilds screens to the Storybook reference + adds the overlay model, preserving the functional/state layer. Epic 3 (Scan Intelligence, phase 18+, D103) is a backend+AI feature track parallel to the design work. -->
<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts (Playwright screenshots) before Exec can be ✅. -->
<!-- Manual override is fine — edit cells by hand any time -->

## Phase Details

### Phase 1 — W1 · Token foundation

```yaml
phase: 1
types: [design-system, ui-kit, web, client-state]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, ClientState]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** mvp — small mechanical diff with whole-app leverage; prove nothing renders broken in the new palette.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 2 — W2 · App shell + navigation

```yaml
phase: 2
types: [user-facing, web, client-state, design-system]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, ClientState, UserFacing]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** mvp — core navigation in the new grammar; IA 11→4 + TanStack Router adaptation.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 3 — W3 · Settings + Notifications

```yaml
phase: 3
types: [user-facing, web, settings]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** mvp — lowest-risk screens; establishes the reusable screen-port playbook.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 4 — W4 · Transactions (list+detail+new)

```yaml
phase: 4
types: [user-facing, web, data-view, client-state]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing, ClientState]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** mvp — core daily-use CRUD surfaces; DM-7 decomposition ports many reusable molecules.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 5 — W5 · Items browse

```yaml
phase: 5
types: [user-facing, web, data-view]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** mvp — product search + infinite scroll; reuses W4 molecules.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 6 — W6 · Scan (single+batch+statements)

```yaml
phase: 6
types: [user-facing, web, upload, streaming, realtime, file-media]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing, Streaming, Upload]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** ent — highest-interaction, SSE-stateful, multi-step flow with error/reconcile edge cases; MVP happy-path-only would leak broken states. Ent = full state + error coverage + journey proof.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 7 — W7 · Analytics — trends + spending

```yaml
phase: 7
types: [user-facing, web, analytics, charts, data-view]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing, Analytics]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** ent — heaviest visual port (3 chart engines: hand-built donut/treemap + ECharts Sankey), interactive drill-downs; MVP would ship fragile/inaccessible charts. Ent = responsive + a11y + interaction fidelity.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 8 — W8 · Reports

```yaml
phase: 8
types: [user-facing, web, analytics, charts]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing, Analytics]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** mvp — DM-34 static point-in-time snapshots (never regenerated) — simpler than live analytics.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 9 — W9 · Groups

```yaml
phase: 9
types: [user-facing, web, multi-tenant]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing, MultiTenant]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** mvp — standard list/detail/invite/share CRUD surfaces wired to existing group hooks.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 10 — W10 · Dashboard (index)

```yaml
phase: 10
types: [user-facing, web, analytics, charts, data-view]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing, Analytics]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** ent — the landing screen (highest polish bar) composing the heaviest analytics (treemap/trend/insights); the app's first impression. Ent = pixel-fidelity + responsive + a11y. Sequenced last so all components exist.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 11 — Wf · Cleanup + visual-regression sweep

```yaml
phase: 11
types: [web, user-facing, validation]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Validation, UserFacing]
suppressed_dims_count: 0
decisions_entry: D98
```

- **Tier:** ent — QA capstone; regression rigor IS the deliverable: full visual-regression matrix × viewports + e2e + CI gate + dead-code removal.
- **Trade-offs accepted:** See `DECISIONS.md` D98.

### Phase 18 — SL · Scan location intelligence

```yaml
phase: 18
types: [scan, ai-prompt, backend, DB, data-view, user-facing, web]
phase_tier: ent
prototype: false
decisions_entry: D103
```

**Epic 3 — Scan Intelligence.** A receipt scan reads its purchase country/city and stores it on the transaction, reconciled against the user's settings default: receipt wins → unknown city for a known country uses that country's capital → no country (or nothing) uses the settings default.

**Done (committed):**
- **Extraction** — `LOCATION` block in the receipt prompt + `country` (ISO-2) / `city` on `Raw`/`GeminiExtractionResult`, part of the PydanticAI output_type (`ca466c7`).
- **Reconciliation + dataset** — 4-case `resolve_scan_location` (`services/locations.py`) + `app/reference/locations.json` (49 operating-region countries; CL = 125 cities, consolidated from 346 comunas; every country carries its capital) (`dd907ba`, `9a90c3b`).
- **Persist** — `users.default_country/default_city` (migration 043) + rectification (country validated) + profile read; `scan_worker` loads the scope-owner default → `persist_scan` writes `transaction.country/city` (`dd907ba`).
- **Prompt-lab proof** — dev-only `receipt-extraction-location` candidate; 6 live Gemini scans (CL ×3 → Villarrica · US → Orlando · UK → London/GB · FR → Paris) all extracted the correct ISO country + city (`c9c1ce4`).

**Remaining tasks (explicit):**
1. **Backend endpoints** — `GET /api/v1/locations` serving `known_countries()` (code+name) + `cities_of(country)` for the settings dropdowns; auth-gated + cacheable. Rectification + profile already expose `default_country`/`default_city`.
2. **Prompt promotion strategy** — production `receipt-extraction-current` already carries the `LOCATION` block but bypassed the candidate→promote discipline. Run a FULL prompt-lab baseline pass of `receipt-extraction-location` (all baselined cases, scored) to PROVE the LOCATION addition does NOT regress the transaction/reconstruction gates (totals/items/discounts); then formalize — keep production promoted (now lab-validated) or (strict) revert production to baseline and promote only after the full pass. Future prompt edits go candidate-first via the prompt-lab (`run`/`compare`/`score`).
3. **Frontend** — Scanning `Ubicación predeterminada` = country + dependent-city selectors (read `/locations`, write via rectification; replaces CS-8 coming-soon); foreign-country indicator Código/Bandera made functional in the transaction views (CS-9) via a persisted display pref + a `country-code → flag-emoji` helper (Unicode, no data).

- **Tier:** ent — touches the AI extraction prompt (regression risk → needs the full prompt-lab pass), a DB migration, the scan hot-path, new endpoints, and new UI. Ent = prompt-lab regression proof + 4-case reconciliation tested + e2e for the selectors.
- **Trade-offs accepted:** location is best-effort (capital/default fallback when unknown); CL stored as cities not comunas (user direction); the foreign indicator is a display pref over the stored country.

## Current Phase

Phase 18: SL · Scan location intelligence (tier ent) — **Epic 3 Scan Intelligence**, parallel to the design work. Backend extraction + reconciliation + persist + dataset DONE and prompt-lab-proven (6 live scans). Now on the remaining three: the `/locations` endpoint, the prompt promotion strategy (full prompt-lab baseline pass), and the frontend Scanning selectors + foreign indicator. (Design-Fidelity DF2–DF6 remain queued; Wf Push PR #15 parked.)

## Dependencies

- **W2 → W1** — the shell is built in the new grammar; needs `tokens.css` + gt-* utilities first.
- **W3…W10 → {W1, W2}** — every screen recolors via W1 and sits in W2's geometric shell.
- **Later screens → earlier screens** — W5/W8/W10 reuse molecules first ported in W4; charts ported in W7 are reused by W10.
- **W10 last** — Dashboard composes W7's analytics components + W4's molecules; the landing screen gets the highest polish once everything exists.
- **Wf → all** — cleanup + visual-regression capstone runs after every screen is ported.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Inline `var()` ↔ `gt-*` drift during transition | medium | Per-file discipline — never half-convert a file; un-ported screens keep auto-recolored inline-`var()`, ported screens adopt `gt-*` wholesale. |
| Dark-mode removal (6 live schemes today) | medium | D-B confirmed (defer dark); flag to users; re-addable later as a token extension. design-lab is light-only. |
| Charts port (recharts → hand-built + ECharts Sankey) slips | high | ent tier on W7/W10 + extra budget; port content/structure not the AppSurface device frame. |
| Device-frame mockups → real responsive web | medium | Port content/structure only; map design-lab platform breakpoints to web's real responsive layout. |
| i18n hardcoding (design-lab hardcodes Spanish) | low | Route all ported strings through `useI18n`/`t()`; es authored, en/pt backfilled. |
| Nav IA 11→4 leaves 7 destinations homeless | medium | W2 sub-decision: secondary nav reached inside tabs / Perfil dropdown. |

## Notes

- **View-only migration.** TanStack Query hooks, `lib/api.ts`, i18n (es/en/pt via `t()`), firebase, zustand stores all STAY. No backend/API change. design-lab screens are presentational — swap fixtures for the existing hooks at the screen boundary; keep component contracts (props) stable.
- **Standing rules.** Every frontend change needs Playwright UI proof (screenshots) before "done"; code identifiers English, UI strings Spanish via `useI18n`; keep web route + e2e tests green per screen.
- **`PLAN-MOCKUPS.md` untouched** — the mockup lane (DM-1…DM-34) is the design source of truth; this is the real-app lane.
- **Execution model (ultracode):** drive each phase with `/gabe-execute`; fan out screen-by-screen ports across parallel agents where files don't collide (worktree isolation if they do); adversarially verify each ported screen visually (Playwright screenshots vs the design-lab reference) before accepting; then `/gabe-review` → `/gabe-commit` → `/gabe-push` per phase.

## Review Artifacts

- HTML review artifact: none — disabled by user request ("keep it lean"; decisions already made).
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

Per **D97 (production-direct)**, staging/staging-e2e are retired — runtime proof targets the local dev server for per-screen visual proof + production for the deployed gate (BEHAVIOR.md B2's Railway-staging gate is superseded by D97).

- **Every screen phase (W2–W10):** Playwright screenshots of the ported route (mobile + desktop viewports) on the local Vite dev server (`web` :5173), compared against the matching design-lab Storybook reference (:6008), captured to a per-phase artifact dir; keep web route + e2e tests green; production verify via `/gabe-push`.
- **W6 (scan):** exercise the real EventSource/SSE path end-to-end (capture → processing → review → save) + a statement reconcile path; capture the multi-step journey.
- **W7 / W10 (analytics):** capture donut/treemap/sankey render + a drill-down interaction at mobile + desktop.
- **Wf:** full visual-regression sweep across all routes × (mobile/desktop) + updated e2e + `check:token-classes` green in CI.
