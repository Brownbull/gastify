import { test, expect } from "@playwright/test";

/**
 * Tweaks panel coverage spec. Strong visible-effect assertions — catches the
 * "JS works but CSS doesn't react" regression class that prompted this harness.
 *
 * Runs against atoms/button.html as a representative atom (every atom loads the
 * same desktop-shell.css + atoms.css + tweaks.js triad).
 *
 * Note on localStorage: tweaks.js persists state across reloads via the
 * `gabe-mockup-tweaks-v1` localStorage key. Each test starts with a clean slate
 * via `context.clearCookies()` + `page.evaluate(() => localStorage.clear())`.
 */

test.describe("Tweaks panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/atoms/button.html");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    // Wait for tweaks.js to finish injecting + rendering the panel
    await expect(page.locator("#tweaks-panel")).toBeVisible();
    await expect(page.locator('.tweaks__chip[data-act="theme"]')).not.toHaveCount(0);
  });

  test("default theme is 'normal' — initial state has no stale 'default' value", async ({ page }) => {
    const theme = await page.evaluate(() => document.body.getAttribute("data-theme"));
    expect(theme).toBe("normal");
  });

  test("clicking mono + dark inverts the body background to Mono Dark token (#09090b)", async ({ page }) => {
    await page.locator('.tweaks__chip[data-act="theme"][data-val="mono"]').click();
    await page.locator('.tweaks__chip[data-act="mode"][data-val="dark"]').click();

    // Body data-attrs reflect the choice
    await expect(page.locator("body")).toHaveAttribute("data-theme", "mono");
    await expect(page.locator("body")).toHaveAttribute("data-mode", "dark");

    // The CSS rule [data-theme="mono"][data-mode="dark"] sets --bg: #09090b
    // → computed background-color must be rgb(9, 9, 11). desktop-shell.css has
    // `transition: background 0.2s` on body, so getComputedStyle returns an
    // interpolated mid-transition value if read too early. Poll until settled.
    await expect
      .poll(async () => page.evaluate(() => getComputedStyle(document.body).backgroundColor), {
        timeout: 2000,
      })
      .toBe("rgb(9, 9, 11)");
  });

  test("font picker switches body font-family to Space Grotesk", async ({ page }) => {
    // Default: Outfit at the head of the stack
    const beforeFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(beforeFont.toLowerCase()).toContain("outfit");

    // Switch to Space Grotesk
    await page.locator('select[data-act="font"]').selectOption("space-grotesk");
    await expect(page.locator("body")).toHaveAttribute("data-font", "space-grotesk");

    const afterFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(afterFont.toLowerCase()).toContain("space grotesk");
  });

  test("trimmed controls are absent — no density/radius/text-scale/primary", async ({ page }) => {
    await expect(page.locator('[data-act="density"]')).toHaveCount(0);
    await expect(page.locator('[data-act="radius"]')).toHaveCount(0);
    await expect(page.locator('[data-act="scale"]')).toHaveCount(0);
    await expect(page.locator('[data-act="primary"]')).toHaveCount(0);
    await expect(page.locator('[data-act="primary-reset"]')).toHaveCount(0);
  });

  test("loadState normalizer maps stale theme:'default' → 'normal'", async ({ page }) => {
    // Plant legacy localStorage value, reload, verify migration
    await page.evaluate(() => {
      window.localStorage.setItem(
        "gabe-mockup-tweaks-v1",
        JSON.stringify({ theme: "default", mode: "light" })
      );
    });
    await page.reload();
    await expect(page.locator("#tweaks-panel")).toBeVisible();
    const theme = await page.evaluate(() => document.body.getAttribute("data-theme"));
    expect(theme).toBe("normal");
  });

  test("collapse toggle hides .tweaks__body and shrinks panel width", async ({ page }) => {
    // Initial: panel expanded, body visible
    await expect(page.locator("#tweaks-panel .tweaks__body")).toBeVisible();
    const widthBefore = await page.locator("#tweaks-panel").evaluate((el) => el.getBoundingClientRect().width);
    expect(widthBefore).toBeGreaterThan(200);

    // Click the toggle. Width transitions over 220ms — poll until settled.
    await page.locator('[data-act="collapse"]').click();
    await expect(page.locator("body")).toHaveClass(/tweaks-collapsed/);
    await expect
      .poll(async () => page.locator("#tweaks-panel").evaluate((el) => el.getBoundingClientRect().width), {
        timeout: 2000,
      })
      .toBeLessThan(80);

    // Click again to expand
    await page.locator('[data-act="collapse"]').click();
    await expect(page.locator("body")).not.toHaveClass(/tweaks-collapsed/);
  });

  test("font select exposes both 'default' and 'space-grotesk' options", async ({ page }) => {
    const opts = await page.locator('select[data-act="font"] option').evaluateAll((els) =>
      els.map((el) => (el as HTMLOptionElement).value)
    );
    expect(opts.sort()).toEqual(["default", "space-grotesk"]);
  });

  test("default viewport is 'desktop'", async ({ page }) => {
    await expect(page.locator("body")).toHaveAttribute("data-viewport", "desktop");
  });

  test("viewport chip 'mobile' clamps .demo-row width to ~360px", async ({ page }) => {
    await page.locator('.tweaks__chip[data-act="viewport"][data-val="mobile"]').click();
    await expect(page.locator("body")).toHaveAttribute("data-viewport", "mobile");
    const width = await page.locator(".demo-row").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(361);
    expect(width).toBeGreaterThan(0);
  });

  test("viewport chip 'tablet' clamps .demo-row width to ~768px", async ({ page }) => {
    await page.locator('.tweaks__chip[data-act="viewport"][data-val="tablet"]').click();
    await expect(page.locator("body")).toHaveAttribute("data-viewport", "tablet");
    const width = await page.locator(".demo-row").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(769);
  });

  test("clicking the font <select> does NOT re-render the panel (dropdown stays open)", async ({ page }) => {
    // Tag the select with a unique sentinel; if the panel re-renders the
    // sentinel disappears (renderPanel rebuilds from the template literal).
    await page.locator('select[data-act="font"]').evaluate((el) => {
      el.setAttribute("data-render-sentinel", "before-click");
    });

    // Simulate the user opening the dropdown — a plain click on the select.
    await page.locator('select[data-act="font"]').click();

    // After the click, the sentinel must still be present. If renderPanel
    // ran, the select got replaced with a fresh one (no sentinel).
    const sentinelAfter = await page
      .locator('select[data-act="font"]')
      .getAttribute("data-render-sentinel");
    expect(sentinelAfter).toBe("before-click");

    // And the body's data-font shouldn't have changed (no action ran).
    await expect(page.locator("body")).toHaveAttribute("data-font", "default");
  });
});

test.describe("Tweaks panel — atoms hub coverage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/atoms/index.html");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.locator("#tweaks-panel")).toBeVisible();
  });

  test("hub page: font select switches body font-family to Space Grotesk", async ({ page }) => {
    const beforeFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(beforeFont.toLowerCase()).toContain("outfit");

    await page.locator('select[data-act="font"]').selectOption("space-grotesk");
    await expect(page.locator("body")).toHaveAttribute("data-font", "space-grotesk");

    const afterFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(afterFont.toLowerCase()).toContain("space grotesk");
  });

  test("hub page: collapse toggle works", async ({ page }) => {
    await page.locator('[data-act="collapse"]').click();
    await expect(page.locator("body")).toHaveClass(/tweaks-collapsed/);
    await expect
      .poll(async () => page.locator("#tweaks-panel").evaluate((el) => el.getBoundingClientRect().width), {
        timeout: 2000,
      })
      .toBeLessThan(80);
  });

  test("hub page: theme + mode change body background", async ({ page }) => {
    await page.locator('.tweaks__chip[data-act="theme"][data-val="mono"]').click();
    await page.locator('.tweaks__chip[data-act="mode"][data-val="dark"]').click();
    await expect
      .poll(async () => page.evaluate(() => getComputedStyle(document.body).backgroundColor), {
        timeout: 2000,
      })
      .toBe("rgb(9, 9, 11)");
  });
});
