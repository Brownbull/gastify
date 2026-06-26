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
  // Currency now lives in the Escaneo sub-screen of the settings hub (Wf-fidelity port).
  await page.goto("/settings/scanning");
  const select = page.getByTestId("settings-currency-select");
  await expect(select).toBeVisible({ timeout: 20_000 });
  await expect(select).toBeEnabled({ timeout: 20_000 }); // profile loaded
  return select;
}

test("currency switch persists across reload, both directions", async ({ page }) => {
  await signIn(page);

  // Start-state-agnostic: the shared e2e user's current value is whatever the last
  // run left — switch to the OTHER currency, then back to the original.
  let select = await currencySelect(page);
  const original = await select.inputValue();
  expect(["CLP", "USD"]).toContain(original);
  const other = original === "CLP" ? "USD" : "CLP";

  await select.selectOption(other);
  await expect(select).toBeEnabled({ timeout: 10_000 }); // save round-trip done

  await page.reload();
  select = await currencySelect(page);
  await expect(select).toHaveValue(other); // persisted server-side

  await select.selectOption(original); // restore the shared user
  await expect(select).toBeEnabled({ timeout: 10_000 });
  await page.reload();
  select = await currencySelect(page);
  await expect(select).toHaveValue(original);
});
