# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Migrate the **Playful Geometric** design system from `design-lab/` into the live `web/` app — view-only, incremental, single light theme: recolor all 721 inline `var(--*)` at W1, then port the geometric grammar + components/screens phase-by-phase, each shipped with Playwright proof. Data layer (TanStack Query, `api.ts`, i18n, firebase, stores) stays untouched.

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — AI receipt scanning, multi-currency analytics, responsive web PWA (rebuild of BoletApp)
- **Created:** 2026-06-25
- **Last Updated:** 2026-06-25
- **Confirmed decisions:** D-A = full adoption (sequenced) · D-B = single theme, defer dark · D-C = incremental, phase-by-phase. Reference: `docs/mockups/WEB-MIGRATION.md`, `docs/mockups/HANDOFF.md`.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | W1 · Token foundation | Port `shared/design-tokens.ts` → web `tokens.css`; add Tailwind `@theme inline` gt-* block; swap warm `:root` for Playful Geometric; re-point compat aliases `--text/--text-muted/--border` (342 of 721 uses); collapse to single theme + drop the 3-theme×dark switcher UI (D-B); wire `check:token-classes` into web CI. Outcome: 721 inline vars recolor, gt-* available, nothing renders broken. | mvp | low-med | ✅ | ✅ | ✅ | ✅ |
| 2 | W2 · App shell + navigation | Port AppScaffold/Nav → 4-tab BottomNav (Inicio·Compras·Gastos·Historial) + ScanFab (DM-5) + AppHeader + Perfil-avatar menu + framed surface, adapted to TanStack Router (tabs = `<Link>`); replace `AppLayout`; resolve the 11→4 IA (homes for statements/groups/notifications/reports/trends/items inside tabs/Perfil); port shell atoms. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 3 | W3 · Settings + Notifications | Lowest-risk screens; port `SettingsScreen` (+ subviews as needed) and `NotificationsScreen`; establish the screen-port playbook + first batch of atoms/molecules. | mvp | low-med | ✅ | ✅ | ✅ | ✅ |
| 4 | W4 · Transactions (list+detail+new) | PurchasesScreen (list+filters), TransactionDetail (DM-7 decomposition: MerchantHeader, ItemRow/ItemGroup, TransactionTotal, PaymentChip…), NewTransaction (manual entry); core daily-use, wired to existing hooks. | mvp | med-high | ✅ | ✅ | ✅ | ✅ |
| 5 | W5 · Items browse | `items` route ↔ ItemsBrowse/History; product search across receipts + infinite scroll + filters. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 6 | W6 · Scan (single+batch+statements) | Multi-step SSE-driven scan flow (mode chooser → capture → processing → review → save), statement upload → reconcile → confirm, StatementsList; preserve real EventSource + StatementReconciliationPanel; full state + error coverage. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 7 | W7 · Analytics — trends + spending | Heaviest port: SpendingScreen (donut/treemap/sankey), CategoryDetail, `trends` route; recharts → design-lab hand-built donut/treemap + ECharts Sankey; drill + count-up interactions (DM-10); responsive + a11y. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | W8 · Reports | `reports` route ↔ ReportCard/ReportDetail/ReportViewer; DM-34 static point-in-time snapshots, 4 timeframes (weekly/monthly/quarterly/annual). | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | W9 · Groups | Groups, GroupDetail, InviteJoin, ShareTransactions; multi-user surfaces wired to existing group hooks. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | W10 · Dashboard (index) | HomeScreen: month treemap/trend + gravity-center insights; the landing screen — done last so every component exists. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Wf · Cleanup + visual-regression sweep | Remove dead warm-palette CSS + theme switcher + superseded web components; full Playwright visual-regression across routes × (mobile/desktop); update e2e; confirm `check:token-classes` in CI. | ent | med-high | ⬜ | ⬜ | ⬜ | ⬜ |

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

## Current Phase

Phase 6: W6 · Scan (single+batch+statements) (tier ent)

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
