/**
 * Shared chart-data primitives for mobile (D68 — mirrors web/src/lib/chartData).
 *
 * Same two backend-contract invariants: `share_of_total_percent` is a
 * Decimal STRING (parse it), and `top_*_categories` is capped at 5 so we
 * synthesize an "Other" remainder slice. Colors are returned as a stable
 * palette INDEX (0-5) so the chart components can map it to the active theme's
 * `chartN` hex — keeping a category's color stable across months.
 */
import type { InsightCategoryRollup, InsightsTreeNode } from "./insights";

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
  /** Whether tapping descends a level. `undefined` (flat rollups) = drillable when wired. */
  drillable?: boolean;
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

/**
 * Map one drill level's tree nodes into donut slices (D69 — mirrors web). The
 * `percent` is within-parent (`value / parentTotalMinor`), and the "Other"
 * remainder is real spend that didn't reach this level's children (itemless
 * transactions / uncategorized stores), non-drillable. `drillable` mirrors
 * whether a node has children.
 */
export function treeNodesToSlices(
  nodes: readonly InsightsTreeNode[],
  parentTotalMinor: number,
): ChartSlice[] {
  const slices: ChartSlice[] = nodes.map((node) => ({
    categoryKey: node.key,
    label: node.label,
    parentKey: node.parent_key ?? "",
    parentLabel: "",
    valueMinor: node.total_minor,
    percent: parentTotalMinor > 0 ? (node.total_minor / parentTotalMinor) * 100 : 0,
    colorIndex: colorIndexForKey(node.key),
    isOther: false,
    drillable: (node.children?.length ?? 0) > 0,
  }));

  const accounted = slices.reduce((sum, slice) => sum + slice.valueMinor, 0);
  const remainder = parentTotalMinor - accounted;
  if (parentTotalMinor > 0 && remainder > 0) {
    slices.push({
      categoryKey: OTHER_KEY,
      label: "",
      parentKey: "",
      parentLabel: "",
      valueMinor: remainder,
      percent: (remainder / parentTotalMinor) * 100,
      colorIndex: -1,
      isOther: true,
      drillable: false,
    });
  }

  return slices;
}
