import { expect, type Page } from "@playwright/test";

/**
 * Logs into the legacy BoletApp staging via the TestUserMenu pattern.
 *
 * Mirrors the proven helper at:
 *   /home/khujta/projects/bmad/boletapp/tests/e2e/helpers/staging-helpers.ts (loginAsUser)
 *
 * Staging seeds 4 users: alice / bob / charlie / diana. There is NO 'default'
 * user — that was a bug in the first version of this helper.
 *
 * No creds needed — TestUserMenu handles auth on staging deploys.
 */
export async function loginAsTestUser(
  page: Page,
  user: "alice" | "bob" | "charlie" | "diana" = "alice"
): Promise<void> {
  await page.goto("/");
  await page.waitForSelector('[data-testid="test-login-button"]', { timeout: 15_000 });
  await page.click('[data-testid="test-login-button"]');
  await page.waitForTimeout(500);

  const userBtn = page.locator(`[data-testid="test-user-${user}"]`);
  await userBtn.waitFor({ state: "visible", timeout: 5_000 });
  await userBtn.click();

  // Auth committed when the URL leaves /login AND a known dashboard element appears.
  await page.waitForTimeout(3_000);
  expect(page.url()).not.toContain("login");

  // Wait for one of: scan-fab (post-auth dashboard), profile-avatar (header), or any nav.
  await page.waitForSelector(
    '[data-testid="scan-fab"], [data-testid="profile-avatar"], nav',
    { timeout: 15_000 }
  );
}

/**
 * Inlines a curated set of computed style properties as a `style="..."`
 * attribute on the element + its descendants, so the captured DOM renders
 * standalone outside the legacy app's CSS context.
 */
const STYLE_KEYS = [
  "color",
  "background-color",
  "background",
  "padding",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border",
  "border-radius",
  "border-color",
  "border-width",
  "border-style",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-align",
  "opacity",
  "display",
  "align-items",
  "justify-content",
  "gap",
  "box-shadow",
  "width",
  "height",
  "min-width",
  "min-height",
];

export async function getOuterHtmlWithComputedStyle(
  page: Page,
  selector: string,
  options: { allMatching?: boolean; maxMatches?: number } = {}
): Promise<string | null> {
  const { allMatching = false, maxMatches = 5 } = options;
  return page.evaluate(
    ({ selector, styleKeys, allMatching, maxMatches }) => {
      const matches = Array.from(document.querySelectorAll(selector)).slice(0, maxMatches);
      if (matches.length === 0) return null;

      const targets = allMatching ? matches : [matches[0]];

      function inlineStyles(el: Element): void {
        const computed = window.getComputedStyle(el);
        const declarations = styleKeys
          .map((key) => `${key}: ${computed.getPropertyValue(key)}`)
          .filter((d) => !d.endsWith(": "))
          .join("; ");
        const existingStyle = el.getAttribute("style") || "";
        el.setAttribute(
          "style",
          existingStyle ? `${declarations}; ${existingStyle}` : declarations
        );
        Array.from(el.children).forEach((child) => inlineStyles(child));
      }

      const clones = targets.map((el) => {
        const clone = el.cloneNode(true) as Element;
        inlineStyles(clone);
        return clone.outerHTML;
      });
      return clones.join("\n");
    },
    { selector, styleKeys: STYLE_KEYS, allMatching, maxMatches }
  );
}
