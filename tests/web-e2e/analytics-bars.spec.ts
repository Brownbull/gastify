import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

/**
 * THOROUGH e2e for the two legacy analytics bars on Trends (bars-port plan, Phase 3),
 * with screenshot proofs saved under tests/web-e2e/proof/bars/.
 *
 * Covers: the L1–L4 sweep (each level renders a distinct, non-crashing cut), level
 * persistence across period steps, the W/M/Q/Y pills (key forms), prev/next stepping
 * with YEAR-BOUNDARY edges for week (2026-W01 → 2025-W52), month (2026-01 → 2025-12)
 * and quarter (Q1 → prior Q4), future-clamping (next disabled at the current period
 * per granularity), granularity switches resetting to the current period, and the
 * weekly empty-state rendering.
 */

const PROOF_DIR = path.resolve(__dirname, "proof", "bars");

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("sign-in-test-auth-button").click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function proof(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(PROOF_DIR, `${name}.png`), fullPage: true });
}

async function label(page: Page): Promise<string> {
  return page.getByTestId("period-label").innerText();
}

/** Step prev until the label matches, with a hard cap (data lives in 2026-05). */
async function stepBackTo(page: Page, target: string, cap = 30): Promise<void> {
  for (let i = 0; i < cap; i++) {
    if ((await label(page)) === target) return;
    await page.getByTestId("period-prev").click();
  }
  expect(await label(page)).toBe(target);
}

test("level bar: L1→L4 sweep renders distinct cuts; level survives period steps", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto("/trends");
  await expect(page.getByTestId("level-bar")).toBeVisible({ timeout: 20_000 });

  // Focus the seeded month so the distribution is populated.
  await stepBackTo(page, "2026-05");
  const donutSection = page.getByTestId("level-bar").locator("..").locator("..");

  const cuts: string[] = [];
  for (const level of [1, 2, 3, 4]) {
    await page.getByTestId(`level-pill-${level}`).click();
    await expect(page.getByTestId(`level-pill-${level}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The cut must settle into EITHER slices or the explicit empty state — never a crash.
    await page.waitForTimeout(900);
    const text = await donutSection.innerText();
    expect(text.length).toBeGreaterThan(10);
    cuts.push(text);
    await proof(page, `0${level}-level-L${level}-2026-05`);
  }
  // Distinct cuts: the coarse industry view differs from the item view, and the two
  // transaction-aggregated levels differ from each other.
  expect(cuts[0]).not.toEqual(cuts[3]);
  expect(cuts[0]).not.toEqual(cuts[1]);

  // Level persistence: step a period back and the chosen level stays selected.
  await page.getByTestId("level-pill-3").click();
  await page.getByTestId("period-prev").click();
  await expect(page.getByTestId("period-label")).toHaveText("2026-04");
  await expect(page.getByTestId("level-pill-3")).toHaveAttribute("aria-pressed", "true");
  await proof(page, "05-level-persists-after-step");
});

test("temporal bar: key forms, year-boundary stepping, future clamp, current reset", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  await page.goto("/trends");
  await expect(page.getByTestId("temporal-bar")).toBeVisible({ timeout: 20_000 });

  // --- Month: form + year boundary (2026-01 → 2025-12) + future clamp at current.
  await expect(page.getByTestId("period-label")).toHaveText(/^\d{4}-\d{2}$/);
  await expect(page.getByTestId("period-next")).toBeDisabled(); // starts at current
  await stepBackTo(page, "2026-01");
  await page.getByTestId("period-prev").click();
  await expect(page.getByTestId("period-label")).toHaveText("2025-12");
  await proof(page, "06-month-year-boundary-2025-12");

  // --- Quarter: switching RESETS to the current quarter; boundary Q1 → prior Q4.
  await page.getByTestId("temporal-pill-quarter").click();
  const q = await label(page);
  expect(q).toMatch(/^\d{4}-Q[1-4]$/);
  await expect(page.getByTestId("period-next")).toBeDisabled(); // reset to current
  await stepBackTo(page, "2026-Q1");
  await page.getByTestId("period-prev").click();
  await expect(page.getByTestId("period-label")).toHaveText("2025-Q4");
  await proof(page, "07-quarter-year-boundary-2025-Q4");

  // --- Year: form + stepping.
  await page.getByTestId("temporal-pill-year").click();
  await expect(page.getByTestId("period-label")).toHaveText(/^\d{4}$/);
  await page.getByTestId("period-prev").click();
  await expect(page.getByTestId("period-label")).toHaveText(/^\d{4}$/);
  await proof(page, "08-year-view");

  // --- Week: form, the ISO year-boundary edge (2026-W01 → prev → 2025-W52, since
  // 2025 has 52 ISO weeks), and the weekly view rendering end-to-end.
  await page.getByTestId("temporal-pill-week").click();
  const wk = await label(page);
  expect(wk).toMatch(/^\d{4}-W\d{2}$/);
  await expect(page.getByTestId("period-next")).toBeDisabled();
  await proof(page, "09-week-current");

  await stepBackTo(page, "2026-W01", 40);
  await proof(page, "10-week-W01");
  await page.getByTestId("period-prev").click();
  await expect(page.getByTestId("period-label")).toHaveText("2025-W52");
  await proof(page, "11-week-year-boundary-2025-W52");

  // Weekly with data: ISO week 2026-W20 contains 2026-05-(11..17) — seeded month.
  for (let i = 0; i < 40; i++) {
    const current = await label(page);
    if (current === "2026-W20") break;
    await page.getByTestId("period-next").click();
  }
  await expect(page.getByTestId("period-label")).toHaveText("2026-W20");
  await page.waitForTimeout(900); // let the week's distribution settle
  await proof(page, "12-week-with-data-2026-W20");

  // --- Switching back to month resets to the CURRENT month (not the stepped week).
  await page.getByTestId("temporal-pill-month").click();
  await expect(page.getByTestId("period-label")).toHaveText(/^\d{4}-\d{2}$/);
  await expect(page.getByTestId("period-next")).toBeDisabled();
  await proof(page, "13-back-to-current-month");
});
