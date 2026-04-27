# Component Library — Molecules

**Phase 3 exit artifact.** Catalog of 18 composed components built from the P2 atom layer. Each row maps a molecule → its variants → state matrix → atoms used → screens that consume it. Living doc — P5-P12 update the "Used by" column as screens land.

**Stylesheet:** [`../assets/css/molecules.css`](../assets/css/molecules.css) (single source — composes on top of `desktop-shell.css` tokens + `atoms.css` primitives, zero hex/rgb literals).

**Catalog entry:** [`../INDEX.md` §5](../INDEX.md) cross-references usage by screen.

---

## Legacy ground-truth workflow

Source-of-truth for molecule layouts is the **live BoletApp staging app** at `https://boletapp-staging.web.app`. To stop reverse-engineering from screenshots, every molecule is paired with a **live snapshot** extracted via Playwright MCP — the rendered DOM with computed styles inlined, saved to [`../atoms/legacy-snapshots/<name>-live.html`](../atoms/legacy-snapshots/). The full audit lives in [`../atoms/legacy-snapshots/EXTRACTION-MANIFEST.md`](../atoms/legacy-snapshots/EXTRACTION-MANIFEST.md).

Process for re-extraction (manual MCP-driven for now; codification into `tests/legacy-extract/extract-atoms.spec.ts` is a future round):

1. Reload Claude Code so the Chrome DevTools / Playwright MCP plugins are active
2. Drive the browser session: navigate, log in via TestUserMenu → alice, walk to each molecule's source route
3. For each target: `getComputedStyle()` walk → inline RGB/px values → save to `legacy-snapshots/<name>-live.html` via [`scripts/wrap-snapshot.mjs`](../../../scripts/wrap-snapshot.mjs)
4. Update the manifest with capture date + selector + notes

When a molecule's mockup diverges from its live snapshot, the snapshot wins. Open the molecule demo's "LEGACY · BoletApp staging" section to see them side-by-side.

## Table of contents

| # | Molecule | File | Variants | Tag | Live snapshot |
|---|----------|------|----------|-----|---------------|
| 1 | State tabs | [`state-tabs.html`](./state-tabs.html) | ARIA · legacy | foundation · canonical | ✅ [state-tabs-live.html](../atoms/legacy-snapshots/state-tabs-live.html) |
| 2 | Card · Transaction | [`card-transaction.html`](./card-transaction.html) | expense · income · multi-currency | card | ✅ [card-transaction-live.html](../atoms/legacy-snapshots/card-transaction-live.html) |
| 3 | Card · Stat | [`card-stat.html`](./card-stat.html) | up / down / flat delta | card | ✅ [card-stat-live.html](../atoms/legacy-snapshots/card-stat-live.html) |
| 4 | Card · Empty | [`card-empty.html`](./card-empty.html) | history · filter · group | card | ✅ [card-empty-live.html](../atoms/legacy-snapshots/card-empty-live.html) |
| 5 | Card · Feature | [`card-feature.html`](./card-feature.html) | promotion · cohort opt-in · upgrade | card | ⊝ skip — not present in BoletApp staging |
| 6 | Card · Celebration | [`card-celebration.html`](./card-celebration.html) | first-scan · streak · savings goal | card | ⊝ skip — needs success-flow trigger |
| 7 | Modal | [`modal.html`](./modal.html) | confirm · form · learning · error · credit | overlay | ⊝ skip — BoletApp uses full-page nav, not overlay modals |
| 8 | Sheet (bottom) | [`sheet.html`](./sheet.html) | action · filter | overlay | ⊝ deferred — no sheet seen on routes walked |
| 9 | Drawer | [`drawer.html`](./drawer.html) | right (default) · left | overlay | ≈ [profile-menu-live.html](../atoms/legacy-snapshots/profile-menu-live.html) (closest analog: profile-dropdown popover) |
| 10 | Toast | [`toast.html`](./toast.html) | success · info · warning · error | feedback | ⊝ deferred — auto-dismisses, needs bespoke capture |
| 11 | Banner | [`banner.html`](./banner.html) | info · warning · error · offline | feedback | ⊝ deferred — credit-low banner not visible on alice account |
| 12 | Nav · Bottom | [`nav-bottom.html`](./nav-bottom.html) | 5-tab default | nav | ✅ [nav-bottom-live.html](../atoms/legacy-snapshots/nav-bottom-live.html) |
| 13 | Nav · Top | [`nav-top.html`](./nav-top.html) | default · elevated · minimal | nav | ✅ [nav-top-live.html](../atoms/legacy-snapshots/nav-top-live.html) |
| 14 | Nav · Sidebar | [`nav-sidebar.html`](./nav-sidebar.html) | expanded · collapsed | nav | ⊝ skip — BoletApp is mobile-first, no desktop sidebar |
| 15 | FAB | [`fab.html`](./fab.html) | sm / md / lg · with mode menu | nav | ✅ [fab-live.html](../atoms/legacy-snapshots/fab-live.html) |
| 16 | Form | [`form.html`](./form.html) | multi-step · conditional reveal · error summary | form | ⊝ deferred — manual entry route not walked |
| 17 | Filter strip | [`filters.html`](./filters.html) | date · category · amount · tag · search | filter | ✅ [filter-strip-live.html](../atoms/legacy-snapshots/filter-strip-live.html) + [filter-search-live.html](../atoms/legacy-snapshots/filter-search-live.html) + [filter-active-chips-live.html](../atoms/legacy-snapshots/filter-active-chips-live.html) |
| 18 | List item | [`list-item.html`](./list-item.html) | navigable · selectable · swipeable | list | ⊝ deferred — Ajustes route not walked; profile-menu items captured inline |

**Legend:** ✅ captured — live snapshot exists · ≈ analog captured under a different name · ⊝ deferred / skipped — see manifest for reason.

---

## State matrix (Ent tier — full coverage)

| Molecule | default | hover | active | focus | disabled | loading | error |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| state-tabs | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| card-transaction | ✅ | ✅ | ✅ (selected) | — | ✅ | ✅ (skeleton) | — |
| card-stat | ✅ | ✅ | ✅ (selected) | — | — | ✅ (skeleton) | — |
| card-empty | ✅ | — | — | — | — | — | — |
| card-feature | ✅ | — | — | — | — | — | — |
| card-celebration | ✅ | — | — | — | — | — | — |
| modal | ✅ | — | — | ✅ (focus trap) | — | ✅ (footer btn) | ✅ (variant) |
| sheet | ✅ | — | — | ✅ | — | — | — |
| drawer | ✅ | — | — | ✅ | — | — | — |
| toast | ✅ (entering · default · dismissing) | — | — | — | — | — | ✅ (variant) |
| banner | ✅ | — | — | — | — | — | ✅ (variant) |
| nav-bottom | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| nav-top | ✅ · is-elevated | — | — | ✅ | — | — | — |
| nav-sidebar | ✅ | ✅ | ✅ | ✅ | — | — | — |
| fab | ✅ | ✅ | ✅ (pressed) | ✅ | ✅ | — | — |
| form | ✅ | — | — | ✅ | ✅ | ✅ (submitting) | ✅ (summary + per-field) |
| filter-strip | ✅ | ✅ | ✅ · with-count | ✅ | ✅ | — | — |
| list-item | ✅ | ✅ | ✅ (selected) | ✅ | — | — | — |

**Legend.** ✅ documented in molecule's demo · — not applicable to that molecule shape.

---

## Atom dependency map

| Molecule | Atoms used | Composes (other molecules) |
|----------|-----------|---------------------------|
| state-tabs | — | — |
| card-transaction | skeleton | — |
| card-stat | skeleton | — |
| card-empty | button | — |
| card-feature | button | — |
| card-celebration | button | — |
| modal | button, field-input, field-select, progress | — |
| sheet | button | list-item, filter-strip |
| drawer | button | card-transaction, filter-strip, list-item |
| toast | — | — |
| banner | button | — |
| nav-bottom | — | — |
| nav-top | button, avatar, field-input | filter-search (sub-pattern) |
| nav-sidebar | avatar | — |
| fab | — | — |
| form | field-input, field-select, field-label, button, chip | — |
| filter-strip | chip, field-input, button | — |
| list-item | — | — |

**Dependency rule.** Molecules MAY compose other molecules (drawer composes card-transaction). Atoms MUST NOT compose molecules — strictly bottom-up. P5-P12 screens compose freely from both layers.

---

## Icon style contract (`body[data-icon-style]`)

`card-transaction` is the first molecule with category iconography, so it sets the runtime contract that every downstream consumer (P5-P12 screens, future molecules with `--cat-X` badges) must follow.

**Two render branches, one DOM:**

```html
<span class="card-tx-badge is-supermercado" data-cat-emoji="🛒">
  <img class="cat-icon-pixel" src="../assets/icons/categories/l1/l1-supermercado.svg" alt="">
</span>
```

- `data-cat-emoji` — Unicode glyph rendered via CSS `::before` when the page is in emoji mode
- `<img class="cat-icon-pixel">` — legacy pixel-art SVG rendered white via `filter: invert(1)` when the page is in pixel mode

**Toggle source:** Tweaks panel → "Icons" chip group sets `body[data-icon-style="pixel"]` (default) or `body[data-icon-style="emoji"]`. Persisted to localStorage. Applies globally to every category badge across the mockup surface.

**P5-P12 contract:** any new screen that renders a category badge MUST emit BOTH attributes. Single-mode shortcuts (only emoji, only pixel) drift from the catalog and break the toggle for that surface. Adding a new category requires defining `--cat-{name}` + `--cat-{name}-tint` in `desktop-shell.css` (all 6 themes), placing the L1 SVG at `assets/icons/categories/l1/l1-{name}.svg`, and picking a representative emoji glyph.

---

## A11y baseline (WCAG AA target)

All molecules carry these baseline guarantees, verified per-component on the demo page:

- **Color contrast.** All foreground/background pairings meet AA (4.5:1 normal text, 3:1 large text + UI components). The Mono Dark `--primary-ink` gap surfaced in Phase 2 atoms remains a P13 audit follow-up — molecules inherit the same token discipline so the gap is single-source-fix.
- **Keyboard.** Every interactive control reachable via Tab. Focus rings rendered via `:focus-visible` (no outline suppression). State-tabs supports arrow-key navigation in tweaks.js (M3 follow-up if not present at lock).
- **Semantics.** `role="dialog"` on modal/sheet/drawer · `role="alertdialog"` on error modal · `role="status"` on toast/banner (`role="alert"` on error variants) · `role="checkbox"` + `aria-checked` on selectable list-item · `role="tablist"`/`role="tab"`/`role="tabpanel"` on ARIA-shape state-tabs · `aria-current="page"` on active nav items.
- **Live regions.** Toasts use `aria-live="polite"` (success/info/warning) or `aria-live="assertive"` (error) implicitly via role. Banners use the same convention. Forms use `aria-invalid` on invalid fields + `role="alert"` on error summary with jump links.
- **Hit targets.** All tappable elements meet 44×44px minimum on mobile (nav-bottom items, filter chips, FAB, list-item rows).

**Audit gate.** Phase 13 (M13 / `/gabe-mockup` recipe) runs the formal contrast pass against `tokens.json` per token-pair, plus screen-reader walkthrough at Scale tier. Molecules that ship before P13 must self-document any baseline violation as a known gap in their demo page's "Composition" section.

---

## Platform variance notes

| Molecule | Mobile behavior | Desktop behavior |
|----------|-----------------|------------------|
| state-tabs | same | same |
| cards | same shape, may stack vertically | grid (auto-fill, minmax 220-280px) |
| modal | full-bleed at < 480px viewport | centered, max-width 440/560/720 |
| sheet | primary mobile pattern | upgrades to centered modal |
| drawer | mobile slide-in (alternative to sheet) | side panel, can pin permanently at ≥ 1440px |
| toast | top of viewport, edge-bleed | bottom-right, stacked |
| banner | edge-bleed for offline variant | inline with surrounding content |
| nav-bottom | mobile-only — primary nav | not used |
| nav-top | hidden (uses sheet for menu) | always visible, sticky |
| nav-sidebar | drawer-mode (`.drawer-left`) | always visible, collapsible |
| fab | bottom-right, above bottom-nav | desktop equivalent is top-bar primary CTA |
| form | sections stack, single-column | sections may go 2-column at ≥ 768px |
| filter-strip | horizontal scroll on overflow | wraps |
| list-item | swipe-actions enabled | hover row + action buttons inline |

---

## Composition examples (for screens to consume)

### Dashboard mobile — uses 7 molecules

```
nav-top         (mobile-collapsed brand + bell)
banner          (sync status — info)
card-stat × 3   (saldo · gastos hoy · concentración)
card-feature    (cohort opt-in)
card-transaction × N  (recent tx list)
fab             (floating scan trigger)
nav-bottom      (5-tab primary nav)
```

### History desktop — uses 6 molecules

```
nav-top         (full chrome with search)
nav-sidebar     (240px expanded)
filter-strip    (date + category + amount + tag + search inline)
list-item × N   (selectable mode)
drawer (right) (transaction detail when row tapped)
banner          (offline if connection drops)
```

### Single-scan mobile — uses 4 molecules

```
state-tabs      (idle / processing / reviewing / saving / error)
card-celebration (post-success — sparing)
modal (error)   (low-confidence retry)
fab             (mode menu)
```

---

## P5-P12 contract (locked)

Phases 5-12 (auth, capture, history, trends, groups, settings, edge-states) MUST:

1. Compose screens from this catalog. New molecules require a back-port to this library + COMPONENT-LIBRARY.md update + index.html card before the screen lands.
2. Use molecules.css selectors directly. No screen-local re-implementation of card/modal/sheet/drawer shells.
3. Update `INDEX.md §5 Component usage` row each time a screen lands — list every molecule consumed.
4. Surface a11y deviations in PR description, not silently. Deviations route to PENDING.md for P13 audit.

Drift from this contract is a `/gabe-commit` CHECK 9 violation.
