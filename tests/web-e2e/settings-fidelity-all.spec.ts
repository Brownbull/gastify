import { test, type Page } from "@playwright/test";

/**
 * Settings fidelity proof — captures all 7 rebuilt settings subviews against the
 * LIVE prod API on prod-e2e :5174 (sign in as user A; settings needs no seed).
 * Run: E2E_WEB_PORT=5174 npx playwright test settings-fidelity-all.spec.ts
 * Screenshots land under tests/web-e2e/proof/ (gitignored).
 */
const SHOTS = "tests/web-e2e/proof/settings-fidelity-all";

const SUBVIEWS = ["profile", "subscription", "cards", "memory", "data", "help", "limits"];

async function signIn(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("Settings fidelity — all 7 subviews (real prod)", () => {
  test("capture hub + every subview (mobile 390)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);

    await page.goto("/settings");
    await page.getByTestId("settings-row-profile").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/hub.png`, fullPage: true });

    for (const sub of SUBVIEWS) {
      await page.goto(`/settings/${sub}`);
      await page.getByTestId("settings-back").waitFor({ timeout: 15_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOTS}/${sub}.png`, fullPage: true });
    }
  });
});
