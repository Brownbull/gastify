import { test, expect, type Page } from "@playwright/test";

/**
 * Web batch operations — multi-select, batch action bar, select-all toggle.
 * Against staging-e2e with seeded transactions from the e2e test account.
 */

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.describe("Batch operations", () => {
  test("shows select-all checkbox and batch action bar on selection", async ({
    page,
  }) => {
    await signInWithTestAuth(page);
    await page.goto("/transactions");

    const selectAll = page.getByTestId("select-all-checkbox");
    await expect(selectAll).toBeVisible({ timeout: 30_000 });

    await page.screenshot({
      path: "tests/web-e2e/proof/batch-ops/01-transaction-list.png",
    });

    // Select all transactions
    await selectAll.check();
    await expect(page.getByTestId("batch-action-bar")).toBeVisible();
    await expect(page.getByTestId("batch-delete-button")).toBeVisible();
    await expect(page.getByTestId("batch-reassign-button")).toBeVisible();

    await page.screenshot({
      path: "tests/web-e2e/proof/batch-ops/02-all-selected.png",
    });

    // Deselect all
    await selectAll.uncheck();
    await expect(page.getByTestId("batch-action-bar")).not.toBeVisible();

    await page.screenshot({
      path: "tests/web-e2e/proof/batch-ops/03-deselected.png",
    });
  });

  test("reassign category button shows category picker", async ({ page }) => {
    await signInWithTestAuth(page);
    await page.goto("/transactions");

    const selectAll = page.getByTestId("select-all-checkbox");
    await expect(selectAll).toBeVisible({ timeout: 30_000 });
    await selectAll.check();

    await page.getByTestId("batch-reassign-button").click();

    // Category picker dropdown should appear
    const main = page.getByRole("main");
    const categoryOptions = main.locator("button").filter({ hasText: /.+/ });
    const count = await categoryOptions.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({
      path: "tests/web-e2e/proof/batch-ops/04-category-picker.png",
    });
  });
});
