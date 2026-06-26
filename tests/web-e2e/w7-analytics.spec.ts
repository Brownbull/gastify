import { test, type Page } from "@playwright/test";

/**
 * W7 Analytics visual proof — the chart-engine swap (Recharts → hand-built
 * donut/treemap + ECharts Sankey) rendered against the LIVE PRODUCTION API with
 * REAL seeded analytics data (user B). Captures all three Dona·Mapa·Flujo
 * representations + the spend-over-time series.
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
  test("Dona · Mapa · Flujo representations (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await signInAsB(page);
    await page.goto("/trends");

    // Dona — hand-built SVG donut.
    await page.getByTestId("category-donut").waitFor({ timeout: 20_000 });
    await page.getByTestId("donut-legend-item").first().waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1400); // count-up + stagger settle
    await page.screenshot({ path: `${SHOTS}/trends-donut-desktop.png`, fullPage: false });

    // Mapa — squarified treemap.
    await page.getByTestId("repr-pill-treemap").click();
    await page.getByTestId("treemap").waitFor({ timeout: 15_000 });
    await page.getByTestId("treemap-cell").first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/trends-treemap-desktop.png`, fullPage: false });

    // Flujo — ECharts Sankey. Generous wait: the first Flujo load cold-optimizes
    // the tree-shaken echarts/core + subpath deps in the Vite dev server (Wf/P97).
    await page.getByTestId("repr-pill-flow").click();
    await page.getByTestId("sankey-chart").waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1600); // ECharts layout + entrance animation
    await page.screenshot({ path: `${SHOTS}/trends-sankey-desktop.png`, fullPage: false });
  });

  test("distribution donut renders hand-built SVG (mobile)", async ({ page }) => {
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
