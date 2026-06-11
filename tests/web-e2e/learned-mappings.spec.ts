import { test, expect, type Page } from "@playwright/test";
import { cleanupLearnedMappings } from "./helpers/cleanup";

/**
 * Learned-mappings management (functionality plan, Phase 5; UX-4): a merchant
 * correction appears in Settings → Learned mappings, and deleting it removes the row
 * (the unlearn semantics — next-scan-stops-applying — are backend-pinned).
 */

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.afterEach(async () => {
  await cleanupLearnedMappings();
});

test("a merchant edit appears under learned mappings and can be deleted", async ({ page }) => {
  await signIn(page);

  // Teach: rename an editable transaction's merchant.
  await page.goto("/transactions");
  const links = page.locator("a[href^='/transactions/']");
  await links.first().waitFor({ timeout: 30_000 });
  const target = `E2E Learned ${Date.now()}`;
  let taught = false;
  for (let i = 0; i < Math.min(await links.count(), 6); i++) {
    await links.nth(i).click();
    const editBtn = page.locator('button[title="Click to edit"]').first();
    const editable = await editBtn
      .waitFor({ state: "visible", timeout: 4_000 })
      .then(() => true)
      .catch(() => false);
    if (editable) {
      await editBtn.click();
      const input = page.locator('input[type="text"]:focus');
      await input.fill(target);
      await input.press("Enter");
      await expect(page.getByText(target).first()).toBeVisible({ timeout: 15_000 });
      taught = true;
      break;
    }
    await page.goBack();
  }
  expect(taught).toBe(true);

  // The mapping shows in settings; delete it; the row disappears.
  await page.goto("/settings");
  const section = page.getByTestId("learned-mappings-section");
  await expect(section).toBeVisible({ timeout: 20_000 });
  const row = section.getByText(new RegExp(`→ ${target}`));
  await expect(row).toBeVisible({ timeout: 20_000 });
  const rowContainer = page.locator("div", { has: row }).last();
  await rowContainer.locator("[data-testid^='mapping-delete-']").click();
  await expect(row).toHaveCount(0, { timeout: 15_000 });
});
