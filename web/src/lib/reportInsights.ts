import type { MessageKey } from "@/lib/i18n";
import type { components } from "@/lib/api-types";

type Monthly = components["schemas"]["MonthlyInsightsResponse"];

/** Chilean seasonal context (0 = January). Mirrors the legacy HOLIDAY_MONTHS. */
export type HolidayKind = "summer" | "fiestasPatrias" | "yearEnd";

export function holidayForMonth(monthIndex: number): HolidayKind | null {
  if (monthIndex === 0 || monthIndex === 1) return "summer";
  if (monthIndex === 8) return "fiestasPatrias";
  if (monthIndex === 11) return "yearEnd";
  return null;
}

const HOLIDAY_KEY: Record<HolidayKind, MessageKey> = {
  summer: "reports.holiday.summer",
  fiestasPatrias: "reports.holiday.fiestasPatrias",
  yearEnd: "reports.holiday.yearEnd",
};

/** A persona insight — a structured tag the render layer turns into a localized sentence. */
export type ReportInsight =
  | { kind: "categoryRise"; category: string; percent: number; holiday: HolidayKind | null }
  | { kind: "categoryDrop"; category: string; percent: number }
  | { kind: "trendUp"; percent: number }
  | { kind: "trendDown"; percent: number }
  | { kind: "dominant"; category: string; percent: number }
  | { kind: "diverse"; count: number };

/** A "trophy" fact. `category` + `metric` are data; the render adds the localized label. */
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

/** Signed % change of a gravity center vs its baseline (growth > 0, shrink < 0). */
function gravityChangePercent(ratio: string): number {
  return (Number.parseFloat(ratio) - 1) * 100;
}

/**
 * Build a persona insight + highlights from the month's `/insights/monthly` payload
 * (gravity_centers = server-computed per-category growth/shrink, top categories) and
 * the report card's trend. Pure — no i18n, no fetch. Ported from the legacy BoletApp
 * `reportInsights.ts` decision tree, but driven by `gravity_centers` (gastify's
 * server-side equivalent of the legacy client prev-month diff, D69-era).
 */
export function buildReportInsight(
  monthly: Pick<Monthly, "gravity_centers" | "top_transaction_categories" | "top_item_categories">,
  card: ReportInsightCard,
): { insight: ReportInsight | null; highlights: ReportHighlight[] } {
  const ranked = (monthly.gravity_centers ?? [])
    .map((gc) => ({ gc, pct: gravityChangePercent(gc.ratio) }))
    // Skip vanished categories (current spend 0 → a "-100%" change): "your X
    // spending fell 100%" is a poor headline when there's no current X spending.
    .filter((x) => Number.isFinite(x.pct) && x.gc.current_total_minor > 0)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  // Store categories drive the leader/dominant/diverse signals; fall back to item
  // categories when the store dimension is uncategorised (so item-heavy data still
  // produces an insight rather than silently dropping the fallback chain).
  const txnCats = monthly.top_transaction_categories ?? [];
  const topCats = txnCats.length > 0 ? txnCats : (monthly.top_item_categories ?? []);
  const monthIndex = Number(card.period.split("-")[1]) - 1;
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
  } else if (card.trend === "down" && (card.deltaPct ?? 0) < -15) {
    insight = { kind: "trendDown", percent: Math.round(Math.abs(card.deltaPct ?? 0)) };
  } else if (card.trend === "up" && (card.deltaPct ?? 0) > 15) {
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

  // The category named by the persona sentence — skip the matching rise/drop trophy
  // so the same category isn't repeated in the same block.
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

/** Render a structured insight into a localized sentence (template + replace, since
 *  the web i18n `t` is key-only). Holiday context is appended as a seasonal suffix. */
export function renderReportInsight(insight: ReportInsight, t: (key: MessageKey) => string): string {
  const fill = (key: MessageKey, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), t(key));

  switch (insight.kind) {
    case "categoryRise": {
      const base = fill("reports.insight.categoryRise", {
        category: insight.category,
        percent: insight.percent,
      });
      if (!insight.holiday) return base;
      const season = t(HOLIDAY_KEY[insight.holiday]);
      return `${base} ${fill("reports.insight.seasonalSuffix", { holiday: season })}`;
    }
    case "categoryDrop":
      return fill("reports.insight.categoryDrop", { category: insight.category, percent: insight.percent });
    case "trendUp":
      return fill("reports.insight.trendUp", { percent: insight.percent });
    case "trendDown":
      return fill("reports.insight.trendDown", { percent: insight.percent });
    case "dominant":
      return fill("reports.insight.dominant", { category: insight.category, percent: insight.percent });
    case "diverse":
      return fill("reports.insight.diverse", { count: insight.count });
    default: {
      const _exhaustive: never = insight;
      return _exhaustive;
    }
  }
}
