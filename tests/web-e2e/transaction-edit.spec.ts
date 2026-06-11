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

  // Open the first EDITABLE transaction. Rows link to /transactions/<uuid>; a row
  // shared into a group is LOCKED (D74 — is_shared renders read-only, no edit button),
  // and the groups specs share rows, so blindly picking .first() collides with them.
  const txnLinks = page.locator('a[href^="/transactions/"]');
  await expect(txnLinks.first()).toBeVisible({ timeout: 30_000 });
  const candidates = Math.min(await txnLinks.count(), 6);
  let opened = false;
  for (let i = 0; i < candidates; i++) {
    await txnLinks.nth(i).click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/, { timeout: 30_000 });
    const editBtn = page.locator('button[title="Click to edit"]').first();
    const editable = await editBtn
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (editable) {
      opened = true;
      break;
    }
    await page.goBack(); // locked (shared) — try the next row
  }
  if (!opened) throw new Error("No editable (unshared) transaction found in the first rows");

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
