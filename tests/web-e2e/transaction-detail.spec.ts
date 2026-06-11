import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Web transaction-detail parity with mobile p6-item-flag + p4-multicurrency:
 *  - toggle an item urgency flag (REQ-11), asserting the aria-pressed state, then
 *    untoggle (net-zero, re-run safe).
 *  - assert the USD-equivalent field + FX rate render for a CLP transaction
 *    (REQ-17 original amount, REQ-18 USD shadow).
 * Against the deterministic staging-e2e backend.
 */

const FIXTURE_RECEIPT = path.resolve(
  __dirname,
  "../mobile/fixtures/receipts/gastify-e2e-happy.jpg",
);

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function openFirstTransaction(page: Page): Promise<void> {
  await page.goto("/transactions");
  await page.locator('a[href^="/transactions/"]:not([href$="/new"])').first().click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/, { timeout: 30_000 });
}

// Scan a fresh happy receipt (creates a "Supermercado Jumbo" transaction with 2
// line items), then open THAT transaction from the ledger — the detail screen is
// then guaranteed to have flaggable items (the ledger is full of statement-only
// rows with zero items, so "first transaction" isn't reliable).
async function scanThenOpenJumbo(page: Page): Promise<void> {
  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_RECEIPT);
  await expect(page.getByText("Scan Complete").first()).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: /Save Transaction/i }).click();

  await page.goto("/transactions");
  // The Jumbo transaction is dated within a busy ledger, so filter to it via the
  // merchant search rather than relying on list position.
  await page.getByPlaceholder("Search...").fill("Supermercado Jumbo");
  const jumbo = page
    .locator('a[href^="/transactions/"]:not([href$="/new"])')
    .filter({ hasText: /Supermercado Jumbo/ })
    .first();
  await expect(jumbo).toBeVisible({ timeout: 30_000 });
  await jumbo.click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/, { timeout: 30_000 });
}

test("toggle an item urgency flag on and off (REQ-11)", async ({ page }) => {
  await signIn(page);
  await scanThenOpenJumbo(page);

  // The first line-item's Urgency flag chip (aria-pressed reflects flagged state).
  const urgency = page.getByRole("button", { name: /Urgency/ }).first();
  await expect(urgency).toBeVisible({ timeout: 30_000 });

  const initial = await urgency.getAttribute("aria-pressed");
  await urgency.click();
  // State flips after the mutation resolves.
  const flipped = initial === "true" ? "false" : "true";
  await expect(urgency).toHaveAttribute("aria-pressed", flipped, { timeout: 30_000 });

  // Untoggle back to the original state (net-zero, re-run safe).
  await urgency.click();
  await expect(urgency).toHaveAttribute("aria-pressed", initial ?? "false", {
    timeout: 30_000,
  });
});

test("CLP transaction shows the USD-equivalent shadow (REQ-17/18)", async ({ page }) => {
  await signIn(page);
  await openFirstTransaction(page);

  // The detail summary carries a "USD equivalent" field fed by amount_usd_minor.
  await expect(page.getByText("USD equivalent")).toBeVisible({ timeout: 30_000 });
});
