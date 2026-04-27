/**
 * Inject a "LEGACY · BoletApp staging" section into a molecule HTML file,
 * matching the pattern established in card-transaction.html.
 *
 * Inserts BEFORE the trailing `<script src="../assets/js/tweaks.js" defer></script>` line.
 *
 * Usage: node scripts/inject-legacy-section.mjs <molecule-html> <snapshot-name> <source-route> <selector> <description>
 *
 * Where snapshot-name is the basename of the snapshot file (without -live.html suffix), e.g. `card-stat`.
 */
import fs from "node:fs";

const [, , htmlPath, snapshotName, sourceRoute, selector, description] = process.argv;
if (!htmlPath || !snapshotName) {
  console.error("Usage: node inject-legacy-section.mjs <html> <snapshot-name> <route> <selector> <description>");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const section = `  <section class="demo-section legacy-section">
    <h2><span class="legacy-tag">LEGACY · BoletApp staging</span> Live extraction (${today})</h2>
    <p class="legacy-note" style="font-size: 12px; color: var(--ink-2); line-height: 1.5; max-width: 720px;">
      Captured live from <code>https://boletapp-staging.web.app${sourceRoute}</code> via Playwright MCP. Selector: <code>${selector.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>. Notes: ${description}. Source: <a href="../atoms/legacy-snapshots/${snapshotName}-live.html" style="color: var(--primary); font-weight: 600;">${snapshotName}-live.html</a> · Manifest: <a href="../atoms/legacy-snapshots/EXTRACTION-MANIFEST.md" style="color: var(--primary); font-weight: 600;">EXTRACTION-MANIFEST.md</a>
    </p>
    <iframe
      src="../atoms/legacy-snapshots/${snapshotName}-live.html"
      title="Live BoletApp staging ${snapshotName}"
      style="width: 100%; max-width: 360px; height: 240px; border: 1px solid var(--line); border-radius: 8px; background: #fafafa; margin-top: 12px;"
      loading="lazy"></iframe>
  </section>

`;

const html = fs.readFileSync(htmlPath, "utf8");
const marker = `  <script src="../assets/js/tweaks.js" defer></script>`;
if (!html.includes(marker)) {
  console.error(`No marker found in ${htmlPath}`);
  process.exit(1);
}
if (html.includes("LEGACY · BoletApp staging")) {
  console.log(`${htmlPath}: already has legacy section, skipping`);
  process.exit(0);
}

const updated = html.replace(marker, section + marker);
fs.writeFileSync(htmlPath, updated);
console.log(`${htmlPath}: legacy section injected`);
