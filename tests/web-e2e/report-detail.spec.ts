import { test, expect, type Page } from "@playwright/test";

/**
 * Reports v2 Phase 1 — Report Detail Overlay runtime proof against deployed
 * staging-e2e. Tapping a month report card opens a detail overlay with the
 * hierarchical store + item grouped breakdown (from the already-deployed
 * /insights/tree, D69) + a "view transactions" drill. User A has months of spend,
 * so the focused month's tree returns real grouped data. No new backend.
 */

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("Report detail overlay shows the grouped store + item breakdown and drills to transactions", async ({
  browser,
}, testInfo) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await signIn(page);
    await page.goto("/reports");
    await expect(page.getByTestId("reports-screen")).toBeVisible({ timeout: 15_000 });

    // The screen auto-focuses the latest month WITH spend — tap that card so the
    // detail overlay's /insights/tree fetch has real data to group.
    const focused = page.locator('[data-testid="reports-card"][aria-pressed="true"]');
    await expect(focused).toBeVisible({ timeout: 15_000 });
    await focused.click();

    // Overlay opens with both grouped breakdown sections.
    await expect(page.getByTestId("report-detail-overlay")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("report-detail-store")).toBeVisible();
    await expect(page.getByTestId("report-detail-item")).toBeVisible();

    // Phase 2: the insight block renders — at minimum the "Top category" trophy
    // (the leader falls back to item categories when stores are uncategorised).
    await expect(page.getByTestId("report-detail-insight")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("report-detail-highlight-leader")).toBeVisible();

    // The store breakdown renders hierarchical group cards (parent group + child rows).
    await expect(page.getByTestId("report-detail-group").first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath("01-report-detail-overlay.png"), fullPage: true });

    // Drill: "view transactions" navigates to the list pre-filtered by the period's date range.
    await page.getByTestId("report-detail-view-transactions").click();
    await expect(page).toHaveURL(/\/transactions/, { timeout: 15_000 });
    await expect(page).toHaveURL(/dateFrom=\d{4}-\d{2}-\d{2}/);
    await expect(page).toHaveURL(/dateTo=\d{4}-\d{2}-\d{2}/);
    // The filter actually applied: the focused month has spend, so the filtered list renders rows.
    await expect(page.locator('[data-testid^="select-txn-"]').first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath("02-drilled-transactions.png"), fullPage: true });
  } finally {
    await ctx.close();
  }
});
