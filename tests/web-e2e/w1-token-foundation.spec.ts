import { test } from "@playwright/test";

/**
 * W1 token-foundation visual proof.
 *
 * Captures the public /sign-in route rendered in the Playful Geometric palette
 * (violet primary, cream canvas, slate-900 ink) with the Outfit font loaded.
 * This is a BACKEND-FREE render check — protected routes (dashboard, etc.) need
 * the API (down locally; staging retired per D97), so their visual proof lands
 * at production verify (/gabe-push). Here we prove the global token swap renders
 * and nothing crashes on a real browser paint.
 *
 * Waits on document.fonts.ready so the screenshot reflects Outfit, not a
 * fallback face — the font swap is part of the geometric identity.
 */
const SHOTS = "tests/web-e2e/proof/w1-token-foundation";

async function captureSignIn(page: import("@playwright/test").Page, file: string) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByRole("button").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400); // settle font paint
  await page.screenshot({ path: `${SHOTS}/${file}`, fullPage: true });
}

test.describe("W1 token foundation — Playful Geometric palette proof", () => {
  test("sign-in renders in the new palette (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await captureSignIn(page, "sign-in-desktop.png");
  });

  test("sign-in renders in the new palette (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await captureSignIn(page, "sign-in-mobile.png");
  });
});
