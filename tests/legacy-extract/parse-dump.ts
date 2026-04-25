/**
 * parse-dump.ts — Layer A legacy extraction (offline, no Playwright).
 *
 * Parses the pre-extracted HTML dump at
 *   docs/mockups/legacy-reference/claude-design/preview/
 * and emits per-atom-per-theme snapshots into
 *   docs/mockups/atoms/legacy-snapshots/<atom>-<theme>[-<mode>].html
 *
 * Each snapshot is a self-contained HTML fragment ready to inline into
 * the corresponding atom demo page. Keeps inline styles intact so the
 * snippet renders standalone outside the legacy theme system.
 *
 * Run: `npm run extract:dump`
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const DUMP_DIR = resolve(
  REPO_ROOT,
  "docs/mockups/legacy-reference/claude-design/preview"
);
const OUT_DIR = resolve(REPO_ROOT, "docs/mockups/atoms/legacy-snapshots");

type ParsedSource = {
  filename: string;
  atom: string;        // "button" | "chip"
  theme: string;       // "normal" | "professional" | "mono"
  mode: string | null; // "light" | "dark" | null
  bodyInner: string;   // raw HTML inside <body> (no body tags)
  styleBlock: string;  // raw CSS from the first <style> block, if any
};

function parseFilename(filename: string): { atom: string; theme: string; mode: string | null } | null {
  // Maps "buttons-X.html" → { atom: "button", theme: X, mode: null }
  // Maps "chips-X-Y.html" → { atom: "chip", theme: X, mode: Y }
  const buttonMatch = filename.match(/^buttons-(normal|professional|mono)\.html$/);
  if (buttonMatch) return { atom: "button", theme: buttonMatch[1], mode: null };

  const chipMatch = filename.match(/^chips-(normal|professional|mono)-(light|dark)\.html$/);
  if (chipMatch) return { atom: "chip", theme: chipMatch[1], mode: chipMatch[2] };

  return null;
}

function extractBodyInner(html: string): string {
  // Pull <body ...>...</body> innards. Tolerant of attributes on <body>.
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!m) throw new Error("no <body> found");
  return m[1].trim();
}

function extractStyleBlock(html: string): string {
  // Pull contents of the first <style>...</style> block, if any.
  const m = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1].trim() : "";
}

function scopeCss(css: string, scopeSelector: string): string {
  // Naive but workable rule-by-rule scoper.
  // Replace every selector with `${scopeSelector} ${selector}` so rules
  // don't collide with atoms.css when inlined into the demo page.
  // Skip @-rules (@font-face, @keyframes, @media) — leave them at root.
  // Strip html/body resets entirely (they'd break the host page).
  return css
    .split("}")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      const braceIdx = trimmed.indexOf("{");
      if (braceIdx === -1) return "";
      const selector = trimmed.slice(0, braceIdx).trim();
      const body = trimmed.slice(braceIdx);

      // Skip resets that would cascade outside the snippet.
      if (/^(html|body|html\s*,\s*body|\*)\b/.test(selector)) return "";

      // Skip @-rules — leave them ungenerated for safety.
      if (selector.startsWith("@")) return "";

      // Scope every comma-separated selector individually.
      const scoped = selector
        .split(",")
        .map((s) => `${scopeSelector} ${s.trim()}`)
        .join(", ");
      return `${scoped} ${body}`;
    })
    .filter((r) => r.length > 0)
    .join("\n}\n") + (css.includes("}") ? "\n}" : "");
}

function loadSources(): ParsedSource[] {
  const files = readdirSync(DUMP_DIR);
  const out: ParsedSource[] = [];
  for (const filename of files) {
    const meta = parseFilename(filename);
    if (!meta) continue;
    const html = readFileSync(resolve(DUMP_DIR, filename), "utf8");
    const bodyInner = extractBodyInner(html);
    const styleBlock = extractStyleBlock(html);
    out.push({ filename, ...meta, bodyInner, styleBlock });
  }
  return out;
}

function buildSnapshot(src: ParsedSource): string {
  const themeAttr = ` data-theme="${src.theme}"`;
  const modeAttr = src.mode ? ` data-mode="${src.mode}"` : "";
  const sourceLabel = `boletapp-dump:${src.filename}`;
  const themeLabel = src.mode ? `${src.theme} · ${src.mode}` : src.theme;

  // Clean up the body content: strip any wrapping <div class="wrap">,
  // but preserve the inner variant elements + their inline styles.
  // The dump uses .wrap as a flexbox container — we replace it with a
  // simpler legacy-variants container that the atom demo styles.
  const wrapMatch = src.bodyInner.match(/<div[^>]*class=["']wrap["'][^>]*>([\s\S]*)<\/div>\s*$/);
  const variants = wrapMatch ? wrapMatch[1].trim() : src.bodyInner;

  // Scope the dump's <style> block to the snippet container so the
  // dump's `.btn` rules don't collide with atoms.css `.btn`.
  // Use a unique scope class derived from the source filename.
  const scopeClass = `legacy-snippet--${src.filename.replace(/\.html$/, "")}`;
  const scopedCss = src.styleBlock
    ? scopeCss(src.styleBlock, `.${scopeClass}`)
    : "";
  const styleTag = scopedCss ? `\n  <style>\n${scopedCss}\n  </style>\n` : "";

  return `<!-- generated by tests/legacy-extract/parse-dump.ts; do not edit by hand -->
<!-- source: legacy-reference/claude-design/preview/${src.filename} -->
<div class="legacy-snippet ${scopeClass}" data-source="${sourceLabel}"${themeAttr}${modeAttr}>${styleTag}  <div class="legacy-snippet__label">Theme: ${themeLabel}</div>
  <div class="legacy-snippet__variants">
${variants
      .split("\n")
      .map((l) => "    " + l.trim())
      .filter((l) => l.trim().length > 0)
      .join("\n")}
  </div>
</div>
`;
}

function main(): void {
  const sources = loadSources();
  if (sources.length === 0) {
    console.error(`No source files found under ${DUMP_DIR}`);
    process.exit(1);
  }

  let written = 0;
  for (const src of sources) {
    const snapshot = buildSnapshot(src);
    const modePart = src.mode ? `-${src.mode}` : "";
    const outFile = resolve(OUT_DIR, `${src.atom}-${src.theme}${modePart}.html`);
    writeFileSync(outFile, snapshot, "utf8");
    written++;
    console.log(`  ${src.atom}-${src.theme}${modePart}.html  ←  ${src.filename}`);
  }
  console.log(`\nWrote ${written} snapshot(s) to ${OUT_DIR}`);
}

main();
