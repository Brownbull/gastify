# Active Plan

<!-- status: active -->

## Goal

Produce complete clean-slate mockup surface for gastify — responsive web portal + unified mobile (Android + iOS shared via React Native) — covering every user-facing REQ, every flow, every component. Deliverables match boletapp/gustify-legacy HTML pattern at `docs/mockups/`. Tool: Claude design (frontend-design skill) primary, HTML fallback.

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — AI receipt scanning, multi-currency, multi-platform (web + mobile), rebuild of BoletApp
- **Created:** 2026-04-23
- **Last Updated:** 2026-04-24 (Phase 1 Review → ✅ · verdict WARNING, 64→93 confidence, P1-P4 deferred)
- **Platform sets:** 2 (web responsive + mobile unified)
- **Strategy:** Clean-slate redesign from zero. Legacy boletapp mockups at `/home/khujta/projects/bmad/boletapp/docs/mockups/` = reference only, not port.
- **Queued next:** Backend P1 Foundation — see `.kdbp/archive/queued_backend-p1.md` (activate after P13 handoff ships).

## Phases

| # | Phase | Description | Types | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|-------|------|------------|------|--------|--------|------|
| 1 | Design language + tokens | Port 3 legacy themes (Normal/Pro/Mono × light/dark) + 3 new candidates as style prompts → 4-screen stress test × 6 themes × 3 platforms (desktop web / mobile web / native mobile) → pick runtime multi-theme set → lock tokens.json + design-system.html | design-system | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 2 | Atomic components | Buttons, inputs, pills, badges, avatars, chips, skeletons, progress. Web + mobile | design-system, ui-kit | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Molecular components | Cards, modals, toasts, banners, nav (bottom-tab + top-bar + sidebar), FAB, filters, sheets, drawers, forms + COMPONENT-LIBRARY.md. Full state matrix + WCAG AA | design-system, ui-kit | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Flow map index + REQ×screen matrix | Enumerate all flows; low-fi skeleton per flow; seed INDEX.md + REQ-COVERAGE.md (living through P5-P12) | flows, index | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Auth + onboarding + consent | Login, register, forgot, email verify, 4-jurisdiction consent (CL/LATAM/EU/US/CA), welcome/first-open, PWA install. Web + mobile | user-facing, auth | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Core capture loop | Dashboard, single-scan 5 states (incl. REQ-26 QR/CAF boleta as scan option), quicksave, manual entry, transaction editor (normal + hard-lock). Web + mobile | user-facing, capture, ai-agent | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Batch + statement flows | Scan mode selector, batch capture, credit warning, batch review, statement upload (consent + encrypted pw), processing, review list, reconciliation/matching. Web + mobile | user-facing, capture, reconciliation | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | History + items + insights | History (5 filters, selection, date groups), items (aggregated/duplicates), insights (3-tab Lista/Airlock/Logro). Web + mobile | user-facing, data-view | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Trends + reports | Trends (donut/sankey/treemap/bump + drill-downs + stats popup), Reports (4-accordion + detail overlay + inline donuts + PDF). Web + mobile | user-facing, analytics, charts | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Groups (shared expenses) | 16 screens: switcher, home, tx list, analytics, create, admin, invite/redeem, settings subview, leave/delete confirm, read-only detail, tx card, batch add. Web + mobile | user-facing, multi-tenant | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Settings + profile | 9 subviews: Límites, Perfil, Preferencias (theme/dark/lang/currency/date/font), Escaneo, Suscripción, Datos, Grupos, App, Cuenta. Web + mobile | user-facing, settings | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | Alerts + errors + offline states | Alerts list + unread badge, toasts, scan errors, credit depletion, offline banner, reconnect, 404/maintenance, push examples, extended edge states. Web + mobile | user-facing, edge-cases | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 13 | Handoff + index hub + audit | index.html gallery, HANDOFF.md, SCREEN-SPECS.md, MOCKUP-PLAN.md (frozen), full REQ×screen audit, a11y pass, cross-screen consistency check | documentation, validation | ent | low | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->

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
types: [flows, index]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, flows, index]
suppressed_dims_count: 0
decisions_entry: D10
```

- **Types:** `flows, index`
- **Tier:** mvp
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D10
- **Scope:** Enumerate flows: F1 first-scan, F2 quicksave, F3 batch, F4 statement, F5 groups, F6 learning→trust, F7 credit depletion, F8 scan error recovery, F9 offline→reconnect, F10 analytics deep-dive, F11 reports + PDF, F12 data export, F13 settings config, F14 auth + onboarding, F15 jurisdiction consent, F16 PWA install, F17 push setup, F18 i18n switch, F19 multi-currency, F20 cohort opt-in. One HTML walkthrough skeleton per flow (low-fi placeholders). Seed `docs/mockups/INDEX.md` (flow×screen×component cross-ref) + `REQ-COVERAGE.md` (REQ×screen matrix). Living docs — P5-P12 update them.

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
types: [documentation, validation]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, documentation, validation]
suppressed_dims_count: 0
decisions_entry: D19
```

- **Types:** `documentation, validation`
- **Tier:** ent
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D19
- **Scope:** `docs/mockups/index.html` browseable gallery (all screens + flows + components linked), `HANDOFF.md` (engineer spec with code-ready component inventory + token references + responsive breakpoints + gesture/animation specs), `SCREEN-SPECS.md` (per-screen breakdown: REQ coverage, components used, states, data shape), `MOCKUP-PLAN.md` (this plan frozen + what was cut), complete REQ×screen audit (every REQ-01..REQ-27 has ≥1 screen OR explicit not-user-facing tag), a11y pass (WCAG AA contrast + focus order + ARIA roles), cross-screen consistency check (tokens applied uniformly, no drift). **Enterprise scope:** this is the validation gate — not optional.

## Current Phase

Phase 1: Design language + tokens

## Dependencies

- P2 ← P1
- P3 ← P1, P2
- P4 ← P1 (can run parallel with P2/P3)
- P5–P12 ← P3 (components must exist before screens use them)
- P13 ← P1–P12 (all screens + components must exist before audit)

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
