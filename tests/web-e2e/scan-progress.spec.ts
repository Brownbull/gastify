import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Real-browser proof of the web scan progress journey over SSE against the
 * deterministic staging-e2e backend (fixture provider — no Gemini). The web uses
 * EventSource (works through Railway's edge), so unlike the mobile WebSocket it is
 * unaffected by the WS-403 bug; this exercises that real transport end-to-end.
 */

const FIXTURE_RECEIPT = path.resolve(
  __dirname,
  "../mobile/fixtures/receipts/gastify-e2e-happy.jpg",
);

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  // Firebase email/password resolves -> onAuthStateChanged -> redirect to "/".
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("renders live scan progress over SSE through to completion", async ({ page }) => {
  await signInWithTestAuth(page);

  await page.goto("/scan");
  await expect(page.getByRole("heading", { name: "Scan Receipt" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(FIXTURE_RECEIPT);

  // Progress must render (the upload form is replaced by the progress stages) — proves
  // the real EventSource is consuming the real SSE stream, not just a final jump.
  await expect(page.getByText(/Submitted|Processing|Extracting|Categorizing|Verified/).first())
    .toBeVisible({ timeout: 30_000 });

  // And it reaches the completed result with the fixture's extracted data.
  await expect(page.getByText("Scan Complete").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Supermercado Jumbo/)).toBeVisible();
});

test("recovers from an SSE drop and still completes", async ({ page }) => {
  await signInWithTestAuth(page);

  // Abort the FIRST SSE events connection to simulate a dropped stream; allow the rest.
  // The web's onerror -> exponential-backoff reconnect should re-subscribe and the late
  // subscriber receives the stored terminal snapshot, completing the journey.
  let dropped = false;
  await page.route("**/api/v1/scans/*/events*", async (route) => {
    if (!dropped) {
      dropped = true;
      await route.abort("connectionfailed");
      return;
    }
    await route.continue();
  });

  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_RECEIPT);

  // Despite the dropped first stream, the reconnect re-subscribes and the journey completes.
  await expect(page.getByText("Scan Complete").first()).toBeVisible({ timeout: 60_000 });
  expect(dropped).toBe(true); // confirm we actually exercised the drop path
});
