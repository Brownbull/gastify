# Active Plan

<!-- status: active -->
<!-- project_type: mockup -->

## Goal

Produce complete clean-slate mockup surface for gastify — responsive web portal + unified mobile (Android + iOS shared via React Native) — covering every user-facing REQ, every flow, every component. Deliverables match boletapp/gustify-legacy HTML pattern at `docs/mockups/`. Tool: Claude design (frontend-design skill) primary, HTML fallback.

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — AI receipt scanning, multi-currency, multi-platform (web + mobile), rebuild of BoletApp
- **Created:** 2026-04-23
- **Last Updated:** 2026-04-27 (L1 Exec ✅ — 11 atoms extracted from frontend/, atoms.css populated, sub-hub + catalog live, principal hub flipped, Playwright-verified across all 6 theme/mode combos)
- **Platform sets:** 2 (web responsive + mobile unified)
- **Strategy:** Clean-slate redesign from zero. Legacy boletapp mockups at `/home/khujta/projects/bmad/boletapp/docs/mockups/` = reference only, not port.
- **Queued next:** Backend P1 Foundation — see `.kdbp/archive/queued_backend-p1.md` (activate after P13 handoff ships).

## Phases

| # | Phase | Description | Types | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|-------|------|------------|------|--------|--------|------|
| 1 | Design language + tokens | Port 3 legacy themes (Normal/Pro/Mono × light/dark) + 3 new candidates as style prompts → 4-screen stress test × 6 themes × 3 platforms (desktop web / mobile web / native mobile) → pick runtime multi-theme set → lock tokens.json + design-system.html | design-system | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Atomic components | Buttons, inputs, pills, badges, avatars, chips, skeletons, progress. Web + mobile | design-system, ui-kit | mvp | low | ✅ | ✅ | ✅ | ✅ |
| 3 | Molecular components | Cards, modals, toasts, banners, nav (bottom-tab + top-bar + sidebar), FAB, filters, sheets, drawers, forms + COMPONENT-LIBRARY.md. Full state matrix + WCAG AA | design-system, ui-kit | ent | med | ✅ | ⬜ | ⬜ | ⬜ |
| 4 | INDEX + Flow map + REQ×screen + CRUD×entity + central hub | Enumerate flows; low-fi skeleton per flow; seed `docs/mockups/INDEX.md` (4 tables) + REQ-COVERAGE.md; **principal `docs/mockups/index.html` hub with section cards (Design / Atoms / Molecules / Flows / Screens / Handoff) + `flows/index.html` + `molecules/index.html` sub-hubs; migrate top-hub tokens to `desktop-shell.css`; section-aware breadcrumb in `tweaks.js`; Playwright `hubs.spec.ts` coverage**. Living docs — P5-P12 update them. | mockup-flows, mockup-index | mvp | med | ✅ | ⬜ | ⬜ | ⬜ |
| L0 | mockups-legacy: Foundation | **Active L-block — mini-phase that defers P5–P12.** Set up `docs/mockups-legacy/` parallel hierarchy: extract frontend tokens → `desktop-shell.css`, copy `tweaks.js` + icons, stub `atoms.css`/`molecules.css`, author principal hub + sub-hub placeholders, README + VERIFICATION + INDEX. Source = operational `frontend/` React port. | mockup-tooling, design-system | mvp | low | ✅ | ⬜ | ⬜ | ⬜ |
| L1 | mockups-legacy: Atoms | Extract ~13 atoms from `frontend/src/components/` + `frontend/src/shared/ui/` to `docs/mockups-legacy/atoms/<name>.html`. Source-driven create + Playwright verify per `VERIFICATION.md`. | mockup-extracted, ui-kit | mvp | low | ✅ | ✅ | ✅ | ✅ |
| L2 | mockups-legacy: Molecules | Extract ~60-80 molecules from `frontend/src/features/`. Three sub-phases: L2a direct counterparts (~18 matching clean-slate), L2b frontend-specific (~40-60 essential), L2c specialized long-tail. | mockup-extracted, ui-kit | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| L3 | mockups-legacy: Flows | Extract 7+ user journeys from frontend handler chains. Reuse F1–F13 numbering where flows match clean-slate; add new IDs for novel flows (e.g., currency-mismatch resolution). | mockup-extracted, mockup-flows | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |
| L4 | mockups-legacy: Screens | Extract ~57 views across 12 feature folders. Eight sub-phases (L4a–L4h) mapped to PLAN P5–P12 boundaries: a Auth, b Capture, c Batch, d History/Items/Insights, e Trends/Reports, f Groups, g Settings, h Edge states. | mockup-extracted, user-facing | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| L5 | mockups-legacy: Catalog + handoff | Wire all atoms↔molecules↔screens↔flows cross-references (one-level), write `COMPARISON.md` (clean-slate vs legacy drift report), update root `docs/mockups/INDEX.md` with parallel-hierarchy navigation, run consistency check. **L5 ✅ unblocks P5–P12.** | mockup-extracted, mockup-docs | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Auth + onboarding + consent | **DEFERRED until L5 ✅.** Login, register, forgot, email verify, 4-jurisdiction consent (CL/LATAM/EU/US/CA), welcome/first-open, PWA install. Web + mobile | user-facing, auth | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Core capture loop | Dashboard, single-scan 5 states (incl. REQ-26 QR/CAF boleta as scan option), quicksave, manual entry, transaction editor (normal + hard-lock). Web + mobile | user-facing, capture, ai-agent | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Batch + statement flows | Scan mode selector, batch capture, credit warning, batch review, statement upload (consent + encrypted pw), processing, review list, reconciliation/matching. Web + mobile | user-facing, capture, reconciliation | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | History + items + insights | History (5 filters, selection, date groups), items (aggregated/duplicates), insights (3-tab Lista/Airlock/Logro). Web + mobile | user-facing, data-view | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Trends + reports | Trends (donut/sankey/treemap/bump + drill-downs + stats popup), Reports (4-accordion + detail overlay + inline donuts + PDF). Web + mobile | user-facing, analytics, charts | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Groups (shared expenses) | 16 screens: switcher, home, tx list, analytics, create, admin, invite/redeem, settings subview, leave/delete confirm, read-only detail, tx card, batch add. Web + mobile | user-facing, multi-tenant | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Settings + profile | 9 subviews: Límites, Perfil, Preferencias (theme/dark/lang/currency/date/font), Escaneo, Suscripción, Datos, Grupos, App, Cuenta. Web + mobile | user-facing, settings | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | Alerts + errors + offline states | Alerts list + unread badge, toasts, scan errors, credit depletion, offline banner, reconnect, 404/maintenance, push examples, extended edge states. Web + mobile | user-facing, edge-cases | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 13 | Handoff + index hub + audit | index.html gallery, HANDOFF.json (against schema) + HANDOFF.md narrative, SCREEN-SPECS.md, MOCKUP-PLAN.md (frozen), full REQ×screen audit, a11y AA pass, cross-screen consistency check | mockup-docs, mockup-validation | ent | low | ⬜ | ⬜ | ⬜ | ⬜ |
| Spike P14.0 | Mockup→React spike (Toast molecule) | Out-of-band exploration ahead of queued backend P1: codify `/gabe-mockup spike` mode in gabe_lens + validate by porting docs/mockups/molecules/toast.html into a working `frontend/` React + Vite + TS harness with Provider/Container/useToast system layer. Tokens single-source via @import chain. Recipe documented at docs/mockups/REACT-PORT-RECIPE.md. | spike, mockup-react | mvp | med | ✅ | ⬜ | ⬜ | ⬜ |

> **Active queue — L-block (mockups-legacy):** Phases L0–L5 jump the queue ahead of P5–P12. They produce a parallel mockup hierarchy at `docs/mockups-legacy/` extracted from the operational React port at `frontend/`. **P5–P12 are deferred until L5 ✅** — when the L-block completes, Current Phase advances to P5. P13 (Handoff) still executes last; it audits both `docs/mockups/` and `docs/mockups-legacy/` together. Rationale + full insertion record: see Retrofit Log entry 2026-04-27.

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- L-block uses `L` prefix to distinguish from clean-slate P1–P13 track. /gabe-execute dispatches L0–L5 via gabe-mockup skill (same as P2/P3). -->
<!-- "DEFERRED until L5 ✅" marker shown on P5; P6–P12 implicitly inherit the same deferral via the banner above. -->
<!-- /gabe-review no-arg resolution: phases 3, 4, L0 each shipped Exec ✅ without a /gabe-review run, leaving Review=⬜ trailing the Current Phase pointer. The deterministic top-down resolution in /gabe-review (Step 0.3) lands on the first such row, NOT necessarily Current Phase. PENDING.md P11 tracks the cleanup. Until then, pass an explicit target (`/gabe-review docs/mockups-legacy/atoms`) when you want a phase other than the top match. -->

## Phase Details

### Phase 1 — Design language + tokens

```yaml
phase: 1
types: [design-system]
phase_tier: ent
phase_tier_original: mvp
phase_tier_escalated: 2026-04-23
prototype: false
dim_overrides: []
sections_considered: [Core, design-system]
suppressed_dims_count: 0
decisions_entry: D7
```

- **Types:** `design-system`
- **Tier:** ent (escalated from mvp 2026-04-23 — see DECISIONS.md D7 escalation)
- **Prototype:** no
- **Sections considered:** Core, design-system
- **Trade-offs accepted:** See DECISIONS.md D7
- **Scope:**
  - **Port** 3 legacy themes from `bmad/boletapp/docs/mockups/` (Normal warm/forest, Professional cool/blue, Mono grayscale — each with light + dark mode = 6 variants) as style prompt files
  - **Author** 3 new exploratory candidates (Editorial/serif, Organic/botanical, Playful-geometric — or user pick) with light+dark = 6 more variants
  - **4-screen stress test**: dashboard + single-scan idle + history list + insights — covers data-dense + capture + list + mixed-content surface breadth
  - **3 platform frames**: Desktop Web (1440 responsive), Mobile Web (PWA 390×844 with browser-API limits documented), Native Mobile (iOS+Android React-Native 390×844 with full platform access — haptics, biometrics, camera, push)
  - **Multi-theme runtime**: user picks subset of 6 themes to ship as in-app runtime-switchable themes (not a single picked winner — multiple themes alive in app per user clarification)
  - **Tool**: frontend-design skill + style prompts (legacy-proven pattern from `bmad/boletapp/docs/mockups/styles/*.prompt`). Hand-rolled inline HTML prohibited.
  - **Exit artifacts**: `docs/mockups/tokens.json` (multi-theme token structure), `docs/mockups/design-system.html` (switcher demo across 4 stress screens × 3 platforms), `docs/mockups/styles/*.prompt` (6 style prompts), `docs/mockups/explorations/` (6 themes × 4 screens × 3 platforms = 72 renders or stress subset)

#### Phase 1 Task List

| # | Task | Owner | Output |
|---|------|-------|--------|
| T1 | Scaffold `docs/mockups/{explorations,styles,screens,flows,tokens}/` | agent | folders |
| T2 | Port 6 legacy `styles/*.prompt` files + adapt for gastify domain + add desktop+mobile+native directives + light/dark variants | agent | 6 prompts |
| T3 | Author 3 new style prompts (editorial / organic / playful-geometric — tentative, user may swap) | agent | 3 prompts |
| T4 | Define `STRESS-TEST-SPEC.md` — 4 screens × 3 platforms frame conventions + state matrix + interaction-note template | agent | spec doc |
| T5 | **[EXTERNAL]** User runs frontend-design skill / Claude design on prompts × stress screens, drops renders to `explorations/output/` | user | N HTMLs |
| T6 | **[USER]** Pick runtime multi-theme set (subset of 6 themes × 2 modes) to ship | user | decision |
| T7 | Lock `tokens.json` (multi-theme) + `design-system.html` (switcher demo) | agent | 2 files |

### Phase 2 — Atomic components

```yaml
phase: 2
types: [design-system, ui-kit]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, design-system, ui-kit]
suppressed_dims_count: 0
decisions_entry: D8
```

- **Types:** `design-system, ui-kit`
- **Tier:** mvp
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D8
- **Scope:** Button (primary/secondary/ghost/destructive/icon), Input (text/password/email/number/search), Select, Pill, Badge, Avatar, Chip, Skeleton, Progress (linear/circular), Spinner. Happy-path variants only; full state matrix moves to P3 molecules where compounds land.

### Phase 3 — Molecular components

```yaml
phase: 3
types: [design-system, ui-kit]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, design-system, ui-kit]
suppressed_dims_count: 0
decisions_entry: D9
```

- **Types:** `design-system, ui-kit`
- **Tier:** ent
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D9
- **Scope:** Cards (transaction, stat, empty, feature, celebration), Modals (confirm, form, learning, error, credit), Toast, Banner (info/warning/error/offline), Nav (bottom-tab 5-slot mobile, top-bar + sidebar web), FAB (with long-press mode selector), Filters (date/category/amount/tag/search), Sheets, Drawers, Forms (multi-step, conditional reveal), List items (swipeable, selectable). **Enterprise scope:** full state matrix (default/hover/active/focus/disabled/loading/error) + WCAG AA contrast verification. Output: `components/molecules/*.html` + `COMPONENT-LIBRARY.md`.

### Phase 4 — Flow map index + REQ×screen matrix

```yaml
phase: 4
types: [mockup-flows, mockup-index]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-flows, mockup-index]
suppressed_dims_count: 0
decisions_entry: D10
```

- **Types:** `mockup-flows, mockup-index`
- **Tier:** mvp
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D10 (original Phase 4 tier) + D22 (centralized hub amendment, 2026-04-24)
- **Scope:** Enumerate flows: F1 first-scan, F2 quicksave, F3 batch, F4 statement, F5 groups, F6 learning→trust, F7 credit depletion, F8 scan error recovery, F9 offline→reconnect, F10 analytics deep-dive, F11 reports + PDF, F12 data export, F13 settings config, F14 auth + onboarding, F15 jurisdiction consent, F16 PWA install, F17 push setup, F18 i18n switch, F19 multi-currency, F20 cohort opt-in. One HTML walkthrough skeleton per flow (low-fi placeholders). Seed `docs/mockups/INDEX.md` (flow×screen×component cross-ref) + `REQ-COVERAGE.md` (REQ×screen matrix). Living docs — P5-P12 update them.

  **Amendment 2026-04-24 (D22) — centralized HTML hub layer:**
  - **A1.** Restructure existing `docs/mockups/index.html` (currently a hand-authored P5-P12 screen gap matrix, 341 lines) into a principal hub with section cards: Design System / Atoms / Molecules / Flows / Screens / Handoff. Migrate inline `:root` tokens → use `desktop-shell.css` canonical tokens (option a — clean alignment with the rest of mockups; accept small visual shift). Existing P5-P12 gap matrix content preserved inside the "Screens" section.
  - **A2.** Build `docs/mockups/flows/index.html` — flows gallery sub-hub. Card grid pattern matching `atoms/index.html`. One card per F1-F13 flow walkthrough already living in `flows/`. Each card: flow number, name, 1-line description, REQs covered. Footer back-link to principal hub.
  - **A3.** Build `docs/mockups/molecules/index.html` — placeholder hub for Phase 3. Minimal page: "Phase 3 — Molecules. Not yet built." Keeps the breadcrumb pattern consistent for when P3 lands.
  - **A4.** Generalize the breadcrumb in `assets/js/tweaks.js`. Replace the atoms-only path-match (`/atoms/<name>.html` → `← All atoms`) with section-aware logic: `/<section>/<name>.html` → `← <section> index` linking to `./index.html`; `/<section>/index.html` → `← Mockups home` linking to `../index.html`.
  - **A5.** Playwright extension. Rename `tests/mockups/atoms-hub.spec.ts` → `tests/mockups/hubs.spec.ts`. Add specs: principal hub loads + each section card link resolves; flows hub lists 13 cards + each link resolves; molecules placeholder reachable; full breadcrumb chain works (atom page → atoms/index → principal hub).
  - **A6.** Cross-reference `docs/mockups/INDEX.md` (the markdown 4-table living doc) and `atoms/INDEX.md` to point at the principal hub. Add a "Navigation" section at the top of `docs/mockups/INDEX.md`.
  - **Out of scope (queued):** Layer B — extracting this hub + sub-hub + Playwright pattern into `gabe_lens/templates/mockup/` so future mockup projects get it from `/gabe-mockup` for free. Tracked separately, executed after Layer A lands.

### Phase 5 — Auth + onboarding + consent

```yaml
phase: 5
types: [user-facing, auth]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, auth]
suppressed_dims_count: 0
decisions_entry: D11
```

- **Types:** `user-facing, auth`
- **Tier:** mvp
- **Prototype:** no
- **REQs covered:** REQ-16, REQ-20, REQ-23 (web PWA install), REQ-25 (push opt-in ref), REQ-27 (cohort opt-in initial consent)
- **Trade-offs accepted:** See DECISIONS.md D11
- **Scope:** Login, Register, Forgot PW, Email Verify, First-open Welcome, Jurisdiction Consent (CL/LATAM/EU/US/CA — 4 jurisdiction variants with distinct consent copy), PWA Install prompt (web), Push permission prompt (mobile). Web + mobile per screen.

### Phase 6 — Core capture loop

```yaml
phase: 6
types: [user-facing, capture, ai-agent]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, capture, ai-agent]
suppressed_dims_count: 0
decisions_entry: D12
```

- **Types:** `user-facing, capture, ai-agent`
- **Tier:** mvp
- **Prototype:** no
- **REQs covered:** REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-12, REQ-13, REQ-26
- **Trade-offs accepted:** See DECISIONS.md D12
- **Scope:** Dashboard (home carousel + recent tx), Single-Scan 5 states (Idle→Processing→Reviewing→Saving→Error) with REQ-26 QR/CAF boleta as mode option inside Idle state, QuickSave card (post-scan overlay with confidence %), Manual Entry, Transaction Editor (normal mode + Hard-Lock mode per REQ-12/13). Web + mobile.

### Phase 7 — Batch + statement flows

```yaml
phase: 7
types: [user-facing, capture, reconciliation]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, capture, reconciliation]
suppressed_dims_count: 0
decisions_entry: D13
```

- **Types:** `user-facing, capture, reconciliation`
- **Tier:** mvp
- **Prototype:** no
- **REQs covered:** REQ-07, REQ-08, REQ-09
- **Trade-offs accepted:** See DECISIONS.md D13
- **Scope:** Scan Mode Selector (3 cards: Recibo/Lote/Estado), Batch Capture (gallery X/50), Credit Warning Dialog, Batch Review (per-receipt cards), Statement Upload (consent screen + encrypted-password case + dedup hash message), Statement Processing (async pending state), Statement Review List, Matching/Reconciliation Review (approve/reject/create/conflict). Web + mobile.

### Phase 8 — History + items + insights

```yaml
phase: 8
types: [user-facing, data-view]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, data-view]
suppressed_dims_count: 0
decisions_entry: D14
```

- **Types:** `user-facing, data-view`
- **Tier:** mvp
- **Prototype:** no
- **REQs covered:** REQ-05, REQ-10, REQ-11
- **Trade-offs accepted:** See DECISIONS.md D14
- **Scope:** History (5 filter types, selection mode, date groups, pagination), Items (aggregated/duplicate dual view, 3 sort keys, CSV export), Insights (3-tab switcher Lista/Airlock/Logro, carousel, selection mode — includes urgency/special-case flag REQ-11 + concentration/gravity-center REQ-10 presentation). Web + mobile.

### Phase 9 — Trends + reports

```yaml
phase: 9
types: [user-facing, analytics, charts]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, analytics, charts]
suppressed_dims_count: 0
decisions_entry: D15
```

- **Types:** `user-facing, analytics, charts`
- **Tier:** mvp
- **Prototype:** no
- **REQs covered:** REQ-06, REQ-10, REQ-27 (cohort chart if late-phase enabled)
- **Trade-offs accepted:** See DECISIONS.md D15
- **Scope:** Trends (donut/sankey/treemap/bump chart types, drill-down L1→L2, stats popup, transaction count badge linking to History with pre-applied filters, Floating Download FAB for CSV/PDF), Reports (4-accordion sections, Report Detail Overlay with inline donut charts, PDF export). Web + mobile.

### Phase 10 — Groups (shared expenses)

```yaml
phase: 10
types: [user-facing, multi-tenant]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, multi-tenant]
suppressed_dims_count: 0
decisions_entry: D16
```

- **Types:** `user-facing, multi-tenant`
- **Tier:** mvp
- **Prototype:** no
- **REQs covered:** REQ-15
- **Trade-offs accepted:** See DECISIONS.md D16
- **Scope:** Group Switcher, Group Home, Group Transactions, Group Analytics, Create Group, Transaction Card, Batch Add, Admin Panel, Settings Form, Invite Link, Redeem Invite, Leave Confirm, Delete Confirm, Read-Only Detail, Settings Subview, Group Home Empty. 16 screens. Web + mobile.

### Phase 11 — Settings + profile

```yaml
phase: 11
types: [user-facing, settings]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, settings]
suppressed_dims_count: 0
decisions_entry: D17
```

- **Types:** `user-facing, settings`
- **Tier:** mvp
- **Prototype:** no
- **REQs covered:** REQ-09, REQ-14, REQ-18, REQ-19, REQ-22
- **Trade-offs accepted:** See DECISIONS.md D17
- **Scope:** 9 subviews — Límites, Perfil, Preferencias (theme/dark/lang/currency/date/font size with live preview), Escaneo, Suscripción (plan/credits/reset), Datos (3-tab learned mappings view/delete), Grupos, App, Cuenta (export all / delete / sign-out REQ-14). Web + mobile.

### Phase 12 — Alerts + errors + offline states

```yaml
phase: 12
types: [user-facing, edge-cases]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, edge-cases]
suppressed_dims_count: 0
decisions_entry: D18
```

- **Types:** `user-facing, edge-cases`
- **Tier:** ent
- **Prototype:** no
- **REQs covered:** REQ-25, edge states across all REQs
- **Trade-offs accepted:** See DECISIONS.md D18
- **Scope:** Alerts list + unread badge, Toast system (success/info/warning/error variants), Scan errors (WifiOff/Timeout/Low-Confidence/ServerError), Credit Depletion Modal, Offline Banner, Reconnect Toast, 404 + Maintenance, Push Notification examples (3+ types). **Enterprise scope:** cover extended edge states — permission denied, rate limited, session expired, payment failed, sync conflict, data corruption recovery. Web + mobile.

### Phase 13 — Handoff + index hub + audit

```yaml
phase: 13
types: [mockup-docs, mockup-validation]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-docs, mockup-validation]
suppressed_dims_count: 0
decisions_entry: D19
```

- **Types:** `mockup-docs, mockup-validation`
- **Tier:** ent
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D19
- **Scope:** `docs/mockups/index.html` browseable gallery (all screens + flows + components linked), `HANDOFF.md` (engineer spec with code-ready component inventory + token references + responsive breakpoints + gesture/animation specs), `SCREEN-SPECS.md` (per-screen breakdown: REQ coverage, components used, states, data shape), `MOCKUP-PLAN.md` (this plan frozen + what was cut), complete REQ×screen audit (every REQ-01..REQ-27 has ≥1 screen OR explicit not-user-facing tag), a11y pass (WCAG AA contrast + focus order + ARIA roles), cross-screen consistency check (tokens applied uniformly, no drift). **Enterprise scope:** this is the validation gate — not optional.

### Phase L0 — mockups-legacy Foundation

```yaml
phase: L0
types: [mockup-tooling, design-system]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-tooling, design-system]
suppressed_dims_count: 0
decisions_entry: RF-2026-04-27
```

- **Types:** `mockup-tooling, design-system`
- **Tier:** mvp
- **Prototype:** no
- **Source plan:** `~/.claude/plans/at-this-stage-maybe-sunny-wall.md` (archived L-block design)
- **Scope:** Set up `docs/mockups-legacy/` parallel hierarchy. Extract frontend tokens from `frontend/index.html` `:root` blocks → `assets/css/desktop-shell.css` (3 themes × 2 modes, `.dark` translated to `[data-mode="dark"]` for tweaks.js compat). Copy `tweaks.js` + icons from `docs/mockups/`. Stub `atoms.css` and `molecules.css`. Author principal hub `index.html` + sub-hub placeholders for atoms/molecules/flows/screens. Author `README.md`, `VERIFICATION.md` (per-component Playwright recipe), `INDEX.md` (catalog skeleton).
- **Exit artifacts:** complete `docs/mockups-legacy/` skeleton verified by http-server boot + principal hub render + theme switching (Normal/Professional/Mono × light/dark) + Tweaks panel auto-detection.
- **Status (2026-04-27):** Exec ✅. Review/Commit/Push pending.

### Phase L1 — mockups-legacy Atoms

```yaml
phase: L1
types: [mockup-extracted, ui-kit]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-extracted, ui-kit]
suppressed_dims_count: 0
decisions_entry: RF-2026-04-27
```

- **Types:** `mockup-extracted, ui-kit`
- **Tier:** mvp
- **Prototype:** no
- **Scope:** Extract ~13 atoms from `frontend/src/components/` (App shell components, dialogs, toasts, progress, location selector, etc.) and `frontend/src/shared/ui/` (Toast, CircularProgress) into `docs/mockups-legacy/atoms/<name>.html`. Methodology per `docs/mockups-legacy/VERIFICATION.md`: read React source → author idiomatic mockup HTML using canonical CSS chain → verify side-by-side via Playwright at `localhost:4173` (mockup) vs `localhost:5174` (live frontend). Catalog each atom in `atoms/INDEX.md` with back-link to the React source file.
- **Exit artifacts:** ~13 atom HTMLs, populated `atoms.css`, populated `atoms/index.html` sub-hub, populated `atoms/INDEX.md`, screenshots in `extraction-snapshots/<name>/`.

### Phase L2 — mockups-legacy Molecules

```yaml
phase: L2
types: [mockup-extracted, ui-kit]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-extracted, ui-kit]
suppressed_dims_count: 0
decisions_entry: RF-2026-04-27
```

- **Types:** `mockup-extracted, ui-kit`
- **Tier:** mvp
- **Prototype:** no
- **Scope:** Three sub-phases.
  - **L2a — Direct counterparts (~18):** the molecules that already exist in `docs/mockups/molecules/` (cards, modals, toast, banner, navs, FAB, filters, sheets, drawers, forms, list-items). Extract from frontend, verify each matches its clean-slate counterpart structurally; document divergence in catalog row.
  - **L2b — Frontend-specific (~40-60):** molecules that exist only in the frontend across the 12 feature folders (analytics, batch-review, dashboard, history, insights, items, reports, scan, settings, transaction-editor, etc.). Triage to keep essentials.
  - **L2c — Specialized long-tail:** AirlockSequence, BadgeUnlock, etc. Extract only if used by an extracted screen in L4.
- **Exit artifacts:** ~60-80 molecule HTMLs, populated `molecules.css`, `molecules/COMPONENT-LIBRARY.md`, populated `molecules/index.html`.

### Phase L3 — mockups-legacy Flows

```yaml
phase: L3
types: [mockup-extracted, mockup-flows]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-extracted, mockup-flows]
suppressed_dims_count: 0
decisions_entry: RF-2026-04-27
```

- **Types:** `mockup-extracted, mockup-flows`
- **Tier:** mvp
- **Prototype:** no
- **Scope:** Extract 7+ user journeys from frontend handler chains (`frontend/src/features/*/hooks/use*Handlers.ts`, `frontend/src/hooks/app/useTransactionHandlers.ts`). Map to clean-slate F1–F13 numbering where the journey matches; add new IDs for novel flows surfaced only by the legacy port (e.g., currency-mismatch resolution per the F1–F6 findings in `.kdbp/KNOWLEDGE.md` 2026-04-27 entry).
- **Exit artifacts:** ~8-10 flow walkthrough HTMLs, populated `flows/index.html`, INDEX.md flow-table populated.

### Phase L4 — mockups-legacy Screens

```yaml
phase: L4
types: [mockup-extracted, user-facing]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-extracted, user-facing]
suppressed_dims_count: 0
decisions_entry: RF-2026-04-27
```

- **Types:** `mockup-extracted, user-facing`
- **Tier:** mvp
- **Prototype:** no
- **Scope:** Extract ~57 views across 12 feature folders. Eight sub-phases mapped to clean-slate P5–P12 boundaries:
  - **L4a → P5 (Auth):** ~1 (login only — frontend has minimal auth surface; gap documented)
  - **L4b → P6 (Core capture):** ~5 (dashboard, single-scan states, quicksave, manual entry, transaction editor)
  - **L4c → P7 (Batch + statement):** ~5 (mode selector, batch capture, credit warning, batch review, statement upload placeholder)
  - **L4d → P8 (History + items + insights):** ~3 (history with filters, items aggregated/duplicates, insights 3-tab)
  - **L4e → P9 (Trends + reports):** ~2 (trends carousel donut/sankey/treemap/bump, reports 4-accordion)
  - **L4f → P10 (Groups):** likely partial — frontend may not have full 16-screen groups surface; document gaps
  - **L4g → P11 (Settings):** ~9 subviews (Límites, Perfil, Preferencias, Escaneo, Suscripción, Datos, Grupos, App, Cuenta)
  - **L4h → P12 (Edge states):** scattered — error/empty/offline states across views, including the 3 distinct error variants per `.kdbp/PENDING.md` P6 (insufficient credits / rate limit / generic)
- **Each sub-phase ends with a natural pause point.** Hard checkpoint after L4d (~halfway through screens) to re-evaluate scope.
- **Exit artifacts:** ~30 mobile + ~30 desktop variants, populated `screens/index.html`, `INDEX.md` §5 sub-tables populated per sub-phase.

### Phase L5 — mockups-legacy Catalog + handoff

```yaml
phase: L5
types: [mockup-extracted, mockup-docs]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, mockup-extracted, mockup-docs]
suppressed_dims_count: 0
decisions_entry: RF-2026-04-27
```

- **Types:** `mockup-extracted, mockup-docs`
- **Tier:** mvp
- **Prototype:** no
- **Scope:** Wire all atoms↔molecules↔screens↔flows cross-references (one-level only, per gabe-mockup conventions). Author `docs/mockups-legacy/COMPARISON.md` — drift report comparing clean-slate `docs/mockups/` against legacy-extracted `docs/mockups-legacy/`. Update `docs/mockups/INDEX.md` with a Navigation section pointing at the parallel hierarchy. Run consistency check (tokens applied uniformly, no hex/rgb in HTML, all cross-refs intact). Optionally extend `tests/mockups/hubs.spec.ts` with `mockups-legacy/` coverage.
- **Exit artifacts:** complete cross-reference graph, `COMPARISON.md`, updated root `INDEX.md`, optional Playwright suite extension.
- **L5 ✅ unblocks P5–P12.** Once L5 status is fully ✅, advance Current Phase to **Phase 5: Auth + onboarding + consent** and remove "DEFERRED" markers on P5–P12.

## Current Phase

**Phase L1: mockups-legacy Atoms** — 🎯 **complete** (Exec ✅, Review ✅, Commit ✅, Push ✅)

P1–P4 of the clean-slate track are Exec ✅. L0 ✅ + L1 Exec ✅ landed 2026-04-27. L1 Review ✅ landed 2026-04-27 (cross-agent triangulation Codex+Claude, 9 findings all fixed in the review session — see LEDGER 2026-04-27 19:15). L1 Commit ✅ landed 2026-04-27 as part of 5-phase catch-up commit `be9aefd` (P3 + P4 + Spike P14 + L0 + L1 + review fixes bundled per /gabe-commit [B] commit-all selection). L1 Push ✅ landed 2026-04-27 16:30 to origin/main (P5 deployment row). Next phase in queue is **L2 (Molecules)** — three sub-phases L2a/L2b/L2c. After L5 ✅ ships, Current Phase advances to **Phase 5: Auth + onboarding + consent**.

> **Retroactive Commit-column correction needed:** Phases 3, 4, and L0 — and Spike P14 — were all bundled into the same `be9aefd` commit but their Commit columns remain ⬜ because `/gabe-commit` Step 6.6 only auto-ticks the Current Phase. Manually retro-tick those four columns when convenient (or accept the ⬜ as accurate signal that they didn't follow per-phase commit hygiene).

## Dependencies

- P2 ← P1
- P3 ← P1, P2
- P4 ← P1 (can run parallel with P2/P3)
- **L0–L5 ← `frontend/` operational** (the React port at `frontend/` is the extraction source)
- **L1 ← L0** (foundation tooling + tokens must exist)
- **L2 ← L1** (atoms feed molecules)
- **L3 ← L2** (flows reference molecules)
- **L4 ← L2, L3** (screens compose molecules and route via flows)
- **L5 ← L1, L2, L3, L4** (catalog crosses all tiers)
- **P5–P12 ← L5** (deferred — clean-slate screen phases unblock when L-block ships)
- P13 ← P1–P12 + L0–L5 (audits both clean-slate and legacy tracks)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Claude design tool overwhelm on big phases (P6/P7/P9/P10) | high | Break mid-phase into per-screen sessions; enforce component reuse from P3; escalate to /gabe-plan update if phase needs splitting |
| Component drift across screen phases | med | P3 locks component library; P5-P12 forbidden to invent new components without back-porting to P3 |
| INDEX.md + REQ-COVERAGE.md rot as screens land | med | Each P5-P12 phase commit-gated on index update; /gabe-commit CHECK 9 (doc drift) catches rot |
| Mobile variant skipped under deadline pressure | high | Each screen phase outputs BOTH variants in same session — no separate "mobile pass" escape hatch |
| Scope creep from boletapp feature nostalgia | med | Clean-slate anchored to SCOPE.md REQs only; boletapp mockups are ref for patterns, not feature list |
| Theme exploration stalls P1 | med | P1 tier=mvp: pick winner in single session, don't iterate to perfection; tokens can refine in P3 feedback loop |
| REQ-27 cohort benchmarking is late-phase in SCOPE | low | P9 includes cohort chart opt-in only; full cohort mockup may defer if SCOPE gates it |
| Spanish-first copy drift between web + mobile variants | low | P11 Preferencias includes i18n preview; handoff doc calls out translation keys |

## Notes

- Tool order: Claude design (frontend-design skill) primary, HTML fallback when design outputs don't land or need fine control. Final artifacts = HTML at `docs/mockups/`.
- Platform split: 2 sets (web responsive + mobile unified). iOS + Android share mobile set — React Native shared codebase. Platform-flag notes on screens where gesture differs (swipe-back, haptics).
- REQ-26 QR/CAF boleta: mode option inside P6 single-scan Idle state, not its own phase.
- REQ-21 (observability): not user-facing — out of mockup scope.
- Indices: `docs/mockups/INDEX.md` (flow×screen×component) + `docs/mockups/REQ-COVERAGE.md` (REQ×screen matrix) seeded P4, updated P5-P12, audited P13.
- Theme source: zero, not ported. Legacy 3 themes (Normal/Professional/Mono) rendered as 3 of ≥6 candidates in P1; not privileged.

## Retrofit Log

- **2026-04-23 — state correction (Phase 1 Commit ⬜):** Phase 1 row had Commit=✅ with Exec=⬜ + Review=⬜ — inconsistent state. Verified git log + `docs/mockups/` filesystem + lane LEDGER: zero P1 execution work landed. Corrected Commit ✅ → ⬜. Caught by `/gabe-next` pre-dispatch verification.
- **2026-04-23 — /gabe-plan check retrofit `[all]`:** Added `Types` column to Phases table. Added structured YAML block per phase (1–13) with `phase_tier`, `dim_overrides: []`, `sections_considered`, `decisions_entry`. Corrected DECISIONS-ID references in Phase Details prose: D1→D7, D2→D8, D3→D9, D4→D10, D5→D11, D6→D12, D7→D13, D8→D14, D9→D15, D10→D16, D11→D17, D12→D18, D13→D19. Zero LLM calls (no prose-only overrides detected). Zero tier decisions changed — structural fix only.
- **2026-04-23 — lane rollback:** Plan moved from `.kdbp/lanes/ux-mockups/PLAN.md` → `.kdbp/PLAN.md`. Lane architecture dropped in favor of serial single-plan workflow. Backend P1 plan parked at `.kdbp/archive/queued_backend-p1.md`.
- **2026-04-24 — /gabe-plan check `[fix-types]`:** Synced Phase Details YAML `types:` + `sections_considered:` + prose `**Types:**` lines to match Phases table cells. P4: `[flows, index]` → `[mockup-flows, mockup-index]`. P13: `[documentation, validation]` → `[mockup-docs, mockup-validation]`. Closes YAML-vs-Phases-table drift introduced by 2026-04-24 /gabe-mockup retrofit. Zero LLM calls, zero tier changes.
- **2026-04-24 — Phase 2 Exec via /gabe-mockup M2 recipe:** 10 atoms authored at `docs/mockups/atoms/` (button · input · select · pill · badge · avatar · chip · skeleton · progress · spinner). Canonical atom stylesheet at `docs/mockups/assets/css/atoms.css` (458 lines) using P1-locked shell token vocab + supplementary spacing/radii/type-scale tokens. Each atom HTML self-contained (loads `desktop-shell.css + atoms.css + tweaks.js`), zero hex/rgb literals in atom HTML. `atoms/INDEX.md` catalog with selector map, state convention, and M13 a11y backlog (Mono Dark `--primary-ink` contrast gap surfaced). Phase 2 Exec ⬜→🔄→✅. Note: Phase 2 Commit column was already ✅ from 2026-04-23 P2 infra seed commit; Review + Push still ⬜.
- **2026-04-24 — /gabe-mockup retrofit:** Added `<!-- project_type: mockup -->` to PLAN frontmatter. Added `project_type: mockup` to BEHAVIOR.md frontmatter. P4 types renamed `[flows, index]` → `[mockup-flows, mockup-index]` + description upgraded to include 4-table INDEX.md governance + CRUD×entity matrix. P13 types renamed `[documentation, validation]` → `[mockup-docs, mockup-validation]`. Seeded `.kdbp/ENTITIES.md` (9 principal entities from SCOPE REQs). Landed `docs/mockups/assets/js/tweaks.js` (self-contained runtime Tweaks panel — single-script include) from gabe_lens template. Existing `docs/mockups/assets/css/desktop-shell.css` remains canonical token source (P1 exit artifact, v2.0.0 per `assets/tokens/tokens.json`); tweaks.js detects its `[data-theme][data-mode]` selectors without filename coupling. Seeded `docs/mockups/INDEX.md` from template (4-table skeleton, populated progressively P4-P12). Caught by `/gabe-next` dispatching to `/gabe-mockup` instead of `/gabe-execute` on Current Phase = 2.
- **2026-04-25 — Phase 3 Exec via /gabe-mockup M3 recipe:** 18 molecules authored at `docs/mockups/molecules/`. Foundation: state-tabs (canonical multi-state). Cards: card-transaction · card-stat · card-empty · card-feature · card-celebration. Overlays: modal (5 variants confirm/form/learning/error/credit) · sheet · drawer. Feedback: toast (4 variants) · banner (4 variants incl. offline edge-bleed). Nav: nav-bottom (mobile 5-tab) · nav-top (desktop) · nav-sidebar (expanded + collapsed) · fab (with long-press scan-mode menu). Forms: form (multi-step + conditional reveal + error summary) · filters (5 chip types + search) · list-item (selectable + swipeable). Canonical stylesheet at `assets/css/molecules.css` (~640 lines, 15 sections, zero hex/rgb literals — composes desktop-shell tokens + atom primitives). `COMPONENT-LIBRARY.md` catalog with state matrix × atom dependency × platform variance × P5-P12 contract. `molecules/index.html` rebuilt as live catalog hub (placeholder retired). `INDEX.md §5` populated with 18 catalog rows + sub-hub references. Playwright `tests/mockups/molecules.spec.ts` adds 20 specs (18 smoke + state-tabs interaction + hub catalog); `hubs.spec.ts` molecules section retrofitted from placeholder assertions to live-hub assertions. Full mockup suite: 63/63 pass. Phase 3 Exec ⬜→🔄→✅. Review + Commit + Push remain ⬜.
- **2026-04-24 — Phase 4 amendment (D22): central hub + section sub-hubs.** Phase 4 scope expanded to include the principal `docs/mockups/index.html` hub restructure + per-section sub-hubs (`flows/index.html`, `molecules/index.html`) + section-aware breadcrumb in `tweaks.js` + Playwright `hubs.spec.ts` coverage. Token migration in the top hub: inline `:root` block (lines ~13-27 of existing index.html) → `desktop-shell.css` canonical tokens (option a, accepted small visual shift). Phase tier remains `mvp`; no `dim_overrides` change. Layer B (extracting the pattern into `gabe_lens/templates/mockup/` so `/gabe-mockup` seeds it on future projects) is **queued as a separate follow-up**, tracked outside this PLAN. Source: `/gabe-plan update` invoked from `/plan` confirmation.
- **2026-04-26 — Spike P14.0 (out-of-band): Mockup→React validation via `/gabe-mockup spike toast --system`.** Translated `docs/mockups/molecules/toast.html` into a working React component under new `frontend/` directory (Vite + React 18 + TypeScript). Canonical token chain via Vite `@mockups` alias + `@import` of desktop-shell.css + atoms.css + molecules.css. System layer: `ToastProvider` (queue, max 3, FIFO eviction) + `ToastContainer` + `useToast` hook (success/info/warning/error dispatchers). Verification: `tsc --noEmit` clean, `vite build` clean (37 modules, 65.93kB CSS bundled — token chain proven to resolve). Visual diff vs static mockup at port 4173 deferred to user (requires browser). Bookkeeping: `docs/mockups/REACT-PORT-RECIPE.md` documents conventions + components-ported table + next-component checklist. **This spike sits ahead of queued backend P1** (`.kdbp/archive/queued_backend-p1.md`) which planned the React scaffold; when P1 activates, the existing `frontend/` is absorbed rather than rebuilt. The skill side: `gabe_lens/skills/gabe-mockup/SKILL.md` now has a "Modes" section + a documented `spike` mode + a "Shared conventions — React port" subsection. New template subtree at `gabe_lens/templates/mockup/react/` (16 files) drives the recipe — mirrored to `refrepos/setup/cherry-pick/kdbp/templates/mockup/react/`. Per existing dual-home install, the templates auto-flow to both `~/.claude/templates/gabe/mockup/react/` and `~/.agents/templates/gabe/mockup/react/`.
- **2026-04-27 — L-block insertion (mockups-legacy parallel hierarchy):** The `frontend/` React port (originally a Spike P14.0 toast translation) ballooned during sustained sessions into a fully operational app with all backends mocked (Firebase Auth/Firestore/Storage/Functions/Messaging shimmed; Gemini canned via 8-case scan-picker). Strategic decision recorded in `.kdbp/KNOWLEDGE.md` 2026-04-27 entry: gastify will **rebuild the frontend from scratch** rather than reuse the legacy port — but the operational port serves as a high-fidelity extraction source for the remaining mockup work. Rather than continue P5–P12 from imagination/screenshots, we extract directly from `frontend/` into a parallel mockup hierarchy at `docs/mockups-legacy/`. Inserted Phases L0–L5 in the active queue between Phase 4 (done) and Phase 5 (deferred). L0 Foundation ✅ shipped same day: tokens extracted from `frontend/index.html` into `docs/mockups-legacy/assets/css/desktop-shell.css` (3 themes × 2 modes, `.dark` translated to `[data-mode="dark"]` for tweaks.js compat); `tweaks.js` + icons copied from `docs/mockups/`; `atoms.css`/`molecules.css` stubbed; principal hub `index.html` + sub-hub placeholders authored; README + VERIFICATION + INDEX docs scaffolded; Python http-server boots on `:4173`; theme switching verified Normal Light → Professional Dark via Playwright. L-block design archived at `~/.claude/plans/at-this-stage-maybe-sunny-wall.md`. P5–P12 deferred until L5 ✅ ships; L5 then unblocks the clean-slate screen track. P13 (Handoff) audits both hierarchies. Methodology = source-driven create + Playwright verify per `docs/mockups-legacy/VERIFICATION.md`. /gabe-execute dispatches L-block via gabe-mockup skill (same dispatch as P2/P3). Decision tag: `RF-2026-04-27` for the YAML `decisions_entry` slot.
- **2026-04-27 — Phase L1 Exec ✅ (mockups-legacy atoms):** 11 atoms extracted from `frontend/src/`: button · input · select · pill · badge · avatar · chip · skeleton · progress · spinner · toast. The "~13" in the plan tolerance reduced to 11 because the frontend uses **inline Tailwind utility classes** rather than dedicated atom React components — there is no `Button.tsx` / `Input.tsx` / etc. The catalogued atoms mirror the **visual primitives** the live frontend produces, with named class selectors a refactor would land on. Only `frontend/src/shared/ui/Toast.tsx` exists as a true atom React file (drove `atoms/toast.html`). Canonical stylesheet `assets/css/atoms.css` populated (~340 lines, 11 sections, zero hex/rgb literals — composes desktop-shell tokens). Each atom HTML self-contained (loads `desktop-shell.css + atoms.css + tweaks.js`), includes a "Used by molecules (one level up)" placeholder section per cross-ref contract, populated during L2 extraction. `atoms/INDEX.md` catalog with React source back-links + selector convention + state coverage convention + dependencies-down explainer. `atoms/index.html` sub-hub rebuilt as live catalog (placeholder retired) — card grid with inline previews per atom using real DOM. Principal hub `index.html` Atoms card flipped `placeholder → live`, meta-pill updated to "11 atoms ✅". Root `INDEX.md §2 Atoms` table populated with 11 catalog rows + back-links. Verification: Playwright captured atoms-hub × Normal Light + Normal Dark + Professional Light, button atom × Normal Light, toast atom × Professional Light at `extraction-snapshots/_l1-verification/`. Programmatic spot-check confirmed CSS variable cascade resolves correctly per theme on `body` (`--primary` → #4a7c59 / #6b9e7a / #2563eb / #60a5fa / #18181b / #fafafa for the 6 theme/mode combos). Selector convention: BEM-lite (`.btn`, `.btn--primary`, `.btn--sm`, `.is-active`, `.is-error`). State convention: pseudo-class + `aria-*` driven; class-state only where ARIA isn't expressive enough. Phase L1 Exec ⬜→🔄→✅. Review + Commit + Push remain ⬜.
