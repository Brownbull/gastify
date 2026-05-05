import { test, expect } from "@playwright/test";

interface StoryEntry {
  id: string;
  title: string;
  name: string;
  type: string;
}

async function getDesignSystemStories(
  baseURL: string
): Promise<StoryEntry[]> {
  const res = await fetch(`${baseURL}/index.json`);
  const data = await res.json();
  const entries: Record<string, StoryEntry> = data.entries ?? data.v ?? {};
  return Object.values(entries).filter(
    (e) =>
      e.type === "story" &&
      (e.id.startsWith("design-system-atoms-") ||
        e.id.startsWith("design-system-molecules-") ||
        e.id.startsWith("design-system-screens-"))
  );
}

test.describe("Design System stories render without errors", () => {
  test("all atoms, molecules, and screens render", async ({ page, baseURL }) => {
    test.setTimeout(300_000);

    const allStories = await getDesignSystemStories(baseURL!);
    expect(allStories.length).toBeGreaterThan(0);

    const failures: string[] = [];
    const errors: string[] = [];
    let rendered = 0;

    for (const story of allStories) {
      const consoleErrors: string[] = [];
      const handler = (msg: import("@playwright/test").ConsoleMessage) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      };
      page.on("console", handler);

      const url = `${baseURL}/iframe.html?id=${story.id}&viewMode=story`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
        await page.waitForSelector("#storybook-root", { timeout: 5000 });

        const content = await page.locator("#storybook-root").innerHTML();
        if (!content || content.trim().length === 0) {
          failures.push(`${story.id}: empty`);
        } else {
          rendered++;
        }

        const critical = consoleErrors.filter(
          (e) => !e.includes("net::ERR_") && !e.includes("favicon") && !e.includes("404")
        );
        if (critical.length > 0) {
          errors.push(`${story.id}: ${critical[0].slice(0, 120)}`);
        }
      } catch (e) {
        failures.push(
          `${story.id}: ${e instanceof Error ? e.message.slice(0, 100) : "unknown"}`
        );
      }

      page.removeListener("console", handler);
    }

    console.log(`\n===== STORYBOOK RENDER REPORT =====`);
    console.log(`Total: ${allStories.length} | Rendered: ${rendered} | Failed: ${failures.length} | Console errors: ${errors.length}`);
    if (failures.length > 0) console.log(`\nFAILURES:\n${failures.join("\n")}`);
    if (errors.length > 0) console.log(`\nCONSOLE ERRORS:\n${errors.join("\n")}`);
    console.log(`===================================\n`);

    expect(failures.length, `${failures.length} stories failed`).toBe(0);
  });
});
