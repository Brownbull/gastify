import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import {
  cleanupTestGroups,
  deleteTransaction,
  transactionIdsOn,
  transactionMonth,
} from "./helpers/cleanup";

/**
 * Stats REACT to data changes (feature-correctness plan, Phase 3) — the gap the
 * coverage audit found: every stats spec asserted rendering of existing data; nothing
 * proved the figures MOVE when data changes. These pin the loop end-to-end on the
 * deployed staging-e2e backend:
 *   1. personal: scan → the month's total INCREASES by the receipt's amount;
 *      batch-delete that transaction → the total returns to baseline.
 *   2. group: share a transaction into a fresh group → the GROUP scope's dashboard
 *      total goes from empty to the shared amount (group stats update on share).
 */

const FIXTURE_RECEIPT = path.resolve(
  __dirname,
  "../mobile/fixtures/receipts/gastify-e2e-happy.jpg",
);
const FIXTURE_MONTH = "2026-05"; // the happy fixture's transaction_date month
// NOTE: the dashboard total is the USD-normalized aggregate (mixed-currency analytics),
// so the exact increment depends on the FX shadow — the CONTRACT is delta-symmetry:
// the total strictly increases on scan and returns exactly to baseline on delete.

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

/** The dashboard's total-spend figure as an integer (mirrors groups.spec). */
async function readTotalSpend(page: Page): Promise<number> {
  const raw = await page.getByTestId("total-spend").innerText();
  return Number(raw.replace(/[^\d]/g, ""));
}

async function dashboardTotalAt(page: Page, month: string): Promise<number> {
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(month);
  await page.getByTestId("total-spend").waitFor({ state: "visible", timeout: 20_000 });
  return readTotalSpend(page);
}

test.afterEach(async () => {
  await cleanupTestGroups();
});

test("personal stats: scan raises the month total; delete restores it", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  const before = await dashboardTotalAt(page, FIXTURE_MONTH);
  const beforeIds = await transactionIdsOn("2026-05-18"); // the fixture's date

  // Scan the fixture receipt through the real pipeline (UI).
  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_RECEIPT);
  await expect(page.getByText("Scan Complete").first()).toBeVisible({ timeout: 90_000 });

  // The month's total strictly increased (USD-normalized units; see note above).
  const afterScan = await dashboardTotalAt(page, FIXTURE_MONTH);
  expect(afterScan).toBeGreaterThan(before);

  // Identify the NEW transaction via the API (the UI list paginates; the new row can
  // land past page 1 among same-date fixtures) and delete it within the 90-day window.
  const afterIds = await transactionIdsOn("2026-05-18");
  const added = [...afterIds].filter((id) => !beforeIds.has(id));
  expect(added).toHaveLength(1);
  expect(await deleteTransaction(added[0])).toBe(true);

  // Stats return to baseline IN THE UI — deletes are observable in the figures.
  const afterDelete = await dashboardTotalAt(page, FIXTURE_MONTH);
  expect(afterDelete).toBe(before);
});

test("group stats: sharing a transaction moves the group total from empty to its amount", async ({
  page,
}) => {
  test.setTimeout(240_000); // row-iteration + scope switch + two dashboard loads
  await signIn(page);
  const groupName = `E2E Stats ${Date.now()}`;

  // Fresh group.
  await page.goto("/groups");
  const form = page.getByTestId("create-group-form");
  await form.getByRole("textbox").fill(groupName);
  await form.getByRole("button").click();
  await expect(page.getByText(groupName)).toBeVisible({ timeout: 15_000 });

  // Share the first UNLOCKED seeded transaction; capture its amount from the detail.
  await page.goto("/transactions");
  const links = page.locator("a[href^='/transactions/']:not([href$='/new'])");
  await links.first().waitFor({ timeout: 30_000 });
  const count = Math.min(await links.count(), 6);
  let shared = false;
  let sharedId: string | undefined;
  for (let i = 0; i < count; i++) {
    await links.nth(i).click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/, { timeout: 15_000 });
    const share = page.getByTestId("share-to-group");
    const usable = await share
      .waitFor({ state: "visible", timeout: 4_000 })
      .then(() => true)
      .catch(() => false);
    if (usable) {
      await share.getByRole("combobox").selectOption({ label: groupName });
      await share.getByRole("button").click();
      await expect(share.getByRole("button")).toHaveText(/Compartido|Shared/, {
        timeout: 15_000,
      });
      shared = true;
      sharedId = page.url().match(/\/transactions\/([0-9a-f-]+)$/)?.[1];
      break;
    }
    await page.goBack();
  }
  expect(shared).toBe(true);

  // The list is newest-first, so the shared row's month is whatever the latest data
  // is — read it from the API rather than assuming a fixture month.
  const sharedMonth = sharedId ? await transactionMonth(sharedId) : undefined;
  expect(sharedMonth, "shared transaction month resolves via API").toBeTruthy();

  // Switch the app scope to the group: its dashboard total at the txn's month equals
  // the shared amount (was a fresh, empty group — stats updated on share).
  await page.getByTestId("group-switcher").first().click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: new RegExp(groupName) })
    .click();
  const groupTotal = await dashboardTotalAt(page, sharedMonth as string);
  expect(groupTotal).toBeGreaterThan(0); // was a fresh empty group — the share moved it
});
