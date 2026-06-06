import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Web Notification Center runtime proof (Phase 7, D78) against deployed staging-e2e.
 *
 * Hook-fire path: a deterministic fixture scan (staging-e2e forces the fixture
 * provider, D76) completes and fires the scan_complete hook, which creates a real
 * user-global notification for the signed-in user. The feed then lists it (newest
 * first, unread), mark-read clears the unread marker + drops the badge, and delete
 * removes the row. This proves the end-to-end scan→notification hook AND the UI,
 * additively (no destructive seed).
 *
 * Requires: deployed staging-e2e serving /api/v1/notifications + the scan pipeline.
 */

const HAPPY_FIXTURE = path.resolve(
  __dirname,
  "../mobile/fixtures/receipts/gastify-e2e-happy.jpg",
);

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("Notification Center: a fixture scan creates a notification; list, mark-read, delete", async ({
  browser,
}, testInfo) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await signIn(page);

    // 1) Fire the scan_complete hook via a deterministic fixture scan.
    await page.goto("/scan");
    await page.locator('input[type="file"]').setInputFiles(HAPPY_FIXTURE);
    await expect(page.getByText(/Scan Complete/i).first()).toBeVisible({ timeout: 90_000 });

    // 2) The feed lists the freshly-created notification (newest first, unread).
    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-screen")).toBeVisible({ timeout: 15_000 });
    const firstRow = page.getByTestId("notifications-row").first();
    await expect(firstRow).toBeVisible({ timeout: 20_000 });
    await expect(firstRow).toHaveText(/Boleta escaneada/);
    await expect(firstRow).toHaveAttribute("data-unread", "true");
    // The bell badge reflects the unread notification (user-global).
    await expect(page.getByTestId("notifications-bell").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("01-notifications-list.png"), fullPage: true });

    // 3) Mark read → the row's unread marker clears (optimistic).
    await firstRow.getByTestId("notifications-mark-read").click();
    await expect(firstRow).toHaveAttribute("data-unread", "false", { timeout: 10_000 });
    await page.screenshot({ path: testInfo.outputPath("02-notifications-read.png"), fullPage: true });

    // 4) Delete → the row count drops by one (robust to any pre-existing rows).
    const before = await page.getByTestId("notifications-row").count();
    await page.getByTestId("notifications-row").first().getByTestId("notifications-delete").click();
    await expect(page.getByTestId("notifications-row")).toHaveCount(before - 1, { timeout: 10_000 });
    await page.screenshot({ path: testInfo.outputPath("03-notifications-after-delete.png"), fullPage: true });
  } finally {
    await ctx.close();
  }
});
