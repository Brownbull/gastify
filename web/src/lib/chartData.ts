/**
 * Shared chart-data primitives (D68).
 *
 * Maps the backend's `InsightCategoryRollup` rows into a renderer-agnostic
 * `ChartSlice` shape used by the donut + legend. Two invariants the backend
 * contract forces on us:
 *
 *  1. `share_of_total_percent` is a Decimal serialized as a JSON STRING
 *     ("65.10"), not a number — every consumer must `Number.parseFloat` it.
 *  2. `top_*_categories` is capped at 5 rows, so the slices never sum to the
 *     month total. We synthesize an "Other" slice for the remainder, otherwise
 *     a donut visually misrepresents the spend.
 *
 * Colors come from the Phase-1 theme tokens (`--chart-1..6`), assigned by a
 * STABLE hash of `category_key` so a category keeps its color across months
 * (an ordinal-by-rank palette would reshuffle colors as ranking changes).
 */

import type { components } from "@/lib/api-types";

type CategoryRollup = components["schemas"]["InsightCategoryRollup"];
type TreeNode = components["schemas"]["InsightsTreeNode"];

export interface ChartSlice {
  /** `category_key`, or `__other__` for the synthesized remainder slice. */
  categoryKey: string;
  label: string;
  parentKey: string;
  parentLabel: string;
  valueMinor: number;
  /** 0-100, parsed from the Decimal-string `share_of_total_percent`. */
  percent: number;
  /** CSS custom-property reference, e.g. `var(--chart-1)`. SVG `fill` reads it directly. */
  colorVar: string;
  isOther: boolean;
  /**
   * Whether tapping this slice drills into a deeper level. `undefined` (flat
   * `rollupToSlices` output) is treated as drillable when an `onSliceClick` is
   * wired; tree levels set it explicitly so leaf nodes stay non-interactive.
   */
  drillable?: boolean;
}

const SERIES_TOKENS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
] as const;

const OTHER_KEY = "__other__";
const OTHER_TOKEN = "--neutral-primary";

/** Parse the Decimal-string percent the API serializes, clamped to [0, 100]. */
export function parsePercent(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

/**
 * Stable category → theme-token color. Same `category_key` always maps to the
 * same `--chart-N`, independent of rank, so a category's color is consistent
 * across donut, legend, and months. FNV-ish string hash, modulo the 6-token
 * palette.
 */
export function categoryColorVar(categoryKey: string): string {
  if (categoryKey === OTHER_KEY) return `var(${OTHER_TOKEN})`;
  let hash = 0;
  for (let i = 0; i < categoryKey.length; i += 1) {
    hash = (hash * 31 + categoryKey.charCodeAt(i)) >>> 0;
  }
  return `var(${SERIES_TOKENS[hash % SERIES_TOKENS.length]})`;
}

/**
 * Map top-category rollups into donut slices, appending an "Other" remainder
 * slice so the slices sum to `totalSpendMinor` (the API caps rows at 5).
 */
export function rollupToSlices(
  rows: readonly CategoryRollup[],
  totalSpendMinor: number,
): ChartSlice[] {
  const slices: ChartSlice[] = rows.map((row) => ({
    categoryKey: row.category_key,
    label: row.label,
    parentKey: row.parent_key,
    parentLabel: row.parent_label,
    valueMinor: row.total_minor,
    percent: parsePercent(row.share_of_total_percent),
    colorVar: categoryColorVar(row.category_key),
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
      colorVar: `var(${OTHER_TOKEN})`,
      isOther: true,
    });
  }

  return slices;
}

/**
 * Map one drill level's tree nodes into donut slices (D69). `percent` is
 * recomputed *within the parent* (`value / parentTotalMinor`), not the grand
 * total, so a drilled donut's proportions are correct. The "Other" remainder
 * here is real spend that didn't reach this level's children — e.g. itemless
 * transactions under a store-type, or uncategorized-store spend at the root —
 * and is non-drillable. `drillable` mirrors whether a node has children.
 */
export function treeNodesToSlices(
  nodes: readonly TreeNode[],
  parentTotalMinor: number,
): ChartSlice[] {
  const slices: ChartSlice[] = nodes.map((node) => ({
    categoryKey: node.key,
    label: node.label,
    parentKey: node.parent_key ?? "",
    // Tree nodes carry parent_key but no denormalized parent label, so parentLabel
    // is intentionally empty here (the breadcrumb derives ancestor labels instead).
    parentLabel: "",
    valueMinor: node.total_minor,
    percent: parentTotalMinor > 0 ? (node.total_minor / parentTotalMinor) * 100 : 0,
    colorVar: categoryColorVar(node.key),
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
      colorVar: `var(${OTHER_TOKEN})`,
      isOther: true,
      drillable: false,
    });
  }

  return slices;
}

export { OTHER_KEY };


/**
 * Flatten the insights tree at exactly classification level N (the L1–L4 bar,
 * legacy DonutViewMode port): collect every node whose `level` === N across the whole
 * tree, regardless of parentage. The level totals all sum to the same period total
 * only at L1/L2 (transaction-aggregated); L3/L4 exclude itemless spend by design —
 * callers pass the response total for percent math.
 */
export function flattenTreeAtLevel(
  nodes: readonly TreeNode[],
  level: number,
  responseTotalMinor: number,
): ChartSlice[] {
  const found: TreeNode[] = [];
  const walk = (list: readonly TreeNode[]) => {
    for (const node of list) {
      if (node.level === level) found.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  found.sort((a, b) => b.total_minor - a.total_minor);
  return found.map((node) => ({
    categoryKey: node.key,
    label: node.label,
    parentKey: node.parent_key ?? "",
    parentLabel: "",
    valueMinor: node.total_minor,
    percent: responseTotalMinor > 0 ? (node.total_minor / responseTotalMinor) * 100 : 0,
    colorVar: categoryColorVar(node.key),
    isOther: false,
    drillable: false, // the level bar shows a flat cut; drilling is the dashboard's job
  }));
}
