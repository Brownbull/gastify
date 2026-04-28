import { test, type Page } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Screen validator spec — runs 4 categories of layout sanity checks per
 * (screen × viewport). Data-driven via env vars set by runner.mjs.
 *
 * Each test always passes (findings are data, not test failures). The
 * runner aggregates per-test findings JSON files into MOCKUP-VALIDATION.md.
 *
 * Generated: 2026-04-28T14:16:25Z
 * Project:   gastify
 */

interface Finding {
  screen: string;
  viewport: string;
  ruleId: string;
  category: string;
  severity: "block" | "warn" | "info";
  message: string;
  selector?: string;
  // Distinguishes multiple findings sharing the same ruleId+selector on one
  // screen (e.g., 3 nav images all matching `img`). Used by runner.mjs for
  // stable-ID hashing; falls back to selector if absent.
  fingerprint?: string;
}

interface Target {
  screen: string;
  viewport: string;
  url: string;
  viewportWidth: number;
  architecture: string;
}

const MANIFEST_PATH = process.env.MOCKUP_VALIDATE_MANIFEST;
const FINDINGS_DIR = process.env.MOCKUP_VALIDATE_FINDINGS_DIR;

if (!MANIFEST_PATH || !FINDINGS_DIR) {
  test("runner not detected", async () => {
    test.skip(
      true,
      "screen-validator.spec.ts must be invoked via tests/mockups/validate/runner.mjs",
    );
  });
} else {
  const { manifest, rules } = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    manifest: Target[];
    rules: any;
  };
  mkdirSync(FINDINGS_DIR, { recursive: true });

  for (const target of manifest) {
    test(`${target.screen} @ ${target.viewport}`, async ({ page }) => {
      const findings: Finding[] = [];
      const emit = (f: Omit<Finding, "screen" | "viewport">) =>
        findings.push({ ...f, screen: target.screen, viewport: target.viewport });

      await page.setViewportSize({ width: target.viewportWidth, height: 900 });
      await page.goto(`/${target.url}`);

      // Dynamic-architecture projects (e.g., gastify) gate viewport via [data-viewport]
      // on <body>, set by tweaks.js. Override after boot to ensure the requested class.
      if (target.architecture === "dynamic") {
        const dataAttr = target.viewport === "phone" ? "mobile" : target.viewport;
        await page.evaluate((vp) => {
          try { localStorage.clear(); } catch {}
          document.body.setAttribute("data-viewport", vp);
        }, dataAttr);
        await page.waitForTimeout(80);
      }

      if (rules.categories.C1_overflow.enabled) await checkOverflow(page, target, emit);
      if (rules.categories.C2_narrow_columns.enabled)
        await checkNarrowColumns(page, target, rules, emit);
      if (rules.categories.C3_empty_content.enabled) await checkEmptyContent(page, emit);
      if (rules.categories.C4_kdbp_rules.enabled && rules.kdbpRules?.length) {
        await checkKdbpRules(page, rules.kdbpRules, emit);
      }

      const id = `${target.screen}__${target.viewport}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      writeFileSync(
        join(FINDINGS_DIR!, `${id}.json`),
        JSON.stringify(findings, null, 2),
      );
    });
  }
}

async function checkOverflow(
  page: Page,
  target: Target,
  emit: (f: Omit<Finding, "screen" | "viewport">) => void,
) {
  const bodyOverflow = await page.evaluate((vw) => {
    const sw = document.documentElement.scrollWidth;
    return sw > vw ? sw : 0;
  }, target.viewportWidth);
  if (bodyOverflow) {
    emit({
      ruleId: "body-overflow",
      category: "C1_overflow",
      severity: "block",
      message: `Body width ${bodyOverflow}px > viewport ${target.viewportWidth}px`,
      selector: "body",
    });
  }

  const containers = await page.$$eval(
    ".frame, .surface-content, [data-frame], .screen, .screen-phone, .tablet-surface, .desktop-surface, main",
    (els) =>
      els
        .map((el) => {
          const cls =
            typeof el.className === "string"
              ? el.className
              : (el.className as any)?.toString?.() ?? "";
          return {
            tag: el.tagName.toLowerCase(),
            firstClass: cls.split(/\s+/).filter(Boolean)[0] ?? "",
            sw: el.scrollWidth,
            cw: el.clientWidth,
          };
        })
        .filter((e) => e.cw > 0 && e.sw > e.cw + 1),
  );
  for (const c of containers) {
    const sel = c.firstClass ? `${c.tag}.${c.firstClass}` : c.tag;
    emit({
      ruleId: "container-overflow",
      category: "C1_overflow",
      severity: "block",
      message: `${sel} scrolls horizontally: scrollWidth=${c.sw} > clientWidth=${c.cw}`,
      selector: sel,
    });
  }

  const images = await page.$$eval("img", (imgs) =>
    imgs
      .map((img) => ({
        src: img.src,
        nw: img.naturalWidth,
        pw: img.parentElement?.clientWidth ?? 0,
      }))
      .filter((i) => i.pw > 0 && i.nw > i.pw),
  );
  for (const img of images) {
    const file = img.src.split("/").pop() ?? "img";
    // Severity ladder for image-overflow: cosmetic downscale (<25% over) → warn,
    // major frame violation (≥25% over) → block. 32→28px (14% over) is warn.
    const overshoot = (img.nw - img.pw) / img.pw;
    const severity: Finding["severity"] = overshoot >= 0.25 ? "block" : "warn";
    emit({
      ruleId: "image-overflow",
      category: "C1_overflow",
      severity,
      message: `<img> natural ${img.nw}px > parent ${img.pw}px (${file})`,
      selector: "img",
      fingerprint: file,
    });
  }
}

async function checkNarrowColumns(
  page: Page,
  target: Target,
  rules: any,
  emit: (f: Omit<Finding, "screen" | "viewport">) => void,
) {
  const minWidth = rules.min_column_width_px ?? 60;
  type Col = { tag: string; text: string; width: number; scrollWidth: number };
  const cols: Col[] = await page.$$eval(
    'th, td, [role="columnheader"], [role="cell"]',
    (els) =>
      els
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 30),
          width: el.clientWidth,
          scrollWidth: el.scrollWidth,
        }))
        .filter((c) => c.text.length > 0 && c.width > 0),
  );
  for (const c of cols) {
    if (c.width < minWidth) {
      emit({
        ruleId: "min-column-width",
        category: "C2_narrow_columns",
        severity: "warn",
        message: `${c.tag} width ${c.width}px < min ${minWidth}px (text: "${c.text}")`,
        selector: c.tag,
        fingerprint: c.text,
      });
    } else if (c.scrollWidth > c.width + 1) {
      emit({
        ruleId: "column-text-overflow",
        category: "C2_narrow_columns",
        severity: "warn",
        message: `${c.tag} content clipped: scrollWidth=${c.scrollWidth} > clientWidth=${c.width} (text: "${c.text}")`,
        selector: c.tag,
        fingerprint: c.text,
      });
    }
  }
}

async function checkEmptyContent(
  page: Page,
  emit: (f: Omit<Finding, "screen" | "viewport">) => void,
) {
  const emptyTables = await page.$$eval("table", (tables) =>
    tables
      .map((t) => ({
        hasThead: !!t.querySelector("thead"),
        rowCount: t.querySelectorAll("tbody tr").length,
      }))
      .filter((t) => t.hasThead && t.rowCount === 0),
  );
  emptyTables.forEach((_, idx) => {
    emit({
      ruleId: "list-emptiness",
      category: "C3_empty_content",
      severity: "warn",
      message: "<table> has <thead> but 0 <tbody><tr> rows",
      selector: "table",
      fingerprint: `nth-${idx + 1}`,
    });
  });

  const skeletonRatio = await page.evaluate(() => {
    const sks = document.querySelectorAll(".skeleton, [data-skeleton]");
    if (sks.length === 0) return 0;
    const total = window.innerWidth * window.innerHeight;
    let area = 0;
    sks.forEach((s) => {
      const r = s.getBoundingClientRect();
      area += r.width * r.height;
    });
    return area / total;
  });
  if (skeletonRatio > 0.5) {
    emit({
      ruleId: "placeholder-only",
      category: "C3_empty_content",
      severity: "warn",
      message: `Skeleton placeholders cover ${(skeletonRatio * 100).toFixed(0)}% of viewport`,
      selector: ".skeleton",
    });
  }
}

async function checkKdbpRules(
  page: Page,
  kdbpRules: Array<{
    id: string;
    summary: string;
    detect: string | null;
    severity: "block" | "warn" | "info";
    expected: "present" | "absent";
  }>,
  emit: (f: Omit<Finding, "screen" | "viewport">) => void,
) {
  for (const r of kdbpRules) {
    if (!r.detect || !r.detect.startsWith("dom-selector ")) {
      emit({
        ruleId: r.id,
        category: "C4_kdbp_rules",
        severity: "info",
        message: `${r.id}: ${r.summary} (no detector — informational only)`,
      });
      continue;
    }
    const selector = r.detect.replace(/^dom-selector\s+/, "").trim();
    const count = await page.locator(selector).count();
    if (count === 0 && r.expected === "present") {
      emit({
        ruleId: r.id,
        category: "C4_kdbp_rules",
        severity: r.severity,
        message: `${r.id} violated: \`${selector}\` not found (${r.summary})`,
        selector,
      });
    } else if (count > 0 && r.expected === "absent") {
      emit({
        ruleId: r.id,
        category: "C4_kdbp_rules",
        severity: r.severity,
        message: `${r.id} violated: \`${selector}\` present but should be absent (${r.summary})`,
        selector,
      });
    }
  }
}
