# Icon Style Spec — gastify pixel-icon family regeneration

**Status:** SPEC READY · regeneration BLOCKED on PixelLab credits (2026-06-10).
**Decision:** regenerate the WHOLE icon set in one locked style for Gustify-level cohesion (user, 2026-06-10).
**Applies to:** `design-lab/public/pixel-icons/**` (and later `web/`/`mobile/` once promoted).

## Why (the diagnosis)

The current set (ported from BoletApp, generated piecemeal) is **two clashing families**:

1. **~150 true pixel art** — nav, rubros, stores, items, familias, finanzas, mascots. Detailed pixel grid, dark outlines, dithered shading. Reasonably good, but with internal variance (different outline weights, the piggy is smooth-gradient, the cart is busier).
2. **~15–20 smooth *vector* glyphs** — all `status-*`, the scan state-feedback (`scan-success/error/retry/crop/processing`), and several `action-*` (`add/delete/search/favorite/split`). Glossy, anti-aliased, web-2.0 style — **not pixel art**. This is the jarring clash.

By contrast Gustify's 435-icon set is ONE coherent family generated in a single locked style (selective dark outline + dithered shading + warm palette, each filling its canvas). Reference: `/home/khujta/projects/apps/gustify/apps/web/public/generated-icons/**` + `IconImage.tsx` (smooth `object-contain`, NO `image-rendering: pixelated`).

**Render fix already applied:** `design-lab/src/design-system/assets/PixelIcon.tsx` now uses smooth `object-contain` (was forcing `pixelated`). This cleaned up the pixel-art subset; the off-family glyphs still need regeneration.

## Locked generation style

Icons stay **warm earthy pixel art** (gastify's existing mascot identity, and the same approach Gustify uses) — NOT the violet/cream UI palette. The app chrome is Playful-Geometric violet/cream; the icons are warm pixel art sitting inside it, exactly as Gustify does.

| Parameter | Locked value |
|---|---|
| Canvas | **64×64** (RGBA, transparent) — all icons, including the nav set (upscale the 32px ones) |
| Background | `no_background: true` |
| Outline | `single color black outline` (uniform dark outline — the biggest cohesion lever) |
| Shading | `basic shading` (light dithering; avoid `highly detailed` which caused the busy variance) |
| Detail | `medium detail` (avoid `highly detailed` — keeps the family calm + readable at 20px) |
| Palette | warm earthy: forest greens, terracotta, cream, slate ink outline, amber accents — consistent across all icons |
| Subject | centered, fills ~80% of canvas, single clear object, minimal scene |

## Generation workflow (when credits are available)

PixelLab generation currently returns **"Response validation failed"** even on a minimal call at the $1 balance → **out of credits; top up first**, then:

1. **Lock the reference.** Generate ONE anchor icon via `generate_image_pixflux` with the locked params above (suggest `fin-coin` — a gold coin — or `nav-home`). Iterate prompt until the style is loved. Save as the family reference.
2. **Batch via Bitforge.** Generate every icon in the manifest with `generate_image_bitforge` using the approved reference as `style_image_path` (64×64 ref required), `style_strength: 60–70`, `no_background: true`, 64×64. Bitforge inherits the reference's exact style → uniform family. (Pixflux-with-identical-params is the fallback if Bitforge is unreliable.)
3. **Overwrite in place** under `design-lab/public/pixel-icons/<name>.png` (same filenames → no code changes; `PixelIcon`/catalog pick them up).
4. **Verify** the catalog story (`Design System/Assets/Pixel Icons`) reads as one family; re-run the gates.

Cost estimate: ~160 functional icons (after trimming mascots, see below) × per-image cost — confirm against topped-up balance before batching.

## Manifest (201 icons → ~160 after trim)

Source: every PNG in `design-lab/public/pixel-icons/`. Counts by group:

| Group | Count | Notes |
|---|---|---|
| `store-*` | 44 | merchant types — name IS the subject (`store-pharmacy` → "pharmacy storefront") |
| `item-*` | 42 | line-item categories — name IS the subject (`item-dairy-eggs` → "dairy and eggs") |
| `snowshoe-*` / `cat*` / `piggy-*` | 40 | **mascots — TRIM to ~6 canonical** (snowshoe character, snowshoe face, piggy bank, piggy coins, peso coin, mascot wave). Most are redundant v3/v4 variants. |
| `rubro-*` | 12 | 12-rubro taxonomy anchors |
| `familia-*` | 9 | food subgroups |
| `nav-*` | 9 | bottom-nav / sidebar |
| `scan-*` | 9 | scan-flow states — **5 are off-family, all regenerate** |
| `action-*` | 8 | CRUD/list ops — **several off-family** |
| `chart-*` | 5 | chart-type picker |
| `status-*` | 4 | **all off-family — top priority to regenerate** |
| `credit-*`, `fin-*`, misc | ~19 | money concepts + brand |

### Curated subject prompts — UI + brand icons (the ones that appear in screens)

```
nav-home        cozy house                  fin-coin        gold coin with peso sign
nav-history     stack of receipts           fin-receipt     paper receipt
nav-scan        phone scanning a receipt    fin-wallet      leather wallet
nav-trends      upward bar chart            fin-credit-card credit card
nav-reports     clipboard with chart        fin-budget      calculator
nav-insights    glowing lightbulb           fin-piggy-bank  pink piggy bank
nav-alerts      notification bell           fin-income-up   green up arrow
nav-settings    gear cog                    fin-expense-down red down arrow
nav-profile     friendly person bust
scan-single     single receipt              action-add      plus sign
scan-batch      stack of receipts           action-delete   trash can
scan-statement  bank statement document     action-edit     pencil
scan-processing spinning gear / loading     action-search   magnifying glass
scan-success    green check mark            action-filter   funnel
scan-error      red cross mark              action-favorite heart
scan-retry      circular refresh arrow      action-duplicate two stacked papers
scan-crop       crop-frame corners          action-split    split arrows
status-info     letter i in a circle        chart-line      line chart
status-warning  warning triangle            chart-pie       pie chart
status-offline  crossed-out cloud           chart-calendar  calendar
status-sync     sync arrows over a cloud    chart-export    download/export arrow
credit-normal   single coin token           credit-super    stack of coin tokens
```

### Taxonomy icons (stores / items / rubros / familias)

Self-descriptive kebab names → subject = name minus prefix, hyphens → spaces, appended with a noun cue:
`store-*` → "<name> storefront"; `item-*`/`familia-*`/`rubro-*` → "<name>" as a single grocery/category object. (Full list lives in `design-lab/public/pixel-icons/` + the README role taxonomy.)

## Until regeneration

- Render fix is live (smooth icons).
- The catalog (`Design System/Assets/Pixel Icons`) still shows the mixed set — the off-family glyphs are knowingly inconsistent until the batch runs.
- No code/filename changes needed by the regen (overwrite-in-place), so screen/atom work can proceed in parallel.
