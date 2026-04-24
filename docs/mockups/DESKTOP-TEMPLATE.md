# Desktop Screen Template

Pattern for extending desktop-responsive coverage across all 28 remaining screens without duplicating the shell.

## Files

| Path | Role |
|------|------|
| `assets/css/desktop-shell.css` | **Shared shell** — theme tokens (6 variants) + base + controls + app-shell grid + sidebar + topbar + rail-card base + section headings + platform-notes + responsive breakpoints + focus rings + brand wordmark. 448 lines. |
| `screens/_desktop-template.html` | **Copy-paste starting point** — empty shell with placeholder `MAIN CONTENT` block. 221 lines. |
| `screens/gastify-dashboard-desktop.html` | **Reference implementation** — dashboard content filled in, uses shared shell. 606 lines total, ~280 lines of that are dashboard-specific (balance / stats / tx-list / rail cards). |

## Authoring a new desktop screen

```bash
# 1. Copy template to new screen file
cp docs/mockups/screens/_desktop-template.html docs/mockups/screens/gastify-{screen}-desktop.html

# 2. Edit in place:
#    - <title>     → new screen name
#    - .nav-item.active → correct nav row for this screen
#    - <!-- MAIN CONTENT --> block → screen-specific markup
#    - <style> block after desktop-shell.css link → screen-specific styles
#    - Optional: delete <aside class="rail"> if screen has no rail
#    - .platform-notes ul → screen-specific interaction notes
```

## What stays in shared CSS (do NOT inline in screens)

- All `:root` theme tokens + 5 alternate `[data-theme][data-mode]` blocks
- Base reset + typography + focus-visible + `.wordmark` (brand-invariant)
- `.controls` (top theme switcher bar)
- `.app-shell` grid
- `.sidebar`, `.sidebar-brand`, `.brand-mark`, `.nav-list`, `.nav-item`, `.nav-icon`, `.sidebar-footer`, `.user-chip`, `.user-avatar`, `.user-name`, `.user-email`
- `.main` flex column
- `.topbar`, `.search`, `.search input`, `.kbd-hint`, `.scan-btn`, `.icon-btn`, `.bell-badge`, `.topbar-avatar`
- `.section-head`, `.section-title`, `.section-link`
- `.rail` + `.rail-card` + `.rail-title`
- `.platform-notes` block styling
- Responsive breakpoints for shell (≤1280, ≤1024, ≤640)

## What goes inline per screen (NOT in shared CSS)

- Hero sections (balance card, scan viewfinder, etc. — screen-specific visual)
- Specific data blocks (`.stats-row`, `.tx-list`, form layouts, etc.)
- Screen-specific rail card bodies (donut, anomaly-list, quick-actions, etc.)
- Screen-specific responsive tweaks that ONLY affect the main-content grid

If a screen-specific pattern gets reused across 2+ screens → promote to shared CSS.

## Canonical filter strip (for views that calculate on tx/items)

Dashboard, History, Trends, Insights, Items, Reports all show the same filter strip at the top of `<main class="main">`, driven by the same filter-state model (ported from BoletApp legacy `useHistoryFiltersStore`). Full reference markup lives in [`screens/_filter-dropdowns.html`](screens/_filter-dropdowns.html) — copy-paste Blocks A/B/C into `<main>` and Block D into `<script>`.

**Three axes:**
- **Temporal** — `Año / Trimestre / Mes / Semana` timeframe pills + `< Abril 2026 >` period navigator + calendar-icon modal (5 rows: Año/Trimestre/Mes/Semana/Día)
- **Category** — funnel-icon modal with **4 taxonomy-level chips (L1 Rubro / L2 Giro / L3 Familia / L4 Categoría)** + Lugar tab for location tree
- **Location** — Country → Cities checkbox tree nested inside category modal as 5th chip

**3-state visual convention** (propagated throughout):
- `.active` — committed filter (primary-soft bg)
- `.pending` — user changed via chevron, not yet applied (warning bg + pulse)
- no class — original / empty

**Commit mechanics:** clicking the row LABEL or `.timeframe-pill` applies the change and closes the modal. Chevrons (`<` `>`) only change pending values. Keeps accidental clicks from re-filtering mid-navigation.

**CSS lives in** `assets/css/desktop-shell.css` under `FILTER STRIP` + `FILTER MODAL` blocks — never duplicate per screen.

**Screens that DON'T need filter strip:** Transaction Editor, Settings, Scan flows, Auth, Groups (Group Switcher needs temporal filter only — partial strip OK).

## Theme switcher wiring

Copy from `_desktop-template.html` `<script>` block at bottom. 3 responsibilities:
1. Theme-tab click → swap `data-theme` attribute on `<body>`
2. Mode toggle click → flip `data-mode` light ↔ dark
3. Keyboard: `/` focuses search, `⌘K` / `Ctrl+K` fires scan button

## Known-good screens (desktop variants shipped)

| Screen | Status | Filter strip? |
|--------|--------|----------------|
| Dashboard | ✅ `gastify-dashboard-desktop.html` | ✅ (drives balance/stats/tx list) |
| History | ✅ `gastify-history-desktop.html` | ✅ canonical |
| Transaction editor | ✅ `gastify-transaction-editor-desktop.html` | n/a (split-panel item editor) |
| Settings | ✅ `gastify-settings-desktop.html` | n/a (form) |
| Trends | ✅ `gastify-trends-desktop.html` | ✅ canonical + chart-range zoom |
| Insights | ✅ `gastify-insights-desktop.html` | ✅ canonical (filters drive which insights appear) |
| Reports | ✅ `gastify-reports-desktop.html` | ✅ canonical (accordion groups + detail drawer) |

## Pending queue (P0 — apply template to all)

Apply template to remaining mobile-only screens. Priority order matches Dashboard usage:

1. `gastify-history-desktop.html` — tx list + filters + date groups + selection
2. `gastify-transaction-editor-desktop.html` — split panel (item list left, detail pane right)
3. `gastify-settings-desktop.html` — left subnav within main + right detail pane (nested pattern)
4. `gastify-insights-desktop.html` — carousel + detail drawer
5. `gastify-trends-desktop.html` — chart type selector + large chart + drill-down rail
6. `gastify-reports-desktop.html` — accordion list + detail overlay
7. `gastify-items-desktop.html` — aggregated table
8. `gastify-single-scan-states-desktop.html` — upload/camera zone + preview rail
9. `gastify-scan-mode-selector-desktop.html` — 3-card mode picker (full width)
10. Group screens (`gastify-group-*-desktop.html`) — 5 existing + 11 new to build
11. Remaining 28 screens

## Shell change protocol

Editing `desktop-shell.css` affects every desktop screen. Process:
1. Make edit
2. Open `gastify-dashboard-desktop.html` in browser
3. Cycle all 6 theme × mode variants via top controls → verify nothing broke
4. Spot-check 1 other desktop screen (once more exist)
5. Commit as `docs(mockups): update desktop-shell — [change description]`
