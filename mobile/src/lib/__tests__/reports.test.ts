import {
  computeTrend,
  periodLabel,
  seriesHasNoSpend,
  seriesToReportCards,
} from "../reports";
import type { InsightsSeriesPoint } from "../insights";

function point(
  period: string,
  periodStart: string,
  totalSpendMinor: number,
  transactionCount: number,
): InsightsSeriesPoint {
  return {
    period,
    period_start: periodStart,
    period_end: periodStart,
    total_spend_minor: totalSpendMinor,
    transaction_count: transactionCount,
  };
}

describe("computeTrend", () => {
  it("classifies a higher current total as up with a positive percent", () => {
    expect(computeTrend(150_000, 100_000)).toEqual({
      direction: "up",
      percent: 50,
      hasBaseline: true,
    });
  });

  it("classifies a lower current total as down with a negative percent", () => {
    expect(computeTrend(90_000, 150_000)).toEqual({
      direction: "down",
      percent: -40,
      hasBaseline: true,
    });
  });

  it("classifies an equal total as flat", () => {
    expect(computeTrend(120_000, 120_000)).toEqual({
      direction: "flat",
      percent: 0,
      hasBaseline: true,
    });
  });

  it("reports no baseline for the first period", () => {
    expect(computeTrend(100_000, null)).toEqual({
      direction: "flat",
      percent: 0,
      hasBaseline: false,
    });
  });

  it("reads new spend over a zero baseline as up with no baseline percent", () => {
    // Undefined percent (no divide-by-zero) — direction only, matching web Reports.
    expect(computeTrend(80_000, 0)).toEqual({
      direction: "up",
      percent: 0,
      hasBaseline: false,
    });
  });
});

describe("periodLabel", () => {
  it("renders a month bucket as a human month + year", () => {
    expect(periodLabel({ period: "2026-03", period_start: "2026-03-01" })).toBe(
      "March 2026",
    );
  });

  it("formats week + quarter + year buckets (D77 granularity)", () => {
    expect(periodLabel({ period: "2026-W23", period_start: "2026-06-01" })).toBe("W23 2026");
    expect(periodLabel({ period: "2026-Q1", period_start: "2026-01-01" })).toBe("Q1 2026");
    expect(periodLabel({ period: "2026", period_start: "2026-01-01" })).toBe("2026");
  });

  it("falls back to the canonical key for an unrecognised bucket", () => {
    expect(periodLabel({ period: "weird", period_start: "bad" })).toBe("weird");
  });
});

describe("seriesToReportCards", () => {
  const ascending = [
    point("2026-02", "2026-02-01", 100_000, 4),
    point("2026-03", "2026-03-01", 150_000, 6),
    point("2026-04", "2026-04-01", 90_000, 5),
  ];

  it("orders cards most-recent first", () => {
    const cards = seriesToReportCards(ascending);
    expect(cards.map((c) => c.period)).toEqual(["2026-04", "2026-03", "2026-02"]);
  });

  it("computes each trend against the chronologically previous period", () => {
    const cards = seriesToReportCards(ascending);
    // card[0] = April vs March (down), card[1] = March vs Feb (up),
    // card[2] = February (oldest, no baseline).
    expect(cards[0].trend.direction).toBe("down");
    expect(cards[1].trend.direction).toBe("up");
    expect(cards[2].trend.hasBaseline).toBe(false);
  });

  it("carries the period total + transaction count onto each card", () => {
    const [april] = seriesToReportCards(ascending);
    expect(april.totalSpendMinor).toBe(90_000);
    expect(april.transactionCount).toBe(5);
    expect(april.label).toBe("April 2026");
  });
});

describe("seriesHasNoSpend", () => {
  it("is true when every point has zero spend", () => {
    expect(
      seriesHasNoSpend([
        point("2026-03", "2026-03-01", 0, 0),
        point("2026-04", "2026-04-01", 0, 0),
      ]),
    ).toBe(true);
  });

  it("is false when any point has spend", () => {
    expect(
      seriesHasNoSpend([
        point("2026-03", "2026-03-01", 0, 0),
        point("2026-04", "2026-04-01", 5_000, 1),
      ]),
    ).toBe(false);
  });
});
