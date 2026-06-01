import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Web scan non-happy outcomes — parity with the mobile scan-upload review/failure
 * device flows. Against the deterministic staging-e2e backend (fixture provider):
 * the review fixture yields confidence 0.42 (low-confidence review), the failure
 * fixture yields INVALID_IMAGE (scan error panel).
 */

const FIXTURE = (name: string): string =>
  path.resolve(__dirname, `../mobile/fixtures/receipts/gastify-e2e-${name}.jpg`);

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("low-confidence scan surfaces the review warning", async ({ page }) => {
  await signIn(page);
  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE("review"));

  // The review fixture (confidence 0.42) completes but flags for review.
  await expect(page.getByText("Scan Complete").first()).toBeVisible({ timeout: 90_000 });
  await expect(
    page.getByText(/Low confidence scan — please review the extracted data carefully/i),
  ).toBeVisible({ timeout: 30_000 });
});

test("failed scan surfaces the scan error panel", async ({ page }) => {
  await signIn(page);
  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE("failure"));

  // The failure fixture (INVALID_IMAGE) renders the ScanError alert, not a result.
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible({ timeout: 90_000 });
  await expect(alert.getByText(/Invalid Image/i)).toBeVisible();
});
