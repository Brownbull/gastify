import { test, expect, type Page } from "@playwright/test";

/**
 * Web dashboard + trends — Phase 4 (D68 + D69). Runs local Vite
 * (--mode staging-e2e) against the deployed staging-e2e backend (fixture
 * provider, $0).
 *
 * Dashboard (v2, D69): proves the recursive drill-down donut backed by
 * GET /insights/tree — the donut opens at the L1 industry level and drills the
 * full 4-level store cross-walk Industry -> Store-type -> Item-family -> Item,
 * with a breadcrumb that rolls back up. Asserts REAL category labels at each
 * level (Supermarkets industry, Supermarket store-type), not just element
 * counts.
 *
 * Trends (v1, D68): the distribution donut stays flat (top categories) +
 * GET /insights/series time-series.
 *
 * The deterministic fixtures are seeded into 2026-03; both screens open on the
 * current month, so the test drives the month picker to the seeded month.
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

test("dashboard donut drills the category tree industry -> store-type -> family -> item", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 15_000,
  });
  await gotoSeededMonth(page);

  const legend = page.getByTestId("donut-legend");

  // L1 — the donut opens at the industry level. Supermarket spend dominates, so
  // its industry ("Supermarkets") is a real slice, not the "Other" remainder.
  await expect(legend.getByText("Supermarkets")).toBeVisible();
  expect(await page.getByTestId("donut-legend-item").count()).toBeGreaterThan(1);
  await expect(page.getByTestId("donut-total")).not.toHaveText("");
  await page.screenshot({ path: "tests/web-e2e/proof/dashboard/01-dashboard-L1-industries.png" });

  // L1 -> L2 — tap the industry; the breadcrumb appears and the store-type shows.
  await legend.getByText("Supermarkets").click();
  const breadcrumb = page.getByTestId("drill-breadcrumb");
  await expect(breadcrumb).toBeVisible();
  await expect(breadcrumb.getByText("Supermarkets")).toBeVisible();
  await expect(legend.getByText("Supermarket", { exact: true })).toBeVisible();
  await page.screenshot({ path: "tests/web-e2e/proof/dashboard/02-dashboard-L2-storetype.png" });

  // L2 -> L3 — tap the store-type; the cross-walk shows the item families bought
  // there. Capture the top family's label so we can assert it in the breadcrumb.
  await legend.getByText("Supermarket", { exact: true }).click();
  await expect(breadcrumb.getByText("Supermarket", { exact: true })).toBeVisible();
  const familyItems = page.getByTestId("donut-legend-item");
  await expect(familyItems.first()).toBeVisible();
  expect(await familyItems.count()).toBeGreaterThan(0);
  await page.screenshot({ path: "tests/web-e2e/proof/dashboard/03-dashboard-L3-families.png" });

  // L3 -> L4 — drill into the top item family (label discovered at runtime), and
  // assert it becomes the deepest breadcrumb crumb while items render.
  const topFamilyButton = familyItems.first().getByRole("button");
  const familyLabel = ((await topFamilyButton.locator("span").nth(1).textContent()) ?? "").trim();
  expect(familyLabel.length).toBeGreaterThan(0);
  await topFamilyButton.click();
  await expect(breadcrumb.getByText(familyLabel, { exact: true })).toBeVisible();
  await expect(page.getByTestId("donut-legend-item").first()).toBeVisible();
  await expect(page.getByTestId("donut-total")).not.toHaveText("");
  await page.screenshot({ path: "tests/web-e2e/proof/dashboard/04-dashboard-L4-items.png" });

  // Roll up — the "All categories" crumb returns to the industry level.
  await page.getByRole("button", { name: "All categories" }).click();
  await expect(page.getByTestId("drill-breadcrumb")).toBeHidden();
  await expect(legend.getByText("Supermarkets")).toBeVisible();
  await page.screenshot({ path: "tests/web-e2e/proof/dashboard/05-dashboard-rolled-up.png" });

  // Dimension toggle resets the drill and re-buckets to the item Family tree.
  await page.getByRole("button", { name: "By item" }).click();
  await page.waitForTimeout(700);
  await expect(page.getByTestId("donut-legend-item").first()).toBeVisible();
  await expect(page.getByTestId("drill-breadcrumb")).toBeHidden();
  await page.screenshot({ path: "tests/web-e2e/proof/dashboard/06-dashboard-by-item.png" });
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
