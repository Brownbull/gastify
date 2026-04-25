import { defineConfig, devices } from "@playwright/test";

/**
 * Legacy extraction config — separate from `playwright.config.ts` so it
 * doesn't run during `npm test`. Connects to a running BoletApp instance
 * (local dev or Firebase staging), extracts atom DOM + computed styles,
 * writes snapshots into `docs/mockups/atoms/legacy-snapshots/`.
 *
 * Usage:
 *   1. Source legacy creds (the legacy `.env` file is in
 *      /home/khujta/projects/bmad/boletapp/.env at lines 27-28):
 *        export LEGACY_TEST_USER_EMAIL='...'
 *        export LEGACY_TEST_USER_PASSWORD='...'
 *   2. (Optional) Override base URL — defaults to staging deploy:
 *        export LEGACY_BASE_URL='http://localhost:5174'
 *   3. Run:
 *        npm run extract:legacy
 *
 * Mobile viewport (360x780) — matches legacy boletapp's primary form-factor.
 */
const DEFAULT_BASE = "https://boletapp-staging.web.app";

export default defineConfig({
  testDir: ".",
  testMatch: /extract-atoms\.spec\.ts$/,
  fullyParallel: false,        // run in order, single context (auth state shared via fixture)
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.LEGACY_BASE_URL || DEFAULT_BASE,
    viewport: { width: 360, height: 780 },
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "legacy-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
