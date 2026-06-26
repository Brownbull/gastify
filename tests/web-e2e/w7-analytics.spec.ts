import { test, type Page } from "@playwright/test";

/**
 * W7 Analytics visual proof — the chart-engine swap (Recharts → hand-built
 * donut/treemap + ECharts Sankey) rendered against the LIVE PRODUCTION API with
 * REAL seeded analytics data (user B). Grows per sub-batch: donut first, then
 * treemap / Sankey / the Dona·Mapa·Flujo trends route.
 * Run against a `vite --mode prod-e2e` server on the CORS-allowed port 5174.
 */
const SHOTS = "tests/web-e2e/proof/w7-analytics";

async function signInAsB(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sign-in-test-auth-button-b").click();
  await page.getByRole("button", { name: "Agregar transacción" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("W7 analytics — geometric chart-engine swap (real seeded prod data)", () => {
  test("trends distribution donut renders hand-built SVG (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await signInAsB(page);
    await page.goto("/trends");
    await page.getByTestId("category-donut").waitFor({ timeout: 20_000 });
    // The legend is the assertable rendered-data surface.
    await page.getByTestId("donut-legend-item").first().waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1400); // let the count-up + stagger settle
    await page.screenshot({ path: `${SHOTS}/trends-donut-desktop.png`, fullPage: false });
  });

  test("trends distribution donut renders hand-built SVG (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1100 });
    await signInAsB(page);
    await page.goto("/trends");
    await page.getByTestId("category-donut").waitFor({ timeout: 20_000 });
    await page.getByTestId("donut-legend-item").first().waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${SHOTS}/trends-donut-mobile.png`, fullPage: false });
  });
});
