import { test, expect, type Page } from "@playwright/test";

/**
 * Web dashboard + trends — Phase 4 (D68). Runs local Vite (--mode staging-e2e)
 * against the deployed staging-e2e backend (fixture provider, $0). Proves the
 * category donut renders REAL rollup data — a named category (Supermarket) with
 * an amount in the legend, NOT just the synthesized "Other" slice — and that
 * /trends renders the distribution donut + spend time-series from
 * GET /insights/series.
 *
 * The deterministic P6 fixtures are seeded into 2026-03; both screens open on
 * the current month, so the test drives the month picker to the seeded month.
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

test("dashboard renders a category donut with real category data", async ({ page }) => {
  await signIn(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 15_000,
  });

  await gotoSeededMonth(page);

  // Outcome assertion: a NAMED category (not just the synthesized "Other") with
  // a real share — the donut actually breaks spend down by category.
  const legend = page.getByTestId("donut-legend");
  await expect(legend.getByText("Supermarket")).toBeVisible();
  expect(await page.getByTestId("donut-legend-item").count()).toBeGreaterThan(1);
  await expect(page.getByTestId("donut-total")).not.toHaveText("");
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/01-dashboard-donut.png",
  });

  // Dimension toggle re-buckets store -> item; a different category set renders.
  await page.getByRole("button", { name: "By item" }).click();
  await page.waitForTimeout(700);
  await expect(page.getByTestId("donut-legend-item").first()).toBeVisible();
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/02-dashboard-by-item.png",
  });
});

test("trends renders distribution donut + spend time-series", async ({ page }) => {
  await signIn(page);
  await page.goto("/trends");
  await expect(page.getByRole("heading", { name: "Trends" })).toBeVisible({
    timeout: 15_000,
  });

  await gotoSeededMonth(page);
  await expect(page.getByTestId("donut-legend").getByText("Supermarket")).toBeVisible();
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/03-trends-distribution.png",
  });

  // The spend time-series (bars from /insights/series) renders for the window.
  await expect(page.getByTestId("spend-timeseries")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/04-trends-timeseries.png",
  });

  // Quarter granularity re-buckets the series without error.
  await page.getByRole("button", { name: "Quarter" }).click();
  await page.waitForTimeout(900);
  await expect(page.getByTestId("spend-timeseries")).toBeVisible();
  await page.screenshot({
    path: "tests/web-e2e/proof/dashboard/05-trends-quarter.png",
  });
});
