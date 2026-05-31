import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Real-browser e2e for the desktop web app's scan/statement progress journey.
 *
 * Runs `vite dev --mode staging-e2e` (against the deterministic staging-e2e backend —
 * FIXTURE scan provider, no Gemini, $0) and drives a real Chromium + real EventSource
 * over the real SSE stream. Proves the SSE progress path end-to-end (the web transport is
 * unaffected by the mobile WS-403 bug; ADR D62).
 *
 * Run: npm run test:web-e2e   (needs web/.env.staging-e2e — see tests/web-e2e/README.md)
 */

// Load the gitignored web/.env.staging-e2e and pass its VITE_* values into the vite
// process env. This (a) pins the gastify-staging config so shell-profile VITE_* vars
// (a dev's legacy boletapp-d609f config) cannot shadow it, and (b) keeps the Firebase
// web config + disposable creds OUT of this committed file.
function loadDotenv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

const webEnv = loadDotenv(path.resolve(__dirname, "../../web/.env.staging-e2e"));

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
    env: { ...process.env, ...webEnv },
  },
});
