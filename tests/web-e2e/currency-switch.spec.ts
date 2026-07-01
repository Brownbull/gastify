import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * User currency switch (functionality plan, Phase 3): the settings currency picker
 * changes the user's default currency CLP↔USD via the rectification API and PERSISTS
 * across a reload. Restores CLP at the end (shared e2e user).
 *
 * The picker is the Playful-Geometric Select (button + listbox, not a native
 * <select>): the trigger carries the current code on `data-value`, and each option
 * has testid `settings-currency-select-option-<CODE>`.
 */

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function currencyTrigger(page: Page): Promise<Locator> {
  // Currency now lives in the Escaneo sub-screen of the settings hub (fidelity port).
  await page.goto("/settings/scanning");
  const trigger = page.getByTestId("settings-currency-select");
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await expect(trigger).toBeEnabled({ timeout: 20_000 }); // profile loaded
  return trigger;
}

async function pickCurrency(page: Page, trigger: Locator, code: string): Promise<void> {
  await trigger.click(); // open the listbox
  await page.getByTestId(`settings-currency-select-option-${code}`).click();
  // Changes are now STAGED — apply to persist (settings batch their writes).
  const apply = page.getByTestId("settings-apply");
  await apply.click();
  await expect(apply).toHaveCount(0, { timeout: 10_000 }); // bar disappears once saved
}

test("currency switch persists across reload, both directions", async ({ page }) => {
  await signIn(page);

  // Start-state-agnostic: the shared e2e user's current value is whatever the last
  // run left — switch to the OTHER currency, then back to the original.
  let trigger = await currencyTrigger(page);
  const original = await trigger.getAttribute("data-value");
  expect(["CLP", "USD"]).toContain(original);
  const other = original === "CLP" ? "USD" : "CLP";

  await pickCurrency(page, trigger, other);

  await page.reload();
  trigger = await currencyTrigger(page);
  await expect(trigger).toHaveAttribute("data-value", other); // persisted server-side

  await pickCurrency(page, trigger, original!); // restore the shared user
  await page.reload();
  trigger = await currencyTrigger(page);
  await expect(trigger).toHaveAttribute("data-value", original!);
});
