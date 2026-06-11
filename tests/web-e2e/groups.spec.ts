import { test, expect, type Page } from "@playwright/test";
import { cleanupTestGroups } from "./helpers/cleanup";

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


// P82: page-independent cleanup (the specs create their own contexts).
test.afterEach(async () => {
  await cleanupTestGroups();
});

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

  // 3. Personal dashboard at the seeded month: the fixtures total is shown and
  // there is NO group banner (personal scope).
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  await page.getByTestId("total-spend").waitFor({ state: "visible", timeout: 20_000 });
  await expect(page.getByTestId("dashboard-scope-banner")).toHaveCount(0);
  const personalTotal = await readTotalSpend(page);
  expect(personalTotal).toBeGreaterThan(0);

  // 4. Switch the WHOLE-APP scope to the group. The dashboard re-scopes: the banner
  // names the group, and at the seeded month it shows the group's OWN data — NOT
  // the personal fixtures. The freshly-shared spend lands in another month, so the
  // group has no 2026-03 spend → the empty state proves isolation (group != personal).
  await page.getByTestId("group-switcher").first().click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: new RegExp(GROUP_NAME) })
    .click();
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  await expect(page.getByTestId("dashboard-scope-banner")).toContainText(GROUP_NAME, {
    timeout: 20_000,
  });
  await expect(page.getByTestId("dashboard-empty")).toBeVisible({ timeout: 20_000 });

  // 5. Scanning is blocked in group mode (D70 — scan is personal-only).
  await page.goto("/scan");
  await expect(page.getByTestId("personal-only-notice")).toBeVisible({ timeout: 10_000 });

  // 6. Back to Personal — the banner disappears and the full personal total returns.
  await page.getByTestId("group-switcher").first().click();
  await page.getByRole("listbox").getByRole("option", { name: /Personal/ }).click();
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  await expect(page.getByTestId("dashboard-scope-banner")).toHaveCount(0);
  expect(await readTotalSpend(page)).toBe(personalTotal);
});

test("5e: admin visibility + member consent + consent-gated transactions list", async ({
  page,
}) => {
  await signIn(page);
  const groupName = `E2E 5e ${Date.now()}`;

  // Create a group + share a personal transaction into it (the contributor row).
  await page.goto("/groups");
  const form = page.getByTestId("create-group-form");
  await form.getByRole("textbox").fill(groupName);
  await form.getByRole("button").click();
  await expect(page.getByText(groupName)).toBeVisible({ timeout: 15_000 });

  await page.goto("/transactions");
  await page.locator("a[href^='/transactions/']").first().click();
  const share = page.getByTestId("share-to-group");
  await expect(share).toBeVisible({ timeout: 15_000 });
  await share.getByRole("combobox").selectOption({ label: groupName });
  await share.getByRole("button").click();
  await expect(share.getByRole("button")).toHaveText(/Compartido|Shared/, { timeout: 15_000 });

  // Open the group's detail panel (the per-card expand button carries aria-expanded).
  await page.goto("/groups");
  const card = page.locator("li", { hasText: groupName });
  await card.locator('button[aria-expanded="false"]').click();

  // Default: the transactions list shows only the owner's OWN row (visibility off).
  await page.getByTestId("group-transactions-toggle").click();
  const list = page.getByTestId("group-transactions");
  await expect(list).toBeVisible();
  await expect(list.getByText(/You|Tú|Você/)).toBeVisible({ timeout: 15_000 });

  // Admin enables member visibility. The checkbox is controlled — its checked
  // state only flips after the async mutation writes the updated detail back to
  // cache — so click + retry-assert rather than check() (which verifies sync).
  await page.getByTestId("group-visibility-toggle").click();
  await expect(page.getByTestId("group-visibility-toggle")).toBeChecked();
  // The consent control appears once visibility is on; the member opts in.
  await page.getByTestId("group-consent-toggle").click();
  await expect(page.getByTestId("group-consent-toggle")).toBeChecked();

  // The own shared row is still listed after enabling visibility + consent.
  await expect(list.getByText(/You|Tú|Você/)).toBeVisible();
});

/** Read the dashboard's total-spend figure as a number of minor units-ish integer. */
async function readTotalSpend(page: Page): Promise<number> {
  const el = page.getByTestId("total-spend");
  await el.waitFor({ state: "visible", timeout: 20_000 });
  const text = (await el.textContent()) ?? "";
  return Number(text.replace(/[^0-9]/g, "")) || 0;
}
