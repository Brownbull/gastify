#!/usr/bin/env node
/**
 * check-story-baseline — Phase-10 smoke gate.
 *
 * Every screen surface under features/<feature>/screens/ must be reachable in
 * Storybook, so no screen ships invisible/untested. "Reachable" = it has its own
 * `*.stories.tsx`, OR its export is referenced by a STORIED entry file (any
 * `*.stories.tsx`, or any component that has a sibling story — e.g. a *Flow that
 * renders it as a step). Internal components (pickers/dialogs/subviews) are
 * intentionally exempt — they are covered through their parent screen's story.
 *
 * Exit 1 if any screen is orphaned (no story + referenced nowhere storied).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "archive") out.push(...walk(p)); }
    else if (e.name.endsWith(".tsx") && !e.name.includes(".archive.")) out.push(p);
  }
  return out;
}

const all = walk(SRC);
const storyOf = (f) => f.replace(/\.tsx$/, ".stories.tsx");
const hasStory = (f) => fs.existsSync(storyOf(f));

// storied-entry files: every story, plus every component that has a sibling story
// (so a *Flow.tsx with a *Flow.stories.tsx counts as a reachable parent).
const storiedEntries = all.filter((f) => f.endsWith(".stories.tsx") || (!f.endsWith(".stories.tsx") && hasStory(f)));
const haystack = storiedEntries.map((f) => fs.readFileSync(f, "utf8")).join("\n");

// targets: screen surfaces (non-story tsx directly under a feature's screens/ dir)
const screens = all.filter((f) => /\/features\/[^/]+\/screens\/[^/]+\.tsx$/.test(f) && !f.endsWith(".stories.tsx"));

const orphans = [];
let direct = 0, viaParent = 0;
for (const s of screens) {
  const name = path.basename(s, ".tsx");
  if (hasStory(s)) { direct++; continue; }
  if (new RegExp(`\\b${name}\\b`).test(haystack)) { viaParent++; continue; }
  orphans.push(path.relative(ROOT, s));
}

if (orphans.length === 0) {
  console.log(`✓ story-baseline: ${screens.length} screens reachable in Storybook (${direct} direct stories, ${viaParent} via a storied parent).`);
  process.exit(0);
}
console.error(`✗ story-baseline: ${orphans.length} screen(s) with NO story and referenced by nothing storied (invisible in Storybook):\n`);
for (const o of orphans) console.error(`  ${o}`);
console.error(`\nFix: add a <Screen>.stories.tsx, or render it in a *Flow story / a parent screen that has one.`);
process.exit(1);
