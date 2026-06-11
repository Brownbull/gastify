import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { cleanupTestGroups } from "./helpers/cleanup";

/**
 * Group ADMIN operations through the real UI (functionality plan, Phase 4) — the
 * backend ops were pytest-pinned but the web controls had no e2e:
 *   owner promotes a member to admin → role label updates;
 *   owner demotes back → label updates;
 *   owner removes the member → roster shrinks (B loses the group);
 *   owner deletes the group via the UI → gone from the list (and P83 releases
 *   any shared sources — pinned by backend contract).
 * Two real users (A owner, B member via invite), separate browser contexts.
 */

async function signIn(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.afterEach(async () => {
  await cleanupTestGroups();
});

test("owner promotes, demotes, removes a member, then deletes the group", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  const groupName = `E2E Admin ${Date.now()}`;
  a.on("dialog", (d) => d.accept()); // confirm() guards on remove + delete

  try {
    // A creates the group + invite; B joins.
    await signIn(a, "sign-in-test-auth-button");
    await a.goto("/groups");
    const form = a.getByTestId("create-group-form");
    await form.getByRole("textbox").fill(groupName);
    await form.getByRole("button").click();
    await expect(a.getByText(groupName)).toBeVisible({ timeout: 15_000 });
    const cardA = a.locator("li", { hasText: groupName });
    await cardA.locator('button[aria-expanded="false"]').click();
    await a.getByTestId("generate-invite-button").click();
    const token = (await a.getByTestId("invite-link").inputValue()).split("/invite/")[1];
    expect(token).toBeTruthy();

    await signIn(b, "sign-in-test-auth-button-b");
    await b.goto(`/invite/${token}`);
    await b.getByRole("button", { name: /join|unir/i }).click();
    await expect(b.getByText(groupName).first()).toBeVisible({ timeout: 20_000 });

    // A reloads the roster and finds B's row controls.
    await a.goto("/groups");
    await a.locator("li", { hasText: groupName }).locator('button[aria-expanded="false"]').click();
    const roleToggle = a.locator("[data-testid^='member-role-toggle-']").first();
    await expect(roleToggle).toBeVisible({ timeout: 20_000 });
    const memberId = (await roleToggle.getAttribute("data-testid"))!.replace(
      "member-role-toggle-",
      "",
    );
    const roleLabel = a.getByTestId(`member-role-${memberId}`);

    // Promote → admin; demote → member (the role label is the observable).
    await roleToggle.click();
    await expect(roleLabel).toHaveText(/admin/i, { timeout: 15_000 });
    await roleToggle.click();
    await expect(roleLabel).toHaveText(/member|miembro/i, { timeout: 15_000 });

    // Remove B → roster row disappears.
    await a.getByTestId(`member-remove-${memberId}`).click();
    await expect(a.getByTestId(`member-role-${memberId}`)).toHaveCount(0, { timeout: 15_000 });

    // Delete the group through the UI → gone from A's list.
    await a.getByTestId("group-delete-button").click();
    await expect(a.locator("li", { hasText: groupName })).toHaveCount(0, { timeout: 15_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
