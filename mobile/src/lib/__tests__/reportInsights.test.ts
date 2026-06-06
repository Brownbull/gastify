import {
  buildReportInsight,
  renderReportInsight,
  holidayForMonth,
} from "../reportInsights";

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

describe("buildReportInsight (mobile)", () => {
  it("picks the strongest gravity center as a category rise; the rise trophy is a different category (deduped)", () => {
    const { insight, highlights } = buildReportInsight(
      {
        gravity_centers: [gc("Supermercado", "growth", "1.45"), gc("Restaurant", "growth", "1.30")],
        top_transaction_categories: [cat("Supermercado", "40")],
      },
      card(),
    );
    expect(insight).toEqual({ kind: "categoryRise", category: "Supermercado", percent: 45, holiday: null });
    expect(highlights.find((h) => h.key === "rise")).toMatchObject({ category: "Restaurant", metric: "+30%" });
    expect(highlights.find((h) => h.key === "leader")).toMatchObject({ category: "Supermercado", metric: "40%" });
  });

  it("ignores vanished categories (current spend 0) so the insight isn't 'fell 100%'", () => {
    const vanished = { ...gc("Supermercado", "shrink", "0"), current_total_minor: 0 };
    const { insight } = buildReportInsight(
      { gravity_centers: [vanished, gc("Restaurant", "growth", "1.30")], top_transaction_categories: [] },
      card({ trend: "flat", deltaPct: 1 }),
    );
    expect(insight).toEqual({ kind: "categoryRise", category: "Restaurant", percent: 30, holiday: null });
  });

  it("does not emit a month-worded trend insight for a quarter period (Phase 3)", () => {
    const quarter = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [cat("A", "20")], top_item_categories: [] },
      { period: "2026-Q1", trend: "up", deltaPct: 30 },
    );
    expect(quarter.insight?.kind).not.toBe("trendUp");
    const month = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [cat("A", "20")], top_item_categories: [] },
      { period: "2026-03", trend: "up", deltaPct: 30 },
    );
    expect(month.insight).toEqual({ kind: "trendUp", percent: 30 });
  });

  it("falls back to item categories for the leader when stores are uncategorised", () => {
    const { highlights } = buildReportInsight(
      { gravity_centers: [], top_transaction_categories: [], top_item_categories: [cat("Fresh Food", "62")] },
      card({ trend: "flat", deltaPct: 1 }),
    );
    expect(highlights.find((h) => h.key === "leader")).toMatchObject({ category: "Fresh Food", metric: "62%" });
  });

  it("tags seasonal context for a big rise in September (fiestas patrias)", () => {
    const { insight } = buildReportInsight(
      { gravity_centers: [gc("Asado", "growth", "1.40")], top_transaction_categories: [] },
      card({ period: "2026-09" }),
    );
    expect(insight).toEqual({ kind: "categoryRise", category: "Asado", percent: 40, holiday: "fiestasPatrias" });
  });

  it("falls back to trend then dominant then diverse", () => {
    expect(
      buildReportInsight({ gravity_centers: [], top_transaction_categories: [cat("A", "20")] }, card({ trend: "down", deltaPct: -18 }))
        .insight,
    ).toEqual({ kind: "trendDown", percent: 18 });
    expect(
      buildReportInsight({ gravity_centers: [], top_transaction_categories: [cat("A", "60")] }, card({ trend: "flat", deltaPct: 1 }))
        .insight,
    ).toEqual({ kind: "dominant", category: "A", percent: 60 });
  });
});

describe("renderReportInsight (mobile, English)", () => {
  it("renders a category rise with a seasonal suffix", () => {
    expect(renderReportInsight({ kind: "categoryRise", category: "Gifts", percent: 60, holiday: "yearEnd" })).toBe(
      "Your Gifts spending rose 60% this month. Lines up with the year-end holidays.",
    );
  });
  it("renders a diverse insight", () => {
    expect(renderReportInsight({ kind: "diverse", count: 5 })).toBe("You spread spending across 5 categories.");
  });
});

describe("holidayForMonth", () => {
  it("maps the Chilean seasonal months", () => {
    expect(holidayForMonth(1)).toBe("summer");
    expect(holidayForMonth(8)).toBe("fiestasPatrias");
    expect(holidayForMonth(11)).toBe("yearEnd");
    expect(holidayForMonth(6)).toBeNull();
  });
});
