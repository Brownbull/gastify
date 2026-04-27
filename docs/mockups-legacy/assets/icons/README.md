# gastify Icons

Pixel-art icon set generated via PixelLab MCP for BoletApp → gastify. 200+ PNGs at 64×64 default, organized by role. Transparent backgrounds. Two-tone pixel-art style consistent across all icons.

## Structure

```
assets/icons/
├── app-icons/              — production UI icons (role-organized)
│   ├── navigation/         — 8 bottom-nav / top-bar icons
│   ├── actions/            — 8 CRUD + list-op icons
│   ├── analytics/          — 4 chart-type icons
│   ├── scan-features/      — 8 scan-flow state icons
│   ├── status/             — 4 state/feedback icons
│   ├── credits/            — 2 credit-tier icons
│   ├── financial/          — 8 money/budget/receipt icons
│   ├── item-categories/    — 42 item-level category icons (86-category taxonomy subset)
│   ├── store-categories/   — 44 merchant-type icons
│   ├── rubros/             — 12 high-level rubro (category-family) icons
│   └── familias/           — 9 food-family subgroup icons
├── app-icons-gallery.html  — 557-line self-contained gallery (visual index)
└── [root-level PNGs]       — 53 character + brand icons (mascots, piggy-bank, scan-receipt, etc.)
```

## Production icon roles

### Navigation (8) — bottom-tab / sidebar-nav
`nav-home.png` · `nav-history.png` · `nav-scan.png` · `nav-trends.png` · `nav-settings.png` · `nav-alerts.png` · `nav-insights.png` · `nav-reports.png`

### Actions (8) — buttons / row-actions / list-ops
`action-add.png` · `action-delete.png` · `action-edit.png` · `action-search.png` · `action-filter.png` · `action-favorite.png` · `action-duplicate.png` · `action-split.png`

### Scan features (8) — scan-flow states
`scan-single.png` · `scan-batch.png` · `scan-statement.png` · `scan-processing.png` · `scan-success.png` · `scan-error.png` · `scan-retry.png` · `scan-crop.png`

### Analytics (4) — chart-type picker
`chart-line.png` · `chart-pie.png` · `chart-calendar.png` · `chart-export.png`

### Status (4) — banners / toasts
`status-info.png` · `status-warning.png` · `status-offline.png` · `status-sync.png`

### Financial (8) — money concepts
`fin-coin.png` · `fin-receipt.png` · `fin-wallet.png` · `fin-credit-card.png` · `fin-budget.png` · `fin-piggy-bank.png` · `fin-income-up.png` · `fin-expense-down.png`

### Credits (2) — plan tier indicators
`credit-normal.png` · `credit-super.png`

### Item categories (42) — receipt line-item classification (subset of 86-category taxonomy)
`item-alcohol.png` · `item-apparel.png` · `item-baby.png` · … (see `app-icons/item-categories/`)

### Store categories (44) — merchant type
`store-almacen.png` · `store-auto-shop.png` · `store-bakery.png` · … (see `app-icons/store-categories/`)

### Rubros (12) — SCOPE 12-rubro taxonomy anchors
`rubro-comercio-barrio.png` · `rubro-educacion.png` · `rubro-entretenimiento-hospedaje.png` · … (see `app-icons/rubros/`)

### Familias (9) — food subgroup (under Alimentación rubro)
`familia-food-fresh.png` · `familia-food-packaged.png` · `familia-food-prepared.png` · … (see `app-icons/familias/`)

### Characters + brand (53 root-level)
`piggy-bank.png`, `piggy-dollar.png`, `piggy-coin-drop.png`, `piggy-receipt.png`, `piggy-scarf.png` · `snowshoe-*` (cat mascot variants) · `cat-*` (additional cat characters) · `receipt-dollar.png`, `scan-receipt.png`, `phone-scan.png`, `peso-coin.png`, `shield-finance.png`, `chart-growth.png`, `shopping-cart.png`, `credit-card.png`, `calculator.png`, `treasure-chest.png`, `wallet-green.png`

## Usage (HTML)

```html
<!-- Bottom nav icon -->
<img src="/docs/mockups/assets/icons/app-icons/navigation/nav-home.png" alt="Inicio" width="32" height="32">

<!-- Category chip icon -->
<img src="/docs/mockups/assets/icons/app-icons/item-categories/item-alcohol.png" alt="Alcohol" width="20" height="20">

<!-- Mascot in empty state -->
<img src="/docs/mockups/assets/icons/piggy-receipt.png" alt="" width="120" height="120">
```

Default size: 64×64. Scale to 16 / 20 / 24 / 32 / 48 for UI. 64–128 for hero/empty-state surfaces.

## Theme compatibility

Icons are pixel art with transparent backgrounds → work on any theme bg. Two-tone design.

- **Normal (warm forest):** all icons render correctly. Primary warm palette harmonizes.
- **Professional (cool blue):** slight palette mismatch (icons lean warm). Optional: generate cool-tone variants via PixelLab for key nav/action icons.
- **Mono (grayscale):** use `filter: grayscale(1)` in CSS to desaturate at render time. Preserves shape, drops color.
- **Organic / Playful-Geo / Sketch:** re-evaluate per exploration — may need style-matched variants.

## Gallery preview

Open `app-icons-gallery.html` directly in a browser to browse all categorized icons at once. 557 lines, self-contained (no external deps).

## Regeneration

Icons were generated via PixelLab MCP (`mcp__pixellab__generate_image_bitforge`). Seed: the gastify domain + Chilean retail context (almacén, farmacia, panadería, etc.). To regenerate a new variant:

```
/pixel-icon <name> --style config-c --size 64
```

Or via MCP directly with prompts derived from the production-proven set in this folder.

## Claude Design upload

Drag the entire `assets/` folder (includes `fonts/` + `icons/`) into "Add fonts, logos and assets" field during design system setup. Claude Design can then reference icon paths in its renders.

If Claude Design only accepts individual files (not folders), prioritize the `navigation/` + `actions/` + `scan-features/` + `status/` subfolders first (28 files total) — these cover the core UI surface. Add others as needed.

## License

Generated by user via PixelLab for BoletApp → gastify project. Owned by project.
