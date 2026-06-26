import { test, type Page } from "@playwright/test";

/**
 * W9 Groups visual proof — the geometric port of the groups list + the group
 * detail panel (create form, group card, members/invite/visibility sections),
 * rendered against the LIVE PRODUCTION API. Creates a throwaway group, expands
 * it, screenshots, then leaves/deletes it (self-cleaning). Run against a
 * `vite --mode prod-e2e` server on the CORS-allowed port 5174.
 */
const SHOTS = "tests/web-e2e/proof/w9-groups";
const GROUP_NAME = `W9 Geo Proof ${Date.now()}`;

async function signIn(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test("W9 groups — geometric list + detail panel (desktop), self-cleaning", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await signIn(page);
  await page.goto("/groups");
  await page.getByTestId("create-group-form").waitFor({ timeout: 20_000 });

  // Create a throwaway group → geometric card appears.
  const form = page.getByTestId("create-group-form");
  await form.getByRole("textbox").fill(GROUP_NAME);
  await form.getByRole("button").click();
  const card = page.locator("li", { hasText: GROUP_NAME });
  await card.waitFor({ timeout: 15_000 });

  // Expand it → geometric detail panel (avatar/invite/members/visibility/actions).
  await card.locator('button[aria-expanded="false"]').click();
  await page.getByTestId("group-avatar-section").waitFor({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/groups-detail-desktop.png`, fullPage: false });

  // Self-clean: owner deletes the throwaway group (confirm dialog auto-accepted).
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("group-delete-button").click();
  await card.waitFor({ state: "detached", timeout: 15_000 });
});
