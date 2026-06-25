# Navigation + Header Chrome — Build Spec (Phase 7 / DM-5)

> Legacy-study lane A (nav + header chrome) reconciled against DM-5 (resolved IA).
> Authoritative legacy source: BoletApp "Gastify" shell —
> `boletapp/src/components/{App/AppLayout,Nav,TopHeader,ProfileDropdown}.tsx`,
> `features/scan/components/ScanModeSelector.tsx`, `app/types.ts`,
> `shared/stores/useNavigationStore.ts`.
> Replaces the generic, never-legacy-studied
> `design-lab/src/design-system/organisms/AppShell.tsx` scaffolding.
> Playful-Geometric re-skin. Platform-aware (DM-6 spike-first; this is the FIRST
> screen-chrome spike). **The key decision is the IA reconciliation in §1 — legacy
> ships 4 tabs + a center-FAB scan; DM-5 keeps 4 tabs but RELOCATES the scan FAB.**

---

## 1. THE IA — legacy vs DM-5 reconciliation (the load-bearing decision)

**Verdict: legacy and DM-5 AGREE on the tab COUNT (4) and DISAGREE only on scan-FAB PLACEMENT + two tab LABELS.** This is the cleanest possible reconciliation — no tab is added or dropped, the scan stays a FAB (not a tab), and the only real spike question is *where the FAB sits*.

### Count match
- **Legacy bottom nav = exactly 4 icon tabs + 1 center scan FAB** (`Nav.tsx:441–589`). The comment at `Nav.tsx:567` is explicit: *"Per mockup, 5th nav item is Alerts not Settings"* — Settings is NOT a tab. So legacy is **4 tabs**, not 5, and scan is already a FAB, not a tab.
- **DM-5 = 4 tabs (Inicio·Compras·Gastos·Perfil) + scan FAB.** Identical shape.
- ⇒ **No conflict on count.** The dropped 11-entry `currentNavCatalog` (DM-2) was never legacy-real; the 5-tab `redesignedNavCatalog` (with inline `escanear` tab) is the thing DM-5 corrects — minus Escanear it IS the 4 tabs.

### Label / destination mapping (legacy tab → DM-5 tab)

| DM-5 tab | Legacy tab | Legacy `view` | Pixel icon (role-keyed) | Screen |
|---|---|---|---|---|
| **Inicio** | Home (`t('home')`, `Home`) | `dashboard` | `nav-home` | Dashboard (launch view) |
| **Compras** | — (legacy puts this in ProfileDropdown as "Compras"/`history`) | `history` | `nav-history` (candidates `fin-receipt`/`scan-receipt`) | Purchases/receipts list ("Compras") |
| **Gastos** | Analytics (`t('analytics')`, `BarChart3`) | `trends` | `chart-pie` (candidates `nav-insights`/`nav-trends`/`nav-reports`) | Spending/analytics ("Explora"→"Gastos") |
| **Perfil** | — (legacy = top-right avatar → ProfileDropdown) | n/a (overflow) | `nav-profile` | Profile + secondary IA |

**Two genuine IA shifts from legacy** (both already baked into DM-5, flagged here for the spike):
1. **Compras is PROMOTED to a tab.** Legacy reaches `history` only via the ProfileDropdown; DM-5 makes it tab #2. Legacy's analytics tab (`trends`) becomes **Gastos** (tab #3).
2. **Perfil is PROMOTED to a tab.** Legacy has NO profile tab — the avatar+dropdown lives in every header. DM-5 makes Perfil tab #4, which **absorbs the ProfileDropdown's secondary IA** (Compras already a tab; Productos/Reportes/Metas/Configuración become Perfil-screen rows or a Perfil sub-nav). Legacy's `insights`/`alerts` tabs are **demoted** out of the bottom bar (they become content/sub-screens under Gastos or Perfil).

⇒ **Spike question for the user (§7 board):** Perfil-as-tab vs legacy avatar-dropdown-in-header. DM-5 says Perfil tab; legacy says avatar everywhere. Recommend honoring DM-5 (Perfil tab) but keeping a **profile avatar in the AppHeader trailing slot** as the one-tap path to settings/account — so we get *both* (tab for browse, avatar for quick menu), matching legacy's "secondary IA one tap from anywhere."

### Where scan lives — the ONE substantive disagreement
- **Legacy: center FAB inside the bottom nav bar** (elevated −36px, `Nav.tsx:463–552`), tap=single-scan, long-press=mode popup.
- **DM-5: FAB moves OUT of the bar into the content section** — *desktop: next to the screen title; mobile/tablet: bottom-right corner* (Gustify "add ingredient" mirror).
- ⇒ **This is spike axis A (§7).** Both are 4-tab; only FAB placement differs. The bar's column math is unaffected (4 columns either way; legacy's center notch is removed when the FAB exits the bar).

### Final IA (what we build)
- **Bottom bar (mobile/tablet) / SideNav (desktop): 4 destinations** — Inicio·Compras·Gastos·Perfil, fixed order, never hidden.
- **Scan: a `ScanFab` organism, NOT a tab** — placement per DM-5 (spike A decides center-in-bar vs corner-floating vs desktop-title-adjacent).
- **Header (every screen): AppHeader** — wordmark/title + a profile avatar trailing (one-tap to the Perfil/settings menu), per-screen actions (search/filter/period) in between.
- **Reached via header/overflow, not a tab:** Productos, Reportes, Configuración, Metas(disabled), Grupos — all under Perfil tab and/or the avatar menu.
- **Reached programmatically (no nav entry):** scan result/batch/statement editors, recent-scans — entered by the scan/edit flow (legacy parity).

---

## 2. BOTTOM NAV / TAB BAR organism (`BottomNav`)

Refine the existing `AppShell.BottomNav` (don't rebuild) — but **hard-fix the column count to 4** and **strip the `isScan` center-pill special-case** (DM-5 kills the inline scan tab; FAB is now its own organism, §4).

Bar shell (legacy `Nav.tsx:424–437` re-skinned): `fixed bottom-0 inset-x-0 z-50 flex items-stretch`, `border-t-2 border-gt-line-strong bg-gt-surface`, `pt-gt-4 px-gt-8`, `pb-[calc(8px+env(safe-area-inset-bottom,0px))]`, `role="navigation" aria-label="Navegación principal"`. Height ~`h-16` content + safe-area. **No bottom border on the header** (legacy blends header into content); the BAR gets the only ink top-border.

4 tabs, `grid grid-cols-4` (FIXED — not `repeat(items.length)`; with the FAB gone the bar is a clean 4-up). Each tab:
- **Icon = PixelIcon** (`size={24}`), role-keyed name per §1 table. **Destinations do NOT use IconButton** (per IconButton's own header note) — a tab is a bare `<button>`/`<a>`.
- **No text labels** (legacy parity, icons only); `aria-label` = Spanish tab label.
- **Active** = `text-gt-primary` + soft halo (`bg-gt-primary-soft` rounded pill behind the icon, `rounded-gt-pill`), `aria-current="page"`. **Inactive** = `text-gt-ink-2`/`gt-ink-3` (legacy `--text-tertiary`).
- Alerts/notification count → **`Badge tone="negative"`** dot (legacy red badge `alertsBadgeCount`) anchored top-right of the relevant icon (if alerts surfaces here; default it lives under Gastos/Perfil).
- Haptic `navigator.vibrate(10)` on tap (legacy `Nav.tsx:225`). Tap = `onSelect(key)`.

Motion: active-halo cross-fade only (no bar slide). Respect `prefers-reduced-motion`.

`BottomNavProps`: `{ items: NavItem[4]; active: string; onSelect(key); alertsCount?; className? }`.

---

## 3. TOP HEADER BAR organism(s) (`AppHeader`)

Legacy runs **two** header systems (global `TopHeader` for dashboard/settings + per-screen sticky headers for everything else, `TopHeader.tsx` + `app/types.ts:90–104`). **Recommendation: ONE flexible `AppHeader` with slots + a `variant` prop — NOT N bespoke headers.** Legacy's per-screen headers already share a consistent skeleton (72px, `var(--bg)`, left back/logo · center/left title · right actions+avatar); we collapse that into one organism with a small variant enum. This is the AppShell.AppHeader refined (it currently only has `leading`/`trailing` — add `variant` + `title` + a center/actions slot).

Header shell: `<header>` `h-14`–`h-[72px]`, `bg-gt-surface`, `px-gt-16`, **no bottom border** (legacy blends; sticky scroll adds a `shadow-gt-sm` drop only when content scrolls under it — the legacy collapse behavior, §3.1). 3-zone layout: `leading | center | trailing`.

**Variants** (legacy `HeaderVariant` + the per-screen pattern, unified):

| Variant | Leading | Center / Title | Trailing | Legacy origin |
|---|---|---|---|---|
| **`home`** | AppLogo "g" tile (or none) | **Wordmark** `gastify` (`font-gt-display text-gt-2xl text-gt-primary`, legacy 28px Baloo→Outfit) | **ProfileAvatar** → Perfil menu | `TopHeader` home (Dashboard) |
| **`browse`** | (none, or back if drilled) | `<h1>` title (`text-gt-xl font-extrabold text-gt-ink`) — Compras/Productos/Gastos | **IconButton search** + **IconButton filter** + ProfileAvatar | History/Items/Trends headers |
| **`detail`** | **back** IconButton (`ChevronLeft`) | `<h1>` title (20px) | per-screen action(s) + ProfileAvatar | legacy `detail` + scan editors |
| **`settings`** | **back** IconButton | "Configuración" + optional `› Subview` breadcrumb + `v{version}` subtitle | ProfileAvatar | `TopHeader` settings |
| **`period`** | (none/back) | title + **period stepper** (`‹ Mes ›`, swipeable) | filter + ProfileAvatar | Reports year-selector / Trends period |

- **Search / filter** = **IconButton** (utility actions, `size="md"`), icon = PixelIcon `action-search` / `action-filter`. Legacy `IconFilterBar`.
- **Back** = **IconButton** (`size="md"`, utility), stroke `ChevronLeftIcon` — **MISSING, must be added** (§6). Legacy `ChevronLeft size={28} strokeWidth={2.5}`.
- **ProfileAvatar** (refine AppShell.ProfileButton) — `h-8 w-8 rounded-gt-pill bg-gt-primary-soft text-gt-primary`, user initials (legacy 40×40 initials on `--primary`); tap = open Perfil menu / NavDrawer. Present in EVERY variant's trailing (legacy parity: avatar one-tap from anywhere).
- Wordmark + ProfileButton + AppHeader all already exist in AppShell — keep, re-skin to the variant API.

### 3.1 Collapse-on-scroll (legacy `useCollapsibleHeader`)
History/Items/Trends collapse a secondary band (search/breadcrumb/sort/export) on scroll → `maxHeight:0` + drop shadow. Model as an **optional `collapsibleBand` slot** under the header row (defer the live collapse to a screen-level hook; v1 = static band, or omit). Dashboard's month navigator is **in-content**, NOT the header (legacy `DashboardCarouselHeader`) — do not put it in AppHeader.

`AppHeaderProps`: `{ variant; title?; subtitle?; leading?; trailing?; actions?; collapsibleBand?; onBack?; className? }`.

---

## 4. THE SCAN FAB organism (`ScanFab`) — DM-5 relocation

Net-new organism that **wraps `IconButton` size `"fab"`** (IconButton's own header says it provides the scan FAB; bottom-nav destinations do NOT use IconButton — ScanFab does). Icon = PixelIcon `nav-scan` (states: `scan-single`/`scan-batch`/`scan-statement`; `scan-error` flagged plus-vs-X, regen pending).

**Placement (DM-5, platform-aware — spike A decides among legacy/DM-5):**
- **mobile/tablet** → `fixed bottom-right` floating, clear of the bottom bar (`bottom-[calc(72px+env(safe-area-inset-bottom))] right-gt-16`), `z-40`. (DM-5 corner.)
- **desktop** → **next to the screen title** in the content header (not the SideNav), inline `ScanFab` in the page title row. (DM-5 title-adjacent.)
- **legacy alt (spike A·A)** → center-in-bar, elevated −36px (legacy `Nav.tsx:463`). Kept as the comparison option only.

Re-skin: round `rounded-gt-pill`, `border-2 border-gt-line-strong`, hard offset `shadow-gt-md`, bounce hover (the IconButton recipe) — **replaces** legacy's blurred `boxShadow:'0 4px 12px rgba(0,0,0,0.15)'` + per-mode gradient with the flat-geometric ink-border + `bg-gt-primary`. Per-mode color = a **tint swap** (emerald/amber/violet → token tints), NOT a gradient (LAYOUT-CONVENTIONS: blur always 0).

**Interactions (legacy `Nav.tsx:160–222`):**
- **Tap** → `onScan()` (start single scan; if a scan is in progress, route to active scan view).
- **Long-press 500ms** → opens **`ScanModeSelector`** popover (3 modes: single `scan-single`/1 credit · batch `scan-batch`/1 super · statement `scan-statement`/1 super), haptic `vibrate(50)`. Floating card, `rounded-gt-3xl border-2 shadow-gt-md`.
- **Credit badges** (optional, legacy corners): two tappable `Badge` pills on the FAB corners (super=amber upper-left, normal upper-right) → credit-info modal. Defer to v2; flag in spike.

`ScanFabProps`: `{ mode?: "single"|"batch"|"statement"; placement: "corner"|"title"|"bar-center"; onScan(); onModeSelect?(mode); superCredits?; normalCredits?; busy?; className? }`.

---

## 5. SIDE NAV (desktop) + NAV DRAWER (overflow)

### SideNav — desktop only
**Legacy has NO sidebar** (§3 of the legacy map: `max-w-md` centered card, no `<aside>`, no breakpoint switch). gastify DM-5 **adds** a desktop SideNav (Phase 7 row: "SideNav (4 + desktop title-FAB)") — this is a *gastify-new* affordance, not a legacy port. Refine the existing `AppShell.SideNav`: **fix to 4 items** (drop the catalog-driven width assumption), `w-60 border-r-2 border-gt-line-strong bg-gt-surface`, Wordmark header, `<ul>` of icon+label rows (PixelIcon `h-5 w-5`), active = `bg-gt-primary-soft font-extrabold text-gt-primary`, inactive = `text-gt-ink-2 hover:bg-gt-bg-3`. Scan on desktop = **title-adjacent ScanFab** (§4), NOT a SideNav row. Platform switch via `AppSurface` platform (`bottom bar on mobile/tablet, SideNav on desktop`). `SideNavProps`: `{ items: NavItem[4]; active; onSelect; footer? }`.

### NavDrawer — the Perfil/overflow menu
**Legacy's only overflow = ProfileDropdown** (`ProfileDropdown.tsx`) — a portal popover under the avatar; **no hamburger, no slide-in drawer**. gastify keeps `AppShell.NavDrawer` but **re-roles it as the Perfil menu** (or render the ProfileDropdown as a popover on desktop, full-surface sheet on mobile — see DM "FullSurfaceSheet", Phase 7). Contents (legacy `ProfileDropdown.tsx:105–110, 176–188`, top→bottom): user name+email block · **Compras**(`nav-history`) · **Productos**(`item-*`/Package) · **Reportes**(`nav-reports`/FileText) · **Metas**(disabled, "Próximamente" `Badge tone="neutral"`) · divider · **Configuración**(`nav-settings`). Close on scrim-click / Escape (legacy). Trigger = ProfileAvatar (header trailing) OR Perfil tab. `MenuIcon`/`XIcon` (stroke, present) for the open/close affordance if a hamburger style is spiked.

---

## 6. ICONS NEEDED — definitive PRESENT-vs-MISSING

Icon convention (user-locked 2026-06-10): **nav destinations + scan = PixelIcon**; **utility actions (back/close/menu/search/filter/submit) MAY use stroke `icons.tsx`.**

| Need | Kind | Status | File / export |
|---|---|---|---|
| **Inicio** tab | pixel | ✅ present | `nav-home.png` |
| **Compras** tab | pixel | ✅ present | `nav-history.png` (alt `fin-receipt`/`scan-receipt` — spike picks) |
| **Gastos** tab | pixel | ✅ present | `chart-pie.png` (alt `nav-insights`/`nav-trends`/`nav-reports`) |
| **Perfil** tab | pixel | ✅ present | `nav-profile.png` |
| **Scan** (FAB) | pixel | ✅ present | `nav-scan.png` + `scan-single`/`scan-batch`/`scan-statement` states |
| **Settings** | pixel | ✅ present | `nav-settings.png` |
| **Search** | pixel | ✅ present | `action-search.png` (no stroke `SearchIcon`) |
| **Filter** | pixel | ✅ present | `action-filter.png` (no stroke `FilterIcon`) |
| **Menu / hamburger** | stroke | ✅ present | `MenuIcon` (icons.tsx) — no gen needed |
| **Close X** | stroke | ✅ present | `XIcon` (icons.tsx) |
| **Profile avatar glyph** | stroke | ✅ present | `UserIcon` (initials preferred; icon = fallback) |
| **Back** | stroke | ❌ **MISSING** | none — `icons.tsx` has only `ChevronDownIcon` |

**Only ONE gap: Back.** Two options (recommend the first — it's a utility action, stroke-allowed, zero PixelLab cost):
- **RECOMMENDED:** add a stroke **`ChevronLeftIcon`** (and/or `ArrowLeftIcon`) to `design-lab/src/design-system/assets/icons.tsx` — rotate/reflect the existing `ChevronDownIcon` path. Matches legacy `ChevronLeft size={28} strokeWidth={2.5}`.
- **ALT (if a pixel look is wanted in chrome):** generate via **PixelLab (Gustify-style)** → **`nav-back.png`** (and optionally pixel `action-search`/`action-filter` already exist, so only `nav-back` would be net-new). Use the established `pixellab-icons` skill params.

**PixelLab generation list (net-new, only if pixel-back chosen):** `nav-back` — single icon. Everything else is covered. (Note: `scan-error.png` reads as a plus, not an X — regen pending from Phase 6; relevant only if ScanFab surfaces the error state.)

---

## 7. REUSE vs NET-NEW

**REUSE / REFINE (existing AppShell + atoms — keep the API, re-skin + DM-5-correct):**
- `AppShell.AppHeader` → add `variant`/`title`/`actions`/`collapsibleBand` (§3). Keep `leading`/`trailing`.
- `AppShell.BottomNav` → **fix to `grid-cols-4`, strip the `isScan` center-pill** (§2).
- `AppShell.SideNav` → fix to 4 items, desktop-only via `AppSurface` (§5).
- `AppShell.NavDrawer` → re-role as Perfil/overflow menu (§5).
- `AppShell.Wordmark`, `AppShell.ProfileButton`→`ProfileAvatar` → reuse as-is / initials.
- `AppSurface` (platform frame, `platformFromGlobals`) → reuse as-is; drives mobile-bar vs desktop-SideNav switch.
- Atoms: **`IconButton`** (back/search/filter `size="md"`; ScanFab wraps `size="fab"`), **`PixelIcon`** (all tab + scan glyphs), **`Badge`** (alerts dot, "Próximamente", credit pills).

**DROP:** `currentNavCatalog` (11-entry, DM-2/DM-5 loser) — delete; `redesignedNavCatalog` minus `escanear` = the 4 tabs (rename/trim to a single `MAIN_NAV` source of 4). The stale `AppShell.tsx` "NAV CATALOGS … IA decision OPEN" header comment is now wrong — remove it.

**BUILD (net-new organisms):** `organisms/ScanFab.tsx` (+ ScanModeSelector popover), `organisms/AppHeader` variants (or extend in place), the `MAIN_NAV` 4-item const, `_spikes/NavHeaderSpike.tsx`. Add stroke `ChevronLeftIcon` to `icons.tsx` (§6).

---

## 8. SPIKE A/B/C/D (FIRST screen-chrome spike — IA + bar layout, platform-aware)

Spike-first per DM-6. `design-system/_spikes/NavHeaderSpike.tsx` → `Design System/Spikes/NavHeader`, with `option` (A/B/C/D + Compare) + `platform` (mobile/tablet/desktop) pickers. The board lets the user pick the FAB placement + Perfil treatment interactively. **IA count is FIXED at 4 tabs (legacy+DM-5 agree); spikes vary FAB placement + header density + overflow treatment — not the tab set.**

| Spike | What varies | Crisp line |
|---|---|---|
| **A · Scan-FAB placement** (the decision) | FAB location | A1 corner-floating (DM-5 mobile) · A2 desktop title-adjacent (DM-5) · A3 center-in-bar elevated −36px (legacy). Same 4-tab bar; judge where scan feels right per platform. |
| **B · Header variant density** | AppHeader layout | B1 home wordmark+avatar (Dashboard) · B2 browse title+search+filter+avatar (Compras) · B3 detail back+title+action · B4 period stepper (Gastos/Reportes). Pick spacing/typography rhythm; confirm one flexible AppHeader covers all. |
| **C · Perfil treatment** (legacy-vs-DM-5) | tab #4 + avatar | C1 Perfil tab opens a full Perfil screen (DM-5) · C2 avatar-in-header opens ProfileDropdown popover (legacy) · C3 both (tab browse + avatar quick-menu, **recommended**). Resolves the §1 promotion question. |
| **D · Desktop chrome** | mobile-bar vs SideNav | D1 SideNav `w-60` + title-FAB (DM-5 gastify-new) · D2 legacy centered `max-w-md` card with the SAME bottom bar (no sidebar) · D3 SideNav rail (icon-only `w-16`). Decide whether desktop earns a real sidebar or stays the phone-card. |

Board compare knob: **platform** (mobile/tablet/desktop) re-renders every option through `AppSurface` so the bar↔SideNav switch + FAB placement are judged per device in one view. Decision → fold winners into `BottomNav`/`AppHeader`/`ScanFab`/`SideNav` defaults + the single `MAIN_NAV` const → archive `NavHeaderSpike.archive.tsx`.
