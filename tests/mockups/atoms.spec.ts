import { test, expect } from "@playwright/test";

/**
 * Smoke spec for all 10 atom demo pages. Per atom: page loads without console
 * errors, Tweaks panel boots, and the atom's primary CSS class appears at least
 * once in the rendered DOM.
 */

interface AtomCase {
  name: string;
  file: string;
  primaryClass: string;        // a class that MUST appear on the page (smoke check)
  hasLegacySnippet: boolean;   // true if a real legacy reference is embedded; false = placeholder only
}

const ATOMS: AtomCase[] = [
  { name: "button", file: "button.html", primaryClass: "btn", hasLegacySnippet: true },
  { name: "input", file: "input.html", primaryClass: "field-input", hasLegacySnippet: false },
  { name: "select", file: "select.html", primaryClass: "select", hasLegacySnippet: false },
  { name: "pill", file: "pill.html", primaryClass: "pill", hasLegacySnippet: true },
  { name: "badge", file: "badge.html", primaryClass: "badge", hasLegacySnippet: true },
  { name: "avatar", file: "avatar.html", primaryClass: "avatar", hasLegacySnippet: true },
  { name: "chip", file: "chip.html", primaryClass: "chip", hasLegacySnippet: true },
  { name: "skeleton", file: "skeleton.html", primaryClass: "skeleton", hasLegacySnippet: false },
  { name: "progress", file: "progress.html", primaryClass: "progress", hasLegacySnippet: false },
  { name: "spinner", file: "spinner.html", primaryClass: "spinner", hasLegacySnippet: false },
];

test.describe("Atoms — smoke", () => {
  for (const atom of ATOMS) {
    test(`${atom.name} page loads + tweaks panel boots`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.goto(`/atoms/${atom.file}`);

      // Tweaks panel injected by tweaks.js after DOMContentLoaded
      const panel = page.locator("#tweaks-panel");
      await expect(panel).toBeVisible();

      // The atom's primary class appears at least once in the demo
      const primary = page.locator(`.${atom.primaryClass}`).first();
      await expect(primary).toBeVisible();

      // Atoms-section breadcrumb is present (since this IS an /atoms/X.html page)
      await expect(page.locator(".tweaks__breadcrumb")).toBeVisible();
      await expect(page.locator(".tweaks__breadcrumb")).toHaveAttribute("href", "./index.html");

      // Legacy reference section is always present (snippet OR missing-placeholder)
      await expect(page.locator(".legacy-section")).toBeVisible();
      if (atom.hasLegacySnippet) {
        await expect(page.locator(".legacy-snippet").first()).toBeVisible();
      } else {
        await expect(page.locator(".legacy-section--missing")).toBeVisible();
      }

      // No console errors during boot
      expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
    });
  }
});
