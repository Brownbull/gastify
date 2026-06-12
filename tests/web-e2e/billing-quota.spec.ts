import { test, expect, type Page } from "@playwright/test";

/**
 * D96 tier/quota UI — the quota snapshot reaches the scan page (RATE-LIMIT-PLAN
 * Phase 2/5). The GET /billing/quota endpoint returns tier + per-feature used/limit
 * regardless of enforcement state, so the "used/limit" line renders on a live
 * backend even with billing_enforcement_enabled off (the staging-e2e posture).
 *
 * The tier-GATE 403/402 behavior (free-tier statement block, premium quota
 * exhaustion) is proven in backend pytest — it only fires under enforcement, which
 * staging-e2e deliberately keeps off so the statement-journey suite can upload
 * freely. This spec proves the client wiring + the live endpoint contract.
 */

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("scan page shows the monthly scan quota from /billing/quota", async ({ page }) => {
  await signIn(page);

  // The quota line reads the live endpoint; default free tier = scan limit 20.
  await page.goto("/scan");
  const quota = page.getByTestId("scan-quota");
  await expect(quota).toBeVisible({ timeout: 15_000 });
  // Format is "used/limit" — assert the free-tier scan ceiling is present.
  await expect(quota).toHaveText(/\d+\/20/);
});

test("billing quota endpoint returns the D96 tier shape", async ({ page }) => {
  await signIn(page);
  // Navigate to scan and capture the quota request the page issues.
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/v1/billing/quota") && r.status() === 200,
      { timeout: 20_000 },
    ),
    page.goto("/scan"),
  ]);
  const body = await response.json();
  expect(body.tier).toBe("free");
  expect(body.features.scan).toMatchObject({ limit: 20 });
  expect(body.features.statement).toMatchObject({ limit: 0 });
  expect(body.features.batch).toMatchObject({ limit: 0 });
  expect(typeof body.enforced).toBe("boolean");
});
