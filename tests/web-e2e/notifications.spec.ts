import { test, expect, type Page } from "@playwright/test";

/**
 * Web Notification Center runtime proof (Phase 7, D78) against deployed staging-e2e.
 * The staging seed inserts exactly one deterministic, unread notification for user A
 * (deep-linked to the seeded transaction), so the bell badge shows unread, the feed
 * lists it, mark-read clears the unread marker, and delete empties the feed.
 *
 * Requires: deployed staging-e2e serving /api/v1/notifications + the seed having run.
 */

async function signIn(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("Notification Center: bell badge, list, mark-read, delete", async ({ browser }, testInfo) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await signIn(page, "sign-in-test-auth-button");

    // The bell + unread badge reflect the seeded unread notification (user-global).
    await expect(page.getByTestId("notifications-bell").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("notifications-badge").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-screen")).toBeVisible({ timeout: 15_000 });

    // The seeded notification renders, unread.
    const firstRow = page.getByTestId("notifications-row").first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await expect(firstRow).toHaveAttribute("data-unread", "true");
    await page.screenshot({ path: testInfo.outputPath("01-notifications-list.png"), fullPage: true });

    // Mark read → the row's unread marker clears (optimistic).
    await firstRow.getByTestId("notifications-mark-read").click();
    await expect(firstRow).toHaveAttribute("data-unread", "false", { timeout: 10_000 });
    await page.screenshot({ path: testInfo.outputPath("02-notifications-read.png"), fullPage: true });

    // Delete the (only seeded) row → empty state.
    await page
      .getByTestId("notifications-row")
      .first()
      .getByTestId("notifications-delete")
      .click();
    await expect(page.getByTestId("notifications-empty")).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: testInfo.outputPath("03-notifications-empty.png"), fullPage: true });
  } finally {
    await ctx.close();
  }
});
