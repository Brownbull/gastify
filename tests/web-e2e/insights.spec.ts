import { test, expect, type Page } from "@playwright/test";

/**
 * Web insights monthly-view journey (REQ-06 monthly rollups + dimension toggle).
 * Pick a populated month, assert the summary (Total spend) renders, and toggle the
 * By store <-> By item rollup dimension. Against the deterministic staging-e2e
 * backend (the test account has prior-month seeded transactions).
 */

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("renders monthly insights and toggles rollup dimension", async ({ page }) => {
  await signInWithTestAuth(page);

  await page.goto("/insights");
  const monthInput = page.getByLabel("Insights month");
  await expect(monthInput).toBeVisible({ timeout: 30_000 });

  // The seeded transaction history is in May 2026; the current month is empty.
  // Set the month input directly to a populated period.
  await monthInput.fill("2026-05");

  // Summary stats render (Total spend) once the month has transactions.
  await expect(page.getByText("Total spend")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Top categories" })).toBeVisible();

  // REQ-06 dimension toggle: switch By store <-> By item.
  await page.getByRole("button", { name: "By item" }).click();
  await expect(page.getByRole("button", { name: "By item" })).toBeVisible();
  await page.getByRole("button", { name: "By store" }).click();
  await expect(page.getByRole("button", { name: "By store" })).toBeVisible();
});
