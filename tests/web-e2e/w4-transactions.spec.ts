import { test, type Page } from "@playwright/test";

/**
 * W4 Transactions (list + detail + new) visual proof — the geometric screen port
 * rendered against the LIVE PRODUCTION API with REAL seeded data. Signs in as the
 * SECONDARY e2e user (B), seeded with ~101 demo transactions across 34 weeks, so
 * the list/detail render data (not empty states). Run against a `vite --mode
 * prod-e2e` server on the CORS-allowed port 5174 (reused by the e2e config).
 */
const SHOTS = "tests/web-e2e/proof/w4-transactions";

async function signInAsB(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button-b").click();
  // The ScanFab is on every authed screen — its presence = authed shell rendered.
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("W4 transactions — geometric port (real seeded prod data)", () => {
  test("list renders geometric rows (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await signInAsB(page);
    await page.goto("/transactions");
    await page.getByTestId("select-all-checkbox").waitFor({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/list-desktop.png`, fullPage: false });
  });

  test("list renders geometric rows (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await signInAsB(page);
    await page.goto("/transactions");
    await page.getByTestId("select-all-checkbox").waitFor({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/list-mobile.png`, fullPage: false });
  });

  test("detail renders geometric summary + items (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await signInAsB(page);
    await page.goto("/transactions");
    await page.getByTestId("select-all-checkbox").waitFor({ timeout: 20_000 });
    // Click the first transaction row's merchant link → detail.
    const firstRow = page.locator('li:has([data-testid^="select-txn-"])').first();
    await firstRow.getByRole("link").first().click();
    await page.waitForURL(/\/transactions\/[0-9a-fA-F-]{36}/, { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/detail-desktop.png`, fullPage: true });
  });

  test("new manual-entry form renders geometric (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await signInAsB(page);
    await page.goto("/transactions/new");
    await page.getByTestId("manual-merchant").waitFor({ timeout: 15_000 });
    await page.getByTestId("manual-add-item").click();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/new-desktop.png`, fullPage: true });
  });
});
