import { test, expect, type Page } from "@playwright/test";
import { transactionIdsOn, deleteTransaction } from "./helpers/cleanup";

/**
 * Manual transaction entry (statement-hardening plan, Phase 3): add a transaction
 * with NO scan — merchant, date, time, place, items one-by-one (total auto-sums) —
 * then find it via the ledger's source=manual filter. Cleans up after itself.
 */

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("manual entry: create with items, find via the source filter", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const merchant = `Manual E2E ${Date.now()}`;
  const before = await transactionIdsOn("2026-06-09");

  await page.goto("/transactions/new");
  await page.getByTestId("manual-merchant").fill(merchant);
  await page.getByTestId("manual-date").fill("2026-06-09");
  await page.getByTestId("manual-time").fill("13:45");
  await page.getByTestId("manual-country").fill("CL");
  await page.getByTestId("manual-city").fill("Santiago");

  // Items one by one; the total auto-sums.
  await page.getByTestId("manual-add-item").click();
  await page.getByTestId("manual-item-name-0").fill("Pan Integral");
  await page.getByTestId("manual-item-price-0").fill("2500");
  await page.getByTestId("manual-add-item").click();
  await page.getByTestId("manual-item-name-1").fill("Queso Chanco");
  await page.getByTestId("manual-item-price-1").fill("4800");
  await expect(page.getByTestId("manual-total")).toHaveValue("7300");

  await page.getByTestId("manual-save").click();
  // Lands on the detail with the entered content.
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/, { timeout: 20_000 });
  await expect(page.getByText(merchant).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Pan Integral")).toBeVisible();
  await expect(page.getByText("Queso Chanco")).toBeVisible();

  // The ledger's source=manual filter isolates it.
  await page.goto("/transactions");
  await page.getByTestId("filter-source").selectOption("manual");
  await expect(page.getByText(merchant).first()).toBeVisible({ timeout: 20_000 });

  // Cleanup: delete the created row (API id-diff on its date).
  const after = await transactionIdsOn("2026-06-09");
  for (const id of after) {
    if (!before.has(id)) await deleteTransaction(id);
  }
});
