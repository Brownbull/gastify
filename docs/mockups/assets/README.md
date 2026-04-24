# gastify Design Assets

Self-hosted assets for Claude Design + downstream mockup / implementation surfaces.

## Contents

| Path | Purpose | Size |
|------|---------|------|
| `fonts/` | Outfit + Baloo 2 self-hosted woff2 + CSS (`gastify-fonts.css`) | ~155 KB |
| `icons/` | 200+ pixel-art PNG icons (nav, actions, scan, categories, mascots) | ~956 KB |

Total: ~1.1 MB — safe to upload to Claude Design or bundle with design-system.html.

## Usage in Claude Design setup

Drag entire `assets/` folder (or each subfolder) into the "Add fonts, logos and assets" field. Closes "Missing brand fonts" warning and gives Claude Design icon vocabulary to reference when rendering screens.

## Usage in rendered HTML

```html
<link rel="stylesheet" href="/docs/mockups/assets/fonts/gastify-fonts.css">
<style>
  body { font-family: 'Outfit', sans-serif; }
  .wordmark { font-family: 'Baloo 2', cursive; }
</style>

<img src="/docs/mockups/assets/icons/app-icons/navigation/nav-home.png" width="32" height="32" alt="Inicio">
```

See `fonts/README.md` and `icons/README.md` for per-asset detail.
