import { test, type Page } from "@playwright/test";

/**
 * W3 Settings + Notifications visual proof — the geometric screen port rendered
 * against the LIVE PRODUCTION API with real data (the e2e test user signs into
 * production via the shared Firebase project). Run against a `vite --mode
 * prod-e2e` server on the CORS-allowed port 5174 (reused by the e2e config).
 */
const SHOTS = "tests/web-e2e/proof/w3-settings-notifications";

async function signIn(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button").click();
  // The ScanFab is on every authed screen — its presence = authed shell rendered.
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
}

test.describe("W3 settings + notifications — geometric port (real prod data)", () => {
  test("settings renders geometric (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await signIn(page);
    await page.goto("/settings");
    await page.getByRole("heading", { name: /settings|ajustes/i }).waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/settings-desktop.png`, fullPage: true });
  });

  test("notifications renders geometric (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await signIn(page);
    await page.goto("/notifications");
    await page.getByTestId("notifications-screen").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/notifications-mobile.png`, fullPage: true });
  });
});
