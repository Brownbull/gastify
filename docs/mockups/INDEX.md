# Gastify Mockup Index

<!-- Seeded 2026-04-24 by /gabe-mockup retrofit (Batch E). Living doc — populated progressively through P4-P12. -->
<!-- Governed by /gabe-commit CHECK 7 Layer 4 — low-severity finding fires when docs/mockups/** edited without INDEX.md in same commit. -->

**Project:** gastify
**Last updated:** 2026-04-25 (P3 molecules locked — 18 molecules + COMPONENT-LIBRARY.md + molecules/index.html hub)
**Active plan:** `../../.kdbp/PLAN.md`
**Entities source:** `../../.kdbp/ENTITIES.md`
**Source AUDIT (retrospective):** `AUDIT.md` (to be folded into §6 below during M13)

---

## 1. Decisions log

<!-- Mirrors .kdbp/DECISIONS.md D-entries that affect mockup surface. Linked back to D-id anchors. -->

| # | Decision | Date | Rationale | Affects |
|---|----------|------|-----------|---------|
| D7 | P1 tier escalated mvp → ent | 2026-04-23 | 6-theme × 3-platform stress matrix demands full Enterprise tier on Design System section | P1, tokens.css, stress matrix |
| D8 | P2 atoms kept at mvp | 2026-04-23 | Happy-path atom variants sufficient; full state matrix moves to P3 | P2 scope |
| D9 | P3 molecules at ent | 2026-04-23 | Full state matrix + WCAG AA floor required for molecules | P3 scope |
| D10-D18 | P4-P12 phase tier picks | 2026-04-23 | Per-phase tier decision per /gabe-plan Step 3.5 | all screen phases |
| D19 | P13 handoff at ent | 2026-04-23 | HANDOFF.json schema + a11y AA pass non-optional | P13 |
| RF-2026-04-24 | /gabe-mockup retrofit | 2026-04-24 | Project-type dispatch + single-script tweaks.js (self-contained panel at `assets/js/tweaks.js`) + INDEX.md governance. Existing `assets/css/desktop-shell.css` remains canonical token source. | all phases |

---

## 2. Workflows

<!-- Flow catalog from PLAN.md P4. Each row links to flows/<name>.html walkthrough once emitted. -->

| Flow | REQ coverage | Primary screens | Desktop | Mobile | Status |
|------|--------------|-----------------|---------|--------|--------|
| F1 — First scan | REQ-01, REQ-02, REQ-04 | single-scan-states, quicksave-card, transaction-editor | flows/flow-01-first-scan.html | flows/flow-01-first-scan.html | LIVE |
| F2 — QuickSave | REQ-02, REQ-05 | quicksave-card, dashboard | flows/flow-02-quicksave.html | flows/flow-02-quicksave.html | LIVE |
| F3 — Batch capture | REQ-01 | batch-capture, batch-review | flows/flow-03-batch-capture.html | flows/flow-03-batch-capture.html | LIVE |
| F4 — Statement scan | REQ-07 | statement-upload, statement-review | flows/flow-04-statement-scan.html | flows/flow-04-statement-scan.html | LIVE |
| F5 — Groups sharing | REQ-15 | group-create, group-home, group-invite | flows/flow-05-group-sharing.html | flows/flow-05-group-sharing.html | LIVE |
| F6 — Learning→trust | REQ-09, REQ-13 | transaction-editor, settings-datos | flows/flow-06-learning-trust.html | flows/flow-06-learning-trust.html | LIVE |
| F7 — Credit depletion | — | credit-warning, dashboard | flows/flow-07-credit-depletion.html | flows/flow-07-credit-depletion.html | LIVE |
| F8 — Error recovery | — | single-scan-states (error states) | flows/flow-08-error-recovery.html | flows/flow-08-error-recovery.html | LIVE |
| F9 — Offline → reconnect | — | offline-banner, reconnect-toast | flows/flow-09-offline-reconnect.html | flows/flow-09-offline-reconnect.html | LIVE |
| F10 — Analytics deep-dive | REQ-06, REQ-10 | trends, insights, reports | flows/flow-10-analytics-deepdive.html | same | LIVE |
| F11 — Reports + PDF | REQ-06 | reports, trends | flows/flow-11-reports-export.html | same | LIVE |
| F12 — Data export | — | settings-cuenta | flows/flow-12-data-export.html | same | LIVE |
| F13 — Settings config | REQ-19, REQ-22 | settings-preferencias | flows/flow-13-settings-config.html | same | LIVE |
| F14 — Auth + onboarding | REQ-16 | login, register, welcome | — | — | PLANNED (P5) |
| F15 — Jurisdiction consent | REQ-20 | consent-{CL,LATAM,EU,US-CA} | — | — | PLANNED (P5) |
| F16 — PWA install | REQ-23 | pwa-install-prompt | — | — | PLANNED (P5) |
| F17 — Push setup | REQ-25 | notification-permission-prompt | — | — | PLANNED (P5) |
| F18 — i18n switch | REQ-22 | settings-preferencias | — | — | PLANNED (P11) |
| F19 — Multi-currency | REQ-18, REQ-19 | dashboard, settings-preferencias | — | — | PLANNED (P11) |
| F20 — Cohort opt-in | REQ-27 | settings-datos, trends | — | — | PLANNED (P9/P11) |

---

## 3. Screens — by section (desktop + mobile)

<!-- Updated progressively P5-P12. Initial seed mirrors AUDIT.md coverage snapshot. -->

### 3.1 Auth + onboarding (P5)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| Login | screens/gastify-auth-desktop.html | screens/gastify-login.html | LIVE | REQ-16 | User |
| Register | — | — | PLANNED | REQ-16 | User |
| Forgot password | — | — | PLANNED | REQ-16 | User |
| Email verify | — | — | PLANNED | REQ-16 | User |
| Welcome / first-open | — | — | PLANNED | REQ-20, REQ-27 | User, Consent |
| Consent — CL | screens/gastify-consent-desktop.html | — | IN-DEV (stacked — retrofit to state-tabs) | REQ-20 | Consent |
| Consent — LATAM | screens/gastify-consent-desktop.html | — | IN-DEV (stacked) | REQ-20 | Consent |
| Consent — EU | screens/gastify-consent-desktop.html | — | IN-DEV (stacked) | REQ-20 | Consent |
| Consent — US/CA | screens/gastify-consent-desktop.html | — | IN-DEV (stacked) | REQ-20 | Consent |
| PWA install prompt | — | — | PLANNED | REQ-23 | — |
| Push permission prompt | — | — | PLANNED | REQ-25 | — |

### 3.2 Core capture (P6)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| Dashboard | screens/gastify-dashboard-desktop.html | screens/gastify-dashboard.html | LIVE | REQ-05, REQ-06 | Transaction |
| Single-scan (5 states) | screens/gastify-single-scan-states-desktop.html | screens/gastify-single-scan-states.html | LIVE (canonical state-tabs reference) | REQ-01, REQ-02, REQ-04, REQ-26 | Receipt |
| QuickSave card | screens/gastify-quicksave-card-desktop.html | screens/gastify-quicksave-card.html | LIVE | REQ-02, REQ-05 | Transaction |
| Manual entry | — | screens/gastify-manual-entry.html | LIVE (mobile only) | REQ-05 | Transaction |
| Transaction editor | screens/gastify-transaction-editor-desktop.html | screens/gastify-transaction-editor.html | LIVE | REQ-12, REQ-13 | Transaction, Item |

### 3.3 Batch + statement (P7)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| Scan mode selector | screens/gastify-scan-mode-selector-desktop.html | screens/gastify-scan-mode-selector.html | LIVE | REQ-01 | Receipt |
| Batch capture | — | screens/gastify-batch-capture.html | LIVE (mobile only) | REQ-01 | Receipt |
| Credit warning | — | — | PLANNED | — | — |
| Batch review | — | screens/gastify-batch-review.html | LIVE (mobile only) | REQ-02 | Transaction |
| Statement upload | — | screens/gastify-statement-upload.html | LIVE (mobile only) | REQ-07, REQ-20 | Statement |
| Statement processing | — | — | PLANNED | REQ-07 | Statement |
| Statement review list | — | screens/gastify-statement-review.html | LIVE (mobile only) | REQ-07 | Statement |
| Reconciliation review | — | — | PLANNED | REQ-08 | Transaction, Statement |

### 3.4 Data-view (P8)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| History | screens/gastify-history-desktop.html | screens/gastify-history.html | LIVE | REQ-05 | Transaction |
| Items | screens/gastify-items-desktop.html | screens/gastify-items.html | LIVE | REQ-10, REQ-11 | Item |
| Insights | screens/gastify-insights-desktop.html | screens/gastify-insights.html | LIVE | REQ-10, REQ-11 | Transaction, Item |

### 3.5 Analytics (P9)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| Trends | screens/gastify-trends-desktop.html | screens/gastify-trends.html | LIVE | REQ-06, REQ-10 | Transaction |
| Reports | screens/gastify-reports-desktop.html | screens/gastify-reports.html | LIVE | REQ-06 | Transaction |

### 3.6 Groups (P10)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| Group switcher | — | screens/gastify-group-switcher.html | LIVE (mobile only) | REQ-15 | Group |
| Group home | — | screens/gastify-group-home.html | LIVE (mobile only) | REQ-15 | Group, Transaction |
| Group transactions | — | — | PLANNED | REQ-15 | Transaction |
| Group analytics | — | — | PLANNED | REQ-15 | Group |
| Create group | — | screens/gastify-group-create.html | LIVE (mobile only) | REQ-15 | Group |
| Admin panel | — | screens/gastify-group-admin.html | LIVE (mobile only) | REQ-15 | Group |
| Invite link | — | screens/gastify-group-invite.html | LIVE (mobile only) | REQ-15 | Group |
| Group hub (desktop) | screens/gastify-group-hub-desktop.html | — | LIVE (desktop only) | REQ-15 | Group |
| Redeem invite | — | — | PLANNED | REQ-15 | Group |
| Leave confirm | — | — | PLANNED | REQ-15 | Group |
| Delete confirm | — | — | PLANNED | REQ-15 | Group |
| Read-only detail | — | — | PLANNED | REQ-15 | Transaction |
| Settings subview (group) | — | — | PLANNED | REQ-15 | Group |
| Group home empty | — | — | PLANNED | REQ-15 | Group |
| Batch add (group) | — | — | PLANNED | REQ-15 | Transaction |

### 3.7 Settings (P11)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| Settings hub | screens/gastify-settings-desktop.html | screens/gastify-settings.html | LIVE | — | User |
| Perfil | — | screens/gastify-perfil.html | LIVE | — | User |
| Metas / Límites | — | screens/gastify-metas.html | LIVE | — | User |
| Preferencias | — | inside gastify-settings.html? | ⚠ verify | REQ-19, REQ-22 | User |
| Escaneo | — | inside gastify-settings.html? | ⚠ verify | — | User |
| Suscripción | — | inside gastify-settings.html? | ⚠ verify | — | User |
| Datos | — | inside gastify-settings.html? | ⚠ verify | REQ-09, REQ-27 | CardAlias |
| Cuenta | — | inside gastify-settings.html? | ⚠ verify | REQ-14 | User |

### 3.8 Edge states (P12)

| Screen | Desktop | Mobile | Status | REQ | Primary entity |
|--------|---------|--------|--------|-----|----------------|
| Alerts list | — | screens/gastify-alerts.html | LIVE (mobile only) | — | Alert |
| Notification sheet | — | screens/gastify-notification-sheet.html | LIVE (mobile only) | REQ-25 | Alert |
| Toast system | — | — | PLANNED | — | — |
| Offline banner | — | — | PLANNED | — | — |
| Reconnect toast | — | — | PLANNED | — | — |
| 404 page | — | — | PLANNED | — | — |
| Maintenance page | — | — | PLANNED | — | — |
| Credit depletion modal | — | — | PLANNED | — | — |
| Permission denied | — | — | PLANNED | — | — |
| Rate limited | — | — | PLANNED | — | — |
| Session expired | — | — | PLANNED | REQ-14 | User |
| Payment failed | — | — | PLANNED | — | — |
| Sync conflict | — | — | PLANNED | — | Transaction |
| Data corruption recovery | — | — | PLANNED | — | — |

---

## 4. CRUD × entity matrix

<!-- 9 entities from .kdbp/ENTITIES.md. Initial seed cells based on current screen inventory. -->
<!-- Populated progressively through P5-P12. Blank cells indicate coverage gaps. -->

| Entity | Created by | Viewed on | Modified by | Deleted by |
|--------|------------|-----------|-------------|------------|
| Receipt | single-scan-states, batch-capture, statement-upload, scan-mode-selector | — (transient; becomes Transaction) | — | transaction-editor (cascade via linked transaction) |
| Transaction | quicksave-card, manual-entry, transaction-editor, batch-review, statement-review | dashboard, history, items, insights, trends, reports, group-home | transaction-editor | transaction-editor (hard-lock gate per REQ-12) |
| Item | (auto, via Transaction extraction) | transaction-editor, insights, items | transaction-editor | transaction-editor (cascade via parent Transaction) |
| Statement | statement-upload | statement-review | — (one-shot) | — |
| CardAlias | (auto, via Transaction learning) | settings-datos | settings-datos | settings-datos |
| Group | group-create | group-home, group-switcher, group-hub-desktop | group-admin | group-admin (delete-confirm PLANNED) |
| User | (JIT via managed-auth) | settings-perfil | settings-perfil | settings-cuenta (export + delete, PLANNED) |
| Alert | (server-generated) | alerts, notification-sheet | alerts (mark-read) | alerts (dismiss) |
| Consent | consent-desktop (PLANNED state-tabs retrofit) | welcome (PLANNED) | — (immutable per lifecycle) | — |

---

## 5. Component usage × screen

<!-- Seeded during P3 molecules (locked 2026-04-25). Fills in further as M5-M12 lands + references molecules. -->
<!-- Catalog spec: docs/mockups/molecules/COMPONENT-LIBRARY.md -->

### 5.0 Foundation

| Component | Declared in | Used on |
|-----------|-------------|---------|
| tweaks-panel | `assets/js/tweaks.js` (self-contained, injects styles + DOM) | every mockup via `<script src="../assets/js/tweaks.js" defer></script>` |
| desktop-shell tokens | `assets/css/desktop-shell.css` (P1 canonical) | every mockup |
| atom primitives | `assets/css/atoms.css` (P2 canonical, 11 atoms) | every mockup that consumes molecules |
| molecule library | `assets/css/molecules.css` (P3 canonical, 18 molecules) | every screen P5-P12 |

### 5.1 Molecules — catalog rows

| # | Molecule | File (P3) | Variants | Used on (target screens) |
|---|----------|-----------|----------|--------------------------|
| 1 | state-tabs | `molecules/state-tabs.html` | ARIA · legacy | single-scan-states, login, consent (4 jurisdictions), transaction-editor (normal/hard-lock), preferences |
| 2 | card-transaction | `molecules/card-transaction.html` | expense · income · multi-currency | dashboard, history, insights, group-home, group-transactions |
| 3 | card-stat | `molecules/card-stat.html` | up/down/flat delta | dashboard hero, trends summary, reports detail, group home |
| 4 | card-empty | `molecules/card-empty.html` | history · filter · group | history-empty, insights-empty, groups-empty, items-empty, datos-empty |
| 5 | card-feature | `molecules/card-feature.html` | promotion · cohort opt-in · upgrade | dashboard hero, settings → datos (REQ-27 cohort), settings → suscripción |
| 6 | card-celebration | `molecules/card-celebration.html` | first-scan · streak · savings goal | single-scan post-success, insights → logro, onboarding completion |
| 7 | modal | `molecules/modal.html` | confirm · form · learning · error · credit | transaction-editor, single-scan error, settings → suscripción (credit), onboarding (learning), destructive actions |
| 8 | sheet | `molecules/sheet.html` | action · filter | history (filter) mobile, single-scan mobile (mode picker), tx-editor mobile, group share |
| 9 | drawer | `molecules/drawer.html` | right · left | history desktop (tx detail), statement-review, group-settings, batch-review |
| 10 | toast | `molecules/toast.html` | success · info · warning · error | every post-action confirmation (save, delete, sync, batch upload) |
| 11 | banner | `molecules/banner.html` | info · warning · error · offline | dashboard top, statement-upload (error), global offline indicator |
| 12 | nav-bottom | `molecules/nav-bottom.html` | 5-tab default | every authenticated mobile screen (dashboard, history, trends, insights, groups, settings) |
| 13 | nav-top | `molecules/nav-top.html` | default · elevated · minimal | every authenticated desktop screen (with sidebar) · public auth flows (minimal) |
| 14 | nav-sidebar | `molecules/nav-sidebar.html` | expanded · collapsed | every authenticated desktop screen (paired with nav-top) |
| 15 | fab | `molecules/fab.html` | sm/md/lg · with mode menu | dashboard mobile, history mobile, insights mobile · any capture-eligible mobile screen |
| 16 | form | `molecules/form.html` | multi-step · conditional reveal · error summary | manual entry, group create, statement upload, settings → preferencias, jurisdiction consent |
| 17 | filter-strip | `molecules/filters.html` | date · category · amount · tag · search | history, insights, group-transactions, items |
| 18 | list-item | `molecules/list-item.html` | navigable · selectable · swipeable | settings (every subview), sheet menus, group member list, history selection mode, insights, items |

### 5.2 Hub catalog

| Hub | File | Lists |
|-----|------|-------|
| Atoms hub | `atoms/index.html` | 10 atom cards + back-link to mockups home |
| Molecules hub | `molecules/index.html` | 18 molecule cards (6 sections: foundation, cards, overlays, feedback, navigation, forms+filters) + COMPONENT-LIBRARY.md link + back-link |
| Mockups home | `index.html` | section cards (design / atoms / molecules / flows / screens / handoff) |

---

## 6. Coverage gaps

<!-- Baseline from AUDIT.md. Shrinks as P5-P12 lands. Scale tier: blocking at /gabe-commit when stale. -->

### Gap priority stack (from AUDIT.md § Priority ranking)

| Priority | Area | Scope | Status |
|----------|------|-------|--------|
| P0 | Desktop variants for all 29 screens | REQ-23 | 14 of 29 shipped (48%) |
| P1 | 4-jurisdiction consent screens | REQ-20 | IN-DEV stacked-frame — retrofit to state-tabs needed |
| P1 | Auth flow (register, forgot, verify, welcome) | REQ-16 | 0 of 4 shipped |
| P1 | 11 missing Group screens | REQ-15 | 5 of 16 shipped (31%) |
| P2 | Reconciliation review screen | REQ-08 | 0 shipped |
| P2 | Settings subview verification + gap-fill | REQ-09, REQ-14, REQ-19, REQ-22 | Unverified — audit `gastify-settings.html` (1860 LoC) for 9 subviews |
| P2 | 13+ edge-state surfaces (P12) | — | 2 of 15 shipped |
| P2 | REQ-26 QR/CAF verification | REQ-26 | Unverified inside single-scan-idle |
| P2 | REQ-27 cohort opt-in + trends chart | REQ-27 | 0 shipped |
| P3 | Platform-divergence notes per screen | REQ-24 | 0 of 29 documented |
| P3 | PWA install + push permission prompts | REQ-23, REQ-25 | 0 shipped |
| P3 | Flow walkthroughs F14-F20 | — | 13 of 20 shipped (65%) |

### Per-REQ coverage snapshot (from AUDIT.md §5)

| REQ | Status | Primary screens |
|-----|--------|-----------------|
| REQ-01 Scan submission | ✅ | single-scan-states, batch-capture |
| REQ-02 Extraction worker | N/A backend | (not user-facing) |
| REQ-03 V4 taxonomy | ✅ via tokens | transaction-editor, items |
| REQ-04 Dual progress | ✅ | single-scan-states |
| REQ-05 Ledger API | ✅ | dashboard, history, items |
| REQ-06 Monthly analytics | ✅ | dashboard, trends, reports |
| REQ-07 Statement upload | ✅ | statement-upload, statement-review |
| REQ-08 Reconciliation | ❌ | MISSING reconciliation-review |
| REQ-09 Card alias CRUD | ⚠ verify | settings-datos (inside settings.html) |
| REQ-10 Concentration | ✅ | insights, trends |
| REQ-11 Urgency flag | ✅ | insights |
| REQ-12 Math gate | ✅ | transaction-editor (hard-lock) |
| REQ-13 User-edit precedence | ✅ | transaction-editor |
| REQ-14 Sign-out isolation | ⚠ verify | settings-cuenta |
| REQ-15 Ownership / groups | 🔴 | 11 of 16 group screens missing |
| REQ-16 Managed-auth | 🔴 | 4 auth screens missing |
| REQ-17 Integer minor units | N/A backend | — |
| REQ-18 FX + USD shadow | ✅ | dashboard, history |
| REQ-19 Locale registry | ⚠ verify | settings-preferencias |
| REQ-20 Consent (4-jurisdiction) | 🔴 | 4 variants need state-tabs retrofit + 4 mobile variants missing |
| REQ-21 Observability | N/A backend | — |
| REQ-22 i18n | ⚠ verify | settings-preferencias |
| REQ-23 Responsive web | 🔴 | 14 of 29 desktop variants shipped |
| REQ-24 Mobile cross-platform | 🟡 | 29 mobile screens, 0 platform-divergence notes |
| REQ-25 Push notifications | 🟡 | notification-sheet + prompt missing |
| REQ-26 QR/CAF | ⚠ verify | inside single-scan-idle (unverified) |
| REQ-27 Cohort benchmarking | 🔴 | Onboarding opt-in + trends chart missing |

---

## 7. Handoff index

<!-- Populated at M13 (P13 Handoff + index hub + audit). -->

- **HANDOFF.json** — machine-readable design contract (pending P13 — schema: `~/.claude/templates/gabe/mockup/HANDOFF.schema.json`)
- **HANDOFF.md** — narrative engineer handoff (pending P13)
- **SCREEN-SPECS.md** — per-screen breakdown (pending P13)
- **COMPONENT-LIBRARY.md** — molecules inventory + state matrix + platform variance (pending P3 exit)
- **AUDIT.md** — retrospective audit (LIVE — to be folded into §6 Coverage gaps above during M13)
- **WCAG AA pass table** — contrast ratios per token pairing (pending P13 a11y gate)
- **STRESS-TEST-SPEC.md** — canonical P1 stress matrix (LIVE)
- **DESKTOP-TEMPLATE.md** — desktop shell conventions (LIVE)
- **PLATFORM-NOTES.md** — platform-variance notes (LIVE — expand per-screen in P13)
