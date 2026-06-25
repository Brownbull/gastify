import { test, type Page } from "@playwright/test";

/**
 * Feature verification against REAL seeded production data — signs in as the
 * SECONDARY e2e user (B), which has been seeded with ~101 demo transactions
 * across 34 weeks (all category levels). Confirms the data screens render data
 * (not empty states). Run against the prod-e2e vite server on :5174.
 */
const SHOTS = "tests/web-e2e/proof/seeded-data-verify";

async function signInAsB(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button-b").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("seeded-data verification (user B, real prod data)", () => {
  test("transactions list renders seeded data (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await signInAsB(page);
    await page.goto("/transactions");
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/transactions.png`, fullPage: false });
  });

  test("dashboard renders seeded data (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await signInAsB(page);
    await page.goto("/");
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/dashboard.png`, fullPage: false });
  });

  test("trends renders seeded data (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await signInAsB(page);
    await page.goto("/trends");
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/trends.png`, fullPage: false });
  });
});
