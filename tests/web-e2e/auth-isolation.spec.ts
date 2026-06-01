import { test, expect, type Page } from "@playwright/test";

/**
 * Web auth-isolation journeys (SC-08 / REQ-14 on the web surface):
 *  - ProtectedRoute redirects an unauthenticated visitor away from app routes.
 *  - Sign-out from the app shell returns to /sign-in.
 *
 * Runs against the deterministic staging-e2e backend (same as scan-progress.spec.ts).
 * The app's gated test-auth button (web/src/routes/sign-in.tsx) signs in via
 * email/password, avoiding the Google OAuth popup.
 */

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

const PROTECTED_ROUTES = ["/scan", "/statements", "/transactions", "/insights"];

for (const route of PROTECTED_ROUTES) {
  test(`unauthenticated visit to ${route} redirects to sign-in`, async ({ page }) => {
    // Fresh context (no auth) — ProtectedRoute should bounce to /sign-in.
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in$/, { timeout: 30_000 });
    await expect(page.getByTestId("sign-in-test-auth-button")).toBeVisible();
  });
}

test("sign-out from the app returns to the sign-in screen", async ({ page }) => {
  await signInWithTestAuth(page);

  // The signed-in shell exposes a sign-out control (i18n "Sign out" in en).
  await page.getByRole("button", { name: /sign out/i }).first().click();

  await expect(page).toHaveURL(/\/sign-in$/, { timeout: 30_000 });
  await expect(page.getByTestId("sign-in-test-auth-button")).toBeVisible();

  // And the protected app is no longer reachable after sign-out.
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/sign-in$/, { timeout: 30_000 });
});
