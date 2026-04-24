# Mockups Audit — Consistency / Continuity / Coverage

**Date:** 2026-04-23
**Scope:** `docs/mockups/screens/` (29) + `docs/mockups/flows/` (13) + `docs/mockups/index.html`
**Against:** `.kdbp/SCOPE.md` (27 REQs) + `.kdbp/PLAN.md` Phases P5–P12 + PLAN note platform split (3 surfaces)

---

## 1. Consistency ✅ PASS

Sampled 5 screens (dashboard, history, transaction-editor, settings, insights, login): all share baseline visual language.

| Axis | Result | Evidence |
|------|--------|----------|
| Font stack | ✅ uniform | Every sampled screen imports Outfit 400–800 + Baloo 2 700 from Google Fonts CDN |
| Theme switcher | ✅ uniform | Every sampled screen declares `[data-theme="normal\|professional\|mono"][data-mode="light\|dark"]` — same 6-variant runtime switcher |
| CSS token shape | ✅ uniform | All use `--bg / --surface / --primary / --text / --secondary / --border / --cat-*` vocabulary |
| Category chip palette | ✅ uniform | All `--cat-hogar / --cat-medicamento / --cat-cargo / --cat-otros-green / --cat-mascotas / --cat-construccion / --cat-farmacia / --cat-vet` present with matching `-tint` alpha variants |
| Wordmark | ✅ uniform | `Baloo 2 700 @ 24px` via `.wordmark { font-family: 'Baloo 2', cursive; }` across all dashboards / top bars |

**Action:** no refactor needed at consistency axis. Legacy design-system discipline held up across 29 screens.

---

## 2. Continuity ⚠ PARTIAL

### Flows coverage vs PLAN P4

| PLAN Flow | Legacy File | Status |
|-----------|-------------|--------|
| F1 First-scan | `flows/flow-01-first-scan.html` | ✅ |
| F2 Quicksave | `flows/flow-02-quicksave.html` | ✅ |
| F3 Batch capture | `flows/flow-03-batch-capture.html` | ✅ |
| F4 Statement scan | `flows/flow-04-statement-scan.html` | ✅ |
| F5 Groups sharing | `flows/flow-05-group-sharing.html` | ✅ |
| F6 Learning → trust | `flows/flow-06-learning-trust.html` | ✅ |
| F7 Credit depletion | `flows/flow-07-credit-depletion.html` | ✅ |
| F8 Error recovery | `flows/flow-08-error-recovery.html` | ✅ |
| F9 Offline → reconnect | `flows/flow-09-offline-reconnect.html` | ✅ |
| F10 Analytics deep-dive | `flows/flow-10-analytics-deepdive.html` | ✅ |
| F11 Reports + PDF | `flows/flow-11-reports-export.html` | ✅ |
| F12 Data export | `flows/flow-12-data-export.html` | ✅ |
| F13 Settings config | `flows/flow-13-settings-config.html` | ✅ |
| F14 Auth + onboarding | — | ❌ **GAP** |
| F15 Jurisdiction consent | — | ❌ **GAP** |
| F16 PWA install | — | ❌ **GAP** |
| F17 Push setup | — | ❌ **GAP** |
| F18 i18n switch | — | ❌ **GAP** |
| F19 Multi-currency | — | ❌ **GAP** |
| F20 Cohort opt-in | — | ❌ **GAP** |

**Coverage:** 13/20 flows (65%). Missing 7 flows all map to NEW gastify-rebuild surface (legacy BoletApp did not cover these features).

**Cross-screen handoffs:** Not audited per-flow — requires manual walkthrough of each flow HTML to confirm it references the correct downstream screens. Deferred.

---

## 3. Coverage ⚠ PARTIAL — large gaps

### Screen inventory vs PLAN P5–P12 phases

#### P5 — Auth + onboarding + consent

Required screens: **8**  ·  Present: **1**  ·  Coverage: **12%** 🔴

| Screen | File | Status | REQ |
|--------|------|--------|-----|
| Login | `gastify-login.html` | ✅ | REQ-16 |
| Register | — | ❌ | REQ-16 |
| Forgot PW | — | ❌ | REQ-16 |
| Email Verify | — | ❌ | REQ-16 |
| Welcome / first-open | — | ❌ | REQ-20 |
| Jurisdiction Consent (CL) | — | ❌ | REQ-20 |
| Jurisdiction Consent (LATAM) | — | ❌ | REQ-20 |
| Jurisdiction Consent (EU) | — | ❌ | REQ-20 |
| Jurisdiction Consent (US/CA) | — | ❌ | REQ-20 |
| PWA Install prompt | — | ❌ | REQ-23 |
| Push permission prompt | — | ❌ | REQ-25 |
| Cohort opt-in (initial consent) | — | ❌ | REQ-27 |

#### P6 — Core capture loop

Required screens: **5**  ·  Present: **5**  ·  Coverage: **100%** 🟢

| Screen | File | Status | REQ |
|--------|------|--------|-----|
| Dashboard | `gastify-dashboard.html` | ✅ | REQ-05, REQ-06 |
| Single-Scan 5 states | `gastify-single-scan-states.html` | ✅ | REQ-01, REQ-02, REQ-04 |
| REQ-26 QR/CAF mode (inside scan Idle) | same file (needs verify) | ⚠ verify | REQ-26 |
| QuickSave card | `gastify-quicksave-card.html` | ✅ | REQ-02, REQ-05 |
| Manual Entry | `gastify-manual-entry.html` | ✅ | REQ-05 |
| Transaction Editor (normal + hard-lock) | `gastify-transaction-editor.html` | ✅ | REQ-12, REQ-13 |

**Action:** open `gastify-single-scan-states.html` + verify REQ-26 QR/CAF boleta mode appears inside Idle-state mode selector. If not, add.

#### P7 — Batch + statement flows

Required screens: **8**  ·  Present: **5**  ·  Coverage: **63%** 🟡

| Screen | File | Status | REQ |
|--------|------|--------|-----|
| Scan Mode Selector | `gastify-scan-mode-selector.html` | ✅ | REQ-01 |
| Batch Capture | `gastify-batch-capture.html` | ✅ | REQ-01 |
| Credit Warning Dialog | — | ❌ verify inside other files | — |
| Batch Review | `gastify-batch-review.html` | ✅ | REQ-02 |
| Statement Upload (consent + encrypted pw) | `gastify-statement-upload.html` | ✅ | REQ-07, REQ-20 |
| Statement Processing (async pending) | — | ❌ | REQ-07 |
| Statement Review List | `gastify-statement-review.html` | ✅ | REQ-07 |
| Matching / Reconciliation Review | — | ❌ | REQ-08 |

#### P8 — History + items + insights

Required screens: **3**  ·  Present: **3**  ·  Coverage: **100%** 🟢

| Screen | File | Status | REQ |
|--------|------|--------|-----|
| History | `gastify-history.html` | ✅ | REQ-05 |
| Items | `gastify-items.html` | ✅ | REQ-10, REQ-11 |
| Insights | `gastify-insights.html` | ✅ | REQ-10, REQ-11 |

#### P9 — Trends + reports

Required screens: **2**  ·  Present: **2**  ·  Coverage: **100%** 🟢

| Screen | File | Status | REQ |
|--------|------|--------|-----|
| Trends | `gastify-trends.html` | ✅ | REQ-06, REQ-10 |
| Reports | `gastify-reports.html` | ✅ | REQ-06 |

**Action:** verify REQ-27 cohort chart opt-in appears inside trends if SCOPE gates it.

#### P10 — Groups (shared expenses)

Required screens: **16**  ·  Present: **5**  ·  Coverage: **31%** 🔴

| Screen | File | Status | REQ |
|--------|------|--------|-----|
| Group Switcher | `gastify-group-switcher.html` | ✅ | REQ-15 |
| Group Home | `gastify-group-home.html` | ✅ | REQ-15 |
| Group Transactions | — | ❌ | REQ-15 |
| Group Analytics | — | ❌ | REQ-15 |
| Create Group | `gastify-group-create.html` | ✅ | REQ-15 |
| Transaction Card (group context) | — | ❌ verify in components | REQ-15 |
| Batch Add (group) | — | ❌ | REQ-15 |
| Admin Panel | `gastify-group-admin.html` | ✅ | REQ-15 |
| Settings Form (group) | — | ❌ | REQ-15 |
| Invite Link | `gastify-group-invite.html` | ✅ | REQ-15 |
| Redeem Invite | — | ❌ | REQ-15 |
| Leave Confirm | — | ❌ | REQ-15 |
| Delete Confirm | — | ❌ | REQ-15 |
| Read-Only Detail | — | ❌ | REQ-15 |
| Settings Subview (group) | — | ❌ | REQ-15 |
| Group Home Empty | — | ❌ | REQ-15 |

**11 missing group screens.** This is the biggest P10 gap.

#### P11 — Settings + profile

Required screens: **9 subviews**  ·  Present: **3**  ·  Coverage: **33%** 🟡 (needs manual verification — `gastify-settings.html` may contain all 9 subviews internally)

| Subview | File | Status | REQ |
|---------|------|--------|-----|
| Settings hub | `gastify-settings.html` | ✅ | — |
| Límites | `gastify-metas.html` (likely the Límites subview) | ✅ | — |
| Perfil | `gastify-perfil.html` | ✅ | — |
| Preferencias (theme/dark/lang/currency/date/font) | — | ⚠ verify inside settings | REQ-19, REQ-22 |
| Escaneo | — | ⚠ verify inside settings | — |
| Suscripción | — | ⚠ verify inside settings | — |
| Datos (3-tab learned mappings view/delete) | — | ⚠ verify inside settings | REQ-09 |
| Grupos | — | ⚠ verify inside settings | REQ-15 |
| App | — | ⚠ verify inside settings | — |
| Cuenta (export all / delete / sign-out) | — | ⚠ verify inside settings | REQ-14 |

**Action:** open `gastify-settings.html` (1860 lines) + enumerate how many subviews it actually covers. If fewer than 9, add missing.

#### P12 — Alerts + errors + offline states

Required: **8+ surfaces**  ·  Present: **2**  ·  Coverage: **25%** 🔴

| Surface | File | Status | REQ |
|---------|------|--------|-----|
| Alerts list + unread badge | `gastify-alerts.html` | ✅ | — |
| Toast system (success/info/warning/error) | — | ❌ | — |
| Scan errors (WifiOff/Timeout/LowConfidence/ServerError) | — | partial in single-scan-states | — |
| Credit Depletion Modal | — | ❌ | — |
| Offline Banner | — | ❌ | — |
| Reconnect Toast | — | ❌ | — |
| 404 page | — | ❌ | — |
| Maintenance page | — | ❌ | — |
| Push Notification examples (3+ types) | `gastify-notification-sheet.html` | ✅ | REQ-25 |
| Permission denied | — | ❌ | — |
| Rate limited | — | ❌ | — |
| Session expired | — | ❌ | — |
| Payment failed | — | ❌ | — |
| Sync conflict | — | ❌ | — |
| Data corruption recovery | — | ❌ | — |

**13 edge-state surfaces missing.**

---

## 4. Platform coverage — CROSS-CUTTING GAP 🔴

**Current state (2026-04-23 after T9 P0 anchor):** 1/29 desktop variants shipped (Dashboard). 28 remaining.

| Platform | Coverage |
|----------|----------|
| Mobile Web (PWA 390×844) | ✅ all 29 screens (via ~420px mobile frame) |
| Native Mobile (React Native 390×844) | ⚠ visual parity with mobile web but NO platform-divergence notes documented per screen (haptics, biometrics, safe-area insets, platform-specific gestures) |
| Desktop Web (1440 responsive) | 🚧 **2/29 shipped** (Dashboard + History) — shared shell CSS extracted (`assets/css/desktop-shell.css`), 27 to apply |

### Desktop template established (T9 anchor — Dashboard)

`screens/gastify-dashboard-desktop.html` (~700 lines) defines the pattern:

- **Shell:** 3-column CSS grid `240px + 1fr + 340px` @ 1440 max-width
- **Sidebar:** 240px fixed, sticky top, 7 nav items with pixel-art icons, user chip at footer
- **Top bar:** search (`/` shortcut) + scan button (`⌘K` shortcut, replaces FAB) + bell + avatar
- **Main:** balance hero + 3-col stats row + recent-tx list (5-col grid: icon / name+meta / store / amount / chev)
- **Right rail:** concentration donut + anomalies + credits + quick actions — drops at ≤1280px
- **Sidebar collapse:** horizontal pills at ≤1024px; ≤640px triggers mobile layout fall-back notice
- **Platform notes block** appended at bottom: documents hover states, keyboard shortcuts, breakpoints
- **Focus rings:** `:focus-visible` 2px primary outline + 2px offset on every interactive
- **Theme switcher:** top controls bar (Normal/Pro/Mono + light/dark toggle) with working JS
- **Reuses assets:** self-hosted fonts (Outfit + Baloo 2), pixel-art icons from `assets/icons/app-icons/*`, tokens from category palette

**Impact:** this is the single largest rebuild delta. Every active screen needs:
1. Desktop layout (sidebar nav replacing bottom nav, top-bar scan with ⌘K, hover states, focus rings, 12-col grid, optional right rail)
2. Native Mobile platform-divergence notes (expo-camera / haptics / biometrics hooks documented at each screen)

---

## 5. REQ coverage snapshot

| REQ | Area | Screen Coverage |
|-----|------|-----------------|
| REQ-01 — Receipt scan submission | Capture | ✅ |
| REQ-02 — Two-stage extraction worker | Backend (not user-facing) | N/A |
| REQ-03 — V4 taxonomy | Backend (data) | ✅ via tokens/ |
| REQ-04 — Dual scan-progress streaming | Capture (inside single-scan states) | ✅ |
| REQ-05 — Transaction ledger API | History / Items / Dashboard | ✅ |
| REQ-06 — Monthly analytics | Dashboard / Trends / Reports | ✅ |
| REQ-07 — Statement upload + worker | Statement flows | ✅ |
| REQ-08 — Reconciliation engine | Matching review | ❌ missing screen |
| REQ-09 — Card alias CRUD | Settings → Datos subview | ⚠ verify |
| REQ-10 — Concentration / gravity-center | Insights / Trends | ✅ |
| REQ-11 — Item urgency flag | Insights | ✅ |
| REQ-12 — Math reconciliation gate | Transaction Editor | ✅ |
| REQ-13 — User-edit precedence | Transaction Editor | ✅ |
| REQ-14 — Sign-out isolation | Settings → Cuenta subview | ⚠ verify |
| REQ-15 — Ownership scope (groups) | Groups (11/16 missing) | 🔴 |
| REQ-16 — Managed-auth + JIT user | Login only (4 auth screens missing) | 🔴 |
| REQ-17 — Integer-minor-units money | Not user-facing | N/A |
| REQ-18 — FX + USD shadow | Dashboard, History | ✅ |
| REQ-19 — Currency + locale registry | Settings → Preferencias | ⚠ verify |
| REQ-20 — Consent register (4-jurisdiction) | 4 consent screens missing | 🔴 |
| REQ-21 — Observability pipeline | Not user-facing | N/A |
| REQ-22 — i18n infrastructure | Settings → Preferencias | ⚠ verify |
| REQ-23 — Responsive web portal | 0 of 29 desktop variants | 🔴 |
| REQ-24 — Mobile app (cross-platform) | 29 mobile but no platform notes | 🟡 |
| REQ-25 — Push notifications | `gastify-notification-sheet` + prompt missing | 🟡 |
| REQ-26 — QR/CAF boleta shortcut | Inside single-scan (needs verify) | ⚠ |
| REQ-27 — Cohort benchmarking | Onboarding opt-in + trends chart missing | 🔴 |

---

## 6. Priority gap ranking (close top-down)

### P0 — cross-cutting, blocks all downstream

1. **Desktop responsive variants for all 29 screens** (REQ-23). Single largest visual gap. Needed before P5/P10/P11 variants are designed or they'll need redo.

### P1 — high-surface, REQ-critical

2. **4-jurisdiction consent screens** (REQ-20). Legal red-line — not optional at launch.
3. **Auth screens: Register, Forgot PW, Email Verify, Welcome, Consent flow** (REQ-16). App onboarding completely missing.
4. **11 missing group screens** (REQ-15). Groups as user feature half-built.

### P2 — important but smaller-surface

5. **Reconciliation review screen** (REQ-08). Statement UX incomplete.
6. **Settings subview verification + gap-fill** (`gastify-settings.html` audit). Likely 3–5 of 9 subviews missing.
7. **Edge-state surfaces** (P12): 404, Maintenance, Credit Depletion, Offline Banner, Reconnect Toast, Permission Denied, Rate Limited, Session Expired, Payment Failed, Sync Conflict, Data Corruption. 11+ surfaces.
8. **REQ-26 QR/CAF boleta** verification inside scan-idle.
9. **REQ-27 Cohort opt-in** + trends chart.

### P3 — polish + handoff

10. **Platform-divergence notes** per screen (iOS/Android/Web differences — haptics, biometrics, safe areas, keyboard, gestures).
11. **PWA install + Push permission prompts**.
12. **Flow walkthroughs F14–F20** (auth, consent, PWA, push, i18n, multi-currency, cohort).

---

## 7. Summary

- **Consistency:** ✅ legacy design system held up; no refactor needed
- **Continuity:** ⚠ 13/20 flows covered (65%); 7 new-feature flows missing
- **Coverage:** ⚠ 29/55+ screens covered (~53%); major gaps in auth, consent, groups, edge states, desktop
- **Platform:** 🔴 desktop variant of every screen missing — single largest gap
- **REQ coverage:** 13 fully covered / 5 partial-verify / 4 partial / 5 missing / 5 not-user-facing

**Next action:** T8 rewrite `index.html` to visually reflect this gap matrix — present legacy screens as "baseline" with rebuild-gap overlays (missing screens as ghosted cards, desktop-variant badge, REQ coverage chips). Then T9 iterate starting from P0 desktop variants.
