import { test, expect, type Page } from "@playwright/test";
import { cleanupTestGroups } from "./helpers/cleanup";

/**
 * Web Groups — Phase 5d (D70/D71/D72). Runs local Vite (--mode staging-e2e)
 * against the deployed staging-e2e backend (fixture provider, $0).
 *
 * Proves the whole-app group flow end to end:
 *   create a group → share a personal transaction into it → switch the global
 *   scope to the group → the dashboard re-scopes and shows ONLY the shared
 *   spend (group isolation) → switching back to Personal restores the full
 *   personal dashboard. Also asserts scanning is blocked in group mode (D70).
 *
 * Backend isolation (user A cannot read group B) is proven separately by the
 * Postgres-gated pytest suite; this is the user-facing runtime proof.
 */

const SEEDED_MONTH = "2026-03";
const GROUP_NAME = `E2E Casa ${Date.now()}`;

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}


// P82: page-independent cleanup (the specs create their own contexts).
test.afterEach(async () => {
  await cleanupTestGroups();
});

test("group flow: create, share, switch scope, isolation, scan blocked", async ({ page }) => {
  await signIn(page);

  // 1. Create a group.
  await page.goto("/groups");
  const form = page.getByTestId("create-group-form");
  await form.getByRole("textbox").fill(GROUP_NAME);
  await form.getByRole("button").click();
  await expect(page.getByText(GROUP_NAME)).toBeVisible({ timeout: 15_000 });

  // 2. Share a seeded personal transaction into the group.
  await page.goto("/transactions");
  await page.locator("a[href^='/transactions/']:not([href$='/new'])").first().click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+/, { timeout: 15_000 });
  const share = page.getByTestId("share-to-group");
  await expect(share).toBeVisible({ timeout: 15_000 });
  await share.getByRole("combobox").selectOption({ label: GROUP_NAME });
  await share.getByRole("button").click();
  await expect(share.getByRole("button")).toHaveText(/Compartido|Shared/, { timeout: 15_000 });

  // 3. Personal dashboard at the seeded month: the fixtures total is shown and
  // there is NO group banner (personal scope).
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  await page.getByTestId("total-spend").waitFor({ state: "visible", timeout: 20_000 });
  await expect(page.getByTestId("dashboard-scope-banner")).toHaveCount(0);
  const personalTotal = await readTotalSpend(page);
  expect(personalTotal).toBeGreaterThan(0);

  // 4. Switch the WHOLE-APP scope to the group. The dashboard re-scopes: the banner
  // names the group, and at the seeded month it shows the group's OWN data — NOT
  // the personal fixtures. The freshly-shared spend lands in another month, so the
  // group has no 2026-03 spend → the empty state proves isolation (group != personal).
  await page.getByTestId("group-switcher").first().click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: new RegExp(GROUP_NAME) })
    .click();
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  await expect(page.getByTestId("dashboard-scope-banner")).toContainText(GROUP_NAME, {
    timeout: 20_000,
  });
  await expect(page.getByTestId("dashboard-empty")).toBeVisible({ timeout: 20_000 });

  // 5. Scanning is blocked in group mode (D70 — scan is personal-only).
  await page.goto("/scan");
  await expect(page.getByTestId("personal-only-notice")).toBeVisible({ timeout: 10_000 });

  // 6. Back to Personal — the banner disappears and the full personal total returns.
  await page.getByTestId("group-switcher").first().click();
  await page.getByRole("listbox").getByRole("option", { name: /Personal/ }).click();
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(SEEDED_MONTH);
  await expect(page.getByTestId("dashboard-scope-banner")).toHaveCount(0);
  expect(await readTotalSpend(page)).toBe(personalTotal);
});

test("5e: admin visibility + member consent + consent-gated transactions list", async ({
  page,
}) => {
  await signIn(page);
  const groupName = `E2E 5e ${Date.now()}`;

  // Create a group + share a personal transaction into it (the contributor row).
  await page.goto("/groups");
  const form = page.getByTestId("create-group-form");
  await form.getByRole("textbox").fill(groupName);
  await form.getByRole("button").click();
  await expect(page.getByText(groupName)).toBeVisible({ timeout: 15_000 });

  await page.goto("/transactions");
  await page.locator("a[href^='/transactions/']:not([href$='/new'])").first().click();
  const share = page.getByTestId("share-to-group");
  await expect(share).toBeVisible({ timeout: 15_000 });
  await share.getByRole("combobox").selectOption({ label: groupName });
  await share.getByRole("button").click();
  await expect(share.getByRole("button")).toHaveText(/Compartido|Shared/, { timeout: 15_000 });

  // Open the group's detail panel (the per-card expand button carries aria-expanded).
  await page.goto("/groups");
  const card = page.locator("li", { hasText: groupName });
  await card.locator('button[aria-expanded="false"]').click();

  // Default: the transactions list shows only the owner's OWN row (visibility off).
  await page.getByTestId("group-transactions-toggle").click();
  const list = page.getByTestId("group-transactions");
  await expect(list).toBeVisible();
  await expect(list.getByText(/You|Tú|Você/)).toBeVisible({ timeout: 15_000 });

  // Admin enables member visibility. The checkbox is controlled — its checked
  // state only flips after the async mutation writes the updated detail back to
  // cache — so click + retry-assert rather than check() (which verifies sync).
  await page.getByTestId("group-visibility-toggle").click();
  await expect(page.getByTestId("group-visibility-toggle")).toBeChecked();
  // The consent control appears once visibility is on; the member opts in.
  await page.getByTestId("group-consent-toggle").click();
  await expect(page.getByTestId("group-consent-toggle")).toBeChecked();

  // The own shared row is still listed after enabling visibility + consent.
  await expect(list.getByText(/You|Tú|Você/)).toBeVisible();
});

// P68 (D82): the leave dialog offers the keep-vs-delete choice and wires the chosen
// boolean to `POST /groups/{id}/leave?delete_shared=`. The leaver must be a NON-sole-
// admin member (the last admin gets 409 "Promote another admin"), so user B — joined
// via A's invite — exercises both choices for real (204 + card gone from B's list).
test("P68: leave-group dialog wires the keep-vs-delete choice to delete_shared", async ({
  browser,
}) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  const groupName = `E2E P68 ${Date.now()}`;

  async function generateInvite(): Promise<string> {
    await a.goto("/groups");
    const cardA = a.locator("li", { hasText: groupName });
    await cardA.locator('button[aria-expanded="false"]').click();
    await a.getByTestId("generate-invite-button").click();
    const inviteLink = await a.getByTestId("invite-link").inputValue();
    const token = inviteLink.split("/invite/")[1];
    expect(token, "invite link should contain a token").toBeTruthy();
    return token;
  }

  async function joinAndOpenCard(token: string): Promise<void> {
    await b.goto(`/invite/${token}`);
    await b.getByTestId("invite-join").click();
    await expect(b).toHaveURL(/\/$/, { timeout: 30_000 });
    await b.goto("/groups");
    const cardB = b.locator("li", { hasText: groupName });
    await cardB.locator('button[aria-expanded="false"]').click();
  }

  function leaveRequest(flag: "true" | "false") {
    return b.waitForRequest(
      (req) =>
        req.method() === "POST" &&
        req.url().includes("/leave") &&
        new URL(req.url()).searchParams.get("delete_shared") === flag,
      { timeout: 15_000 },
    );
  }

  try {
    // A: create the group; B: sign in once.
    await signIn2(a, "sign-in-test-auth-button");
    await a.goto("/groups");
    const form = a.getByTestId("create-group-form");
    await form.getByRole("textbox").fill(groupName);
    await form.getByRole("button").click();
    await expect(a.getByText(groupName)).toBeVisible({ timeout: 15_000 });
    await signIn2(b, "sign-in-test-auth-button-b");

    // KEEP path — and cancel closes the dialog without firing a request.
    await joinAndOpenCard(await generateInvite());
    await b.getByTestId("group-leave-button").click();
    await expect(b.getByTestId("group-leave-dialog")).toBeVisible();
    await b.getByTestId("group-leave-cancel-button").click();
    await expect(b.getByTestId("group-leave-dialog")).toHaveCount(0);

    await b.getByTestId("group-leave-button").click();
    const [keepReq] = await Promise.all([
      leaveRequest("false"),
      b.getByTestId("group-leave-keep-button").click(),
    ]);
    expect((await keepReq.response())?.status()).toBe(204);
    // The dialog closes in the mutation's onSuccess — a pure React state update.
    await expect(b.getByTestId("group-leave-dialog")).toHaveCount(0, { timeout: 15_000 });
    await expect(b.locator("li", { hasText: groupName })).toHaveCount(0, { timeout: 15_000 });

    // DELETE-MY-DATA path — B re-joins via a fresh invite, then leaves voiding shares.
    await joinAndOpenCard(await generateInvite());
    await b.getByTestId("group-leave-button").click();
    const [delReq] = await Promise.all([
      leaveRequest("true"),
      b.getByTestId("group-leave-delete-button").click(),
    ]);
    expect((await delReq.response())?.status()).toBe(204);
    await expect(b.locator("li", { hasText: groupName })).toHaveCount(0, { timeout: 15_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

/** Two-context variant of signIn (explicit test-auth button per user). */
async function signIn2(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

/** Read the dashboard's total-spend figure as a number of minor units-ish integer. */

/** Read the dashboard's total-spend figure as a number of minor units-ish integer. */
async function readTotalSpend(page: Page): Promise<number> {
  const el = page.getByTestId("total-spend");
  await el.waitFor({ state: "visible", timeout: 20_000 });
  const text = (await el.textContent()) ?? "";
  return Number(text.replace(/[^0-9]/g, "")) || 0;
}
