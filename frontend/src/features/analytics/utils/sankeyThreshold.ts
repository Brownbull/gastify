/**
 * Sankey Threshold — Threshold filtering and expansion state for Sankey diagrams
 * Story 15b-2f: Extracted from sankeyDataBuilder.ts (pure decomposition)
 */

import { byNumberDesc } from '@/utils/comparators';

// ============================================================================
// TYPES
// ============================================================================

export interface SankeyExpansionState {
    /** Number of categories to show at each level (beyond 10% threshold) */
    level1: number;
    level2: number;
    level3: number;
    level4: number;
}

/** @internal */
export interface CategoryAggregate {
    name: string;
    value: number;
    count: number;
    percent: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum percentage threshold to show a category (10%) */
export const THRESHOLD_PERCENT = 10;

/** Minimum categories to always show (top N + one below threshold) */
export const MIN_VISIBLE_CATEGORIES = 2;

/** Default expansion state - show only threshold-qualified categories */
export const DEFAULT_EXPANSION: Readonly<SankeyExpansionState> = {
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
} as const;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Applies 10% threshold filtering and creates "Más" aggregation.
 *
 * Rules:
 * 1. Show all categories with >= 10% of total
 * 2. Show one additional category with highest % below 10%
 * 3. Aggregate remaining into "Más" group
 * 4. Expansion state can reveal more hidden categories
 *
 * @param categories - Aggregated categories with values
 * @param total - Total value for percentage calculation
 * @param expansionCount - Number of additional categories to reveal beyond threshold
 * @returns Filtered categories with optional "Más" node
 */
export function applyThreshold(
    categories: CategoryAggregate[],
    total: number,
    expansionCount: number
): { visible: CategoryAggregate[]; hidden: CategoryAggregate[]; masNode: CategoryAggregate | null } {
    if (categories.length === 0 || total === 0) {
        return { visible: [], hidden: [], masNode: null };
    }

    // Sort by value descending
    const sorted = [...categories].sort(byNumberDesc('value'));

    // Calculate percentages — return NEW objects, never mutate inputs
    const sortedWithPercent = sorted.map(cat => ({
        ...cat,
        percent: (cat.value / total) * 100,
    }));

    // Find categories above threshold
    const aboveThreshold = sortedWithPercent.filter(cat => cat.percent >= THRESHOLD_PERCENT);

    // Find categories below threshold
    const belowThreshold = sortedWithPercent.filter(cat => cat.percent < THRESHOLD_PERCENT);

    // Determine how many below-threshold to show
    // Always show at least one below threshold (if exists) + expansion count
    const belowToShow = Math.min(
        1 + expansionCount,
        belowThreshold.length
    );

    // Ensure we have at least MIN_VISIBLE_CATEGORIES total
    const minAdditional = Math.max(0, MIN_VISIBLE_CATEGORIES - aboveThreshold.length);
    const actualBelowToShow = Math.max(belowToShow, minAdditional);

    const visibleBelow = belowThreshold.slice(0, actualBelowToShow);
    const hidden = belowThreshold.slice(actualBelowToShow);

    const visible = [...aboveThreshold, ...visibleBelow];

    // Create "Más" node if there are hidden categories
    let masNode: CategoryAggregate | null = null;
    if (hidden.length > 0) {
        const masValue = hidden.reduce((sum, cat) => sum + cat.value, 0);
        const masCount = hidden.reduce((sum, cat) => sum + cat.count, 0);
        masNode = {
            name: 'Más',
            value: masValue,
            count: masCount,
            percent: (masValue / total) * 100,
        };
    }

    return { visible, hidden, masNode };
}

/**
 * Gets the default expansion state.
 */
export function getDefaultExpansion(): SankeyExpansionState {
    return { ...DEFAULT_EXPANSION };
}
