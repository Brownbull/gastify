import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Proof-capture run: drives each web journey against the deployed staging-e2e
 * backend and saves a full-page screenshot of the real rendered state into
 * tests/web-e2e/proof/. Not a coverage test (the *.spec.ts files own assertions)
 * — this exists to collect visual evidence. Run:
 *   npx playwright test --config=tests/web-e2e/playwright.config.ts capture-proof
 */

const PROOF_DIR = path.resolve(__dirname, "proof");
const FIXTURE_RECEIPT = path.resolve(__dirname, "../mobile/fixtures/receipts/gastify-e2e-happy.jpg");
const FIXTURE_PDF = path.resolve(__dirname, "fixtures/gastify-statement-e2e.pdf");

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}
async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(PROOF_DIR, `${name}.png`), fullPage: true });
}

test("proof: scan progress complete", async ({ page }) => {
  await signIn(page);
  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_RECEIPT);
  await expect(page.getByText("Scan Complete").first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/Supermercado Jumbo/)).toBeVisible();
  await shot(page, "01-scan-complete");
});

test("proof: transaction edit marker", async ({ page }) => {
  await signIn(page);
  await page.goto("/transactions");
  await page.locator('a[href^="/transactions/"]:not([href$="/new"])').first().click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/, { timeout: 30_000 });
  await page.locator('button[title="Click to edit"]').first().click();
  const input = page.locator('input[type="text"]').first();
  await input.fill("E2E Proof Merchant");
  await input.press("Enter");
  await expect(page.getByText("(edited)").first()).toBeVisible({ timeout: 30_000 });
  await shot(page, "02-transaction-edited");
});

test("proof: dashboard monthly view", async ({ page }) => {
  // The /insights route was retired in v1 (D68) — its rollups live on the
  // dashboard (/), now backed by the recursive drill-down tree (D69).
  await signIn(page);
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill("2026-03");
  await expect(page.getByText("Total spend")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "By item" }).click();
  await shot(page, "03-dashboard-by-item");
});

test("proof: statement reconciliation buckets", async ({ page }) => {
  await signIn(page);
  await page.goto("/statements");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_PDF);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Start statement scan" }).click();
  await expect(page.getByText("Coverage")).toBeVisible({ timeout: 90_000 });
  await shot(page, "04-statement-reconciled");
});

test("proof: sign-out returns to sign-in", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /sign out/i }).first().click();
  await expect(page).toHaveURL(/\/sign-in$/, { timeout: 30_000 });
  await shot(page, "05-signed-out");
});
