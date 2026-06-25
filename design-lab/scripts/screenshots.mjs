#!/usr/bin/env node
/**
 * screenshots — Phase-10 Playwright nav/screen capture harness.
 *
 * Auto-discovers stories from Storybook's index.json and captures each at one or
 * more platform frames (mobile/tablet/desktop) into screenshots/<platform>/.
 * A visual record for handoff/review; the output dir is gitignored (run on demand).
 *
 * Requires Storybook running: `npm run storybook` (http://localhost:6008).
 *
 * Usage:
 *   npm run screenshots                         # screen stories, mobile
 *   npm run screenshots -- --platform=mobile,tablet,desktop
 *   npm run screenshots -- --filter=scan        # only ids containing "scan"
 *   npm run screenshots -- --all                # every story, not just screens
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:6008";
const OUT = path.join(ROOT, "screenshots");

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const platforms = arg("platform", "mobile").split(",");
const filter = arg("filter", "");
const all = args.includes("--all");

const VIEWPORT = { mobile: { width: 460, height: 940 }, tablet: { width: 900, height: 1180 }, desktop: { width: 1380, height: 980 } };

const res = await fetch(`${BASE}/index.json`).catch(() => null);
if (!res || !res.ok) {
  console.error(`✗ Storybook not reachable at ${BASE}. Run \`npm run storybook\` first.`);
  process.exit(1);
}
const { entries } = await res.json();
let ids = Object.values(entries).filter((e) => e.type === "story").map((e) => e.id);
if (!all) ids = ids.filter((id) => id.includes("-screens-"));
if (filter) ids = ids.filter((id) => id.includes(filter));
ids.sort();
if (ids.length === 0) { console.error("✗ no stories matched."); process.exit(1); }

const browser = await chromium.launch();
let ok = 0, fail = 0;
for (const platform of platforms) {
  const vp = VIEWPORT[platform] ?? VIEWPORT.mobile;
  const dir = path.join(OUT, platform);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  for (const id of ids) {
    try {
      await page.goto(`${BASE}/iframe.html?id=${id}&viewMode=story&globals=platform:${platform}`, { waitUntil: "load" });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(dir, `${id}.png`) });
      ok++;
    } catch (err) {
      console.error(`  ✗ ${platform}/${id}: ${err.message.split("\n")[0]}`);
      fail++;
    }
  }
  await page.close();
}
await browser.close();
console.log(`✓ screenshots: ${ok} captured${fail ? `, ${fail} failed` : ""} → screenshots/{${platforms.join(",")}}/ (${ids.length} stories × ${platforms.length} platform${platforms.length > 1 ? "s" : ""})`);
process.exit(fail ? 1 : 0);
