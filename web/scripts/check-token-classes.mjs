#!/usr/bin/env node
/**
 * check-token-classes — token-foundation guard (ported from design-lab in W1).
 *
 * Scans every `gt-*` utility class used in web source and verifies the suffix
 * exists in the matching `@theme` namespace of the generated tokens.css.
 * Catches SILENT no-ops — a class like `gap-gt-1` compiles to nothing because
 * `1` is not in the spacing scale, so the gap collapses to 0 with no error.
 *
 * The valid name sets are parsed from tokens.css (the single source), so this
 * stays correct as tokens change — run `npm run generate:tokens` first if you
 * edited shared/design-tokens.ts.
 *
 * Exit 1 on any violation; 0 when every gt-* class resolves.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const TOKENS_CSS = path.join(ROOT, "src/styles/tokens.css");

// --- 1. parse valid gt-* names per namespace from the generated @theme block ---
const sets = { color: new Set(), font: new Set(), text: new Set(), radius: new Set(), spacing: new Set(), shadow: new Set(), ease: new Set() };
for (const line of fs.readFileSync(TOKENS_CSS, "utf8").split("\n")) {
  if (line.includes("--line-height")) continue; // skip text-size line-height modifiers
  const m = line.match(/^\s*--(color|font|text|radius|spacing|shadow|ease)-gt-([a-z0-9-]+)\s*:/);
  if (m && !m[2].includes("--")) sets[m[1]].add(m[2]);
}
const ALL = new Set([...Object.values(sets)].flatMap((s) => [...s]));

// --- 2. map a utility prefix to the namespace(s) it draws from -----------------
function namespacesFor(prefix) {
  if (prefix === "text") return ["color", "text"]; // text-<color> OR text-<size>
  if (/^(shadow|inset-shadow|drop-shadow)$/.test(prefix)) return ["shadow", "color"]; // size OR colored
  if (/^(bg|border(-[trblxyse])?|ring(-offset)?|divide(-[xy])?|from|via|to|fill|stroke|outline|accent|caret|decoration|placeholder)$/.test(prefix)) return ["color"];
  if (/^(p[trblxyse]?|m[trblxyse]?|gap(-[xy])?|space-[xy]|w|h|size|min-[wh]|max-[wh]|inset(-[xy])?|top|right|bottom|left|start|end|translate(-[xy])?|scroll-[pm][trblxyse]?|basis|indent)$/.test(prefix)) return ["spacing"];
  if (/^rounded(-([trbl]|tl|tr|bl|br|s|e|ss|se|ee|es))?$/.test(prefix)) return ["radius"];
  if (prefix === "font") return ["font"];
  if (prefix === "ease") return ["ease"];
  return null; // unknown prefix → validate against the union (only flags names invalid everywhere)
}

function isValid(prefix, name) {
  const ns = namespacesFor(prefix);
  if (!ns) return ALL.has(name);
  return ns.some((n) => sets[n].has(name));
}

// --- 3. walk src for .ts/.tsx, skip archived dead code -------------------------
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "archive") out.push(...walk(p)); }
    else if (/\.(tsx?|ts)$/.test(e.name) && !e.name.includes(".archive.")) out.push(p);
  }
  return out;
}

// a token = optional negative, a utility prefix, `-gt-`, a name, optional /opacity
const TOKEN_RE = /-?[a-z][a-z0-9-]*-gt-[a-z0-9-]+(?:\/\d+)?/g;
const violations = [];
const files = walk(SRC);
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const raw of line.match(TOKEN_RE) ?? []) {
      const cls = raw.replace(/\/\d+$/, "").replace(/^-/, "");
      const [prefix, name] = cls.split("-gt-");
      if (!isValid(prefix, name)) {
        violations.push({ file: path.relative(ROOT, file), line: i + 1, cls: raw });
      }
    }
  });
}

// --- 4. report ----------------------------------------------------------------
if (violations.length === 0) {
  console.log(`✓ token-classes: ${files.length} files scanned, every gt-* class resolves to a tokens.css value.`);
  process.exit(0);
}
console.error(`✗ token-classes: ${violations.length} invalid gt-* class${violations.length > 1 ? "es" : ""} (silent no-op — not in any matching @theme namespace):\n`);
for (const v of violations) console.error(`  ${v.file}:${v.line}  →  ${v.cls}`);
console.error(`\nValid spacing: ${[...sets.spacing].join(", ")}`);
console.error(`Fix: use a defined token, or add it to shared/design-tokens.ts + regenerate tokens.css.`);
process.exit(1);
