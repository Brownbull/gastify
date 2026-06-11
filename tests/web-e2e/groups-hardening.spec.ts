import { test, expect, type Page } from "@playwright/test";
import { cleanupTestGroups } from "./helpers/cleanup";

/**
 * Group-hardening runtime proofs (D74 lock + D75 avatar) against deployed
 * staging-e2e. The lifecycle/permission SEMANTICS are proven exhaustively in
 * backend pytest (test_group_hardening.py); these two tests cover what only a live
 * browser can show:
 *   1. sharing a transaction LOCKS its content in the real UI (banner + badge +
 *      the merchant/date/category editors become read-only);
 *   2. a group AVATAR set by the owner propagates to a SECOND live member (user B
 *      sees user A's chosen emoji on the group card).
 *
 * Uses the same disposable A + B staging accounts as the other multi-user proofs.
 * The runner cleans both users' groups first (5-group cap).
 */

async function signIn(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function createGroup(page: Page, name: string): Promise<void> {
  await page.goto("/groups");
  const form = page.getByTestId("create-group-form");
  await form.getByRole("textbox").fill(name);
  await form.getByRole("button").click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
}


// P82: page-independent cleanup (the specs create their own contexts).
test.afterEach(async () => {
  await cleanupTestGroups();
});

test("sharing a transaction locks its content in the UI (D74)", async ({ browser }) => {
  const ctx = await browser.newContext();
  const a = await ctx.newPage();
  const groupName = `E2E Lock ${Date.now()}`;

  try {
    await signIn(a, "sign-in-test-auth-button");
    await createGroup(a, groupName);

    // Open the first personal transaction and share it into the fresh group.
    await a.goto("/transactions");
    await a.locator("a[href^='/transactions/']").first().click();
    const share = a.getByTestId("share-to-group");
    await expect(share).toBeVisible({ timeout: 15_000 });
    await share.getByRole("combobox").selectOption({ label: groupName });
    await share.getByRole("button").click();
    await expect(share.getByRole("button")).toHaveText(/Compartido|Shared/, { timeout: 15_000 });

    // Reload so the detail refetches is_shared, then assert the content-lock UI.
    await a.reload();
    await expect(a.getByTestId("shared-lock-banner")).toBeVisible({ timeout: 15_000 });
    await expect(a.getByTestId("shared-lock-badge")).toBeVisible();

    // The merchant became static text, not an editable input — the content editors
    // are disabled when locked, so no free-text input is present on the page.
    await expect(a.locator("input[type='text']")).toHaveCount(0);
  } finally {
    await ctx.close();
  }
});

test("a group avatar propagates to a second member (D75)", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  const groupName = `E2E Avatar ${Date.now()}`;
  const ICON = "🛒";
  const COLOR = "#10b981";

  try {
    // --- A: create the group + set its avatar (emoji + color) ---
    await signIn(a, "sign-in-test-auth-button");
    await createGroup(a, groupName);
    const cardA = a.locator("li", { hasText: groupName });
    await cardA.locator('button[aria-expanded="false"]').click();
    await a.getByTestId(`group-icon-choice-${ICON}`).click();
    await a.getByTestId(`group-color-choice-${COLOR}`).click();
    await a.getByTestId("group-avatar-save").click();
    // A's own group card now shows the chosen emoji.
    await expect(cardA.getByTestId("group-avatar").first()).toContainText(ICON, {
      timeout: 15_000,
    });

    // --- A: invite ---
    await a.getByTestId("generate-invite-button").click();
    const inviteLink = await a.getByTestId("invite-link").inputValue();
    const token = inviteLink.split("/invite/")[1];
    expect(token, "invite link should contain a token").toBeTruthy();

    // --- B: join, then see the SAME avatar A chose (propagated to the member) ---
    await signIn(b, "sign-in-test-auth-button-b");
    await b.goto(`/invite/${token}`);
    await b.getByTestId("invite-join").click();
    await expect(b).toHaveURL(/\/$/, { timeout: 30_000 });

    await b.goto("/groups");
    const cardB = b.locator("li", { hasText: groupName });
    await expect(cardB.getByTestId("group-avatar").first()).toContainText(ICON, {
      timeout: 15_000,
    });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
