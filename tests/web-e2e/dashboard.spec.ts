import { test, expect, type Page } from "@playwright/test";

/**
 * Web trends — Phase 4 (D68 + D69). Runs local Vite (--mode staging-e2e) against
 * the deployed staging-e2e backend (fixture provider, $0).
 *
 * Trends (v1, D68): the distribution donut (top categories) + GET /insights/series
 * time-series. The deterministic fixtures are seeded into 2026-03; the screen
 * opens on the current month, so the test drives the month picker to the seed.
 *
 * NOTE: the former "dashboard donut drills the category tree" test was removed in
 * DF2 — the home dashboard is now a lean spend-first feed (hero + trend + gravity
 * + recent), and the interactive donut/drill relocates to /trends in DF2-Trends,
 * where its cross-walk-drill coverage will be restored (tracked in PENDING).
 */

const SEEDED_MONTH = "2026-03";

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

/** Drive the month picker to the seeded month and wait for the donut. */
async function gotoSeededMonth(page: Page): Promise<void> {
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  await page.getByTestId("donut-legend").waitFor({ state: "visible", timeout: 20_000 });
}

test("trends renders distribution donut + spend time-series", async ({ page }) => {
  await signIn(page);
  await page.goto("/trends");
  await expect(page.getByRole("heading", { name: "Trends" })).toBeVisible({
    timeout: 15_000,
  });

  await gotoSeededMonth(page);
  await expect(page.getByTestId("donut-legend").getByText("Supermarket")).toBeVisible();
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/07-trends-distribution.png",
  });

  // The spend time-series (bars from /insights/series) renders for the window.
  await expect(page.getByTestId("spend-timeseries")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/08-trends-timeseries.png",
  });

  // Quarter granularity re-buckets the series without error.
  await page.getByRole("button", { name: "Quarter" }).click();
  await page.waitForTimeout(900);
  await expect(page.getByTestId("spend-timeseries")).toBeVisible();
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/09-trends-quarter.png",
  });
});
