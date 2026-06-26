import { test, type Page } from "@playwright/test";

/**
 * W10 Dashboard visual proof — the geometric port of the landing screen
 * (SummaryStats + the W7 donut + DimensionToggle/DrillBreadcrumb + the
 * "what's shifting" gravity insight), rendered against the LIVE PRODUCTION API
 * with REAL seeded data (user B). Run against a `vite --mode prod-e2e` server on
 * the CORS-allowed port 5174.
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
  // Focus a month known to have seeded spend so SummaryStats + the donut render.
  await page.getByLabel("Month", { exact: true }).fill("2026-03");
  await page.getByTestId("total-spend").waitFor({ timeout: 20_000 });
  await page.getByTestId("donut-legend").waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400); // donut count-up + stagger settle
}

test.describe("W10 dashboard — geometric port (real seeded prod data)", () => {
  test("dashboard renders SummaryStats + donut + gravity (desktop)", async ({ page }) => {
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
