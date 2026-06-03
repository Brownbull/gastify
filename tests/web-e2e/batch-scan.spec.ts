import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Web batch scanning — multi-receipt capture + post-persist review. Against the
 * deterministic staging-e2e backend (fixture provider), a batch of three fixtures
 * exercises both saved and failed per-item terminal statuses in one run:
 *   happy   → completed (transaction saved, high confidence)
 *   review  → completed (transaction saved, low-confidence flag; math reconciles)
 *   failure → failed     (INVALID_IMAGE, no transaction)
 * needs_review status comes from a math-reconciliation mismatch, which none of
 * these fixtures trigger — so the summary is 2 saved / 0 review / 1 failed. Each
 * scan is submitted to the existing single-scan pipeline (N× POST /scans) and
 * polled to a terminal status.
 */

const FIXTURE = (name: string): string =>
  path.resolve(__dirname, `../mobile/fixtures/receipts/gastify-e2e-${name}.jpg`);

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("batch scan of three receipts produces two saved and one failed", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/scan-batch");

  await expect(page.getByRole("heading", { name: /batch/i })).toBeVisible({
    timeout: 15_000,
  });

  // Queue three fixtures with distinct deterministic outcomes.
  await page
    .getByTestId("batch-file-input")
    .setInputFiles([FIXTURE("happy"), FIXTURE("review"), FIXTURE("failure")]);
  await expect(page.getByTestId("batch-queue-item")).toHaveCount(3);
  await page.screenshot({
    path: "tests/web-e2e/proof/batch-scan/01-queue.png",
  });

  // Submit the batch — each receipt is uploaded and polled to a terminal status.
  await page.getByTestId("batch-scan-submit").click();
  await expect(page.getByTestId("batch-review")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({
    path: "tests/web-e2e/proof/batch-scan/02-processing.png",
  });

  // The batch settles to review (the "scan more" action only renders in review).
  await expect(page.getByTestId("batch-scan-more")).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByTestId("batch-summary-completed")).toHaveText("2");
  await expect(page.getByTestId("batch-summary-review")).toHaveText("0");
  await expect(page.getByTestId("batch-summary-failed")).toHaveText("1");

  // The two saved receipts each expose a transaction link; the failed one does not.
  await expect(page.getByTestId("batch-item-view")).toHaveCount(2);
  await expect(page.getByTestId("batch-item")).toHaveCount(3);

  await page.screenshot({
    path: "tests/web-e2e/proof/batch-scan/03-summary.png",
  });
});
