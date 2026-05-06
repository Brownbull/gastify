#!/usr/bin/env node
/**
 * A.3 + A.5: Visual ground-truth refresh + Accessibility baseline.
 *
 * Starts the dev server, navigates to each view, captures:
 * - Screenshots at 3 viewport sizes (mobile/tablet/desktop)
 * - axe accessibility violations per view
 *
 * Usage:
 *   node scripts/capture-baseline.mjs [--a11y-only] [--screenshots-only]
 *
 * Output:
 *   docs/rebuild/ux/baseline-snapshots/<view>-<viewport>.png
 *   docs/rebuild/ux/a11y-baseline.json
 */

import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FRONTEND = resolve(ROOT, 'frontend');
const SNAPSHOTS_DIR = resolve(ROOT, 'docs/rebuild/ux/baseline-snapshots');
const A11Y_OUTPUT = resolve(ROOT, 'docs/rebuild/ux/a11y-baseline.json');

const DEV_PORT = 5174;
const DEV_URL = `http://localhost:${DEV_PORT}`;

const VIEWS = [
  'dashboard',
  'history',
  'trends',
  'items',
  'insights',
  'reports',
  'recent-scans',
  'alerts',
  'settings',
  'batch-capture',
  'statement-scan',
];

const VIEWPORTS = {
  mobile:  { width: 390, height: 844 },
  tablet:  { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const THEMES = [
  { mode: 'light', colorTheme: 'normal' },
  { mode: 'dark',  colorTheme: 'normal' },
  { mode: 'light', colorTheme: 'professional' },
  { mode: 'dark',  colorTheme: 'professional' },
  { mode: 'light', colorTheme: 'mono' },
  { mode: 'dark',  colorTheme: 'mono' },
];

const args = process.argv.slice(2);
const a11yOnly = args.includes('--a11y-only');
const screenshotsOnly = args.includes('--screenshots-only');

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

async function navigateToView(page, viewName) {
  await page.evaluate((v) => {
    const store = window.__ZUSTAND_NAVIGATION_STORE__;
    if (store) {
      store.getState().setView(v);
    }
  }, viewName);
  await page.waitForTimeout(1000);
}

async function exposeNavigationStore(page) {
  await page.evaluate(() => {
    const allStores = window.__ZUSTAND_STORES__ || {};
    for (const [name, store] of Object.entries(allStores)) {
      if (name.includes('navigation') || name.includes('Navigation')) {
        window.__ZUSTAND_NAVIGATION_STORE__ = store;
        return;
      }
    }
    const navEl = document.querySelector('[data-view]');
    if (navEl) {
      console.log('Found data-view element, attempting direct navigation');
    }
  });
}

async function runAxeAudit(page) {
  const AxeBuilder = (await import('@axe-core/playwright')).default;
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return {
    violations: results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length,
    })),
    passes: results.passes.length,
    incomplete: results.incomplete.length,
  };
}

async function main() {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  console.log('Starting dev server...');
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND,
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });

  let serverOutput = '';
  devServer.stdout.on('data', d => { serverOutput += d.toString(); });
  devServer.stderr.on('data', d => { serverOutput += d.toString(); });

  try {
    await waitForServer(DEV_URL);
    console.log('Dev server ready.');

    const browser = await chromium.launch({ headless: true });
    const a11yResults = {};

    if (!screenshotsOnly) {
      console.log('\n=== A.5: Accessibility Baseline ===');
      const context = await browser.newContext({ viewport: VIEWPORTS.mobile });
      const page = await context.newPage();
      await page.goto(DEV_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      for (const view of VIEWS) {
        process.stdout.write(`  axe: ${view}...`);
        try {
          await navigateToView(page, view);
          const audit = await runAxeAudit(page);
          a11yResults[view] = audit;
          const violationCount = audit.violations.reduce((s, v) => s + v.nodes, 0);
          console.log(` ${audit.violations.length} rules, ${violationCount} nodes, ${audit.passes} passes`);
        } catch (err) {
          console.log(` ERROR: ${err.message}`);
          a11yResults[view] = { error: err.message };
        }
      }

      await context.close();

      const output = {
        captured_at: new Date().toISOString(),
        tool: '@axe-core/playwright',
        tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        views: a11yResults,
      };
      writeFileSync(A11Y_OUTPUT, JSON.stringify(output, null, 2));
      console.log(`\nA.5 output: ${A11Y_OUTPUT}`);
    }

    if (!a11yOnly) {
      console.log('\n=== A.3: Visual Ground-Truth Refresh ===');
      for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
        for (const theme of THEMES) {
          const context = await browser.newContext({ viewport: vpSize });
          const page = await context.newPage();
          await page.goto(DEV_URL, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);

          // Set theme
          await page.evaluate(({ mode, colorTheme }) => {
            if (mode === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
            const appRoot = document.querySelector('[data-theme]');
            if (appRoot) appRoot.setAttribute('data-theme', colorTheme);
          }, theme);

          for (const view of VIEWS) {
            const filename = `${view}-${vpName}-${theme.mode}-${theme.colorTheme}.png`;
            process.stdout.write(`  capture: ${filename}...`);
            try {
              await navigateToView(page, view);
              await page.screenshot({
                path: resolve(SNAPSHOTS_DIR, filename),
                fullPage: true,
              });
              console.log(' OK');
            } catch (err) {
              console.log(` ERROR: ${err.message}`);
            }
          }

          await context.close();
        }
      }
      console.log(`\nA.3 output: ${SNAPSHOTS_DIR}/`);
    }

    await browser.close();
  } finally {
    devServer.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));
    try { devServer.kill('SIGKILL'); } catch {}
  }

  console.log('\n=== Baseline capture complete ===');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
