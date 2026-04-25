import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for gastify mockup tests.
 *
 * The static server (`http-server`) avoids the file:// protocol's CORS + cssRules
 * restrictions that break the Tweaks panel's stylesheet introspection in WSL/Windows
 * Chrome. Tests reach the mockups via http://localhost:4173/atoms/<name>.html.
 */
export default defineConfig({
  testDir: "./tests/mockups",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx http-server docs/mockups -p 4173 -c-1 --silent",
    url: "http://localhost:4173/atoms/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
