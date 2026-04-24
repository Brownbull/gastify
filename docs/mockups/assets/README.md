# gastify Design Assets

Self-hosted assets for Claude Design + downstream mockup / implementation surfaces.

## Contents

| Path | Purpose | Size |
|------|---------|------|
| `fonts/` | Outfit + Baloo 2 self-hosted woff2 + CSS (`gastify-fonts.css`) | ~155 KB |
| `icons/` | 200+ pixel-art PNG icons (nav, actions, scan, categories, mascots) | ~956 KB |
| `tokens/` | Canonical V4 taxonomy (12 L1 / 44 L2 / 9 L3 / 42 L4) + category colors × 3 themes × 2 modes (production-proven TS files) | ~85 KB |
| `css/` | Shared desktop-shell CSS (`desktop-shell.css` — 6-theme × light/dark variants via `[data-theme][data-mode]`, P1 exit artifact) | ~31 KB |
| `js/` | Runtime Tweaks panel (`tweaks.js` — self-contained theme/mode/font/density/radius switcher + state-tabs driver). Single `<script>` include per mockup. | ~10 KB |

Total: ~1.3 MB — safe to upload to Claude Design or bundle with design-system.html.

## Usage in Claude Design setup

Drag entire `assets/` folder (or each subfolder) into the "Add fonts, logos and assets" field. Closes "Missing brand fonts" warning and gives Claude Design icon vocabulary to reference when rendering screens.

## Usage in rendered HTML

```html
<link rel="stylesheet" href="/docs/mockups/assets/fonts/gastify-fonts.css">
<link rel="stylesheet" href="/docs/mockups/assets/css/desktop-shell.css">
<style>
  body { font-family: 'Outfit', sans-serif; }
  .wordmark { font-family: 'Baloo 2', cursive; }
</style>

<img src="/docs/mockups/assets/icons/app-icons/navigation/nav-home.png" width="32" height="32" alt="Inicio">

<!-- Runtime Tweaks panel (single-script include, injects its own panel + styles) -->
<script src="/docs/mockups/assets/js/tweaks.js" defer></script>
```

From a screen at `docs/mockups/screens/<x>.html` use relative paths: `../assets/css/desktop-shell.css`, `../assets/js/tweaks.js`, `../assets/fonts/gastify-fonts.css`.

See `fonts/README.md`, `icons/README.md`, and `tokens/README.md` for per-asset detail.
