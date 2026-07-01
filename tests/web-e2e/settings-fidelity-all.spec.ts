import { test, type Page } from "@playwright/test";

/**
 * Settings fidelity proof — captures all 7 rebuilt settings subviews against the
 * LIVE prod API on prod-e2e :5174 (sign in as user A; settings needs no seed).
 * Run: E2E_WEB_PORT=5174 npx playwright test settings-fidelity-all.spec.ts
 * Screenshots land under tests/web-e2e/proof/ (gitignored).
 */
const SHOTS = "tests/web-e2e/proof/settings-fidelity-all";

const SUBVIEWS = ["profile", "subscription", "cards", "memory", "data", "help", "limits"];

async function signIn(page: Page, variant: "a" | "b" = "a") {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  const testId = variant === "b" ? "sign-in-test-auth-button-b" : "sign-in-test-auth-button";
  await page.getByTestId(testId).click();
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

  // Phase 3: the reports detail lightbox now portals into the content pane so its
  // greyed backdrop dims the content area only (SideNav stays lit on desktop),
  // matching the shared Modal atom. Capture both breakpoints to prove it.
  async function openReportOverlay(page: Page) {
    await page.goto("/reports");
    await page.getByTestId("reports-screen").waitFor({ timeout: 15_000 });
    const focused = page.locator('[data-testid="reports-card"][aria-pressed="true"]');
    await focused.waitFor({ state: "visible", timeout: 15_000 });
    await focused.click();
    await page.getByTestId("report-detail-overlay").waitFor({ timeout: 15_000 });
    await page.getByTestId("report-detail-store").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
  }

  test("report detail backdrop — desktop dims content pane only (SideNav lit)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page, "b");
    await openReportOverlay(page);
    await page.screenshot({ path: `${SHOTS}/report-overlay-desktop.png` });
  });

  test("report detail backdrop — mobile covers the full viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "b");
    await openReportOverlay(page);
    await page.screenshot({ path: `${SHOTS}/report-overlay-mobile.png` });
  });
});
