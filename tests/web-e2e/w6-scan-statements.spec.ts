import { test, type Page } from "@playwright/test";

/**
 * W6 Scan + Statements visual proof — the geometric port of the single-scan flow
 * (idle dropzone), the batch-scan flow, and the statements/reconciliation screen,
 * rendered against the LIVE PRODUCTION API. Signs in as the secondary e2e user (B).
 * The idle/upload states prove the geometric restyle of the screens themselves
 * (the SSE-driven progress/result/reconciliation states need an in-flight scan).
 * Run against a `vite --mode prod-e2e` server on the CORS-allowed port 5174.
 */
const SHOTS = "tests/web-e2e/proof/w6-scan-statements";

async function signInAsB(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button-b").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("W6 scan + statements — geometric port (live prod)", () => {
  test("single-scan idle dropzone (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await signInAsB(page);
    await page.goto("/scan");
    await page.getByRole("button", { name: "Upload receipt image" }).waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/scan-desktop.png`, fullPage: true });
  });

  test("single-scan idle dropzone (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await signInAsB(page);
    await page.goto("/scan");
    await page.getByRole("button", { name: "Upload receipt image" }).waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/scan-mobile.png`, fullPage: true });
  });

  test("batch-scan screen (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await signInAsB(page);
    await page.goto("/scan-batch");
    // Either the batch queue or the premium notice — both are geometric-restyled.
    await page.locator('[data-testid="batch-scan-page"], [data-testid="batch-premium-notice"]').first().waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/scan-batch-desktop.png`, fullPage: true });
  });

  test("statements upload + status panels (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await signInAsB(page);
    await page.goto("/statements");
    await page.getByRole("heading", { name: "Upload statement" }).waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/statements-desktop.png`, fullPage: true });
  });
});
