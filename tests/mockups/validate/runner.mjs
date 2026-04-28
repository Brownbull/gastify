#!/usr/bin/env node
/**
 * Mockup screen validator runner — orchestrates per-screen validation across
 * phone / tablet / desktop viewports.
 *
 * Emitted by `/gabe-mockup validate` (one-time per project). Subsequent runs
 * reuse this file unmodified — re-emit only with --force.
 *
 * Generated: 2026-04-28T14:16:25Z
 * Project:   gastify
 *
 * Usage:
 *   node tests/mockups/validate/runner.mjs                      # full sweep
 *   node tests/mockups/validate/runner.mjs --screens=foo,bar    # subset of screens
 *   node tests/mockups/validate/runner.mjs --viewports=phone    # subset of viewports
 *   node tests/mockups/validate/runner.mjs --severity=block     # filter
 *   node tests/mockups/validate/runner.mjs --skip-kdbp          # disable C4 category
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');
const VALIDATE_DIR = __dirname;
const CACHE_DIR = join(VALIDATE_DIR, '.cache');
const FINDINGS_DIR = join(CACHE_DIR, 'findings');
const MANIFEST_PATH = join(CACHE_DIR, 'screens.json');
const RULES_PATH = join(VALIDATE_DIR, 'rules.json');
const KDBP_VALIDATION = join(PROJECT_ROOT, '.kdbp/MOCKUP-VALIDATION.md');
const KDBP_RULES = join(PROJECT_ROOT, '.kdbp/RULES.md');
const KDBP_BEHAVIOR = join(PROJECT_ROOT, '.kdbp/BEHAVIOR.md');
const SCREENS_DIR = join(PROJECT_ROOT, 'docs/mockups/screens');
const TWEAKS_JS = join(PROJECT_ROOT, 'docs/mockups/assets/js/tweaks.js');

const args = parseArgs(process.argv.slice(2));
const rules = JSON.parse(readFileSync(RULES_PATH, 'utf8'));

if (args['skip-kdbp']) rules.categories.C4_kdbp_rules.enabled = false;

const architecture = detectArchitecture();
console.log(`[validate] Architecture: ${architecture.mode} — ${architecture.reason}`);

if (architecture.mode === 'unknown') {
  console.error(`[validate] Cannot proceed: ${architecture.reason}`);
  process.exit(2);
}

const screens = enumerateScreens(architecture);
const viewports = (Array.isArray(args.viewports) ? args.viewports : ['phone', 'tablet', 'desktop'])
  .filter(v => rules.viewports[v] !== undefined);
const screenFilter = Array.isArray(args.screens) ? new Set(args.screens) : null;
const severityFilter = Array.isArray(args.severity) ? new Set(args.severity) : null;

if (rules.categories.C4_kdbp_rules.enabled) {
  rules.kdbpRules = parseKdbpRules();
  console.log(`[validate] KDBP rules with detectors: ${rules.kdbpRules.length}`);
}

const manifest = buildManifest(screens, viewports, architecture, screenFilter);
console.log(`[validate] Targets: ${manifest.length} (${screens.length} screens × ${viewports.length} viewports)`);

if (manifest.length === 0) {
  console.error(`[validate] No targets — check --screens / --viewports filters`);
  process.exit(2);
}

mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(FINDINGS_DIR, { recursive: true });
for (const f of readdirSync(FINDINGS_DIR)) rmSync(join(FINDINGS_DIR, f));
writeFileSync(MANIFEST_PATH, JSON.stringify({ architecture, manifest, rules }, null, 2));

console.log(`[validate] Running Playwright spec...`);
await runPlaywright();

const findings = aggregateFindings()
  .map(stampStableId)
  .filter(f => !severityFilter || severityFilter.has(f.severity));
console.log(`[validate] Raw findings: ${findings.length}`);

const merged = mergeWithExisting(findings);
writeValidationDoc(merged, architecture);
console.log(`[validate] Wrote ${KDBP_VALIDATION}`);
console.log(`[validate] Done.`);

// ---------- helpers ----------

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const [k, v] = a.replace(/^--/, '').split('=');
    out[k] = v ? v.split(',') : true;
  }
  return out;
}

function detectArchitecture() {
  // Override: .kdbp/BEHAVIOR.md may carry `mockup_architecture: dynamic|per-device`
  if (existsSync(KDBP_BEHAVIOR)) {
    const m = readFileSync(KDBP_BEHAVIOR, 'utf8').match(/mockup_architecture:\s*(dynamic|per-device)/);
    if (m) return { mode: m[1], reason: 'BEHAVIOR.md override' };
  }
  if (!existsSync(SCREENS_DIR)) {
    return { mode: 'unknown', reason: 'docs/mockups/screens/ not found' };
  }
  const files = readdirSync(SCREENS_DIR).filter(f => f.endsWith('.html'));
  const perDevicePattern = /-(mobile|tablet|desktop)\.html$/;
  const hasPerDevice = files.some(f => perDevicePattern.test(f));
  const hasDynamic = existsSync(TWEAKS_JS) && /data-viewport/.test(readFileSync(TWEAKS_JS, 'utf8'));

  if (hasDynamic && hasPerDevice) {
    return { mode: 'dynamic', reason: 'hybrid: tweaks.js for shared files + per-device suffixes for divergent layouts (e.g. *-desktop.html). Per-device files override the shared file at their viewport' };
  }
  if (hasDynamic) {
    return { mode: 'dynamic', reason: 'tweaks.js sets data-viewport; no per-device file suffixes' };
  }
  if (hasPerDevice) {
    return { mode: 'per-device', reason: 'per-device file suffixes (-mobile/-tablet/-desktop) found' };
  }
  return { mode: 'unknown', reason: 'neither dynamic switcher nor per-device files detected' };
}

function enumerateScreens(architecture) {
  if (!existsSync(SCREENS_DIR)) return [];
  // Skip leading-underscore template files (like _desktop-template.html, _filter-dropdowns.html)
  // and the section index. They're scaffolding, not validation targets.
  const files = readdirSync(SCREENS_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html' && !f.startsWith('_'));

  // Each screen is { name, viewports: { phone?: url, tablet?: url, desktop?: url } }.
  // Pass 1 seeds non-suffixed files to all 3 viewports for `dynamic`; pass 2 lets
  // per-device suffixes override per-viewport. This handles three cases uniformly:
  //   - pure dynamic (gustify-style would diverge here, but: greenfield single-file)
  //   - pure per-device (gustify): only suffixed files exist, no shared base
  //   - hybrid (gastify): shared mobile-shape file + dedicated *-desktop.html
  const map = new Map();
  const perDeviceRe = /-(mobile|tablet|desktop)\.html$/;

  if (architecture.mode === 'dynamic') {
    for (const f of files.filter(f => !perDeviceRe.test(f))) {
      const name = f.replace(/\.html$/, '');
      map.set(name, { phone: `screens/${f}`, tablet: `screens/${f}`, desktop: `screens/${f}` });
    }
  }

  // Per-device files (works for both `dynamic` hybrid and `per-device` modes).
  for (const f of files.filter(f => perDeviceRe.test(f))) {
    const m = f.match(/^(.+)-(mobile|tablet|desktop)\.html$/);
    if (!m) continue;
    const [, base, vp] = m;
    const viewport = vp === 'mobile' ? 'phone' : vp;
    if (!map.has(base)) map.set(base, {});
    map.get(base)[viewport] = `screens/${f}`;
  }

  return [...map].map(([name, viewports]) => ({ name, viewports }));
}

function buildManifest(screens, viewports, architecture, filter) {
  const out = [];
  const skipPattern = new RegExp(rules.skip_screens_pattern);
  for (const screen of screens) {
    if (filter && !filter.has(screen.name)) continue;
    if (skipPattern.test(screen.name)) continue;
    if (rules.skip_screens?.includes(screen.name)) continue;
    for (const viewport of viewports) {
      const url = screen.viewports[viewport];
      if (!url) continue;
      out.push({
        screen: screen.name,
        viewport,
        url,
        viewportWidth: rules.viewports[viewport],
        architecture: architecture.mode,
      });
    }
  }
  return out;
}

function parseKdbpRules() {
  if (!existsSync(KDBP_RULES)) return [];
  const text = readFileSync(KDBP_RULES, 'utf8');
  const out = [];
  // Match R-N blocks with applies-to + optional detect lines
  const blockRe = /\*\*R-(\d+)[^*]*\*\*[\s\S]*?(?=\*\*R-\d+|\Z)/g;
  for (const m of text.matchAll(blockRe)) {
    const block = m[0];
    const idMatch = block.match(/\*\*R-(\d+)[^*]*\*\*\s*[—-]?\s*(.+)/);
    const appliesMatch = block.match(/applies-to:\s*([^\n]+)/i);
    const detectMatch = block.match(/detect:\s*([^\n]+)/i);
    const severityMatch = block.match(/severity:\s*(block|warn|info)/i);
    const expectedMatch = block.match(/expected:\s*(present|absent)/i);
    if (!idMatch || !appliesMatch) continue;
    const applies = appliesMatch[1].toLowerCase();
    if (!/mockup-screens|mockup:/.test(applies)) continue;
    out.push({
      id: `R-${idMatch[1]}`,
      summary: idMatch[2].trim().slice(0, 80),
      detect: detectMatch ? detectMatch[1].trim() : null,
      severity: severityMatch ? severityMatch[1] : 'warn',
      expected: expectedMatch ? expectedMatch[1] : 'present',
    });
  }
  return out;
}

function runPlaywright() {
  return new Promise((resolveP, rejectP) => {
    const proc = spawn('npx', ['playwright', 'test',
      'tests/mockups/validate/screen-validator.spec.ts', '--reporter=list'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        MOCKUP_VALIDATE_MANIFEST: MANIFEST_PATH,
        MOCKUP_VALIDATE_FINDINGS_DIR: FINDINGS_DIR,
      },
    });
    proc.on('exit', code => {
      if (code === 0 || code === 1) resolveP();
      else rejectP(new Error(`Playwright exited ${code}`));
    });
  });
}

function aggregateFindings() {
  if (!existsSync(FINDINGS_DIR)) return [];
  const out = [];
  for (const f of readdirSync(FINDINGS_DIR)) {
    if (!f.endsWith('.json')) continue;
    out.push(...JSON.parse(readFileSync(join(FINDINGS_DIR, f), 'utf8')));
  }
  return out;
}

function stampStableId(finding) {
  // Fingerprint distinguishes multiple findings sharing ruleId+selector on one screen
  // (e.g. 3 nav images, 5 narrow columns). Falls back to selector if absent.
  const distinguisher = finding.fingerprint ?? finding.selector ?? '';
  const key = `${finding.screen}|${finding.viewport}|${finding.ruleId}|${distinguisher}`;
  const id = createHash('sha1').update(key).digest('hex').slice(0, 10);
  return { ...finding, id };
}

function mergeWithExisting(fresh) {
  if (!existsSync(KDBP_VALIDATION)) {
    return fresh.map(f => ({ ...f, status: 'pending', notes: '' }));
  }
  const existing = readFileSync(KDBP_VALIDATION, 'utf8');
  const statusMap = new Map();
  const notesMap = new Map();
  const blockRe = /\*\*\[([a-f0-9]{10})\]\*\*[\s\S]*?(?=\n\s*-\s+\*\*\[|\n##|\n---|$)/g;
  for (const m of existing.matchAll(blockRe)) {
    const [block] = m;
    const idMatch = block.match(/\*\*\[([a-f0-9]{10})\]\*\*/);
    const statusMatch = block.match(/\*\*Status:\*\*\s*([a-z-]+)/i);
    const notesMatch = block.match(/\*\*Notes:\*\*\s*(.+?)(?:\n|$)/);
    if (idMatch && statusMatch) {
      statusMap.set(idMatch[1], statusMatch[1]);
      if (notesMatch && notesMatch[1].trim() !== '—') notesMap.set(idMatch[1], notesMatch[1].trim());
    }
  }
  return fresh.map(f => ({
    ...f,
    status: statusMap.get(f.id) ?? 'pending',
    notes: notesMap.get(f.id) ?? '',
  }));
}

function writeValidationDoc(findings, architecture) {
  const counts = {
    total: findings.length,
    block: findings.filter(f => f.severity === 'block').length,
    warn: findings.filter(f => f.severity === 'warn').length,
    info: findings.filter(f => f.severity === 'info').length,
    fixed: findings.filter(f => f.status === 'fixed-in-place').length,
    deferred: findings.filter(f => f.status === 'deferred').length,
    dismissed: findings.filter(f => f.status === 'dismissed').length,
    pending: findings.filter(f => f.status === 'pending').length,
  };
  const ts = new Date().toISOString();
  const lines = [
    '# MOCKUP-VALIDATION',
    '',
    `> **Run:** ${ts}  `,
    `> **Architecture:** ${architecture.mode} (${architecture.reason})  `,
    `> **Totals:** ${counts.total} findings — ${counts.block} block · ${counts.warn} warn · ${counts.info} info · ${counts.fixed} fixed · ${counts.deferred} deferred · ${counts.dismissed} dismissed · ${counts.pending} pending`,
    '',
    'Stable-IDs are sha1(screen+viewport+ruleId+selector) truncated to 10 chars. Re-running validate preserves user-set Status values per id. Triage actions documented in `~/.claude/templates/gabe/mockup/validate/validate-checklist.md`.',
    '',
    '---',
    '',
    '## Findings',
    '',
  ];

  const byScreen = new Map();
  for (const f of findings) {
    if (f.status === 'dismissed' || f.status === 'deferred') continue;
    if (!byScreen.has(f.screen)) byScreen.set(f.screen, []);
    byScreen.get(f.screen).push(f);
  }
  if (byScreen.size === 0) {
    lines.push('_No active findings._', '');
  } else {
    for (const [screen, items] of [...byScreen].sort()) {
      lines.push(`### ${screen}`, '');
      for (const f of items) {
        const checked = f.status === 'fixed-in-place' ? 'x' : ' ';
        lines.push(`- [${checked}] **[${f.id}]** ${f.ruleId} / ${f.severity} / ${f.viewport} — ${f.message}`);
        lines.push(`  - **Element:** \`${f.selector ?? '(none)'}\``);
        lines.push(`  - **Status:** ${f.status}`);
        lines.push(`  - **Notes:** ${f.notes || '—'}`);
        lines.push('');
      }
    }
  }

  lines.push('---', '', '## Triage Backlog (deferred)', '');
  const deferred = findings.filter(f => f.status === 'deferred');
  if (deferred.length === 0) lines.push('_(empty)_', '');
  else {
    for (const f of deferred) {
      lines.push(`- **[${f.id}]** ${f.screen} / ${f.viewport} / ${f.ruleId}: ${f.message}`);
      lines.push(`  - **Notes:** ${f.notes || '—'}`);
    }
    lines.push('');
  }

  lines.push('---', '', '## Dismissed', '');
  const dismissed = findings.filter(f => f.status === 'dismissed');
  if (dismissed.length === 0) lines.push('_(empty)_', '');
  else {
    for (const f of dismissed) {
      lines.push(`- **[${f.id}]** ${f.screen} / ${f.viewport} / ${f.ruleId}: ${f.message}`);
      lines.push(`  - **Notes:** ${f.notes || 'no reason given'}`);
    }
    lines.push('');
  }

  writeFileSync(KDBP_VALIDATION, lines.join('\n'));
}
