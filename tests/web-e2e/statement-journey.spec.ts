import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { deleteAllStatements, firstMatchedTransactionId } from "./helpers/cleanup";

/**
 * THE FULL STATEMENT JOURNEY (statement-hardening plan, Phase 4), screenshot-proven:
 * upload → reconcile → the matched transaction wears the badge → its content is
 * LOCKED (edit refused with the rule named) → the ledger filters isolate matched /
 * unmatched / statement-origin rows → deleting the statement UNLOCKS the row again.
 * Proofs under tests/web-e2e/proof/statement-journey/.
 */

const PROOF_DIR = path.resolve(__dirname, "proof", "statement-journey");
const FIXTURE_PDF = path.resolve(__dirname, "fixtures/gastify-statement-e2e.pdf");

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function proof(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(PROOF_DIR, `${name}.png`), fullPage: true });
}

test("statement journey: match → badge → locked → filters → unlock", async ({ page }) => {
  test.setTimeout(300_000);
  await signIn(page);

  // 1. Upload + reconcile (the dup path re-dispatches if it already exists).
  await page.goto("/statements");
  await expect(page.getByRole("heading", { name: /statement reconciliation/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_PDF);
  await page.getByRole("checkbox").first().check(); // AI-fallback consent gate
  await page.getByRole("button", { name: "Start statement scan" }).click();
  await expect(page.getByText("Coverage")).toBeVisible({ timeout: 90_000 });
  await proof(page, "01-reconciliation-buckets");

  // 2. The matched transaction wears the badge on its detail.
  const matchedId = await firstMatchedTransactionId();
  expect(matchedId).toBeTruthy();
  await page.goto(`/transactions/${matchedId}`);
  await expect(page.getByTestId("txn-matched-badge")).toBeVisible({ timeout: 20_000 });
  await proof(page, "02-matched-badge-on-detail");

  // 3. LOCKED: the merchant editor saves into a 409 — the UI surfaces the failure
  //    (rollback toast) and the value stays.
  const editBtn = page.locator('button[title="Click to edit"]').first();
  await editBtn.click();
  const input = page.locator('input[type="text"]:focus');
  const original = await input.inputValue();
  await input.fill("Should Not Stick");
  await input.press("Enter");
  await expect(page.getByText(/rolled back|locked|matched/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await proof(page, "03-edit-refused-locked");
  await page.reload();
  await expect(page.getByText(original).first()).toBeVisible({ timeout: 20_000 });

  // 4. Filters: matched=true contains the row; statement-origin filter works too.
  await page.goto("/transactions");
  await page.getByTestId("filter-matched").selectOption("true");
  await expect(page.getByTestId("txn-matched-badge").first()).toBeVisible({ timeout: 20_000 });
  await proof(page, "04-filter-matched-only");
  await page.getByTestId("filter-matched").selectOption("");
  await page.getByTestId("filter-source").selectOption("statement");
  await page.waitForTimeout(800);
  await proof(page, "05-filter-statement-origin");

  // 5. UNLOCK: remove EVERY statement (multiple historical fixtures can hold MATCHED
  // verdicts on the same txn — deleting one isn't enough). Cascades all verdicts.
  expect(await deleteAllStatements()).toBeGreaterThan(0);
  await page.goto(`/transactions/${matchedId}`);
  await expect(page.getByText(original).first()).toBeVisible({ timeout: 20_000 }); // loaded
  await expect(page.getByTestId("txn-matched-badge")).toHaveCount(0);
  // Same-value commits are editor no-ops, so prove the unlock with a real rename:
  // the new name STICKS (no rollback toast) and survives a reload, then restore.
  const rename = async (value: string) => {
    const btn = page.locator('button[title="Click to edit"]').first();
    await btn.click();
    const inp = page.locator('input[type="text"]:focus');
    await inp.fill(value);
    // Await the server response BEFORE reloading — the optimistic update shows the
    // value immediately and a premature reload ABORTS the in-flight PATCH.
    await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === "PATCH" && r.url().includes("/transactions/") && r.ok(),
        { timeout: 15_000 },
      ),
      inp.press("Enter"),
    ]);
    await page.reload();
    await expect(page.getByText(value).first()).toBeVisible({ timeout: 20_000 });
  };
  await rename(`${original} unlocked`);
  await proof(page, "06-unlocked-after-statement-delete");
  await rename(original); // restore
});
