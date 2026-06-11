import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { cleanupTestGroups } from "./helpers/cleanup";

/**
 * Multi-user group proof — TWO real authenticated users in TWO isolated browser
 * contexts (user A + user B, the same disposable staging accounts used on web +
 * Android). This closes the one gap the single-user proofs + backend pytest
 * can't cover: a SECOND live signed-in user seeing the FIRST user's shared data
 * through the real UI.
 *
 *   A creates a group, shares a personal transaction into it, generates an invite,
 *   and enables member visibility + consent. B (separate account + context) signs
 *   in, joins via A's invite link, consents, and sees A's shared transaction in
 *   B's own browser — a row B did not create. A then sees B in the member roster.
 *
 * The consent/membership/departed-contributor SEMANTICS (who sees whose rows, the
 * D72 "departed contributor drops from the list but stays in aggregates" rule) are
 * proven with multiple users in backend pytest (test_group_visibility.py +
 * test_group_share.py). This is the user-facing two-session runtime proof.
 */

async function signIn(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}


// P82: page-independent cleanup (the specs create their own contexts).
test.afterEach(async () => {
  await cleanupTestGroups();
});

test("two real users: B joins A's group via invite and sees A's shared transaction", async ({
  browser,
}) => {
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  const groupName = `E2E Multi ${Date.now()}`;

  try {
    // --- A: create a group + share a personal transaction into it ---
    await signIn(a, "sign-in-test-auth-button");
    await a.goto("/groups");
    const formA = a.getByTestId("create-group-form");
    await formA.getByRole("textbox").fill(groupName);
    await formA.getByRole("button").click();
    await expect(a.getByText(groupName)).toBeVisible({ timeout: 15_000 });

    await a.goto("/transactions");
    await a.locator("a[href^='/transactions/']").first().click();
    const share = a.getByTestId("share-to-group");
    await expect(share).toBeVisible({ timeout: 15_000 });
    await share.getByRole("combobox").selectOption({ label: groupName });
    await share.getByRole("button").click();
    await expect(share.getByRole("button")).toHaveText(/Compartido|Shared/, { timeout: 15_000 });

    // --- A: generate an invite + enable member visibility + opt own detail in ---
    await a.goto("/groups");
    const cardA = a.locator("li", { hasText: groupName });
    await cardA.locator('button[aria-expanded="false"]').click();
    await a.getByTestId("generate-invite-button").click();
    const inviteLink = await a.getByTestId("invite-link").inputValue();
    const token = inviteLink.split("/invite/")[1];
    expect(token, "invite link should contain a token").toBeTruthy();
    await a.getByTestId("group-visibility-toggle").click();
    await expect(a.getByTestId("group-visibility-toggle")).toBeChecked();
    await a.getByTestId("group-consent-toggle").click();
    await expect(a.getByTestId("group-consent-toggle")).toBeChecked();

    // --- B: sign in (separate account + context), join via A's invite ---
    await signIn(b, "sign-in-test-auth-button-b");
    await b.goto(`/invite/${token}`);
    await b.getByTestId("invite-join").click();
    await expect(b).toHaveURL(/\/$/, { timeout: 30_000 });

    // --- B: open the group, consent, and see A's shared transaction ---
    await b.goto("/groups");
    const cardB = b.locator("li", { hasText: groupName });
    await cardB.locator('button[aria-expanded="false"]').click();
    await b.getByTestId("group-consent-toggle").click();
    await expect(b.getByTestId("group-consent-toggle")).toBeChecked();

    await b.getByTestId("group-transactions-toggle").click();
    const listB = b.getByTestId("group-transactions");
    await expect(listB).toBeVisible();
    // B has shared nothing, so any row B sees is A's — a transaction B did NOT
    // create. It must be attributed to A (NOT the "You" self-label).
    const rowB = listB.getByTestId("group-txn-row").first();
    await expect(rowB).toBeVisible({ timeout: 15_000 });
    await expect(rowB).not.toContainText(/You|Tú|Você/);
    await expect(listB.getByTestId("group-transactions-empty")).toHaveCount(0);

    // --- A sees B joined: the group card now reports 2 members ---
    await a.goto("/groups");
    await expect(a.locator("li", { hasText: groupName })).toContainText(
      /2 (members|miembros|membros)/,
      { timeout: 15_000 },
    );
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
