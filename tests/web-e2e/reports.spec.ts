import { test, expect, type Page } from "@playwright/test";

/**
 * Web Reports screen runtime proof (Phase 6 T8) against deployed staging-e2e.
 * Reports reuses the already-deployed /insights/series + /insights/monthly (no new
 * backend). User A has months of spend, so the monthly report cards render with real
 * totals and the screen auto-focuses the latest month with spend — whose category
 * breakdown donut renders.
 */

async function signIn(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("Reports screen renders monthly cards + the period breakdown donut", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await signIn(page, "sign-in-test-auth-button");
    await page.goto("/reports");
    await expect(page.getByTestId("reports-screen")).toBeVisible({ timeout: 15_000 });

    // A has months of series data → at least one monthly report card renders.
    await expect(page.getByTestId("reports-card").first()).toBeVisible({ timeout: 15_000 });

    // The screen auto-focuses the latest month WITH spend, so its category breakdown
    // donut renders (the same donut the dashboard/trends use, fed by /insights/monthly).
    await expect(page.getByTestId("donut-legend")).toBeVisible({ timeout: 15_000 });

    // Reports v2 Phase 1: tapping a month card opens the detail overlay; close it
    // before continuing with the granularity toggles.
    const cards = page.getByTestId("reports-card");
    await cards.nth(Math.min(1, (await cards.count()) - 1)).click();
    await expect(page.getByTestId("report-detail-overlay")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("report-detail-close").click();
    await expect(page.getByTestId("report-detail-overlay")).toHaveCount(0);

    // D77: the granularity toggle re-buckets the cards. Quarterly + yearly hide the
    // month-only breakdown and still render period cards from real data.
    await page.getByTestId("reports-granularity-quarter").click();
    await expect(page.getByTestId("reports-breakdown")).toHaveCount(0);
    await expect(page.getByTestId("reports-card").first()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("reports-granularity-year").click();
    await expect(page.getByTestId("reports-card").first()).toBeVisible({ timeout: 15_000 });

    // #2: weekly buckets (the new backend ISO-week granularity) render too.
    await page.getByTestId("reports-granularity-week").click();
    await expect(page.getByTestId("reports-breakdown")).toHaveCount(0);
    await expect(page.getByTestId("reports-card").first()).toBeVisible({ timeout: 15_000 });

    // Back to monthly restores the breakdown.
    await page.getByTestId("reports-granularity-month").click();
    await expect(page.getByTestId("reports-breakdown")).toBeVisible({ timeout: 15_000 });
  } finally {
    await ctx.close();
  }
});
