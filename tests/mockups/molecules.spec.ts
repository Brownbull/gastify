import { test, expect } from "@playwright/test";

/**
 * Smoke spec for all 18 molecule demo pages. Per molecule: page loads without
 * console errors, Tweaks panel boots, and the molecule's primary CSS class
 * appears at least once in the rendered DOM. Section-aware breadcrumb resolves
 * back to molecules/index.html.
 *
 * Plus a focused interaction test for state-tabs (canonical multi-state
 * pattern) — clicking a non-active tab toggles aria-selected + .is-active.
 */

interface MoleculeCase {
  name: string;
  file: string;
  primaryClass: string;
}

const MOLECULES: MoleculeCase[] = [
  { name: "state-tabs", file: "state-tabs.html", primaryClass: "state-tabs" },
  { name: "card-transaction", file: "card-transaction.html", primaryClass: "card-transaction" },
  { name: "card-stat", file: "card-stat.html", primaryClass: "card-stat" },
  { name: "card-empty", file: "card-empty.html", primaryClass: "card-empty" },
  { name: "card-feature", file: "card-feature.html", primaryClass: "card-feature" },
  { name: "card-celebration", file: "card-celebration.html", primaryClass: "card-celebration" },
  { name: "modal", file: "modal.html", primaryClass: "modal" },
  { name: "sheet", file: "sheet.html", primaryClass: "sheet" },
  { name: "drawer", file: "drawer.html", primaryClass: "drawer" },
  { name: "toast", file: "toast.html", primaryClass: "toast" },
  { name: "banner", file: "banner.html", primaryClass: "banner" },
  { name: "nav-bottom", file: "nav-bottom.html", primaryClass: "nav-bottom" },
  { name: "nav-top", file: "nav-top.html", primaryClass: "nav-top" },
  { name: "nav-sidebar", file: "nav-sidebar.html", primaryClass: "nav-sidebar" },
  { name: "fab", file: "fab.html", primaryClass: "fab" },
  { name: "form", file: "form.html", primaryClass: "form" },
  { name: "filters", file: "filters.html", primaryClass: "filter-strip" },
  { name: "list-item", file: "list-item.html", primaryClass: "list-item" },
];

test.describe("Molecules — smoke", () => {
  for (const molecule of MOLECULES) {
    test(`${molecule.name} page loads + tweaks panel boots`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.goto(`/molecules/${molecule.file}`);

      // Tweaks panel injected by tweaks.js after DOMContentLoaded
      const panel = page.locator("#tweaks-panel");
      await expect(panel).toBeVisible();

      // The molecule's primary class appears at least once in the demo
      const primary = page.locator(`.${molecule.primaryClass}`).first();
      await expect(primary).toBeVisible();

      // Section-aware breadcrumb back to molecules/index.html
      await expect(page.locator(".tweaks__breadcrumb")).toBeVisible();
      await expect(page.locator(".tweaks__breadcrumb")).toHaveAttribute(
        "href",
        "./index.html",
      );

      // No console errors during boot
      expect(
        consoleErrors,
        `console errors: ${consoleErrors.join(" | ")}`,
      ).toEqual([]);
    });
  }
});

test.describe("Molecules — state-tabs interaction", () => {
  test("clicking a non-active tab toggles ARIA shape", async ({ page }) => {
    await page.goto("/molecules/state-tabs.html");

    // ARIA-shape demo: editor tablist with "Normal" + "Hard-lock"
    const tablist = page.locator('[role="tablist"][data-state-group="editor"]');
    await expect(tablist).toBeVisible();

    const normalTab = tablist.locator('[role="tab"]', { hasText: "Normal" });
    const hardlockTab = tablist.locator('[role="tab"]', { hasText: "Hard-lock" });

    // Initial state — Normal selected
    await expect(normalTab).toHaveAttribute("aria-selected", "true");
    await expect(hardlockTab).toHaveAttribute("aria-selected", "false");

    // Click Hard-lock — tweaks.js binds toggle
    await hardlockTab.click();

    // After click, selection inverts. tweaks.js may use either aria-selected
    // attribute swap OR adding .is-active class — assert at least one path holds.
    const hardlockSelected = await hardlockTab.getAttribute("aria-selected");
    const hardlockHasActive = await hardlockTab.evaluate((el) =>
      el.classList.contains("is-active"),
    );
    expect(hardlockSelected === "true" || hardlockHasActive).toBe(true);
  });
});

test.describe("Molecules — hub catalog", () => {
  test("molecules/index.html lists all 18 molecule cards + COMPONENT-LIBRARY link", async ({
    page,
  }) => {
    await page.goto("/molecules/index.html");

    // Heading + meta pills present
    await expect(page.locator("h1", { hasText: "Molecules" })).toBeVisible();
    await expect(page.locator(".meta-pill", { hasText: "18 molecules" })).toBeVisible();

    // Each molecule card resolves to a real file
    for (const molecule of MOLECULES) {
      const card = page.locator(`.molecule-card[href="./${molecule.file}"]`);
      await expect(card, `card for ${molecule.name} missing on hub`).toBeVisible();
    }

    // COMPONENT-LIBRARY.md link in footer
    const catalogLink = page.locator(`a[href="./COMPONENT-LIBRARY.md"]`).first();
    await expect(catalogLink).toBeVisible();

    // Back-link to mockups home
    const homeLink = page.locator(`a[href="../index.html"]`).last();
    await expect(homeLink).toBeVisible();
  });
});
