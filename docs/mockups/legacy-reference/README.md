# Legacy Reference — BoletApp Mockups (2026-Q1 production)

Frozen snapshot of BoletApp `docs/mockups/` at the point gastify rebuild forked. Ported verbatim as **layout + interaction + state-matrix reference** for Claude Design. NOT prescriptive — gastify rebuild may refine copy, restructure navigation, swap iconography, retheme. But structure, state breadth, and component vocabulary are production-proven — lift from here, don't reinvent.

## Contents

| Path | Count | Size | Purpose |
|------|-------|------|---------|
| `screens/` | 29 HTMLs + nav reference | ~1.3 MB | Full screen inventory — dashboard, scan, history, insights, reports, groups, settings, profile, auth, components |
| `flows/` | 13 end-to-end walkthroughs | ~0.8 MB | Cross-screen journey walkthroughs — one HTML per user flow with annotated step transitions |
| `index.html` | 1 gallery hub | 48 KB | 708-line "Gastify Design System Hub" — links every screen + flow, categorized |

**Total: 2.1 MB.** One-time port — won't churn.

Every screen + flow is self-contained (no external deps), includes Outfit + Baloo 2 Google Fonts link, and uses the 3-theme runtime switcher (`[data-theme="normal|professional|mono"][data-mode="light|dark"]`). Treat each HTML as an executable spec.

## Screen inventory by feature area

### Core capture + dashboard
- `gastify-dashboard.html` (59 KB, 2026 lines) — **primary reference**: home screen with balance, stats, recent tx, runtime theme switcher baked in. Used throughout STRESS-TEST-SPEC.
- `gastify-single-scan-states.html` (38 KB) — 5-state scan flow: idle → processing → reviewing → saving → error
- `gastify-scan-mode-selector.html` (37 KB) — mode picker: Recibo / Lote / Estado
- `gastify-quicksave-card.html` (41 KB) — post-scan confidence overlay, quick-save affordance
- `gastify-manual-entry.html` (22 KB) — manual transaction creation flow

### Batch + statement
- `gastify-batch-capture.html` (46 KB) — gallery-style multi-scan capture
- `gastify-batch-review.html` (54 KB) — per-receipt review cards
- `gastify-statement-upload.html` (42 KB) — encrypted-password statement ingest
- `gastify-statement-review.html` (44 KB) — statement reconciliation / matching

### Transactions (user-requested focus)
- `gastify-transaction-editor.html` (79 KB, **2463 lines**) — **full tx editor**: normal mode + hard-lock mode (REQ-12/13), all field types, item-level breakdown, category reassignment, split transactions
- `gastify-history.html` (72 KB, **2296 lines**) — **tx history list**: 5 filter types, selection mode, date groups, pagination, bulk actions
- `gastify-items.html` (59 KB) — aggregated item view (duplicates + cross-transaction rollup), CSV export, 3 sort keys

### Insights + analytics
- `gastify-insights.html` (49 KB) — 3-tab switcher (Lista / Airlock / Logro), carousel, anomaly cards
- `gastify-trends.html` (58 KB) — donut / sankey / treemap / bump chart types, drill-down L1→L2
- `gastify-reports.html` (50 KB) — 4-accordion section with report detail overlay, inline donut charts, PDF export

### Settings (user-requested focus)
- `gastify-settings.html` (52 KB, **1860 lines**) — **full settings hub**: 9 subviews — Límites, Perfil, Preferencias (theme/dark/lang/currency/date/font), Escaneo, Suscripción, Datos, Grupos, App, Cuenta
- `gastify-perfil.html` (21 KB) — profile editing
- `gastify-metas.html` (22 KB) — goals / budgets / spending limits

### Groups (shared expenses)
- `gastify-group-switcher.html` (54 KB)
- `gastify-group-home.html` (61 KB)
- `gastify-group-create.html` (40 KB)
- `gastify-group-admin.html` (44 KB)
- `gastify-group-invite.html` (35 KB)

### Auth + onboarding
- `gastify-login.html` (25 KB)

### Edge states
- `gastify-alerts.html` (39 KB) — alerts list + unread badge, 4 variants
- `gastify-notification-sheet.html` (22 KB) — push notification sheet

### Component library
- `gastify-components-cards.html` (31 KB, 762 lines) — all card variants: transaction card, stat card, empty-state card, feature card, celebration card
- `gastify-components-modals.html` (32 KB, 712 lines) — all modal variants: confirm, form, learning, error, credit
- `_nav-reference.html` (6 KB) — navigation primitives (bottom-tab, top-bar, sidebar)

## Flow inventory

Each flow walkthrough = single HTML with N annotated screens linked by step transitions.

| # | Flow | File | Size |
|---|------|------|------|
| F1 | First-scan (new user → first transaction) | `flow-01-first-scan.html` | 36 KB |
| F2 | Quicksave (post-scan accept without edit) | `flow-02-quicksave.html` | 45 KB |
| F3 | Batch capture | `flow-03-batch-capture.html` | 43 KB |
| F4 | Statement scan (encrypted PDF ingest) | `flow-04-statement-scan.html` | 53 KB |
| F5 | Group sharing | `flow-05-group-sharing.html` | 51 KB |
| F6 | Learning → trust (AI confidence building) | `flow-06-learning-trust.html` | 60 KB |
| F7 | Credit depletion | `flow-07-credit-depletion.html` | 65 KB |
| F8 | Error recovery | `flow-08-error-recovery.html` | 50 KB |
| F9 | Offline → reconnect | `flow-09-offline-reconnect.html` | 57 KB |
| F10 | Analytics deep-dive | `flow-10-analytics-deepdive.html` | 78 KB |
| F11 | Reports export | `flow-11-reports-export.html` | 72 KB |
| F12 | Data export | `flow-12-data-export.html` | 63 KB |
| F13 | Settings config | `flow-13-settings-config.html` | 72 KB |

Flow inventory maps directly to PLAN.md P4 flow list (F1–F20). F14–F20 (auth, consent, PWA install, push, i18n, multi-currency, cohort opt-in) were not yet mocked in legacy — those are new-surface for gastify rebuild.

## Design system hub

`index.html` is a 708-line "Gastify Design System Hub" gallery. Opens in browser, links every screen + flow, categorized visually. Use as the entry point for legacy exploration.

## How Claude Design should use this reference

1. **Layout & structure.** Match composition (balance card above stats above tx list, 5-slot bottom nav, etc.). Legacy layouts are production-refined.
2. **State matrix.** Each screen has hero state + variant states (empty / loading / error / selection-mode / etc.). Match state breadth — don't ship a screen with only happy-path.
3. **Interaction vocabulary.** Gesture patterns, transition shapes, keyboard shortcuts. Copy verbatim where sensible.
4. **Category chip palette.** Uses the same tokens in `../assets/tokens/categoryColors/` — production color decisions live there, not reinvented.
5. **Theme switcher implementation.** Every screen has `[data-theme][data-mode]` attributes + theme-tab UI at top. Pattern to replicate in rebuild.
6. **Copy register.** Spanish-CL conversational voice: "Últimos escaneados", "Ver todos →", "Escanea tu primer recibo". Echo register + phrasing.

**DO NOT port verbatim.** This is production code that accumulated cruft. Gastify rebuild = clean-slate in implementation, legacy-informed in UX.

**DO use as a checklist.** When rendering a new screen, open the legacy counterpart + confirm: am I covering the same state surface? Are my variants complete? Did I lose any interaction affordance?

## Known gaps vs PLAN.md

Legacy covered ~70% of gastify P5–P12 scope. Missing (new surface for rebuild):
- Jurisdiction consent screens (4-way CL/LATAM/EU/US/CA) — P5
- PWA install prompt — P5
- Push permission prompt — P5
- Register, Forgot PW, Email Verify — P5 (only Login exists in legacy)
- Desktop responsive variants — all screens (legacy mobile-only)
- Native Mobile platform divergence notes — all screens
- Some group settings subviews (Leave Confirm, Delete Confirm, Read-Only Detail) — P10

These are gastify-rebuild-new and will land in `../explorations/output/` with no legacy reference.

## License + ownership

Ported verbatim from `bmad/boletapp/docs/mockups/` (owned by project). Snapshot 2026-04-23.
