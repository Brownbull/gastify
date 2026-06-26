import { test, type Page } from "@playwright/test";

/**
 * W5 Items browse visual proof — the geometric screen port rendered against the
 * LIVE PRODUCTION API with REAL seeded data. Signs in as the SECONDARY e2e user
 * (B), seeded with ~101 demo transactions (item-rich across all category levels),
 * so the items list renders real product rows. Run against a `vite --mode
 * prod-e2e` server on the CORS-allowed port 5174.
 */
const SHOTS = "tests/web-e2e/proof/w5-items";

async function signInAsB(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button-b").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("W5 items browse — geometric port (real seeded prod data)", () => {
  test("items list renders geometric rows (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await signInAsB(page);
    await page.goto("/items");
    await page.getByTestId("items-row").first().waitFor({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/items-desktop.png`, fullPage: false });
  });

  test("items list renders geometric rows (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await signInAsB(page);
    await page.goto("/items");
    await page.getByTestId("items-row").first().waitFor({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/items-mobile.png`, fullPage: false });
  });

  test("search → empty-filtered → clear chip restores rows (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await signInAsB(page);
    await page.goto("/items");
    await page.getByTestId("items-row").first().waitFor({ timeout: 20_000 });
    // No-match search → geometric empty-filtered state.
    await page.getByTestId("items-search-input").fill("zzqqxx-no-such-item-9173");
    await page.getByTestId("items-empty-filtered").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/items-empty-filtered.png`, fullPage: false });
    // Clear the search chip → rows return.
    await page.getByTestId("items-chip-search").click();
    await page.getByTestId("items-row").first().waitFor({ timeout: 15_000 });
  });
});
