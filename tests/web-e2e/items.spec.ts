import { test, expect, type Page } from "@playwright/test";

/**
 * Web Items screen runtime proof (Phase 6 T4) against deployed staging-e2e. User A
 * has receipt transactions with line items (the same data backing the dashboard
 * donut), so /items must render real rows, filter deterministically, and deep-link
 * each row to its parent transaction.
 */

async function signIn(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("Items screen lists real line items, filters, and deep-links to a transaction", async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await signIn(page, "sign-in-test-auth-button");
    await page.goto("/items");
    await expect(page.getByTestId("items-screen")).toBeVisible({ timeout: 15_000 });

    // A has receipt items → at least one row renders.
    const firstRow = page.getByTestId("items-row").first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });

    // Filter determinism: a no-match search collapses to the filtered-empty state.
    await page.getByTestId("items-search-input").fill("zzqqxx-no-such-item-9173");
    await expect(page.getByTestId("items-empty-filtered")).toBeVisible({ timeout: 15_000 });

    // Clearing the chip restores the rows.
    await page.getByTestId("items-chip-search").click();
    await expect(page.getByTestId("items-row").first()).toBeVisible({ timeout: 15_000 });

    // A row deep-links to its parent transaction detail.
    await page.getByTestId("items-row").first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+/, { timeout: 15_000 });
  } finally {
    await ctx.close();
  }
});
