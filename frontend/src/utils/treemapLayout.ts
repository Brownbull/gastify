/**
 * Squarified Treemap Layout Algorithm
 *
 * Implements the squarified treemap algorithm by Bruls, Huizing, and van Wijk.
 * This algorithm produces rectangles with aspect ratios close to 1 (squares),
 * making the visualization easier to read and compare.
 *
 * Reference: "Squarified Treemaps" (2000)
 * https://www.win.tue.nl/~vanwijk/stm.pdf
 *
 * Story 14.13: Analytics Explorer Redesign - Proportional treemap layout
 */

import { byNumberDesc } from '@/utils/comparators';

export interface TreemapItem {
    id: string;
    value: number;
    [key: string]: unknown; // Allow additional properties to pass through
}

export interface TreemapRect {
    id: string;
    x: number;      // 0-100 percentage
    y: number;      // 0-100 percentage
    width: number;  // 0-100 percentage
    height: number; // 0-100 percentage
    value: number;
    originalItem: TreemapItem;
}

/**
 * Calculate the aspect ratio of a rectangle.
 * Aspect ratio = max(width/height, height/width)
 * Perfect square = 1, elongated rectangle > 1
 */
function aspectRatio(width: number, height: number): number {
    if (width === 0 || height === 0) return Infinity;
    return Math.max(width / height, height / width);
}

/**
 * Calculate the worst aspect ratio for a row of items laid out in a given area.
 * This is the key metric the algorithm tries to minimize.
 */
function worstAspectRatio(
    row: TreemapItem[],
    rowTotal: number,
    areaWidth: number,
    areaHeight: number,
    totalValue: number
): number {
    if (row.length === 0 || totalValue === 0) return Infinity;

    // The row will be laid out along the shorter side
    const isHorizontal = areaWidth >= areaHeight;
    const sideLength = isHorizontal ? areaHeight : areaWidth;

    // Row takes up a portion of the area proportional to its value
    const rowFraction = rowTotal / totalValue;
    const rowThickness = isHorizontal
        ? areaWidth * rowFraction
        : areaHeight * rowFraction;

    let worst = 0;
    for (const item of row) {
        const itemFraction = item.value / rowTotal;
        const itemLength = sideLength * itemFraction;
        const ar = aspectRatio(rowThickness, itemLength);
        worst = Math.max(worst, ar);
    }

    return worst;
}

/**
 * Squarify algorithm - recursively lay out items to minimize aspect ratios.
 *
 * @param items - Items to lay out, sorted by value descending
 * @param x - Starting x position (0-100)
 * @param y - Starting y position (0-100)
 * @param width - Available width (0-100)
 * @param height - Available height (0-100)
 * @param results - Accumulator for results
 */
function squarify(
    items: TreemapItem[],
    x: number,
    y: number,
    width: number,
    height: number,
    results: TreemapRect[]
): void {
    if (items.length === 0 || width <= 0 || height <= 0) return;

    // If only one item, it takes the entire area
    if (items.length === 1) {
        results.push({
            id: items[0].id,
            x,
            y,
            width,
            height,
            value: items[0].value,
            originalItem: items[0]
        });
        return;
    }

    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    if (totalValue === 0) return;

    // Build a row greedily, adding items while the aspect ratio improves
    const row: TreemapItem[] = [];
    let rowTotal = 0;
    const remaining = [...items];

    // Add the first item to start the row
    const firstItem = remaining.shift()!;
    row.push(firstItem);
    rowTotal = firstItem.value;

    let currentWorst = worstAspectRatio(row, rowTotal, width, height, totalValue);

    // Keep adding items while aspect ratio improves
    while (remaining.length > 0) {
        const nextItem = remaining[0];
        const newRowTotal = rowTotal + nextItem.value;
        const newRow = [...row, nextItem];
        const newWorst = worstAspectRatio(newRow, newRowTotal, width, height, totalValue);

        // If adding the next item makes the aspect ratio worse, stop
        if (newWorst > currentWorst) {
            break;
        }

        // Otherwise, add it to the row
        row.push(remaining.shift()!);
        rowTotal = newRowTotal;
        currentWorst = newWorst;
    }

    // Layout the row
    const isHorizontal = width >= height;
    const rowFraction = rowTotal / totalValue;

    if (isHorizontal) {
        // Row is vertical strip on the left
        const rowWidth = width * rowFraction;
        let currentY = y;

        for (const item of row) {
            const itemFraction = item.value / rowTotal;
            const itemHeight = height * itemFraction;

            results.push({
                id: item.id,
                x,
                y: currentY,
                width: rowWidth,
                height: itemHeight,
                value: item.value,
                originalItem: item
            });

            currentY += itemHeight;
        }

        // Recurse on remaining area
        squarify(remaining, x + rowWidth, y, width - rowWidth, height, results);
    } else {
        // Row is horizontal strip on top
        const rowHeight = height * rowFraction;
        let currentX = x;

        for (const item of row) {
            const itemFraction = item.value / rowTotal;
            const itemWidth = width * itemFraction;

            results.push({
                id: item.id,
                x: currentX,
                y,
                width: itemWidth,
                height: rowHeight,
                value: item.value,
                originalItem: item
            });

            currentX += itemWidth;
        }

        // Recurse on remaining area
        squarify(remaining, x, y + rowHeight, width, height - rowHeight, results);
    }
}

/**
 * Calculate a squarified treemap layout for the given items.
 *
 * @param items - Array of items with id and value properties
 * @param containerWidth - Container width (default 100 for percentage-based)
 * @param containerHeight - Container height (default 100 for percentage-based)
 * @returns Array of rectangles with position and size in percentage units
 *
 * @example
 * const items = [
 *   { id: 'A', value: 30, name: 'Category A', color: '#ff0000' },
 *   { id: 'B', value: 26, name: 'Category B', color: '#00ff00' },
 *   { id: 'C', value: 21, name: 'Category C', color: '#0000ff' },
 * ];
 * const layout = calculateTreemapLayout(items);
 * // Returns: [{ id: 'A', x: 0, y: 0, width: 38.9, height: 100, ... }, ...]
 */
export function calculateTreemapLayout(
    items: TreemapItem[],
    containerWidth: number = 100,
    containerHeight: number = 100
): TreemapRect[] {
    if (items.length === 0) return [];

    // Filter out zero/negative values and sort by value descending
    const validItems = items
        .filter(item => item.value > 0)
        .sort(byNumberDesc('value'));

    if (validItems.length === 0) return [];

    const results: TreemapRect[] = [];
    squarify(validItems, 0, 0, containerWidth, containerHeight, results);

    return results;
}

/**
 * Utility to convert CategoryData to TreemapItem format
 */
export function categoryDataToTreemapItems<T extends { name: string; value: number }>(
    categories: T[]
): (TreemapItem & T)[] {
    return categories.map(cat => ({
        ...cat,
        id: cat.name,
    }));
}
