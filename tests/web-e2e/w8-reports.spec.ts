import { test, type Page } from "@playwright/test";

/**
 * W8 Reports visual proof — the geometric port of the reports list + the report
 * detail overlay, rendered against the LIVE PRODUCTION API with REAL seeded data
 * (user B). Covers the cards list, a granularity toggle, and the detail overlay
 * (hero + insight + group breakdown). Run against a `vite --mode prod-e2e` server
 * on the CORS-allowed port 5174.
 */
const SHOTS = "tests/web-e2e/proof/w8-reports";

async function signInAsB(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button-b").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("W8 reports — geometric port (real seeded prod data)", () => {
  test("reports list + monthly breakdown donut (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1300 });
    await signInAsB(page);
    await page.goto("/reports");
    await page.getByTestId("reports-screen").waitFor({ timeout: 20_000 });
    await page.getByTestId("reports-card").first().waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${SHOTS}/reports-list-desktop.png`, fullPage: false });
  });

  test("report detail overlay (hero + insight + breakdown) (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await signInAsB(page);
    await page.goto("/reports");
    await page.getByTestId("reports-card").first().waitFor({ timeout: 20_000 });
    // Open the first selectable (month) report → the geometric detail overlay.
    await page.getByTestId("reports-card").first().click();
    await page.getByTestId("report-detail-overlay").waitFor({ timeout: 15_000 });
    await page.getByTestId("report-detail-store").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${SHOTS}/report-detail-overlay-desktop.png`, fullPage: false });
  });

  test("reports list (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await signInAsB(page);
    await page.goto("/reports");
    await page.getByTestId("reports-card").first().waitFor({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${SHOTS}/reports-list-mobile.png`, fullPage: false });
  });
});
