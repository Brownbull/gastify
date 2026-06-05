/**
 * Pure transforms that fold an insights spend series into Reports period cards
 * (Phase 6 T9). NO new query: Reports reuses `/insights/series` (period totals +
 * counts) and `/insights/monthly` (per-period category donut). The only new logic
 * is the CLIENT-SIDE trend indicator — each card compares its period total to the
 * immediately-preceding point in the same series (point[n] vs point[n-1]).
 */
import type { InsightsSeriesPoint } from "./insights";

export type TrendDirection = "up" | "down" | "flat";

export interface PeriodTrend {
  direction: TrendDirection;
  /** Signed percent change vs the previous period; 0 for flat / no baseline. */
  percent: number;
  /** False for the oldest point (no prior period to compare against). */
  hasBaseline: boolean;
}

export interface ReportCard {
  /** Canonical bucket key from the series (e.g. `2026-03`). */
  period: string;
  /** Human label for the card header (e.g. `March 2026`). */
  label: string;
  periodStart: string;
  periodEnd: string;
  totalSpendMinor: number;
  transactionCount: number;
  trend: PeriodTrend;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Render a series bucket as a human label, driven off the canonical `period`
 * key so every granularity formats correctly:
 * - month   (`2026-03`)   → `March 2026`
 * - quarter (`2026-Q1`)   → `Q1 2026`
 * - year    (`2026`)      → `2026`
 *
 * The label keys on `period` rather than `period_start` because a quarter
 * bucket's start (`2026-01-01`) would otherwise read as a month ("January
 * 2026"). Unrecognised keys fall back verbatim so the helper never throws.
 */
export function periodLabel(point: { period: string; period_start: string }): string {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(point.period);
  if (quarter) return `Q${quarter[2]} ${quarter[1]}`;

  const month = /^(\d{4})-(\d{2})$/.exec(point.period);
  if (month) {
    const monthIndex = Number(month[2]) - 1;
    if (monthIndex >= 0 && monthIndex <= 11) {
      return `${MONTH_NAMES[monthIndex]} ${month[1]}`;
    }
  }

  const year = /^(\d{4})$/.exec(point.period);
  if (year) return year[1];

  return point.period;
}

/**
 * Classify a period total against its predecessor. `up`/`down` require a strict
 * change; an identical (or absent-baseline) total is `flat`. Percent is signed and
 * relative to the previous total; a non-zero current total against a ZERO baseline
 * reads as `up` but with `hasBaseline: false` (the percent is undefined — no
 * division by zero — matching the web Reports, which omits the percent there).
 */
export function computeTrend(
  currentMinor: number,
  previousMinor: number | null,
): PeriodTrend {
  if (previousMinor === null) {
    return { direction: "flat", percent: 0, hasBaseline: false };
  }
  if (currentMinor === previousMinor) {
    return { direction: "flat", percent: 0, hasBaseline: true };
  }
  const direction: TrendDirection = currentMinor > previousMinor ? "up" : "down";
  if (previousMinor === 0) {
    // A zero baseline makes the percent change undefined (can't divide by zero), so
    // report the direction with no baseline — matching the web Reports, which omits
    // the percent for a prior period with no spend rather than a misleading 100%.
    return { direction, percent: 0, hasBaseline: false };
  }
  const percent = ((currentMinor - previousMinor) / previousMinor) * 100;
  return { direction, percent, hasBaseline: true };
}

/**
 * Fold a series (ascending by period) into report cards ordered MOST-RECENT
 * FIRST. The trend on each card always compares against the chronologically
 * previous period, regardless of display order — so `reports-card-0` (the newest
 * month) trends against the month before it.
 */
export function seriesToReportCards(
  points: readonly InsightsSeriesPoint[],
): ReportCard[] {
  const cards = points.map((point, index) => {
    const previous = index > 0 ? points[index - 1].total_spend_minor : null;
    return {
      period: point.period,
      label: periodLabel(point),
      periodStart: point.period_start,
      periodEnd: point.period_end,
      totalSpendMinor: point.total_spend_minor,
      transactionCount: point.transaction_count,
      trend: computeTrend(point.total_spend_minor, previous),
    };
  });
  return cards.reverse();
}

/** True when no period in the series carries any spend (drives the empty state). */
export function seriesHasNoSpend(
  points: readonly InsightsSeriesPoint[],
): boolean {
  return !points.some((point) => point.total_spend_minor > 0);
}
