import { test, expect, type Page } from "@playwright/test";
import { apiAs, cleanupTestGroups } from "./helpers/cleanup";

/**
 * Two-user STATISTICS + DELETION semantics — what user B actually SEES when user A
 * acts on a shared group. The single-user specs prove A's own flows and backend
 * pytest proves the multi-user SEMANTICS; this closes the remaining seam: the
 * second user's live runtime view.
 *
 *   1. A shares → B's group dashboard total appears; B's group transaction LIST is
 *      gated by visibility+consent config; A deleting the personal SOURCE changes
 *      nothing for B (D74 D-Q3: the group copy is an independent snapshot).
 *   2. A leaves with KEEP → B keeps the stats but A's row hides (D72 departed
 *      contributor). A leaves with DELETE → B sees the month VOIDED with the
 *      explanatory notice (D82 + the dashboard void notice). Ownership transfers
 *      to B (D94), so B — not A — can delete the group afterwards.
 *
 * Group/membership setup runs through the API (those UI flows are proven in
 * groups.spec/groups-multiuser.spec); every ASSERTION here is through B's real UI.
 */

const MONTH = new Date().toISOString().slice(0, 7); // seeds are dated today

async function signIn(page: Page, buttonTestId: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId(buttonTestId).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

/** A creates a group, invites B (API), and B joins (API). Returns the group id. */
async function setUpGroupWithB(name: string): Promise<string> {
  const created = await apiAs("a", "POST", "/groups", { name });
  expect(created?.status, "A creates the group").toBe(201);
  const groupId = (created!.json as { id: string }).id;
  const invite = await apiAs("a", "POST", `/groups/${groupId}/invite`);
  expect(invite?.status, "A generates an invite").toBe(200);
  const token = (invite!.json as { token: string }).token;
  const joined = await apiAs("b", "POST", `/invites/${token}/join`);
  expect(joined?.status, "B joins via the invite").toBe(200);
  return groupId;
}

/** A seeds a personal manual transaction dated today and shares it into the group. */
async function seedAndShare(groupId: string, merchant: string): Promise<string> {
  const created = await apiAs("a", "POST", "/transactions", {
    transaction_date: new Date().toISOString().slice(0, 10),
    merchant,
    total_minor: 7777,
    currency: "CLP",
    receipt_type: "manual",
    items: [{ name: "Two User Item", qty: 1, total_price_minor: 7777, sort_order: 0 }],
  });
  expect(created?.status, "A seeds a personal transaction").toBe(201);
  const txnId = (created!.json as { id: string }).id;
  const shared = await apiAs("a", "POST", `/groups/${groupId}/share`, {
    transaction_id: txnId,
  });
  expect(shared?.status, "A shares it into the group").toBe(201);
  return txnId;
}

async function switchToGroupScope(page: Page, groupName: string): Promise<void> {
  await page.getByTestId("group-switcher").first().click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: new RegExp(groupName) })
    .click();
}

async function openGroupTransactions(page: Page, groupName: string): Promise<void> {
  await page.goto("/groups");
  const card = page.locator("li", { hasText: groupName });
  await card.locator('button[aria-expanded="false"]').click();
  await page.getByTestId("group-transactions-toggle").click();
  await expect(page.getByTestId("group-transactions")).toBeVisible({ timeout: 15_000 });
}

async function groupDashboardAt(page: Page, month: string): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill(month);
}

test.afterEach(async () => {
  await cleanupTestGroups();
});

test("B sees shared stats; list is config-gated; A's source delete changes nothing for B", async ({
  page: b,
}) => {
  const groupName = `E2E 2U Stats ${Date.now()}`;
  const groupId = await setUpGroupWithB(groupName);
  const txnId = await seedAndShare(groupId, "Dos Usuarios Cafe");

  await signIn(b, "sign-in-test-auth-button-b");
  await switchToGroupScope(b, groupName);

  // Stats propagate to B: the group dashboard at the seed month shows the spend.
  await groupDashboardAt(b, MONTH);
  await expect(b.getByTestId("dashboard-scope-banner")).toContainText(groupName, {
    timeout: 20_000,
  });
  await expect(b.getByTestId("total-spend")).toBeVisible({ timeout: 20_000 });

  // D70 extension: manual entry is personal-only — group scope shows the notice.
  await b.goto("/transactions/new");
  await expect(b.getByTestId("personal-only-notice")).toBeVisible({ timeout: 10_000 });

  // Visibility OFF (default): B's group transaction list shows NO rows — the spend
  // is in the aggregates only.
  await openGroupTransactions(b, groupName);
  await expect(b.getByTestId("group-transactions-empty")).toBeVisible({ timeout: 15_000 });
  await expect(b.getByTestId("group-txn-row")).toHaveCount(0);

  // A (admin) turns on member visibility and opts their own detail in.
  expect((await apiAs("a", "PATCH", `/groups/${groupId}/visibility`, { enabled: true }))?.status).toBe(200);
  expect(
    (await apiAs("a", "POST", `/groups/${groupId}/consent`, { shares_detail: true }))?.status,
  ).toBe(200);

  // Now B sees A's row — attributed to A, not "You".
  await openGroupTransactions(b, groupName);
  const row = b.getByTestId("group-txn-row").first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText("Dos Usuarios Cafe");
  await expect(row).not.toContainText(/You|Tú|Você/);

  // A deletes the personal SOURCE (allowed by D74 D-Q3) — the group copy is an
  // independent snapshot, so B's view must NOT change.
  expect((await apiAs("a", "DELETE", `/transactions/${txnId}`))?.status).toBe(204);
  await openGroupTransactions(b, groupName);
  await expect(b.getByTestId("group-txn-row").first()).toContainText("Dos Usuarios Cafe");
  await groupDashboardAt(b, MONTH);
  await expect(b.getByTestId("total-spend")).toBeVisible({ timeout: 20_000 });
});

test("leave KEEP keeps B's stats (row hides); leave DELETE voids B's month; ownership transfers to B", async ({
  page: b,
}) => {
  test.setTimeout(240_000);
  const keepName = `E2E 2U Keep ${Date.now()}`;
  const delName = `E2E 2U Del ${Date.now()}`;

  // Both groups: A shares a seed, turns visibility+consent on, and promotes B to
  // admin (the leave guard demands another admin before the owner can go).
  const groups: Array<{ id: string; name: string }> = [];
  for (const name of [keepName, delName]) {
    const id = await setUpGroupWithB(name);
    await seedAndShare(id, "Mes Compartido");
    expect((await apiAs("a", "PATCH", `/groups/${id}/visibility`, { enabled: true }))?.status).toBe(200);
    expect((await apiAs("a", "POST", `/groups/${id}/consent`, { shares_detail: true }))?.status).toBe(200);
    const detail = await apiAs("a", "GET", `/groups/${id}`);
    const member = (detail!.json as { members: Array<{ user_id: string; role: string }> }).members.find(
      (m) => m.role === "member",
    );
    expect(member, "B appears in the roster as a member").toBeTruthy();
    expect(
      (await apiAs("a", "PATCH", `/groups/${id}/members/${member!.user_id}`, { role: "admin" }))?.status,
    ).toBe(200);
    groups.push({ id, name });
  }

  // Baseline through B's UI: both groups show the month's spend + A's row.
  await signIn(b, "sign-in-test-auth-button-b");
  for (const g of groups) {
    await switchToGroupScope(b, g.name);
    await groupDashboardAt(b, MONTH);
    await expect(b.getByTestId("total-spend")).toBeVisible({ timeout: 20_000 });
    await openGroupTransactions(b, g.name);
    await expect(b.getByTestId("group-txn-row").first()).toContainText("Mes Compartido");
  }

  // A leaves: KEEP in one group, DELETE-my-data in the other (D82).
  expect((await apiAs("a", "POST", `/groups/${groups[0].id}/leave?delete_shared=false`))?.status).toBe(204);
  expect((await apiAs("a", "POST", `/groups/${groups[1].id}/leave?delete_shared=true`))?.status).toBe(204);

  // KEEP group, B's view: stats stay, A's row hides (D72 departed contributor).
  await switchToGroupScope(b, keepName);
  await groupDashboardAt(b, MONTH);
  await expect(b.getByTestId("total-spend")).toBeVisible({ timeout: 20_000 });
  await openGroupTransactions(b, keepName);
  await expect(b.getByTestId("group-transactions-empty")).toBeVisible({ timeout: 15_000 });
  await expect(b.getByTestId("group-txn-row")).toHaveCount(0);

  // DELETE group, B's view: the month is VOIDED and says why (not a silent empty).
  await switchToGroupScope(b, delName);
  await groupDashboardAt(b, MONTH);
  const voided = b.getByTestId("dashboard-voided");
  await expect(voided).toBeVisible({ timeout: 20_000 });
  await expect(voided).toContainText(/departed member|miembro que se fue|membro que saiu/);
  await openGroupTransactions(b, delName);
  await expect(b.getByTestId("group-txn-row")).toHaveCount(0);

  // D94 ownership transfer: B (the remaining admin) is now the OWNER of both
  // groups — and can therefore delete them (no orphaned, undeletable groups).
  for (const g of groups) {
    const mine = await apiAs("b", "GET", "/groups");
    const row = (mine!.json as Array<{ id: string; role: string }>).find((x) => x.id === g.id);
    expect(row?.role, `B owns ${g.name} after A's departure`).toBe("owner");
    expect((await apiAs("b", "DELETE", `/groups/${g.id}`))?.status).toBe(204);
  }
});
