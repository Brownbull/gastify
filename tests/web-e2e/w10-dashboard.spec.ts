import { test, type Page } from "@playwright/test";

/**
 * Dashboard visual proof — the DF2 lean spend-first home feed (spend hero +
 * insight StatusCard + 6-month trend + gravity centers + recent-transactions
 * feed), rendered against the LIVE PRODUCTION API with REAL seeded data (user B).
 * Run against a `vite --mode prod-e2e` server on the CORS-allowed port 5174.
 * (The prior W10 donut/DimensionToggle/drill moved to /trends per DF2.)
 */
const SHOTS = "tests/web-e2e/proof/w10-dashboard";

async function signInAsB(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button-b").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

async function focusSeededMonth(page: Page) {
  await page.goto("/");
  // Focus a month known to have seeded spend so the hero + gravity render.
  await page.getByLabel("Month", { exact: true }).fill("2026-03");
  await page.getByTestId("home-hero").waitFor({ timeout: 20_000 });
  await page.getByTestId("home-gravity").waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

test.describe("Dashboard — DF2 lean home feed (real seeded prod data)", () => {
  test("dashboard renders hero + trend + gravity + recent (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await signInAsB(page);
    await focusSeededMonth(page);
    await page.screenshot({ path: `${SHOTS}/dashboard-desktop.png`, fullPage: true });
  });

  test("dashboard renders (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1200 });
    await signInAsB(page);
    await focusSeededMonth(page);
    await page.screenshot({ path: `${SHOTS}/dashboard-mobile.png`, fullPage: false });
  });
});
