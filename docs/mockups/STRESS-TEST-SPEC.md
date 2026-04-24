# Phase 1 Stress-Test Spec

**Purpose:** Define the canonical surface set, platform frames, state matrix, and interaction-note template used to stress-test every candidate theme in Phase 1. If a theme works across all 4 screens × 3 platforms × 2 modes, it works for the rest of the app.

**Consumers:**
- Claude design / frontend-design skill when rendering `styles/*.prompt` outputs
- User reviewing candidates side-by-side
- P2/P3 component authors needing canonical reference surfaces

---

## Matrix — renders per candidate theme

| Screen | Desktop Web | Mobile Web | Native Mobile |
|--------|-------------|------------|---------------|
| Dashboard | `{style}-dashboard-desktop.html` | `{style}-dashboard-mobileweb.html` | `{style}-dashboard-native.html` |
| Single-Scan Idle | `{style}-scan-desktop.html` | `{style}-scan-mobileweb.html` | `{style}-scan-native.html` |
| History List | `{style}-history-desktop.html` | `{style}-history-mobileweb.html` | `{style}-history-native.html` |
| Insights | `{style}-insights-desktop.html` | `{style}-insights-mobileweb.html` | `{style}-insights-native.html` |

Per theme: **12 HTML files**. Each file contains **light + dark** sections (stacked).
6 candidate themes × 12 files = **72 renders total** for P1.

If volume is high, triage permitted per D7 (mvp-time cost tolerance):
- **Minimum viable subset (MVS)**: Dashboard × 3 platforms × 6 themes = 18 renders. Confirms token + platform discipline before full 72.
- **Full subset**: add scan + history + insights when MVS passes.

---

## Platform frame conventions

### Desktop Web — 1440×900 viewport

```
┌──────────────────────────────────────────────────────────┐
│ ☰  gastify       [search] [⌘K escanear]      [🔔] [JG]   │  60px top bar
├──────────────┬───────────────────────────────────────────┤
│ Inicio       │                                            │
│ Historial    │                                            │
│ Escanear     │           MAIN CONTENT                     │
│ Tendencias   │           (max 1200px centered)            │
│ Grupos       │                                            │
│ Ajustes      │                                            │
│              │                                            │
│ ──           │                                            │
│ JG           │                                            │
│ cerrar       │                                            │
└──────────────┴───────────────────────────────────────────┘
 240px sidebar
```

- **Container:** `max-width: 1200px; margin: 0 auto;` within main content area
- **Grid:** 12-column on desktop, gap 24px
- **Hover:** all cards `translateY(-2px)` + shadow-lg; links underline
- **Focus:** 2px primary outline + 2px offset, always visible on tab
- **Keyboard:** `⌘K` opens scan, `/` focuses search, `j/k` navigate lists
- **No FAB** — primary scan in top bar
- **Breakpoints documented:** 1440 / 1024 / 768 / 375 (last collapses to Mobile Web)

### Mobile Web — 390×844 (iPhone 14 logical), PWA

```
┌─────────────────┐
│ status bar      │  40px (browser chrome or home-screen)
├─────────────────┤
│ gastify    [JG] │  60px top bar
├─────────────────┤
│                 │
│   MAIN          │  scrollable, ~620px visible
│                 │
│                 │
├─────────────────┤
│   [FAB]         │  floating 88px from bottom
├─────────────────┤
│ 🏠 📜 📷 📊 ⚙   │  72px bottom nav + safe-area-inset-bottom
└─────────────────┘
```

- **Container:** `max-width: 420px; margin: 0 auto;`
- **Touch targets:** ≥44×44 (nav items 56)
- **Camera:** `<input type="file" accept="image/*" capture="environment">` only — no custom viewfinder in Mobile Web
- **Permissions:** deferred to browser (camera prompt, notification prompt, install prompt)
- **Haptics:** none (document fallback — visual flash on scan success)
- **Biometrics:** none (password + OAuth only)
- **Push:** Web Push API with iOS ≥16.4 caveat documented
- **Install:** `beforeinstallprompt` on Android/desktop; iOS manual "Share → Add to Home Screen" sheet
- **Safe area:** `padding-bottom: env(safe-area-inset-bottom)` on bottom nav

### Native Mobile — 390×844 (React Native + Expo), iOS + Android shared

Same visual shape as Mobile Web, with platform-native primitives:

- **Camera:** `expo-camera` — custom viewfinder, auto-edge-detect overlay, scan-success flash
- **Haptics:** `expo-haptics` — `ImpactFeedbackStyle.Medium` on scan success, `Light` on tab change
- **Biometrics:** `expo-local-authentication` — Face ID / Touch ID / fingerprint unlock
- **Push:** `expo-notifications` — native alerts with custom action buttons
- **Media:** `expo-media-library` — save receipt copies to camera roll
- **Background:** `expo-task-manager` — background sync on app resume
- **Gestures:**
  - iOS: swipe-back from left edge (default)
  - Android: system back button + optional gesture nav
  - Both: swipe-to-dismiss modals, long-press tx for quick actions (edit / delete / split)
- **Safe areas:** `SafeAreaView` from `react-native-safe-area-context`
- **Divergence notes** required per screen:
  - iOS: softer shadows, SF-like line-heights
  - Android: Material elevation, slightly tighter spacing, ripple on tap feedback

---

## Canonical screens (hero state + variants)

### 1. Dashboard

**Hero:** active user, mid-month, balance present, 5 recent tx, 2 anomalies detected, 1 unread notification.

**Structure:**
- Top bar: wordmark (left) · search icon · notification bell (badge "1") · avatar (right)
- Balance card: `Saldo del mes` · `$847.230` · USD shadow `USD 892.40 · tasa 949.12`
- Stats row (2 cards):
  - Concentración · `34%` · `▲ 4.2 pp` · "Supermercado domina"
  - Anomalías · `2` · `▼ revisar`
- Section: "Últimos escaneados" (5 tx rows, "Ver todos →" link)
- FAB (mobile) or top-bar button (desktop): `📷 Escanear`
- Bottom nav (mobile): 🏠 Inicio · 📜 Historial · 📷 Escanear · 📊 Tendencias · ⚙ Ajustes

**Variant states (labeled sections after hero):**
- `empty` — new user: balance card shows "Aún sin movimientos", stats hidden, tx list empty with "Escanea tu primer recibo →" CTA
- `loading` — skeleton shimmers on balance card, stats, tx rows
- `flagged` — anomaly row highlighted with red-tinted background + `!` badge

**Data payload (use for renders):**
```
Balance: $847.230 CLP (USD 892.40 @ 949.12)
Stats: Concentración 34% (↑4.2pp) · Anomalías 2
Recent tx:
  - Jumbo Las Condes · Supermercado · Hoy · −$42.180
  - Copec Apoquindo · Combustible · Ayer · −$28.500
  - Cafetería Providencia · Café · Lun 21 abr · −$4.200
  - Farmacia Cruz Verde · Salud · 20 abr · −$89.420 [FLAGGED inusual]
  - Cinemark Costanera · Entretención · 19 abr · −$12.000
```

### 2. Single-Scan Idle

**Hero:** camera viewfinder ready, Recibo mode active, 47/50 credits remaining.

**Structure:**
- Top bar: ← back · "Escanear" title · ⋯ menu
- Mode tabs (3): [📄 Recibo] [📸 Lote] [📑 Estado] — Recibo selected, underline indicator
- Viewfinder (large): dark camera area, 4 corner brackets, centered hint "Apunta al recibo"
- Bottom overlay:
  - Credits row: `Créditos: 47 / 50` · progress bar
  - Scan button (full-width primary)
- Mobile: bottom nav hidden during camera
- Desktop: viewfinder replaced with file-drop zone for upload; camera fallback via webcam API

**Variant states:**
- `credit-warning` — credit bar orange, "3 créditos restantes" toast above scan button
- `batch-mode` — gallery thumbnails below viewfinder showing X/50 captures
- `statement-mode` — file upload zone instead of viewfinder, consent notice below
- `no-permission` (web + native) — viewfinder replaced with "Permitir acceso a cámara" CTA

### 3. History List

**Hero:** 20+ tx rows, mixed categories, filter "Este mes" active, selection mode off.

**Structure:**
- Top bar: ← · "Historial" title · 🔍 search · ⋮ filter
- Filter chips row (horizontal scroll on mobile): [📅 Este mes] [🏷️ Todas] [💰 Cualquier monto] [🏪 Cualquier comercio] [🔎]
- Date-group header: "HOY"
- Tx rows (group)
- Date-group header: "AYER"
- Tx rows (group)
- Date-group header: "ESTA SEMANA"
- Tx rows (group)
- Desktop: sidebar includes sticky summary ($847.230 / 23 movimientos) and bulk-action buttons

**Variant states:**
- `empty` — "Sin movimientos este mes" + CTA `Escanear recibo`
- `selection-mode` — checkboxes visible on each row, top bar shows "3 seleccionados" + actions bar (editar, categorizar, eliminar)
- `search-active` — input replaces title, showing "MASSA" matching 3 results highlighted
- `filtered` — pill stack shows 2 active filters with × to clear each

### 4. Insights

**Hero:** Lista tab active, carousel with 4 insight cards, anomaly highlight at top.

**Structure:**
- Top bar: "Insights" title · notification indicator · ⋮
- Tab switcher (3): [Lista] [Airlock] [Logro] — Lista active
- Anomaly highlight card: "⚠ Gasto inusual detectado — Farmacia Cruz Verde −$89.420 (20 abr)"
- Carousel (horizontal, swipeable on mobile / scroll on desktop):
  - Card 1: "Concentración — Supermercado 34%"
  - Card 2: "Gasto mensual ↑ 12% vs marzo"
  - Card 3: "Nueva categoría — Combustible aparece"
  - Card 4: "Racha de ahorro en Café (−$8.400 vs mes anterior)"
- Selection mode toggle (long-press card)

**Variant states:**
- `Airlock-tab` — deferred-review card list ("8 transacciones pendientes de categorizar")
- `Logro-tab` — achievement/milestone cards ("Primer mes completo escaneado 🏆")
- `selection-mode` — cards tappable, bulk-dismiss or bulk-snooze action bar

---

## Interaction notes template

Every rendered HTML must end with this block, filled in:

```html
<!-- INTERACTION NOTES
Screen: [Dashboard | Scan Idle | History | Insights]
Platform: [Desktop Web | Mobile Web | Native Mobile]
Style: [normal | professional | mono | organic | playful-geometric | sketch]
Mode: light + dark

Gestures:
- [element]: [gesture] → [result]
- e.g. Mobile: long-press tx row → quick-action sheet (edit/delete/split)
- e.g. Desktop: hover tx row → shows ⋮ button on right

Transitions:
- Enter: [animation, duration, easing]
- e.g. Slide-up from bottom 320ms cubic-bezier(.2,.8,.2,1)
- Exit: [...]
- Tab change: instant cut (no animation per legacy boletapp convention)

Keyboard (desktop only):
- ⌘K: open scan
- /: focus search
- j/k: next/prev row
- Enter on row: open detail
- Esc: clear search / exit selection mode

States handled:
- Loading: [describe skeleton pattern]
- Error: [inline / toast / full-screen]
- Empty: [message + CTA]
- Offline: [banner at top]

Edge cases:
- Long name: truncate with ellipsis, show full on hover (desktop) / tap (mobile)
- Many chips: horizontal scroll row on mobile
- Long amount: `tabular-nums` + right-align, never wraps

Platform-specific:
- [iOS] [Android] [Web] divergences
- e.g. iOS: Haptics.Medium on scan success
- e.g. Android: ripple overlay on tap feedback
- e.g. Web: focus ring on keyboard nav only (`:focus-visible`)

A11y:
- Contrast ratio text/bg: [ratio] (AA pass / AAA pass)
- Touch targets: [sizes]
- ARIA labels: [list icon-only buttons with their labels]
- Reduced motion: [what degrades gracefully]
-->
```

---

## Review checklist (per render)

Before a render is considered a valid stress-test output:

- [ ] All required tokens present (see `styles/_PROMPT-TEMPLATE.md` token list)
- [ ] Light + dark modes both rendered, not just inverted
- [ ] Platform frame correct for target (desktop sidebar vs mobile bottom nav)
- [ ] Touch targets ≥44×44 on mobile surfaces
- [ ] Focus rings visible on all interactive (desktop)
- [ ] Category chip colors from theme palette, not arbitrary
- [ ] Numeric display uses `tabular-nums` for amounts
- [ ] Spanish-CL copy throughout (`Saldo del mes`, `Últimos escaneados`, `Escanear`)
- [ ] Peso format `$42.180` (dot thousands, no decimal for CLP integers)
- [ ] USD shadow shown where balance appears
- [ ] Dashboard: balance + 2 stats + 5 tx present
- [ ] Scan: viewfinder or upload zone correct per platform
- [ ] History: ≥20 tx, ≥3 date groups, 5 filter chips
- [ ] Insights: 3 tabs, 4 carousel cards, anomaly highlight
- [ ] INTERACTION NOTES block filled, non-empty
- [ ] Matches legacy gastify-dashboard.html token shape

---

## Assets

Every render should reference self-hosted assets at:

```html
<link rel="stylesheet" href="../../assets/fonts/gastify-fonts.css">
<!-- Exposes 'Outfit' (variable 400–800) + 'Baloo 2' (700) via local woff2 -->

<img src="../../assets/icons/app-icons/navigation/nav-home.png" width="32" height="32" alt="Inicio">
<!-- 200+ pixel-art icons organized by role: navigation, actions, scan-features, analytics, status, credits, financial, item-categories, store-categories, rubros, familias + 53 root mascots -->
```

See `docs/mockups/assets/README.md` for full asset inventory. Icon path is relative from `explorations/output/*.html` → `../../assets/`.

Claude Design workflow: drag the entire `assets/` folder during design-system setup (fonts + icons upload field). Claude Design stores these and references them during render passes.

## Render workflow

Expected external-tool workflow (user-driven in T5):

1. Open each `styles/{style}.prompt`.
2. Point Claude design / frontend-design skill at the prompt + this spec (as context).
3. Request render: "Produce `{style}-dashboard-desktop.html` per spec."
4. Save output to `docs/mockups/explorations/output/`.
5. Repeat 4 screens × 3 platforms × 6 styles.
6. Spot-check against review checklist.
7. When ready, invoke `/gabe-next` to enter T6 (user pick).

---

## Timing expectations

- MVS (18 renders, dashboard only): ~45 min external render pass
- Full (72 renders): ~3 hours external render pass
- Review + pick: 1 hour human time
- T7 lock tokens: ~30 min agent time

Total P1 to-completion after this spec: ~5 hours wall, mostly external render pass.
