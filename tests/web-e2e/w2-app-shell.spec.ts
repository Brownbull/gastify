import { test, type Page } from "@playwright/test";

/**
 * W2 app-shell visual proof — the Playful Geometric navigation shell
 * (desktop SideNav · mobile AppHeader + 4-tab BottomNav + ScanFab + Perfil
 * avatar). Signs in via the e2e test-auth (client-side firebase), which lands
 * on the authed app so the SHELL renders. The dashboard DATA errors here (no
 * live backend; staging retired per D97) — but the shell is data-free, so this
 * proves the geometric chrome. Full data screens verify on production.
 */
const SHOTS = "tests/web-e2e/proof/w2-app-shell";

async function signInAndWaitForShell(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button").click();
  // The ScanFab is on every authed screen — its presence = the shell rendered.
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

test.describe("W2 app shell — Playful Geometric navigation", () => {
  test("authed shell renders (desktop SideNav)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signInAndWaitForShell(page);
    await page.screenshot({ path: `${SHOTS}/shell-desktop.png` });
  });

  test("authed shell renders (mobile BottomNav + FAB)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAndWaitForShell(page);
    await page.screenshot({ path: `${SHOTS}/shell-mobile.png` });
  });
});
