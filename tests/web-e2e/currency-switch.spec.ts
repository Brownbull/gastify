import { test, expect, type Page } from "@playwright/test";

/**
 * User currency switch (functionality plan, Phase 3): the settings select changes the
 * user's default currency CLP↔USD via the rectification API and PERSISTS across a
 * reload. Restores CLP at the end (shared e2e user).
 */

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function currencySelect(page: Page) {
  await page.goto("/settings");
  const select = page.getByTestId("settings-currency-select");
  await expect(select).toBeVisible({ timeout: 20_000 });
  await expect(select).toBeEnabled({ timeout: 20_000 }); // profile loaded
  return select;
}

test("currency switch CLP→USD persists across reload, then back", async ({ page }) => {
  await signIn(page);

  let select = await currencySelect(page);
  await expect(select).toHaveValue("CLP");

  await select.selectOption("USD");
  await expect(select).toBeEnabled({ timeout: 10_000 }); // save round-trip done

  await page.reload();
  select = await currencySelect(page);
  await expect(select).toHaveValue("USD"); // persisted server-side

  await select.selectOption("CLP"); // restore the shared user
  await expect(select).toBeEnabled({ timeout: 10_000 });
  await page.reload();
  select = await currencySelect(page);
  await expect(select).toHaveValue("CLP");
});
