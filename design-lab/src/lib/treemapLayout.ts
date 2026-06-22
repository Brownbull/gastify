/**
 * Squarified Treemap Layout (Bruls/Huizing/van Wijk, 2000) — ported VERBATIM
 * from legacy BoletApp `utils/treemapLayout.ts` (DM-13). Produces rectangles
 * with aspect ratios near 1 (squares) so areas are easy to compare. Output
 * coordinates are 0–100 PERCENTAGE units. Pure logic, no React, no deps (the
 * legacy `byNumberDesc` sort is inlined).
 *
 * Reference: "Squarified Treemaps" — https://www.win.tue.nl/~vanwijk/stm.pdf
 */

export interface TreemapItem {
  id: string;
  value: number;
  [key: string]: unknown;
}

export interface TreemapRect {
  id: string;
  x: number; // 0–100 %
  y: number; // 0–100 %
  width: number; // 0–100 %
  height: number; // 0–100 %
  value: number;
  originalItem: TreemapItem;
}

/** Aspect ratio of a rectangle: max(w/h, h/w). Perfect square = 1. */
function aspectRatio(width: number, height: number): number {
  if (width === 0 || height === 0) return Infinity;
  return Math.max(width / height, height / width);
}

/** Worst aspect ratio for a row laid out in the given area — the metric to minimize. */
function worstAspectRatio(row: TreemapItem[], rowTotal: number, areaWidth: number, areaHeight: number, totalValue: number): number {
  if (row.length === 0 || totalValue === 0) return Infinity;
  const isHorizontal = areaWidth >= areaHeight;
  const sideLength = isHorizontal ? areaHeight : areaWidth;
  const rowFraction = rowTotal / totalValue;
  const rowThickness = isHorizontal ? areaWidth * rowFraction : areaHeight * rowFraction;
  let worst = 0;
  for (const item of row) {
    const itemFraction = item.value / rowTotal;
    const itemLength = sideLength * itemFraction;
    worst = Math.max(worst, aspectRatio(rowThickness, itemLength));
  }
  return worst;
}

function squarify(items: TreemapItem[], x: number, y: number, width: number, height: number, results: TreemapRect[]): void {
  if (items.length === 0 || width <= 0 || height <= 0) return;
  if (items.length === 1) {
    results.push({ id: items[0].id, x, y, width, height, value: items[0].value, originalItem: items[0] });
    return;
  }
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  if (totalValue === 0) return;

  const row: TreemapItem[] = [];
  const remaining = [...items];
  const firstItem = remaining.shift()!;
  row.push(firstItem);
  let rowTotal = firstItem.value;
  let currentWorst = worstAspectRatio(row, rowTotal, width, height, totalValue);

  while (remaining.length > 0) {
    const nextItem = remaining[0];
    const newRowTotal = rowTotal + nextItem.value;
    const newWorst = worstAspectRatio([...row, nextItem], newRowTotal, width, height, totalValue);
    if (newWorst > currentWorst) break;
    row.push(remaining.shift()!);
    rowTotal = newRowTotal;
    currentWorst = newWorst;
  }

  const isHorizontal = width >= height;
  const rowFraction = rowTotal / totalValue;

  if (isHorizontal) {
    const rowWidth = width * rowFraction;
    let currentY = y;
    for (const item of row) {
      const itemHeight = height * (item.value / rowTotal);
      results.push({ id: item.id, x, y: currentY, width: rowWidth, height: itemHeight, value: item.value, originalItem: item });
      currentY += itemHeight;
    }
    squarify(remaining, x + rowWidth, y, width - rowWidth, height, results);
  } else {
    const rowHeight = height * rowFraction;
    let currentX = x;
    for (const item of row) {
      const itemWidth = width * (item.value / rowTotal);
      results.push({ id: item.id, x: currentX, y, width: itemWidth, height: rowHeight, value: item.value, originalItem: item });
      currentX += itemWidth;
    }
    squarify(remaining, x, y + rowHeight, width, height - rowHeight, results);
  }
}

/** Compute a squarified layout. Filters value>0, sorts value desc (inlined). */
export function calculateTreemapLayout(items: TreemapItem[], containerWidth = 100, containerHeight = 100): TreemapRect[] {
  if (items.length === 0) return [];
  const validItems = items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  if (validItems.length === 0) return [];
  const results: TreemapRect[] = [];
  squarify(validItems, 0, 0, containerWidth, containerHeight, results);
  return results;
}

/**
 * Step-function container height by visible category count (legacy
 * TreemapSlide): keeps the treemap from jumping on every expand/collapse.
 */
export function treemapStepHeight(categoryCount: number): number {
  if (categoryCount <= 4) return 320;
  if (categoryCount <= 6) return 400;
  if (categoryCount <= 8) return 480;
  if (categoryCount <= 10) return 560;
  return 640;
}
