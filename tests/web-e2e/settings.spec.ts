import { test, expect, type Page } from "@playwright/test";

/**
 * Web settings journey — profile display, language switching, account actions.
 * Proves the /settings route renders, the language section is present, and the
 * sign-out button is accessible from settings. (The warm 3-theme × light/dark
 * switcher was removed in W1 — single Playful Geometric light theme, DM-1/D-B.)
 */

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.describe("Settings page", () => {
  test("renders settings with profile, language, and account sections", async ({
    page,
  }) => {
    await signInWithTestAuth(page);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /settings|ajustes/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/profile|perfil/i).first()).toBeVisible();
    await expect(page.getByText(/idioma|language/i).first()).toBeVisible();
    await expect(page.getByText(/account|cuenta/i).first()).toBeVisible();

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/01-settings-loaded.png",
    });
  });

  test("sign-out button is accessible from settings", async ({ page }) => {
    await signInWithTestAuth(page);
    await page.goto("/settings");

    const main = page.getByRole("main");
    await expect(main.getByText(/idioma|language/i)).toBeVisible({
      timeout: 15_000,
    });

    // Scope to the sign-out button inside <main> (not the sidebar one)
    const signOutButton = main.getByRole("button", { name: /sign out|cerrar/i });
    await expect(signOutButton).toBeVisible();

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/06-sign-out-visible.png",
    });
  });
});
