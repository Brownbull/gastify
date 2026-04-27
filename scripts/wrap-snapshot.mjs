/**
 * Tiny helper: read a JSON-stringified extraction blob and wrap it as a
 * legacy-snapshot HTML fragment with metadata header + scoped wrapper class.
 *
 * Usage: node scripts/wrap-snapshot.mjs <input.txt> <output.html> <name> <route> <selector> <description>
 */
import fs from "node:fs";

const [, , inputPath, outputPath, name, route, selector, description] = process.argv;
if (!inputPath || !outputPath || !name) {
  console.error("Usage: node wrap-snapshot.mjs <input.txt> <output.html> <name> <route> <selector> <description>");
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");
const html = JSON.parse(raw);
const today = new Date().toISOString().slice(0, 10);

const wrapped = `<!--
  ${name} — live snapshot from BoletApp staging
  Source:    https://boletapp-staging.web.app${route}
  Selector:  ${selector}
  Captured:  ${today} via Playwright MCP (interactive walkthrough)
  Auth:      TestUserMenu → alice
  Notes:     ${description}
  All CSS variables resolved to computed RGB/px so the snippet renders standalone.
  Wrap with .legacy-snippet--${name}-live for scoped use.
-->
<div class="legacy-snippet legacy-snippet--${name}-live" data-source="boletapp-staging" data-route="${route}" data-selector='${selector}'>
  <style>
    .legacy-snippet--${name}-live { display: flex; flex-direction: column; gap: 8px; max-width: 360px; padding: 12px; background: #fafafa; }
    .legacy-snippet--${name}-live svg { display: inline-block; }
  </style>
${html}
</div>
`;

fs.writeFileSync(outputPath, wrapped);
console.log(`Wrote ${outputPath} — ${wrapped.length} bytes`);
