/**
 * Shared chart-data primitives for mobile (D68 — mirrors web/src/lib/chartData).
 *
 * Same two backend-contract invariants: `share_of_total_percent` is a
 * Decimal STRING (parse it), and `top_*_categories` is capped at 5 so we
 * synthesize an "Other" remainder slice. Colors are returned as a stable
 * palette INDEX (0-5) so the chart components can map it to the active theme's
 * `chartN` hex — keeping a category's color stable across months.
 */
import type { InsightCategoryRollup } from "./insights";

export const SERIES_PALETTE_SIZE = 6;
export const OTHER_KEY = "__other__";

export interface ChartSlice {
  categoryKey: string;
  label: string;
  parentKey: string;
  parentLabel: string;
  valueMinor: number;
  percent: number;
  /** 0-5 index into the theme chart palette; -1 for the "Other" slice. */
  colorIndex: number;
  isOther: boolean;
}

export function parsePercent(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

/** Stable category_key -> palette index (FNV-ish hash), independent of rank. */
export function colorIndexForKey(categoryKey: string): number {
  let hash = 0;
  for (let i = 0; i < categoryKey.length; i += 1) {
    hash = (hash * 31 + categoryKey.charCodeAt(i)) >>> 0;
  }
  return hash % SERIES_PALETTE_SIZE;
}

export function rollupToSlices(
  rows: readonly InsightCategoryRollup[],
  totalSpendMinor: number,
): ChartSlice[] {
  const slices: ChartSlice[] = rows.map((row) => ({
    categoryKey: row.category_key,
    label: row.label,
    parentKey: row.parent_key,
    parentLabel: row.parent_label,
    valueMinor: row.total_minor,
    percent: parsePercent(row.share_of_total_percent),
    colorIndex: colorIndexForKey(row.category_key),
    isOther: false,
  }));

  const accounted = slices.reduce((sum, slice) => sum + slice.valueMinor, 0);
  const remainder = totalSpendMinor - accounted;
  if (totalSpendMinor > 0 && remainder > 0) {
    slices.push({
      categoryKey: OTHER_KEY,
      label: "",
      parentKey: "",
      parentLabel: "",
      valueMinor: remainder,
      percent: (remainder / totalSpendMinor) * 100,
      colorIndex: -1,
      isOther: true,
    });
  }

  return slices;
}
