import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Web statement-reconciliation journey (REQ-07/08/09 on the web surface):
 * upload a credit-card PDF, consent to AI fallback, run it through the
 * deterministic staging-e2e parser, and assert the reconciliation panel renders
 * the coverage buckets (Coverage / Matched / Statement only / App only).
 * Web mirror of the p5 statement device flow; SSE progress, no Gemini.
 */

const FIXTURE_PDF = path.resolve(__dirname, "fixtures/gastify-statement-e2e.pdf");

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("uploads a statement and renders the reconciliation buckets", async ({ page }) => {
  await signInWithTestAuth(page);

  await page.goto("/statements");
  await expect(page.getByRole("heading", { name: /statement reconciliation/i })).toBeVisible({
    timeout: 30_000,
  });

  // Select the PDF (the file input is visually hidden but settable).
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_PDF);

  // Consent to AI fallback (deterministic parser handles the fixture, but the
  // form may gate submit on consent).
  await page.getByRole("checkbox").first().check();

  // Kick the scan.
  await page.getByRole("button", { name: "Start statement scan" }).click();

  // The reconciliation panel renders once processing completes (phase==="completed").
  // Its metric labels are the proof the statement was parsed + reconciled.
  await expect(page.getByText("Coverage")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Matched").first()).toBeVisible();
  await expect(page.getByText("Statement only").first()).toBeVisible();
  await expect(page.getByText("App only").first()).toBeVisible();
});
