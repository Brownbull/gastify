import { describe, it, expect } from "vitest";
import { buildReportInsight, renderReportInsight, holidayForMonth } from "./reportInsights";

function gc(label: string, direction: "growth" | "shrink", ratio: string) {
  return {
    dimension: "transaction_category" as const,
    category_key: label.toLowerCase(),
    category_level: 2 as const,
    parent_key: "p",
    parent_level: 1 as const,
    label,
    direction,
    current_total_minor: 1000,
    baseline_average_minor: 800,
    ratio,
    threshold: "1.25",
    explanation: "",
  };
}

function cat(label: string, share: string) {
  return {
    dimension: "transaction_category" as const,
    category_key: label.toLowerCase(),
    category_level: 2 as const,
    parent_key: "p",
    parent_level: 1 as const,
    label,
    parent_label: "P",
    total_minor: 1000,
    currency: "CLP",
    share_of_total_percent: share,
    transaction_count: 5,
    item_count: 10,
    excluded_total_minor: 0,
    excluded_item_count: 0,
  };
}

const card = (over = {}) => ({ period: "2026-05", trend: "up" as const, deltaPct: 5, ...over });

describe("buildReportInsight", () => {
  it("picks the strongest gravity center as a category rise; the rise trophy is a different category (deduped)", () => {
    const { insight, highlights } = buildReportInsight(
      {
        gravity_centers: [gc("Supermercado", "growth", "1.45"), gc("Restaurant", "growth", "1.30")],
        top_transaction_categories: [cat("Supermercado", "40")],
      },
      card(),
    );
    expect(insight).toEqual({ kind: "categoryRise", category: "Supermercado", percent: 45, holiday: null });
    expect(highlights.map((h) => h.key)).toContain("leader");
    // the rise trophy is the SECOND-strongest — the insight category is not repeated
    expect(highlights.find((h) => h.key === "rise")).toMatchObject({ category: "Restaurant", metric: "+30%" });
  });

  it("skips the rise trophy when it would duplicate the insight category", () => {
    const { highlights } = buildReportInsight(
      { gravity_centers: [gc("Supermercado", "growth", "1.45")], top_transaction_categories: [cat("Supermercado", "40")] },
      card(),
    );
    expect(highlights.find((h) => h.key === "rise")).toBeUndefined();
    expect(highlights.map((h) => h.key)).toEqual(["leader"]);
  });

  it("ignores vanished categories (current spend 0) so the insight isn't 'fell 100%'", () => {
    const vanished = { ...gc("Supermercado", "shrink", "0"), current_total_minor: 0 };
    const { insight } = buildReportInsight(
      { gravity_centers: [vanished, gc("Restaurant", "growth", "1.30")], top_transaction_categories: [] },
      card({ trend: "flat", deltaPct: 1 }),
    );
    expect(insight).toEqual({ kind: "categoryRise", category: "Restaurant", percent: 30, holiday: null });
  });

  it("falls back to item categories for the leader when stores are uncategorised", () => {
    const { highlights } = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [], top_item_categories: [cat("Fresh Food", "62")] },
      card({ trend: "flat", deltaPct: 1 }),
    );
    expect(highlights.find((h) => h.key === "leader")).toMatchObject({ category: "Fresh Food", metric: "62%" });
  });

  it("flags a category drop", () => {
    const { insight } = buildReportInsight(
      { gravity_centers: [gc("Restaurant", "shrink", "0.70")], top_transaction_categories: [cat("Restaurant", "30")] },
      card({ trend: "down", deltaPct: -8 }),
    );
    expect(insight).toEqual({ kind: "categoryDrop", category: "Restaurant", percent: 30 });
  });

  it("tags seasonal context for a big rise in a holiday month (December)", () => {
    const { insight } = buildReportInsight(
      { gravity_centers: [gc("Regalos", "growth", "1.60")], top_transaction_categories: [] },
      card({ period: "2026-12" }),
    );
    expect(insight).toEqual({ kind: "categoryRise", category: "Regalos", percent: 60, holiday: "yearEnd" });
  });

  it("falls back to a trend insight when no category change is significant", () => {
    const { insight } = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [cat("A", "20")] },
      card({ trend: "down", deltaPct: -22 }),
    );
    expect(insight).toEqual({ kind: "trendDown", percent: 22 });
  });

  it("falls back to dominant then diverse", () => {
    const dom = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [cat("A", "55")] },
      card({ trend: "flat", deltaPct: 1 }),
    );
    expect(dom.insight).toEqual({ kind: "dominant", category: "A", percent: 55 });

    const div = buildReportInsight(
      {
        gravity_centers: [],
        top_transaction_categories: [cat("A", "25"), cat("B", "25"), cat("C", "25"), cat("D", "25")],
      },
      card({ trend: "flat", deltaPct: 1 }),
    );
    expect(div.insight).toEqual({ kind: "diverse", count: 4 });
  });

  it("does not emit a month-worded trend insight for a quarter/year period (Phase 3)", () => {
    // A big trend on a quarter card must NOT produce "...vs last month" — it falls
    // through to dominant/diverse (here neither fires → null).
    const quarter = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [cat("A", "20")], top_item_categories: [] },
      { period: "2026-Q1", trend: "up", deltaPct: 30 },
    );
    expect(quarter.insight?.kind).not.toBe("trendUp");
    expect(quarter.insight?.kind).not.toBe("trendDown");
    // The same big trend on a MONTH card still emits the trend insight (unchanged).
    const month = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [cat("A", "20")], top_item_categories: [] },
      { period: "2026-03", trend: "up", deltaPct: 30 },
    );
    expect(month.insight).toEqual({ kind: "trendUp", percent: 30 });
  });

  it("returns no insight when nothing is notable", () => {
    const { insight, highlights } = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [] },
      card({ trend: "flat", deltaPct: 2 }),
    );
    expect(insight).toBeNull();
    expect(highlights).toHaveLength(0);
  });
});

describe("renderReportInsight", () => {
  const t = (key: string) =>
    ({
      "reports.insight.categoryRise": "{category} up {percent}%",
      "reports.insight.seasonalSuffix": "season {holiday}",
      "reports.holiday.yearEnd": "year-end",
      "reports.insight.diverse": "{count} categories",
    })[key] ?? key;

  it("fills the template and appends the seasonal suffix", () => {
    expect(renderReportInsight({ kind: "categoryRise", category: "Food", percent: 45, holiday: "yearEnd" }, t)).toBe(
      "Food up 45% season year-end",
    );
  });

  it("omits the suffix without a holiday", () => {
    expect(renderReportInsight({ kind: "categoryRise", category: "Food", percent: 45, holiday: null }, t)).toBe(
      "Food up 45%",
    );
  });

  it("fills a count template", () => {
    expect(renderReportInsight({ kind: "diverse", count: 5 }, t)).toBe("5 categories");
  });
});

describe("holidayForMonth", () => {
  it("maps Chilean seasonal months", () => {
    expect(holidayForMonth(0)).toBe("summer");
    expect(holidayForMonth(8)).toBe("fiestasPatrias");
    expect(holidayForMonth(11)).toBe("yearEnd");
    expect(holidayForMonth(5)).toBeNull();
  });
});
