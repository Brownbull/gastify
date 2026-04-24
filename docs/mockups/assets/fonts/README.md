# gastify Fonts

Self-hosted Google Fonts used across all 3 legacy themes (Normal / Professional / Mono) and exploration candidates.

## Contents

| File | Family | Weights | Size |
|------|--------|---------|------|
| `QGYvz_MVcBeNP4NJtEtq.woff2` | Outfit | variable 400–800 (latin) | 31.5 KB |
| `QGYvz_MVcBeNP4NJuktqQ4E.woff2` | Outfit | variable 400–800 (latin-ext) | 14.5 KB |
| `wXK0E3kTposypRydzVT08TS3JnAmtdj9yppp_led7Q.woff2` | Baloo 2 | 700 (devanagari) | 64.3 KB |
| `wXK0E3kTposypRydzVT08TS3JnAmtdj9yppo_lc.woff2` | Baloo 2 | 700 (latin) | 19.0 KB |
| `wXK0E3kTposypRydzVT08TS3JnAmtdj9yppm_led7Q.woff2` | Baloo 2 | 700 (latin-ext) | 15.7 KB |
| `wXK0E3kTposypRydzVT08TS3JnAmtdj9yppn_led7Q.woff2` | Baloo 2 | 700 (vietnamese) | 5.3 KB |
| `gastify-fonts.css` | — | @font-face declarations pointing at local files | 5.1 KB |

Hashed filenames are Google Fonts canonical names — keep as-is (CSS references them relatively).

## Usage (HTML)

```html
<link rel="stylesheet" href="/docs/mockups/assets/fonts/gastify-fonts.css">

<style>
  body { font-family: 'Outfit', -apple-system, sans-serif; }
  .wordmark { font-family: 'Baloo 2', cursive; }
</style>
```

## Font roles per theme

| Theme | Body + Display | Playful accent |
|-------|---------------|----------------|
| Normal | Outfit | Baloo 2 (wordmark, emphasis) |
| Professional | Inter (fallback to Outfit if preferred) | — |
| Mono | system-ui stack (no web font) | — |
| Organic | DM Sans + DM Serif Display (add if selected) | — |
| Playful Geometric | Outfit + Plus Jakarta Sans | — |
| Sketch | Caveat + Patrick Hand + Kalam (add if selected) | — |

**Source for further fonts:** Google Fonts CSS2 API — same pattern as this bundle. Fetch with `curl -A "Mozilla/5.0 ..." "https://fonts.googleapis.com/css2?family=<NAME>:wght@<WEIGHTS>&display=swap"`, parse woff2 URLs, download, rewrite relative paths.

## Claude Design upload

Drag this entire `fonts/` folder (or just the `.woff2` files + `gastify-fonts.css`) into "Add fonts, logos and assets" field during design system setup.

Claude Design warning "Missing brand fonts" fires when fonts aren't uploaded — it falls back to web font substitutes. Uploading these closes that warning.

## License

Outfit — SIL Open Font License 1.1 (https://fonts.google.com/specimen/Outfit)
Baloo 2 — SIL Open Font License 1.1 (https://fonts.google.com/specimen/Baloo+2)

Both permit self-hosting + redistribution.
