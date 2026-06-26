import { test, type Page } from "@playwright/test";

/**
 * Settings fidelity pilot — proof that /settings now matches the design-lab
 * SettingsScreen: a sectioned icon-row navigation hub (Cuenta / Preferencias /
 * Datos y privacidad / Soporte) with pushable sub-screens, NOT the old flat form.
 * Captured at 360px (S23-class, the side-by-side comparison viewport) + desktop,
 * against the LIVE prod API on prod-e2e :5174. Sign in as user A — settings needs
 * no seeded data.
 */
const SHOTS = "tests/web-e2e/proof/wf-settings-fidelity";

async function signIn(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("Wf settings fidelity — geometric hub (real prod)", () => {
  test("hub + sub-screens (mobile 360)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signIn(page);

    // The hub — the headline comparison vs the Storybook mockup.
    await page.goto("/settings");
    await page.getByTestId("settings-row-profile").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/hub-mobile.png`, fullPage: true });

    // Preferencias sub-screen (language + date) — the back-header pattern.
    await page.getByTestId("settings-row-preferences").click();
    await page.getByTestId("settings-date-format").waitFor({ timeout: 15_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/sub-preferences-mobile.png`, fullPage: true });

    // Datos y privacidad sub-screen (export + danger zone).
    await page.goto("/settings/data");
    await page.getByTestId("settings-back").waitFor({ timeout: 15_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/sub-data-mobile.png`, fullPage: true });
  });

  test("hub (desktop 1280)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await signIn(page);
    await page.goto("/settings");
    await page.getByTestId("settings-row-profile").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/hub-desktop.png`, fullPage: true });
  });
});
