import { test, expect, type Page } from "@playwright/test";

/**
 * Web transaction manual-edit journey (REQ-13: user_edited_at precedence).
 * Open a transaction from the ledger, inline-edit the merchant name, and assert
 * the "(edited)" provenance marker appears — the web mirror of the mobile
 * ledger-edit device flow. Against the deterministic staging-e2e backend.
 */

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("inline-edit a transaction merchant and see the edited marker", async ({ page }) => {
  await signInWithTestAuth(page);

  await page.goto("/transactions");
  await expect(page.getByRole("heading", { name: /transactions/i })).toBeVisible({
    timeout: 30_000,
  });

  // Open the first transaction in the ledger. Transaction rows link to
  // /transactions/<uuid>; scope to those hrefs so we don't match a nav link.
  const firstTxn = page.locator('a[href^="/transactions/"]').first();
  await expect(firstTxn).toBeVisible({ timeout: 30_000 });
  await firstTxn.click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/, { timeout: 30_000 });

  // On the detail screen the merchant renders as an editable button whose
  // accessible name is the merchant text; it carries title="Click to edit".
  const editButton = page.locator('button[title="Click to edit"]').first();
  await expect(editButton).toBeVisible({ timeout: 30_000 });
  await editButton.click();

  // It becomes a text input; set a new merchant + commit with Enter.
  const newName = "E2E Edited Merchant";
  const input = page.locator('input[type="text"]').first();
  await expect(input).toBeVisible();
  await input.fill(newName);
  await input.press("Enter");

  // The new value persists (shown in both the heading + summary) and the
  // "(edited)" provenance marker (REQ-13) appears.
  await expect(page.getByText(newName).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("(edited)").first()).toBeVisible({ timeout: 30_000 });
});
