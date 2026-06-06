import type { MonthlyInsights } from "./insights";

// TODO(i18n): the rendered sentences + HIGHLIGHT_LABEL below are hardcoded English
// (mobile has no i18n layer yet — same convention as ReportsScreen/TrendsScreen).
// Replace with locale-aware strings when mobile i18n lands; the web side already
// localizes these via reports.insight.* / reports.holiday.* / reports.highlight.* keys.

/** Chilean seasonal context (0 = January). Mirrors the legacy HOLIDAY_MONTHS. */
export type HolidayKind = "summer" | "fiestasPatrias" | "yearEnd";

export function holidayForMonth(monthIndex: number): HolidayKind | null {
  if (monthIndex === 0 || monthIndex === 1) return "summer";
  if (monthIndex === 8) return "fiestasPatrias";
  if (monthIndex === 11) return "yearEnd";
  return null;
}

export type ReportInsight =
  | { kind: "categoryRise"; category: string; percent: number; holiday: HolidayKind | null }
  | { kind: "categoryDrop"; category: string; percent: number }
  | { kind: "trendUp"; percent: number }
  | { kind: "trendDown"; percent: number }
  | { kind: "dominant"; category: string; percent: number }
  | { kind: "diverse"; count: number };

export interface ReportHighlight {
  key: "leader" | "rise" | "drop";
  category: string;
  metric: string;
}

export interface ReportInsightCard {
  period: string; // YYYY-MM
  trend: "up" | "down" | "flat" | null;
  deltaPct: number | null;
}

function gravityChangePercent(ratio: string): number {
  return (Number.parseFloat(ratio) - 1) * 100;
}

/**
 * Build a persona insight + highlights from the month's /insights/monthly payload
 * (gravity_centers + top categories) and the report card's trend. Pure — no fetch.
 * Mirrors the web `reportInsights.ts` (ported from legacy BoletApp reportInsights).
 */
export function buildReportInsight(
  monthly: Pick<MonthlyInsights, "gravity_centers" | "top_transaction_categories" | "top_item_categories">,
  card: ReportInsightCard,
): { insight: ReportInsight | null; highlights: ReportHighlight[] } {
  const ranked = (monthly.gravity_centers ?? [])
    .map((gc) => ({ gc, pct: gravityChangePercent(gc.ratio) }))
    // Skip vanished categories (current spend 0 → a "-100%" change): "your X
    // spending fell 100%" is a poor headline when there's no current X spending.
    .filter((x) => Number.isFinite(x.pct) && x.gc.current_total_minor > 0)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  // Fall back to item categories when the store dimension is uncategorised.
  const txnCats = monthly.top_transaction_categories ?? [];
  const topCats = txnCats.length > 0 ? txnCats : (monthly.top_item_categories ?? []);
  // Month periods are YYYY-MM; quarter (YYYY-Qn) + year (YYYY) must not borrow the
  // month-worded trend / seasonal copy ("vs last month").
  const isMonth = /^\d{4}-\d{2}$/.test(card.period);
  const monthIndex = isMonth ? Number(card.period.split("-")[1]) - 1 : -1;
  const holiday = holidayForMonth(monthIndex);
  const strongest = ranked[0];

  let insight: ReportInsight | null = null;
  if (strongest && Math.abs(strongest.pct) > 15) {
    insight =
      strongest.pct > 0
        ? {
            kind: "categoryRise",
            category: strongest.gc.label,
            percent: Math.round(strongest.pct),
            holiday: strongest.pct > 20 ? holiday : null,
          }
        : { kind: "categoryDrop", category: strongest.gc.label, percent: Math.round(Math.abs(strongest.pct)) };
  } else if (isMonth && card.trend === "down" && (card.deltaPct ?? 0) < -15) {
    insight = { kind: "trendDown", percent: Math.round(Math.abs(card.deltaPct ?? 0)) };
  } else if (isMonth && card.trend === "up" && (card.deltaPct ?? 0) > 15) {
    insight = { kind: "trendUp", percent: Math.round(card.deltaPct ?? 0) };
  } else if (topCats[0] && Number.parseFloat(topCats[0].share_of_total_percent) >= 45) {
    insight = {
      kind: "dominant",
      category: topCats[0].label,
      percent: Math.round(Number.parseFloat(topCats[0].share_of_total_percent)),
    };
  } else if (topCats.length >= 4) {
    insight = { kind: "diverse", count: topCats.length };
  }

  const insightCategory =
    insight && (insight.kind === "categoryRise" || insight.kind === "categoryDrop") ? insight.category : null;

  const highlights: ReportHighlight[] = [];
  if (topCats[0]) {
    highlights.push({
      key: "leader",
      category: topCats[0].label,
      metric: `${Math.round(Number.parseFloat(topCats[0].share_of_total_percent))}%`,
    });
  }
  const rise = ranked.find((x) => x.pct > 15 && x.gc.label !== insightCategory);
  if (rise) highlights.push({ key: "rise", category: rise.gc.label, metric: `+${Math.round(rise.pct)}%` });
  const drop = ranked.find((x) => x.pct < -15 && x.gc.label !== insightCategory);
  if (drop) highlights.push({ key: "drop", category: drop.gc.label, metric: `-${Math.round(Math.abs(drop.pct))}%` });

  return { insight, highlights };
}

const HOLIDAY_LABEL: Record<HolidayKind, string> = {
  summer: "summer",
  fiestasPatrias: "the national holidays",
  yearEnd: "the year-end holidays",
};

export const HIGHLIGHT_LABEL: Record<ReportHighlight["key"], string> = {
  leader: "Top category",
  rise: "Biggest rise",
  drop: "Biggest drop",
};

/** Render a structured insight into an English sentence (mobile has no i18n layer). */
export function renderReportInsight(insight: ReportInsight): string {
  switch (insight.kind) {
    case "categoryRise": {
      const base = `Your ${insight.category} spending rose ${insight.percent}% this month.`;
      return insight.holiday ? `${base} Lines up with ${HOLIDAY_LABEL[insight.holiday]}.` : base;
    }
    case "categoryDrop":
      return `Your ${insight.category} spending fell ${insight.percent}% this month.`;
    case "trendUp":
      return `Your total spending rose ${insight.percent}% vs last month.`;
    case "trendDown":
      return `Your total spending fell ${insight.percent}% vs last month.`;
    case "dominant":
      return `${insight.category} made up ${insight.percent}% of your spending.`;
    case "diverse":
      return `You spread spending across ${insight.count} categories.`;
    default: {
      const _exhaustive: never = insight;
      return _exhaustive;
    }
  }
}
