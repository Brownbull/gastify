import { test, expect, type Page } from "@playwright/test";

/**
 * Web Groups — Phase 5d (D70/D71/D72). Runs local Vite (--mode staging-e2e)
 * against the deployed staging-e2e backend (fixture provider, $0).
 *
 * Proves the whole-app group flow end to end:
 *   create a group → share a personal transaction into it → switch the global
 *   scope to the group → the dashboard re-scopes and shows ONLY the shared
 *   spend (group isolation) → switching back to Personal restores the full
 *   personal dashboard. Also asserts scanning is blocked in group mode (D70).
 *
 * Backend isolation (user A cannot read group B) is proven separately by the
 * Postgres-gated pytest suite; this is the user-facing runtime proof.
 */

const SEEDED_MONTH = "2026-03";
const GROUP_NAME = `E2E Casa ${Date.now()}`;

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("group flow: create, share, switch scope, isolation, scan blocked", async ({ page }) => {
  await signIn(page);

  // 1. Create a group.
  await page.goto("/groups");
  const form = page.getByTestId("create-group-form");
  await form.getByRole("textbox").fill(GROUP_NAME);
  await form.getByRole("button").click();
  await expect(page.getByText(GROUP_NAME)).toBeVisible({ timeout: 15_000 });

  // 2. Share a seeded personal transaction into the group.
  await page.goto("/transactions");
  await page.locator("a[href^='/transactions/']").first().click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+/, { timeout: 15_000 });
  const share = page.getByTestId("share-to-group");
  await expect(share).toBeVisible({ timeout: 15_000 });
  await share.getByRole("combobox").selectOption({ label: GROUP_NAME });
  await share.getByRole("button").click();
  await expect(share.getByRole("button")).toHaveText(/Compartido|Shared/, { timeout: 15_000 });

  // 3. Switch the global scope to the group and land on the dashboard.
  await page.getByTestId("group-switcher").first().click();
  await page.getByRole("option", { name: new RegExp(GROUP_NAME) }).click();
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);

  // The dashboard now reads the GROUP scope — its total is the shared spend only,
  // strictly less than the personal total (isolation: group != personal).
  const groupTotal = await readTotalSpend(page);
  expect(groupTotal).toBeGreaterThan(0);

  // 4. Scanning is blocked in group mode (D70 — scan is personal-only).
  await page.goto("/scan");
  await expect(page.getByTestId("personal-only-notice")).toBeVisible({ timeout: 10_000 });

  // 5. Back to Personal — the dashboard restores the full personal total (> group).
  await page.getByTestId("group-switcher").first().click();
  await page.getByRole("option", { name: /Personal/ }).click();
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  const personalTotal = await readTotalSpend(page);
  expect(personalTotal).toBeGreaterThan(groupTotal);
});

/** Read the dashboard's total-spend figure as a number of minor units-ish integer. */
async function readTotalSpend(page: Page): Promise<number> {
  const el = page.getByTestId("total-spend");
  await el.waitFor({ state: "visible", timeout: 20_000 });
  const text = (await el.textContent()) ?? "";
  return Number(text.replace(/[^0-9]/g, "")) || 0;
}
