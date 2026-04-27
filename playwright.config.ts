import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for gastify mockup tests.
 *
 * Two static servers, two test trees:
 *   - tests/mockups/**          → docs/mockups        on http://localhost:4173 (clean-slate)
 *   - tests/mockups-legacy/**   → docs/mockups-legacy on http://localhost:4176 (extracted from frontend/)
 *
 * Port 4174 is reserved for other gastify use; 4175 is Vite preview; 5174 is Vite dev.
 *
 * The static server (`http-server`) avoids the file:// protocol's CORS + cssRules
 * restrictions that break the Tweaks panel's stylesheet introspection in WSL/Windows
 * Chrome.
 *
 * Phase L1 review (2026-04-27) added the legacy server + project to close finding #4
 * (Playwright served wrong tree) and unblock finding #5 (per-atom snapshot evidence).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : "list",
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npx http-server docs/mockups -p 4173 -c-1 --silent",
      url: "http://localhost:4173/atoms/index.html",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npx http-server docs/mockups-legacy -p 4176 -c-1 --silent",
      url: "http://localhost:4176/atoms/index.html",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: "mockups",
      testDir: "./tests/mockups",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4173",
      },
    },
    {
      name: "mockups-legacy",
      testDir: "./tests/mockups-legacy",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4176",
      },
    },
  ],
});
