# Legacy Snapshot Extraction Manifest

**Source:** `https://boletapp-staging.web.app` (BoletApp staging — the live ground-truth implementation)
**Auth:** TestUserMenu → alice (no credentials, no .env required)
**Method:** Playwright MCP interactive walkthrough — navigate → inspect DOM → extract `outerHTML` with computed styles inlined → save under `docs/mockups/atoms/legacy-snapshots/<name>-live.html`
**Captured:** 2026-04-26
**Viewport:** 360 × 780 (mobile, matches BoletApp's primary form factor)

This file is the audit trail for the live-snapshot extraction pass. It serves three purposes:
1. Record what was captured + where each capture lives
2. Document why some molecules weren't captured (skipped intentionally vs. blocked vs. nonexistent in legacy)
3. Codify the workflow so a future re-extraction (after BoletApp staging updates) can replay the same path

## Captured snapshots

| # | Molecule | Snapshot file | Source route | Selector | Notes |
|---|---|---|---|---|---|
| 1 | `card-transaction` | [`card-transaction-live.html`](./card-transaction-live.html) | `/` (Dashboard, "Últimos Escaneados") | `[data-testid="transaction-card"]` | 2 cards captured: #1 Starbucks (no items, no chevron) + #4 McDonald's (1 item, chevron + collapsed expand panel). **The molecule that drove this whole pass.** |
| 2 | `card-stat` | [`card-stat-live.html`](./card-stat-live.html) | `/` | `[data-testid="carousel-card"]` | Dashboard hero — period-filter pills, treemap-grid, viewmode tabs, total-month indicator. Far richer than our gastify mockup — BoletApp's "card-stat" carries category breakdown + carousel of period views. |
| 3 | `nav-bottom` | [`nav-bottom-live.html`](./nav-bottom-live.html) | `/` | `nav[aria-label="Navegación principal"]` | 5 visible nav buttons + 2 inline credit chips (Súper créditos / Créditos). Different shape from our 5-tab mockup — center "Escanear" doubles as FAB-style integrated nav. |
| 4 | `nav-top` | [`nav-top-live.html`](./nav-top-live.html) | `/` | `header` | Sticky 72px top bar: app-logo button + "Gastify" text + profile-avatar. Uses `position: fixed` with safe-area-inset-top padding. |
| 5 | `fab` | [`fab-live.html`](./fab-live.html) | `/` | `[data-testid="scan-fab"]` | Center-bottom scan FAB (already extracted as button atom previously; molecule-level capture for completeness). |
| 6 | `state-tabs` | [`state-tabs-live.html`](./state-tabs-live.html) | `/` (transaction detail) | `[role="tablist"]` ("Modos de vista de ítems") | "Por Grupo" / "Original" pill-shape tablist with sliding background indicator behind active tab. Cleaner pattern than our gastify state-tabs default. |
| 7 | `profile-menu` (≈ drawer) | [`profile-menu-live.html`](./profile-menu-live.html) | `/` (after profile-avatar click) | `[data-testid="profile-dropdown"]` | Fixed-positioned popover with user info header + 5 menu items (Compras / Productos / Reportes / Metas / Ajustes). Closest BoletApp analog to our `drawer` and `modal` molecules — neither maps 1:1 but the popover pattern informs both. |
| 8 | `card-empty` | [`card-empty-live.html`](./card-empty-live.html) | `/compras` (empty filter result) | `[data-testid="empty-filter-state"]` | "No hay transacciones que coincidan / Intenta ajustar los filtros" with inbox icon. Triggered by filtering to a date range with no transactions. |
| 9 | `filter-strip` (period pills) | [`filter-strip-live.html`](./filter-strip-live.html) | `/compras` | period-pills wrapper containing buttons "2026 / T2 / Abr / Sem / Día" | Time-grouping pills, single active in `--primary` color. NOT category filter — that's a separate strip. |
| 10 | `filter-search` | [`filter-search-live.html`](./filter-search-live.html) | `/compras` | parent of `input[placeholder="Buscar transacciones..."]` | Rounded search pill — magnifier SVG + transparent input. Pill-shape rather than rectangular search bar. |
| 11 | `filter-active-chips` | [`filter-active-chips-live.html`](./filter-active-chips-live.html) | `/compras` | `[role="group"][aria-label*="activos"]` | Horizontally-scrolling strip of applied-filter chips with "× clear all" button on the left. Distinct from the period-pill strip. |

## Skipped — and why

| # | Molecule | Reason |
|---|---|---|
| 12 | `modal` | Tried clicking transactions and various menu items — none triggered a `[role="dialog"]`. BoletApp legacy uses **full-page navigation** rather than overlay modals for transaction detail / edit. The `profile-menu` capture above is the closest popover analog. |
| 13 | `sheet` | No bottom-sheet UI surfaced in the routes walked (Dashboard, Compras, transaction detail). Filter UI uses inline pills + applied-chips strip rather than a slide-up filter sheet. May exist in scan-mode-selector or batch flows — deferred for a future extraction round. |
| 14 | `drawer` | BoletApp staging is mobile-first; no desktop side-drawer navigation seen. The profile-menu popover above is the closest analog and was captured under that name. |
| 15 | `toast` | Auto-dismisses after ~5s and requires triggering an action (save, delete, sync). Not captured — would need a bespoke MCP flow to capture mid-animation. Defer to a follow-up round. |
| 16 | `form` (manual entry) | Did not navigate to manual-entry flow in this pass. Reachable via FAB → mode picker → manual. Defer. |
| 17 | `list-item` (settings rows) | Did not navigate to Ajustes route. Profile menu's items (`role="menuitem"`) are a related pattern and are captured inside `profile-menu-live.html`. Settings list-item rows defer. |
| 18 | `banner` | No credit-low banner was visible during the session (alice has 100 credits). Would require depleting credits or another trigger condition. Defer. |
| 19 | `card-feature` | Promotional / cohort opt-in cards not surfaced. May not be wired into staging. Skip. |
| 20 | `card-celebration` | Requires success-flow completion (e.g., first scan). Too brittle for one-off capture. Skip. |
| 21 | `nav-sidebar` | Desktop-only; staging is mobile. No equivalent. Skip. |

## Bonus discoveries (BoletApp molecules that don't have a 1:1 gastify mockup)

These showed up in the staging app but aren't in our current 18-molecule catalog. Worth considering for the gastify mockup library:

- **`treemap-grid`** — square-grid category breakdown inside the carousel-card. Captured as part of `card-stat-live.html`.
- **`viewmode-pills-container`** — 4-tab pill switcher (Grupos de Compras / Categorías de Compras / Grupos de Productos / Categorías de Productos). Captured inside `card-stat-live.html`.
- **`recientes-indicator-bar`** — pill-shape switch between "Últimos Escaneados" / "Por Fecha" tabs above the recent-tx list. Not separately captured but visible inside the `<main>` snapshot.
- **`carousel-indicators`** — dot-pagination row for the period carousel. Inside `card-stat-live.html`.

## Workflow — how to re-run this extraction

The current captures are **one-off interactive extractions**. To make them re-runnable (so we can refresh after BoletApp staging updates):

1. Encode the captured selectors into `tests/legacy-extract/extract-atoms.spec.ts` (append molecule entries to `ATOM_TARGETS`)
2. Use the proven `loginAsTestUser()` + `getOuterHtmlWithComputedStyle()` helpers from `tests/legacy-extract/helpers/legacy-auth.ts`
3. Run `npm run extract:legacy` to regenerate

That codification step is **deferred to a follow-up round** — for now, the snapshots in this folder are the authoritative source.

## Surprising findings (the things that should change our gastify mockups)

After capturing the live ground truth, these stood out as **divergent from our current `card-transaction.html` molecule** and worth retrofitting:

1. **The thumbnail content is a single shared `lucide-receipt` SVG**, not 4 horizontal pixel-art lines. Same icon for every transaction, opacity 0.7, color `--text-tertiary`.
2. **The category badge is a SOLID PASTEL color** like `rgb(248, 232, 216)` (peach for restaurant), `rgb(248, 240, 216)` (pale yellow for fuel), `rgb(224, 242, 232)` (mint for grocery) — NOT the saturated `--cat-X` we've been using. The merchant text gets the saturated color (`rgb(184, 104, 48)` orange, `rgb(168, 128, 32)` mustard, `rgb(45, 140, 80)` green).
3. **The badge content is a Unicode emoji glyph** (`🍽️`, `⛽`, `🛒`) — not a white pixel-art SVG. 28×28 circle, font-size 14px, no border (just `box-shadow: 0 1px 2px rgba(0,0,0,0.05)`).
4. **The chevron only appears when the transaction has items > 0** (Starbucks/Copec/Líder don't show chevron, McDonald's/Unimarc do because they have 1+ scanned items).
5. **Items pills include a `lucide-package` SVG + count**, with the same pastel-pill shape (`background: rgb(244, 244, 245)`).
6. **Card width is 305px on a 360px viewport** with 12px outer page padding + the card's own internal 12px padding.

These are the corrections that would close the gap between our gastify mockup and the live legacy app. They're the answer to all the rounds of "the icons don't match" and "the colors aren't right" iterations.
