import type { SegmentDatum } from "./analyticsFixtures";

/**
 * Progressive disclosure ("Más"/Otros folding) — ported from legacy BoletApp's
 * applyTreemapGrouping (src/utils/categoryAggregation.ts). The visible set is:
 *
 *   1. ALL categories with pct > 10 (strictly above threshold), PLUS
 *   2. the single largest category at or below 10% (the "one-below" rule), PLUS
 *   3. `expandedCount` more, sliced from the below-threshold tail.
 *
 * The remaining below-threshold categories fold into a synthetic "Más" entry —
 * EXCEPT a single leftover, which is shown directly (don't fold one item).
 * Plus reveals one more (expandedCount+1); Minus folds one (max(0, n-1)). Input
 * is sorted desc by value first. `makeMas` builds the aggregate in the caller's
 * own datum type (donut SegmentDatum vs treemap TreemapFullDatum).
 */
export interface GroupAggregate {
  value: number;
  pct: number;
  count: number;
  itemCount: number;
  /** how many real categories are folded inside. */
  categoryCount: number;
}

export interface GroupResult<T> {
  display: T[];
  /** number of categories currently folded into "Más" (the Plus-button badge). */
  otroCount: number;
  canExpand: boolean;
  canCollapse: boolean;
}

/** the synthetic aggregate's id — renders grey "Otros/Más", never drillable. */
export const MAS_ID = "otros";

export function groupByThreshold<T extends SegmentDatum>(
  segments: T[],
  expandedCount: number,
  makeMas: (agg: GroupAggregate) => T,
): GroupResult<T> {
  const real = [...segments].filter((c) => c.id !== MAS_ID).sort((a, b) => b.value - a.value);
  const above = real.filter((c) => c.pct > 10);
  const below = real.filter((c) => c.pct <= 10);

  const display: T[] = [...above];
  if (below.length > 0) display.push(below[0]); // always show the largest below-threshold
  display.push(...below.slice(1, 1 + expandedCount)); // reveal `expandedCount` more

  const otro = below.slice(1 + expandedCount);
  if (otro.length === 1) {
    display.push(otro[0]); // a single leftover is shown directly, not folded
  } else if (otro.length > 1) {
    const value = otro.reduce((s, c) => s + c.value, 0);
    const total = real.reduce((s, c) => s + c.value, 0);
    display.push(
      makeMas({
        value,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        count: otro.reduce((s, c) => s + (c.count ?? 0), 0),
        itemCount: otro.reduce((s, c) => s + (c.itemCount ?? 0), 0),
        categoryCount: otro.length,
      }),
    );
  }

  return { display, otroCount: otro.length, canExpand: otro.length > 1, canCollapse: expandedCount > 0 };
}
