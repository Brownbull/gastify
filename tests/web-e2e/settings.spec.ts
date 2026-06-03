import { test, expect, type Page } from "@playwright/test";

/**
 * Web settings journey — theme switching, profile display, account actions.
 * Proves the /settings route renders, theme switching applies CSS changes,
 * and the sign-out button is accessible from settings.
 */

async function signInWithTestAuth(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.describe("Settings page", () => {
  test("renders settings with profile, appearance, and account sections", async ({
    page,
  }) => {
    await signInWithTestAuth(page);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /settings|ajustes/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/profile|perfil/i).first()).toBeVisible();
    await expect(page.getByText(/appearance|apariencia/i).first()).toBeVisible();
    await expect(page.getByText(/account|cuenta/i).first()).toBeVisible();

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/01-settings-loaded.png",
    });
  });

  test("switches color theme and mode", async ({ page }) => {
    await signInWithTestAuth(page);
    await page.goto("/settings");

    const main = page.getByRole("main");
    await expect(main.getByText(/appearance|apariencia/i)).toBeVisible({
      timeout: 15_000,
    });

    const initialBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
    );

    // The theme select is the first <select> inside <main> (not the sidebar language picker)
    const themeSelect = main.locator("select").first();
    await themeSelect.selectOption("professional");

    const afterProfessional = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
    );
    expect(afterProfessional).not.toBe(initialBg);

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/02-theme-professional.png",
    });

    // Switch to Mono theme
    await themeSelect.selectOption("mono");

    const afterMono = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
    );
    expect(afterMono).not.toBe(afterProfessional);

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/03-theme-mono.png",
    });

    // Toggle dark mode (second select in main)
    const modeSelect = main.locator("select").nth(1);
    await modeSelect.selectOption("dark");

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(isDark).toBe(true);

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/04-theme-mono-dark.png",
    });

    // Restore Normal + light
    await themeSelect.selectOption("normal");
    await modeSelect.selectOption("light");

    const restored = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
    );
    expect(restored).toBe(initialBg);

    await page.screenshot({
      path: "tests/web-e2e/proof/settings/05-theme-restored.png",
    });
  });

  test("sign-out button is accessible from settings", async ({ page }) => {
    await signInWithTestAuth(page);
    await page.goto("/settings");

    const main = page.getByRole("main");
    await expect(main.getByText(/appearance|apariencia/i)).toBeVisible({
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
