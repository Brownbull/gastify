import { test, expect, Page } from "@playwright/test";

/**
 * Smoke + a11y spec for all 13 mockups-legacy atom demo pages.
 *
 * Authored 2026-04-27 during /gabe-review L1 to close findings #4 (Playwright
 * served wrong tree) and #5 (8 of 11 atoms had no per-atom verification artifact).
 * Extended same day with categories + icon atoms (V4 taxonomy + lucide registry).
 *
 * Per atom:
 *   1. Page loads without console errors
 *   2. Tweaks panel boots (auto-detects desktop-shell.css selectors)
 *   3. Primary class is visible in the demo
 *   4. Source back-link to frontend/src/ is present
 *   5. Cross-ref "Used by molecules" stub exists
 *
 * Per theme/mode (6 combos via tweaks panel — Normal/Pro/Mono × light/dark):
 *   - Body background-color resolves to a non-empty value per theme
 *
 * Atom-specific assertions:
 *   - progress.html: every demo bar has role="progressbar" + aria-valuenow OR aria-busy
 *   - button.html:   .btn--primary computed `color` is NOT identical across themes
 *                    (proves --on-primary token flips per theme)
 */

interface LegacyAtom {
  name: string;
  file: string;
  primaryClass: string;
}

const ATOMS: LegacyAtom[] = [
  { name: "button", file: "button.html", primaryClass: "btn" },
  { name: "input", file: "input.html", primaryClass: "input" },
  { name: "select", file: "select.html", primaryClass: "select" },
  { name: "pill", file: "pill.html", primaryClass: "pill" },
  { name: "badge", file: "badge.html", primaryClass: "badge" },
  { name: "avatar", file: "avatar.html", primaryClass: "avatar" },
  { name: "chip", file: "chip.html", primaryClass: "chip" },
  { name: "skeleton", file: "skeleton.html", primaryClass: "skeleton" },
  { name: "progress", file: "progress.html", primaryClass: "progress" },
  { name: "spinner", file: "spinner.html", primaryClass: "spinner" },
  { name: "toast", file: "toast.html", primaryClass: "toast" },
  { name: "categories", file: "categories.html", primaryClass: "cat-card" },
  { name: "icon", file: "icon.html", primaryClass: "icon" },
];

const THEMES = ["normal", "professional", "mono"] as const;
const MODES = ["light", "dark"] as const;

async function setTheme(page: Page, theme: string, mode: string) {
  // tweaks.js sets these on <body> (not <html>) — match its target. Also persist to
  // localStorage so any future tweaks.js re-init reads what we wrote, not the prior
  // test's residue. Then poll until the body actually carries our values.
  await page.evaluate(
    ({ t, m }) => {
      document.body.setAttribute("data-theme", t);
      document.body.setAttribute("data-mode", m);
      try {
        const raw = localStorage.getItem("gabe-mockup-tweaks-v1");
        const state = raw ? JSON.parse(raw) : {};
        state.theme = t;
        state.mode = m;
        localStorage.setItem("gabe-mockup-tweaks-v1", JSON.stringify(state));
      } catch {}
    },
    { t: theme, m: mode },
  );
  await page.waitForFunction(
    ({ t, m }) =>
      document.body.getAttribute("data-theme") === t &&
      document.body.getAttribute("data-mode") === m,
    { t: theme, m: mode },
    { timeout: 2000 },
  );
}

test.describe("mockups-legacy atoms — smoke", () => {
  for (const atom of ATOMS) {
    test(`${atom.name} loads + tweaks boots + primary class visible`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.goto(`/atoms/${atom.file}`);

      const panel = page.locator("#tweaks-panel");
      await expect(panel).toBeVisible();

      const primary = page.locator(`.${atom.primaryClass}`).first();
      await expect(primary).toBeVisible();

      // Every atom must have a .source-link block. Most cite a frontend/src/ file via <a>;
      // pill is documented purely as a Tailwind utility pattern (no dedicated React file)
      // so the anchor is optional.
      const sourcePara = page.locator(".source-link").first();
      await expect(sourcePara).toBeVisible();
      const anchorCount = await page
        .locator(".source-link a[href*='frontend/src']")
        .count();
      if (atom.name !== "pill") {
        expect(
          anchorCount,
          `${atom.name} should cite a frontend/src/ file`,
        ).toBeGreaterThanOrEqual(1);
      }

      await expect(page.locator(".crossref").first()).toBeVisible();

      expect(
        consoleErrors,
        `console errors: ${consoleErrors.join(" | ")}`,
      ).toEqual([]);
    });
  }
});

test.describe("mockups-legacy atoms — theme coverage", () => {
  for (const atom of ATOMS) {
    test(`${atom.name} renders cleanly across all 6 theme/mode combos`, async ({
      page,
    }) => {
      await page.goto(`/atoms/${atom.file}`);
      // Wait for tweaks.js seeding to complete before overriding theme attrs.
      await expect(page.locator("#tweaks-panel")).toBeVisible();

      for (const theme of THEMES) {
        for (const mode of MODES) {
          await setTheme(page, theme, mode);
          const bg = await page.evaluate(
            () => window.getComputedStyle(document.body).backgroundColor,
          );
          expect(
            bg,
            `${atom.name} @ ${theme}/${mode} body bg should resolve`,
          ).not.toEqual("");
          expect(bg).not.toEqual("rgba(0, 0, 0, 0)");
        }
      }
    });
  }
});

test.describe("progress atom — ARIA contract", () => {
  test("every progress demo has role=progressbar + valuenow or aria-busy", async ({
    page,
  }) => {
    await page.goto("/atoms/progress.html");

    const bars = page.locator(".progress");
    const count = await bars.count();
    expect(count).toBeGreaterThanOrEqual(13);

    for (let i = 0; i < count; i++) {
      const bar = bars.nth(i);
      const role = await bar.getAttribute("role");
      expect(role, `progress bar #${i} role`).toEqual("progressbar");

      const valuenow = await bar.getAttribute("aria-valuenow");
      const busy = await bar.getAttribute("aria-busy");
      const hasOne =
        valuenow !== null || busy === "true";
      expect(
        hasOne,
        `progress bar #${i} must have aria-valuenow OR aria-busy="true"`,
      ).toBe(true);

      const label = await bar.getAttribute("aria-label");
      expect(label, `progress bar #${i} aria-label`).toBeTruthy();
    }
  });
});

test.describe("button atom — on-primary contrast token", () => {
  test(".btn--primary text color flips between Normal Light and Normal Dark", async ({
    page,
  }) => {
    await page.goto("/atoms/button.html");
    // Wait for tweaks.js to finish seeding body data-* defaults — otherwise our
    // setTheme call races against the panel init and tweaks.js wins.
    await expect(page.locator("#tweaks-panel")).toBeVisible();
    const btn = page.locator(".btn--primary").first();
    await expect(btn).toBeVisible();

    await setTheme(page, "normal", "light");
    const lightOnPrimary = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue("--on-primary").trim(),
    );

    await setTheme(page, "normal", "dark");
    const darkOnPrimary = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue("--on-primary").trim(),
    );

    expect(
      lightOnPrimary.toLowerCase(),
      "Normal Light --on-primary should be white",
    ).toBe("#ffffff");
    expect(
      darkOnPrimary.toLowerCase(),
      "Normal Dark --on-primary must be dark text (the bug we fixed)",
    ).toBe("#1a2420");
  });
});
