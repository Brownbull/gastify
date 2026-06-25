/**
 * Generates web/src/styles/tokens.css from shared/design-tokens.ts.
 *
 * Ported from design-lab/scripts/generate-tokens-css.mjs (W1 token foundation).
 * Single theme (Playful Geometric, DM-1). Emits:
 *  1. One `:root` block of CSS custom properties (the semantic role values +
 *     fonts + the ink shadow color) — same var NAMES web already styles off, so
 *     the swap auto-recolors every inline `var(--*)` usage.
 *  2. A Tailwind 4 `@theme inline` block exposing the `gt-*` utility namespace
 *     (bg-gt-bg, text-gt-ink, border-gt-line-strong, rounded-gt-lg,
 *     shadow-gt-md, font-gt-display, ease-gt-bounce, …) backed by var()
 *     references so utilities resolve through the cascade.
 *
 * shared/design-tokens.ts is the single source for web + mobile + design-lab.
 * Never hand-edit tokens.css — edit the source and re-run this.
 *
 * Run: npm run generate:tokens   (Node >= 22.18 for TS type stripping)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const tokens = await import("../../shared/design-tokens.ts");

const { colors, cssVarFor, twKeyFor, fontFamily, fontSize, lineHeight, radius, spacing, shadow, motion } = tokens;

const colorKeys = /** @type {Array<keyof typeof cssVarFor>} */ (Object.keys(cssVarFor));

const rootLines = [
  `  --font-family: ${fontFamily.body};`,
  `  --font-display: ${fontFamily.display};`,
  `  --font-alt: ${fontFamily.alt};`,
  ...colorKeys.map((k) => `  ${cssVarFor[k]}: ${colors[k]};`),
];

const blocks = [
  `/* GENERATED FILE — do not edit by hand.\n   Source: shared/design-tokens.ts · Regenerate: npm run generate:tokens\n   Playful Geometric single theme (DM-1). */`,
  `:root {\n${rootLines.join("\n")}\n}`,
];

const themeLines = [];
for (const [k, tw] of Object.entries(twKeyFor)) {
  themeLines.push(`  --color-gt-${tw}: var(${cssVarFor[k]});`);
}
themeLines.push(`  --font-gt-body: var(--font-family);`);
themeLines.push(`  --font-gt-display: var(--font-display);`);
themeLines.push(`  --font-gt-alt: var(--font-alt);`);
for (const [k, px] of Object.entries(fontSize)) {
  themeLines.push(`  --text-gt-${k}: ${px}px;`);
  themeLines.push(`  --text-gt-${k}--line-height: ${lineHeight.normal};`);
}
for (const [k, px] of Object.entries(radius)) {
  themeLines.push(`  --radius-gt-${k}: ${px}px;`);
}
for (const [k, px] of Object.entries(spacing)) {
  themeLines.push(`  --spacing-gt-${k}: ${px}px;`);
}
for (const [k, value] of Object.entries(shadow)) {
  themeLines.push(`  --shadow-gt-${k}: ${value};`);
}
themeLines.push(`  --ease-gt-out: ${motion.easing.out};`);
themeLines.push(`  --ease-gt-in-out: ${motion.easing.inOut};`);
themeLines.push(`  --ease-gt-bounce: ${motion.easing.bounce};`);

blocks.push(`@theme inline {\n${themeLines.join("\n")}\n}`);

const outPath = path.resolve(dirname, "../src/styles/tokens.css");
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, blocks.join("\n\n") + "\n");
console.log(`wrote ${outPath}`);
