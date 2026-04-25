import { test, expect } from "@playwright/test";

/**
 * Hub coverage spec — top hub + every section sub-hub.
 *
 * Tests cover the centralized navigation pattern:
 *   /index.html (top hub) — 6 section cards, no breadcrumb (it IS home)
 *   /<section>/index.html — sub-hub with cards + "← Mockups home" breadcrumb
 *   /<section>/<page>.html — section page with "← <Section> index" breadcrumb
 *
 * Breadcrumb logic lives in tweaks.js (section-aware via location.pathname).
 */

const EXPECTED_ATOMS = [
  "button.html",
  "input.html",
  "select.html",
  "pill.html",
  "badge.html",
  "avatar.html",
  "chip.html",
  "skeleton.html",
  "progress.html",
  "spinner.html",
];

const EXPECTED_TOP_SECTIONS = [
  "design-system",
  "atoms",
  "molecules",
  "flows",
  "screens",
  "handoff",
];

test.describe("Top hub (/index.html)", () => {
  test("renders 6 section cards (Design System, Atoms, Molecules, Flows, Screens, Handoff)", async ({ page }) => {
    await page.goto("/index.html");
    const cards = page.locator(".section-card");
    await expect(cards).toHaveCount(6);

    const sections = await page.locator(".section-card").evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-section"))
    );
    expect(sections.sort()).toEqual([...EXPECTED_TOP_SECTIONS].sort());
  });

  test("each section card has data-status (live OR placeholder)", async ({ page }) => {
    await page.goto("/index.html");
    const statuses = await page.locator(".section-card").evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-status"))
    );
    for (const status of statuses) {
      expect(status).toMatch(/^(live|placeholder)$/);
    }
  });

  test("top hub does NOT inject the breadcrumb (it IS home)", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("#tweaks-panel")).toBeVisible();
    await expect(page.locator(".tweaks__breadcrumb")).toHaveCount(0);
  });

  test("live section cards link to resolvable destinations", async ({ page, request }) => {
    await page.goto("/index.html");
    const liveCards = page.locator('.section-card[data-status="live"]');
    const hrefs = await liveCards.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href"))
    );
    for (const href of hrefs) {
      expect(href, `live card href: ${href}`).toBeTruthy();
      const response = await request.get(`/${href}`);
      expect(response.status(), `${href} HTTP status`).toBe(200);
    }
  });

  test("placeholder cards have status badge marked 'placeholder'", async ({ page }) => {
    await page.goto("/index.html");
    const placeholderCards = page.locator('.section-card[data-status="placeholder"]');
    const count = await placeholderCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      await expect(placeholderCards.nth(i).locator(".status-badge--placeholder")).toBeVisible();
    }
  });
});

test.describe("Atoms sub-hub (/atoms/index.html)", () => {
  test("lists exactly 10 atom cards", async ({ page }) => {
    await page.goto("/atoms/index.html");
    const cards = page.locator(".atom-card");
    await expect(cards).toHaveCount(10);
  });

  test("injects '← Mockups home' breadcrumb (it's a sub-hub, not the top hub)", async ({ page }) => {
    await page.goto("/atoms/index.html");
    await expect(page.locator("#tweaks-panel")).toBeVisible();
    const breadcrumb = page.locator(".tweaks__breadcrumb");
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toHaveAttribute("href", "../index.html");
    await expect(breadcrumb).toHaveText(/Mockups home/);
  });

  test("every atom link resolves to a 200", async ({ page, request }) => {
    await page.goto("/atoms/index.html");

    for (const atom of EXPECTED_ATOMS) {
      const response = await request.get(`/atoms/${atom}`);
      expect(response.status(), `${atom} HTTP status`).toBe(200);
    }

    const hrefs = await page.locator(".atom-card").evaluateAll((cards) =>
      cards.map((c) => (c as HTMLAnchorElement).getAttribute("href"))
    );
    expect(hrefs.sort()).toEqual([...EXPECTED_ATOMS].sort());
  });

  test("atoms with legacy snapshots show a 'Legacy ref' pill on their hub card; others don't", async ({ page }) => {
    await page.goto("/atoms/index.html");
    const withLegacy = ["button", "pill", "badge", "avatar", "chip"];
    const withoutLegacy = ["input", "select", "skeleton", "progress", "spinner"];
    for (const atom of withLegacy) {
      await expect(page.locator(`a[href="${atom}.html"] .atom-pill--legacy`), `${atom} should have legacy pill`).toBeVisible();
    }
    for (const atom of withoutLegacy) {
      await expect(page.locator(`a[href="${atom}.html"] .atom-pill--legacy`), `${atom} should NOT have legacy pill`).toHaveCount(0);
    }
  });

  test("clicking an atom card navigates to that atom's page + breadcrumb appears", async ({ page }) => {
    await page.goto("/atoms/index.html");
    await page.locator('.atom-card[href="button.html"]').click();
    await expect(page).toHaveURL(/\/atoms\/button\.html$/);
    await expect(page.locator("h1")).toHaveText("Button");
    const breadcrumb = page.locator(".tweaks__breadcrumb");
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toHaveAttribute("href", "./index.html");
    await expect(breadcrumb).toHaveText(/Atoms index/);
  });
});

test.describe("Flows sub-hub (/flows/index.html)", () => {
  test("renders 13 live flow cards + 7 planned cards", async ({ page }) => {
    await page.goto("/flows/index.html");
    const liveCards = page.locator('.flow-card[data-status="live"]');
    const plannedCards = page.locator('.flow-card[data-status="planned"]');
    await expect(liveCards).toHaveCount(13);
    await expect(plannedCards).toHaveCount(7);
  });

  test("injects '← Mockups home' breadcrumb", async ({ page }) => {
    await page.goto("/flows/index.html");
    await expect(page.locator("#tweaks-panel")).toBeVisible();
    const breadcrumb = page.locator(".tweaks__breadcrumb");
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toHaveAttribute("href", "../index.html");
    await expect(breadcrumb).toHaveText(/Mockups home/);
  });

  test("live flow cards have flow IDs F1–F13 and href to flow walkthrough files", async ({ page }) => {
    await page.goto("/flows/index.html");
    const liveCards = page.locator('.flow-card[data-status="live"]');
    const ids = await liveCards.locator(".flow-id").evaluateAll((els) =>
      els.map((el) => el.textContent?.trim())
    );
    expect(ids).toEqual(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13"]);

    const hrefs = await liveCards.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href"))
    );
    for (const href of hrefs) {
      expect(href, `flow href: ${href}`).toMatch(/^flow-\d+-[a-z-]+\.html$/);
    }
  });

  test("planned flow cards are non-interactive (div, not <a>)", async ({ page }) => {
    await page.goto("/flows/index.html");
    const plannedCards = page.locator('.flow-card[data-status="planned"]');
    const tagNames = await plannedCards.evaluateAll((els) =>
      els.map((el) => el.tagName.toLowerCase())
    );
    for (const tag of tagNames) {
      expect(tag).toBe("div");
    }
  });
});

test.describe("Molecules sub-hub (/molecules/index.html)", () => {
  test("renders placeholder banner + 7 planned molecule cards", async ({ page }) => {
    await page.goto("/molecules/index.html");
    await expect(page.locator(".placeholder-banner")).toBeVisible();
    const cards = page.locator(".molecule-card");
    await expect(cards).toHaveCount(7);
  });

  test("injects '← Mockups home' breadcrumb", async ({ page }) => {
    await page.goto("/molecules/index.html");
    await expect(page.locator("#tweaks-panel")).toBeVisible();
    const breadcrumb = page.locator(".tweaks__breadcrumb");
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toHaveAttribute("href", "../index.html");
    await expect(breadcrumb).toHaveText(/Mockups home/);
  });

  test("all molecule cards are placeholders (status badge 'planned')", async ({ page }) => {
    await page.goto("/molecules/index.html");
    const badges = page.locator(".molecule-card .status-badge");
    const count = await badges.count();
    expect(count).toBe(7);
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toHaveText(/planned/i);
    }
  });
});

test.describe("Breadcrumb chain — full hub → section → page → back", () => {
  test("from atoms hub, click first atom, breadcrumb returns to atoms hub", async ({ page }) => {
    await page.goto("/atoms/index.html");
    await page.locator('.atom-card[href="button.html"]').click();
    await expect(page).toHaveURL(/\/atoms\/button\.html$/);
    await page.locator(".tweaks__breadcrumb").click();
    await expect(page).toHaveURL(/\/atoms\/index\.html$/);
  });

  test("from atoms sub-hub, breadcrumb returns to top hub", async ({ page }) => {
    await page.goto("/atoms/index.html");
    await page.locator(".tweaks__breadcrumb").click();
    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.locator(".tweaks__breadcrumb")).toHaveCount(0);
  });
});
