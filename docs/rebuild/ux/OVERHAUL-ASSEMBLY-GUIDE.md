# Overhaul Assembly Guide — wiring design-lab into the live web + mobile apps

> **What this doc is.** The **assembly contract** for the frontend overhaul: how the
> Playful-Geometric visual system built in `design-lab/` plugs into the two apps that
> are **already fully functional** — `web/` (React, prod) and `mobile/` (Expo/RN,
> Android). It answers "given a working app and a finished design system, *how do we
> marry them*" — the bridge that does not exist yet (today `shared/design-tokens.ts`
> feeds only `design-lab/`).
>
> **What this doc is NOT** (already owned elsewhere — do not duplicate):
> - **WHAT must exist** (every screen/control/behavior) → [UI-FEATURE-INVENTORY.md](./UI-FEATURE-INVENTORY.md)
> - **design-lab folder taxonomy + Storybook hierarchy** → [STORYBOOK-STRUCTURE.md](./STORYBOOK-STRUCTURE.md)
> - **icon family + generation style** → [ICON-STYLE-SPEC.md](./ICON-STYLE-SPEC.md)
>
> This doc owns the **HOW it gets wired**: the token bridge, the per-screen assembly
> map, the load-bearing invariants the overhaul must not break, and the verification
> ladder. Read the inventory first for the feature list; read this to assemble.
>
> **Boundary reminder.** `design-lab/`, `shared/`, and `.kdbp/PLAN-MOCKUPS.md` belong
> to the mockup lane. The overhaul session *reads* design-lab and *ports out of*
> `shared/design-tokens.ts`; it does its building inside `web/` and `mobile/`. When
> the overhaul commits, stage only `web/`+`mobile/` files (never `git add .`).

---

## 0. The one-paragraph mental model

There are **three** frontend surfaces. `design-lab/` is the **design proving ground**
(Storybook, atoms→molecules→screens, the violet "Playful Geometric" look). `web/` and
`mobile/` are the **shipping apps** — every feature works today, e2e-proven, in
production. The overhaul is **not a rewrite**: the apps keep their routing, hooks, data
flow, state stores, and (critically) their `data-testid`/`testID` attributes. The
overhaul **swaps the skin**: it ports the design tokens out of `shared/`, restyles the
components to the geometric grammar, and folds in the design-lab atom/molecule
treatments. The single source of truth for the look is `shared/design-tokens.ts`; the
bridge to each app is different (web = CSS vars + Tailwind `gt-*`; mobile = a TS adapter
because RN can't read CSS).

```
shared/design-tokens.ts  ── generate ──▶  design-lab/src/styles/tokens.css   (EXISTS today)
        │
        ├── (overhaul builds) ──▶  web/src/styles/global.css  :root + @theme   (TO BUILD)
        └── (overhaul builds) ──▶  mobile/src/theme/tokens.ts  RN adapter        (TO BUILD)
```

---

## 1. The token bridge — the heart of the assembly

### 1.1 The source of truth

`shared/design-tokens.ts` — the ONLY file in `shared/` — exports `gastifyTokens`
(palette, semantic `colors`, `cssVarFor`, `twKeyFor`, typography, radius, shadow,
motion, breakpoints). It is **"Playful Geometric" (DM-1)**: a SINGLE theme (the old
3-themes-×-light/dark matrix is gone). The contract that makes wiring cheap:

- **`cssVarFor`** maps each semantic key → a CSS custom property name (`primary` → `--primary`).
- **`twKeyFor`** maps each key → a Tailwind `gt-*` utility suffix (`primary` → `gt-primary`).
- The `gt-*` names + semantic keys are **deliberately stable**; DM-1 changed only the
  VALUES. So downstream components keyed on those names don't churn when values change.

### 1.2 The palette the overhaul lands (exact values, from `shared/design-tokens.ts`)

| Role | Value | CSS var | `gt-*` utility |
|---|---|---|---|
| bg (canvas) | cream `#FFFDF5` | `--bg` | `gt-bg` |
| surface | white `#FFFFFF` | `--surface` | `gt-surface` |
| primary | violet `#8B5CF6` | `--primary` | `gt-primary` |
| primary-hover | `#7C3AED` | `--primary-hover` | `gt-primary-hover` |
| primary-light | violetSoft `#EDE9FE` | `--primary-light` | `gt-primary-soft` |
| secondary | pink `#F472B6` | `--secondary` | `gt-secondary` |
| accent | amber `#FBBF24` | `--accent` | `gt-accent` |
| success | emerald `#34D399` | `--success` | `gt-success` |
| error | red `#EF4444` | `--error` | `gt-error` |
| text (ink) | slate900 `#1E293B` | `--text-primary` | `gt-ink` |
| text-secondary | slate500 `#64748B` | `--text-secondary` | `gt-ink-2` |
| border (soft divider) | slate200 `#E2E8F0` | `--border-light` | `gt-line` |
| border (INK identity) | slate900 `#1E293B` | `--border-medium` | `gt-line-strong` |
| chart-1..6 | violet, amber, pink, emerald, blue, slate | `--chart-1..6` | `gt-chart-1..6` |
| positive / negative / neutral | `#10B981` / `#EF4444` / `#64748B` | `--positive-*` / `--negative-*` / `--neutral-*` | `gt-positive` / `gt-negative` / `gt-neutral` |

**Geometric grammar (the identity — must survive the port):**
- **Borders:** 2–3px ink (`--border-medium` / `gt-line-strong`) on framed surfaces; soft slate (`gt-line`) for dividers.
- **Shadows:** HARD zero-blur offset, drawn in ink: `xs 1px 1px`, `sm 2px 2px`, `md 4px 4px`, `lg 6px 6px`, `xl 8px 8px`, `2xl 12px 12px` — **blur MUST stay 0** or the identity breaks.
- **Type:** Outfit body / Baloo 2 display, leaning extrabold (800). `fontSize` px ramp xs 11 → 7xl 44. (Open polish item: the built Storybook currently ships **Nunito Sans** — reconcile the typeface before the web port.)
- **Radius:** sm 4 → 6xl 20, `pill 999`. (`frame 40` is device-bezel chrome — mockup only, not a product radius.)
- **No spacing scale** is defined in the token module — spacing stays Tailwind defaults.

### 1.3 Web wiring — replace `:root`, keep the var names

The web app **already references CSS vars everywhere** via `style={{ color: "var(--primary)" }}`
and a few Tailwind arbitrary utilities (`hover:bg-(--primary-light)`). Today those vars
are defined in `web/src/styles/global.css` as a **warm "Ni No Kuni" palette**
(`--bg: #f5f0e8`, `--primary: #4a7c59` green) across a **6-set theme matrix** (Normal /
`[data-theme=professional]` / `[data-theme=mono]` × light + `.dark`).

**The port (direction: shared → web, overwriting web's current look):**

1. **Regenerate** the token CSS from `shared/design-tokens.ts` (the same script
   design-lab uses: `generate-tokens-css.mjs` emits a `:root` block of `--*` literals +
   a Tailwind 4 `@theme inline` block exposing `gt-*`). Port that output into
   `web/src/styles/global.css`, replacing the current `:root` block.
2. Because the **CSS var names are identical** (`--primary`, `--surface`, `--bg`, …
   per `cssVarFor`), **every existing `var(--primary)` reference picks up violet
   automatically** — components barely change; the theme swaps underneath them.
3. **Collapse the theme matrix to one theme** (DM-1 is single-theme). The
   `[data-theme=professional|mono]` and `.dark` blocks go away. Decide the fate of
   `uiStore`'s `colorTheme`/`themeMode` + `applyThemeToDOM` + the Settings "Appearance"
   section (see §4 "Theme selector").
4. **Define the currently-undefined-but-referenced tokens** so components stop relying
   on literal fallbacks: `--danger` (used with fallback `#dc2626` — map to `--error`),
   `--success` / `--success-light` (some sites pass bare `var(--success)`), and
   `--background` (fallback `#f9fafb` — map to `--bg`). Also keep the legacy aliases the
   code already uses: `--text` (=`--text-primary`), `--text-muted` (=`--text-tertiary`),
   `--border` (=`--border-light`).
5. **Optionally adopt `gt-*` Tailwind utilities** for new/restyled markup (the design-lab
   components are authored in `gt-*`). This is what makes pasting a design-lab component
   into web cheap — but it requires wiring the `@theme inline` block into web's Tailwind
   v4 config. Existing `var(--*)` inline styles keep working regardless; `gt-*` is
   additive.

**Net for web:** the heavy lift is one `global.css` swap + theme-matrix collapse. The
component restyle is then incremental (geometric borders/shadows/radius per screen).

### 1.4 Mobile wiring — a TS adapter (RN can't read CSS)

Mobile has **no CSS** — it styles via `StyleSheet.create` with **hardcoded hex** on most
screens, plus a partial `ThemeProvider` (`useTheme`) consumed by only 5 surfaces
(Settings, Items, and the 3 chart components). The app is **mid-migration**: a token
theme exists but most screens ignore it.

**The port (direction: shared → mobile via a platform adapter):**

1. **Build the RN adapter** — a new module (e.g. `mobile/src/theme/tokens.ts`) that
   imports `shared/design-tokens.ts` and re-exports the values as RN-consumable objects
   (`colors`, `fontFamily`, `fontSize`, `radius`, plus an `offsetShadow(size)` helper
   that returns RN `shadowOffset`/`shadowColor` with `shadowRadius: 0` to reproduce the
   hard-shadow look — RN has no CSS box-shadow). Values are **px-unit-agnostic** by
   design, so they drop in.
2. **Replace `ThemeProvider`'s palette** with the Playful-Geometric values (or point
   `useTheme` at the adapter). Collapse its 3-theme × light/dark matrix to the single
   theme (DM-1).
3. **Migrate the hardcoded-hex screens** to the adapter, screen by screen — this is the
   bulk of mobile work. Recurring literals to replace: blue primary `#2563eb` → violet,
   dark text `#0f172a` → ink, surface `#ffffff`, app bg `#f8fafc` → cream, borders
   `#e2e8f0`/`#cbd5e1`, success/error/warning families. Keep `fontVariant:["tabular-nums"]`
   on amounts and the alphabetized style-key convention.
4. **`ScreenShell` is the highest-leverage restyle** — it wraps ~13 screens
   (`SafeAreaView` + `KeyboardAvoidingView` + optional `ScrollView`, bg `#f8fafc`,
   padding 24). Restyling it propagates the canvas/padding everywhere. Note `scroll={false}`
   screens (Items, Notifications) reproduce padding via `SCREEN_PADDING` on the
   `FlatList` `contentContainerStyle` — restyle both paths.

**Net for mobile:** more work than web (no shared CSS to swap), done screen-by-screen
behind the adapter. The 3 chart components + Settings + Items already read `useTheme`, so
they update for free once the theme palette swaps.

### 1.5 The category/payment data tokens (NOT gt-* — a documented exception)

design-lab's `src/lib/categoryTokens.ts` (DM-4) is a 107-token, 4-level Chilean expense
taxonomy (L1 Rubros → L4 Categorías), each `{label, icon, color, tint, parent}`, and
`paymentMethods.ts`. These category/payment colors are **DATA, not `gt-*` tokens** —
applied via inline style (the donut slices, `CategoryChip`, payment chips). The apps
already color charts by a hashed `category_key → --chart-N` mapping
(`web/src/lib/chartData.ts`, mobile chart palette). **Assembly decision the overhaul
must make:** adopt design-lab's per-category color taxonomy (richer, icon-bearing) vs.
keep the current 6-chart-token hash. If adopting, port `categoryTokens.ts` into a shared
spot both apps read (it currently lives only in design-lab).

---

## 2. The load-bearing invariants — what the overhaul MUST NOT break

These are the contracts that keep the working app working while the skin changes.

| # | Invariant | Why | Where it lives |
|---|---|---|---|
| I1 | **Every `data-testid` (web, 120 literals) + `testID` (mobile) is preserved** on the equivalent restyled control. | The Playwright + Maestro suites select on them. A rename = a broken suite. Rename only with the suite updated in the same commit. | §3 maps them per screen; full list in UI-FEATURE-INVENTORY §1–16 |
| I2 | **Data hooks, query keys, and stores are untouched.** Restyle the view, not the data layer. `useUiStore.activeScope` (web) / `scopeStore` (mobile) drive scope; the insights/transactions/groups hooks thread `group_id`. | The overhaul is visual. Touching hooks risks regressions the e2e won't catch if the testid moved too. | web `hooks/` + `stores/`; mobile `hooks/` + `stores/` |
| I3 | **Behavior contracts hold:** optimistic edit + rollback toast on txn PATCH; matched-lock 409; share-lock read-only when `is_shared`; SSE/WS progress phases; 429 → `RateLimitToast`. | These are e2e-pinned product behaviors, not styling. | UI-FEATURE-INVENTORY §1, §5, §7, §9 |
| I4 | **Scope-awareness:** scan/batch/manual-entry show `personal-only-notice` in group mode (D70); dashboards re-scope; group dashboards show the void notice. | Restyling must keep the personal-only gate and the scope banner wired. | web `PersonalOnlyNotice`, `GroupSwitcher`; mobile `ScopeBanner`, `ScopeSwitcher` |
| I5 | **i18n stays keyed (web only).** Web has a hand-rolled `i18n.ts` (215 keys × es/en/pt, `t(key)`); restyled copy still routes through `t()`. **Mobile has NO i18n** — inline English; the overhaul may keep English or land mobile i18n (a bigger call — see §5). | A restyle that hardcodes Spanish in web breaks en/pt. | web `lib/i18n.ts` + `useI18n`; mobile = inline |
| I6 | **The hard-shadow / ink-border identity** (blur 0, 2–3px ink) is the brand. Don't soften it into Material elevation. | It's the whole "Playful Geometric" point (DM-1). | `shared/design-tokens.ts` shadow + border tokens |

---

## 3. Per-surface assembly map

Each surface below: the **web route** + **mobile screen** that implement it, the **load-bearing
testids** that must survive, the **design-lab component(s)** that can fold in, and the
**assembly note**. (Feature/behavior details: UI-FEATURE-INVENTORY. This is the wiring view.)

> Legend — DL = design-lab component available to fold in. ⚠ = a real web↔mobile
> divergence the overhaul must reconcile.

| Surface | Web route | Mobile screen | Key testids to preserve | DL components | Assembly note |
|---|---|---|---|---|---|
| **Sign-in** | `sign-in.tsx` | `SignInScreen` | web: `sign-in-google-button`, `sign-in-test-auth-button`(+`-b`); mobile: `google-sign-in-button`, `e2e-sign-in-button`(+`-b`) | Button atom, wordmark | ⚠ testid names DIVERGE web vs mobile — keep each platform's own. |
| **Dashboard** | `index.tsx` | `DashboardScreen` | `dashboard-scope-banner`, `dashboard-voided`, `dashboard-empty`, `total-spend`, `category-donut`, `donut-legend`, `drill-breadcrumb` | SummaryStats, Card, CategoryDonut | Donut drill is in-memory (`useDonutDrill`) — pure restyle. Mobile uses gifted-charts, web uses Recharts (different libs, same data). |
| **Scan** | `scan.tsx` | `HomeScreen` (scan panel) | web: `scan-quota`, `personal-only-notice`; mobile: `home-screen`, `scan-camera-button`, `scan-progress-panel`, `scan-result-panel` | ScanResult-like Card, StateTabs (progress) | ⚠ BIG divergence: web has a dedicated `/scan` route; **mobile folds scan into the `HomeScreen` hub** (~980 lines). The overhaul may split mobile's hub per DM-5's 4-tab nav. |
| **Batch scan** | `scan-batch.tsx` | `BatchCaptureScreen` + `BatchReviewScreen` | `batch-scan-page`/`batch-capture-screen`, `batch-queue`, `batch-item`, `batch-summary`, `batch-premium-notice` | CompactRowList, Badge (status) | Premium-gated when `quota.enforced && batch.limit===0`. Keep the gate. |
| **Statements** | `statements.tsx` | `StatementsScreen` (+`statementStyles.tsx`) | `statement-*` (upload/panel/bucket-tabs/reconciliation), `statement-bucket-{key}` | StateTabs (buckets), Card, EmptyState | Reconciliation bucket tabs = `StateTabs` molecule. SSE (web) / WS (mobile) progress — restyle the stage list, keep the stream. |
| **Transactions list** | `transactions.index.tsx` | `TransactionsScreen` | `add-transaction-link`, `filter-source`, `filter-matched`, `batch-action-bar`, `txn-matched-badge`, `select-txn-{id}`/`transaction-row-{id}` | CompactRowList, Chip (filters), Badge (matched) | The ledger row = `CompactRowList` item. Batch-select + filter chips fold in cleanly. |
| **Transaction detail** | `transactions.$transactionId.tsx` | `TransactionDetailScreen` | `shared-lock-banner`, `shared-lock-badge`, `txn-matched-badge`, mobile `transaction-edit-*`, `transaction-item-{i}-*` | Input, Card, ItemFlagChips, the `TransactionDetailSpike` | design-lab has a `TransactionDetailSpike` — reference it. Inline-edit + rollback toast behavior is e2e-pinned (I3). |
| **Manual entry** | `transactions.new.tsx` | (none — ⚠ mobile gap) | `manual-merchant`, `manual-date`, `manual-total`, `manual-add-item`, `manual-item-*-{i}`, `manual-save` | Input, Button, CategoryChip | ⚠ **Mobile has no manual-entry screen** (P-row in inventory §16). Overhaul could add it. |
| **Items** | `items.tsx` | `ItemsScreen` | `items-screen`, `items-search-input`/`items-search`, `items-row`/`items-row-{i}`, `items-clear-all` | CompactRowList, Chip, CategoryChip | Mobile `ItemsScreen` already reads `useTheme` — updates with the palette swap. |
| **Trends** | `trends.tsx` | `TrendsScreen` | `temporal-bar`, `level-bar`, `temporal-pill-{v}`, `level-pill-{n}`, `period-stepper`, `trends-no-series` | StateTabs (W/M/Q/Y), CategoryDonut, SpendTimeSeries | The temporal + level bars = `StateTabs` instances. |
| **Reports** | `reports.tsx` | `ReportsScreen` + `ReportDetailScreen` | `reports-screen`, `reports-card`, `reports-granularity-{v}`, `report-detail-overlay`, `report-detail-sparkline`, `report-detail-highlight-{k}` | Card, Sparkline, SummaryStats, EmptyState | ⚠ web = a `ReportDetailOverlay` modal; mobile = a `ReportDetailScreen` route. Same content, different container. |
| **Notifications** | `notifications.tsx` + `NotificationBell` | `NotificationsScreen` | `notifications-screen`, `notifications-row`/`-row-{i}`, `notifications-bell`, `notifications-badge`, `notifications-mark-all` | CompactRowList, Badge (unread dot), IconButton | Optimistic mark-read/delete — keep the mutations. |
| **Groups** | `groups.tsx` | `GroupsScreen` + `GroupDetailScreen` | `create-group-form`/`create-group-input`, `group-leave-dialog` (+keep/delete/cancel), `group-visibility-toggle`, `group-consent-toggle`, `member-role-{uid}`, `group-icon-choice-{c}`, `group-color-choice-{c}` | Card, Chip, GroupAvatar, StateTabs, Toast | ⚠ web `groups.tsx` is ONE route (list+detail inline); mobile SPLITS into `GroupsScreen` + `GroupDetailScreen`. `GroupDetailScreen` is the one screen NOT in `ScreenShell` (own ScrollView). Leave-dialog testids must survive (P68 work). |
| **Invite** | `invite.$token.tsx` | (in `GroupsScreen` join flow) | web: `invite-join`, `invite-error`; mobile: `join-invite-input`, `join-invite-button` | Card, Button | ⚠ web has a dedicated `/invite/{token}` landing route; mobile joins via a token input on `GroupsScreen`. |
| **Settings** | `settings.tsx` | `SettingsScreen` | web: `settings-currency-select`, `settings-date-format`, `learned-mappings-section`; **mobile: NONE** ⚠ | Card, Input, Label | ⚠ **mobile `SettingsScreen` has zero testIDs** — a Maestro gap; the overhaul should add them while restyling. Web Settings has the theme/appearance section that DM-1 single-theme may retire (§4). |
| **Global shell** | `AppLayout` (sidebar + mobile bottom nav) | `AppNavigator` (native stack, no tabs) | `group-switcher`/`scope-switcher`, `rate-limit-toast` | AppShell, AppSurface, Toast | ⚠ **Navigation is the biggest structural divergence.** Web = 11-item sidebar + mobile bottom nav. Mobile = a flat native stack hub-and-spoke off `HomeScreen`. **DM-5 prescribes a 4-tab nav (Inicio·Compras·Gastos·Perfil) + scan FAB** — adopting it is the largest mobile-navigation change in the overhaul. |

---

## 4. Decisions the overhaul must make (assembly forks)

These are choices the design system implies but the apps haven't resolved. Flagging them
so the overhaul session decides deliberately, not by accident.

1. **Theme selector fate.** DM-1 is single-theme. Web today ships a 6-set matrix with a
   Settings "Appearance" picker (`colorTheme` + `themeMode` + locale), persisted in
   `uiStore` / SecureStore (mobile). Single-theme means: drop the picker, drop
   `[data-theme=*]` + `.dark`, simplify `applyThemeToDOM`. **OR** keep light/dark as the
   one axis that survives (geometric look in two modes). Decide before the `global.css`
   swap — it changes how much of `uiStore`/`ThemeProvider` you keep.
2. **Mobile navigation = adopt DM-5's 4-tab + FAB?** Today mobile is a hub-and-spoke
   stack off a giant `HomeScreen`. DM-5 prescribes Inicio·Compras·Gastos·Perfil tabs + a
   scan FAB. This is the single biggest mobile structural change. If adopted: split
   `HomeScreen`'s scan panel into its own surface, add a tab navigator, re-home the
   per-screen nav buttons. (Web's sidebar may or may not mirror the 4-tab grouping.)
3. **Category color taxonomy** (§1.5): adopt design-lab's 107-token per-category palette
   (icon-bearing) or keep the 6-chart-token hash. If adopting, port `categoryTokens.ts`
   to a shared location.
4. **Mobile i18n** (§5): keep inline English or land a mobile i18n layer during the
   overhaul (web already has one; mobile's `reportInsights.ts` has a TODO for it).
5. **Typeface reconciliation:** token module names Outfit/Baloo 2; built Storybook ships
   Nunito Sans. Pick one before porting fonts into web/mobile.
6. **`gt-*` adoption in web:** wire the Tailwind `@theme inline` block (lets you paste
   design-lab components verbatim) or stay on `var(--*)` inline styles (less setup,
   components restyled by hand). Additive either way.

---

## 5. Platform divergences cheat-sheet (web ↔ mobile)

The overhaul touches both apps; these are the structural gaps so neither is assumed to
mirror the other.

| Concern | Web | Mobile |
|---|---|---|
| Framework | React 19 + Vite + TanStack Router (file-based) | Expo / React Native + React Navigation (native stack) |
| Styling | CSS vars in `global.css` + Tailwind v4 + inline `var(--*)` | `StyleSheet.create` hardcoded hex + partial `ThemeProvider` |
| Token bridge | CSS `:root` + `@theme inline` (port the generated CSS) | **TS adapter** importing `shared/design-tokens.ts` (no CSS) |
| i18n | hand-rolled `i18n.ts`, 215 keys × es/en/pt | **none** — inline English |
| Navigation | 11-item sidebar + mobile bottom nav | flat native stack, hub off `HomeScreen` (DM-5 → 4 tabs) |
| Scan | dedicated `/scan` route | folded into `HomeScreen` hub |
| Reports detail | `ReportDetailOverlay` modal | `ReportDetailScreen` route |
| Groups | one `groups.tsx` (list+detail) | split `GroupsScreen` + `GroupDetailScreen` |
| Invite | `/invite/{token}` landing route | token input on `GroupsScreen` |
| Manual entry | `/transactions/new` route | **missing** (gap) |
| Settings testIDs | present | **none** (gap) |
| Charts | Recharts (lazy) | `react-native-gifted-charts` + `react-native-svg` |
| Progress stream | SSE (`EventSource`) | WebSocket + REST-poll fallback |
| Native-only | — | camera (`expo-image-picker`), PDF (`expo-document-picker`), push (`expo-notifications`), SecureStore, Firebase native |
| 429 toast transport | `window` `CustomEvent` (`RATE_LIMIT_EVENT`) | module-level emitter (`onRateLimited`) — RN has no `window` |

---

## 6. Suggested assembly sequence

A low-risk order — themes first (cheap, high blast-radius), screens after (incremental).

1. **Reconcile tokens** — settle the typeface (§4.5) and theme-selector fate (§4.1) so
   the token target is final.
2. **Web token swap** — port the generated `:root` + `@theme` into `global.css`, define
   the undefined-but-referenced vars (§1.3 step 4), collapse the matrix. Run the full web
   vitest + Playwright suite: **the apps should still pass** (testids unchanged, behavior
   unchanged) — only the look changed. This is the proof the bridge is sound.
3. **Web component restyle, screen by screen** — apply geometric borders/shadows/radius;
   fold design-lab atoms/molecules where they map (§3). Re-run the screen's e2e after each.
4. **Mobile adapter** — build `mobile/src/theme/tokens.ts` + `offsetShadow`; repoint
   `ThemeProvider`. The 5 `useTheme` surfaces update for free.
5. **Mobile `ScreenShell` restyle** — propagates the canvas to ~13 screens at once.
6. **Mobile screen migration** — hardcoded-hex → adapter, screen by screen; add the
   missing Settings testIDs and (if adopting DM-5) the tab nav. Re-run Maestro per screen.
7. **Category taxonomy + icons** (§1.5, ICON-STYLE-SPEC) as a parallel track.

**Verification ladder (per the design-lab + app gates):**
- design-lab changes: `npm run typecheck && build && build-storybook && test-storybook` (port 6008).
- web changes: `tsc` + eslint + `vitest` (134 tests today) + Playwright e2e (the testid-pinned suites).
- mobile changes: `tsc` + `jest` (255 tests today) + Maestro flows on the S23.
- The **invariant test** after every token/restyle step: the **existing** e2e suites pass
  unchanged. If a testid had to move, its suite moved in the same commit (I1).

---

## 7. Pointers

| You need… | Go to |
|---|---|
| The full feature/control/behavior list | [UI-FEATURE-INVENTORY.md](./UI-FEATURE-INVENTORY.md) |
| design-lab folder layout + Storybook hierarchy | [STORYBOOK-STRUCTURE.md](./STORYBOOK-STRUCTURE.md) |
| Icon family + generation params | [ICON-STYLE-SPEC.md](./ICON-STYLE-SPEC.md) |
| The token values themselves | `shared/design-tokens.ts` (palette, `colors`, `cssVarFor`, `twKeyFor`, shadow, radius, type) |
| The token→CSS generator to mirror for web | `design-lab/scripts/generate-tokens-css.mjs` → emits `design-lab/src/styles/tokens.css` |
| Built design-lab components to fold in | `design-lab/src/design-system/{atoms,molecules,organisms}/` + their `.stories.tsx` |
| The category/payment data tokens | `design-lab/src/lib/{categoryTokens,paymentMethods}.ts` |
| The DM-* design decisions | `.kdbp/PLAN-MOCKUPS.md` §Decisions (DM-1 single theme, DM-3 atom treatments, DM-4 categories, DM-5 nav, DM-6 spikes) |
| Web's current tokens to replace | `web/src/styles/global.css` (`:root`) |
| Mobile's partial theme to repoint | `mobile/src/providers/ThemeProvider.tsx` (`useTheme`) |

> **When the overhaul ships:** stage only `web/` + `mobile/` (+ this doc / inventory if
> updated). Never `git add .` — `design-lab/`, `shared/`, and `.kdbp/PLAN-MOCKUPS.md`
> belong to the mockup lane and must stay untouched by the dev/overhaul session.
