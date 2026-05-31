import { defineConfig, devices } from "@playwright/test";

/**
 * Real-browser e2e for the desktop web app's scan/statement progress journey.
 *
 * Runs `vite dev --mode staging-e2e` (loads web/.env.staging-e2e: gated test-auth on,
 * API pointed at the deterministic staging-e2e backend with the FIXTURE scan provider
 * — no Gemini, $0) and drives a real Chromium with a real EventSource consuming the
 * real SSE stream. Proves the SSE progress path end-to-end (the web's transport is
 * unaffected by the mobile WS-403 bug; this is the accessible runtime evidence).
 *
 * Run: npx playwright test --config=tests/web-e2e/playwright.config.ts
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "cd ../../web && npx vite --mode staging-e2e --port 5173 --strictPort",
    url: "http://localhost:5173/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Pin the gastify-staging web config (all PUBLIC — embedded in the deployed bundle)
    // so it can't be shadowed by shell-profile VITE_* vars (a dev's local config points
    // at the legacy boletapp-d609f project). The disposable test creds stay in the
    // gitignored web/.env.staging-e2e (vite reads them from the file).
    env: {
      ...process.env,
      VITE_API_BASE_URL: "https://gastify-api-staging-e2e-staging.up.railway.app",
      VITE_FIREBASE_API_KEY: "AIzaSyDA7CKkfTdP2dEck3fmmONg-k6jfOi8AVo",
      VITE_FIREBASE_AUTH_DOMAIN: "gastify-staging.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "gastify-staging",
      VITE_FIREBASE_STORAGE_BUCKET: "gastify-staging.firebasestorage.app",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "52976046656",
      VITE_FIREBASE_APP_ID: "1:52976046656:web:e2eplaceholder",
      VITE_E2E_AUTH_ENABLED: "true",
    },
  },
});
