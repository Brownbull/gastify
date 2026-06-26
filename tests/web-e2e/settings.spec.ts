import { test, expect, type Page } from "@playwright/test";

/**
 * Web settings journey — the geometric hub (Wf-fidelity port): /settings is now a
 * sectioned icon-row navigation hub; each backed row pushes a sub-screen route.
 * Proves the hub renders, a row navigates into its sub-screen, and the sign-out
 * (logout) row is accessible from the hub.
 */

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.describe("Settings hub", () => {
  test("renders the sectioned hub and navigates into a sub-screen", async ({ page }) => {
    await signInWithTestAuth(page);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /settings|ajustes/i })).toBeVisible({
      timeout: 15_000,
    });
    // Section headings + key rows.
    await expect(page.getByText(/cuenta|account/i).first()).toBeVisible();
    await expect(page.getByTestId("settings-row-profile")).toBeVisible();
    await expect(page.getByTestId("settings-row-preferences")).toBeVisible();

    // Tapping a backed row pushes its sub-screen route.
    await page.getByTestId("settings-row-profile").click();
    await expect(page).toHaveURL(/\/settings\/profile$/, { timeout: 10_000 });
    await expect(page.getByText(/correo|email/i).first()).toBeVisible({ timeout: 10_000 });

    // Back returns to the hub.
    await page.getByTestId("settings-back").click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 });

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/01-settings-hub.png",
    });
  });

  test("the logout row is accessible from the hub", async ({ page }) => {
    await signInWithTestAuth(page);
    await page.goto("/settings");

    const logout = page.getByTestId("settings-row-logout");
    await expect(logout).toBeVisible({ timeout: 15_000 });
    await expect(logout).toHaveText(/sign out|cerrar/i);

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/06-logout-visible.png",
    });
  });
});
