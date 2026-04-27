/**
 * Item Duplicate Detection Service
 * Story 14.31: Items History View - Session 2
 *
 * Detects potential duplicate items within the same store based on:
 * - Same merchant (store)
 * - Similar item names (fuzzy matching)
 *
 * Examples of duplicates:
 * - "LECHE ENTERA 1L" vs "Leche Entera 1L" (same store)
 * - "ARROZ INTEGRAL 1KG" vs "ARROZ INTEGRAL 1 KG" (same store)
 *
 * Uses Fuse.js for fuzzy string matching with configurable threshold.
 */

import Fuse from 'fuse.js';
import type { FlattenedItem } from '@/types/item';
import { filterAndGroupDuplicates } from '@/utils/duplicateGrouping';

/**
 * Threshold for fuzzy matching (0 = exact match, 1 = match anything).
 * 0.15 is very strict - only catches case differences and obvious typos.
 * Lower = stricter, fewer false positives.
 */
export const ITEM_SIMILARITY_THRESHOLD = 0.15;

/**
 * Minimum name length to consider for duplicate detection.
 * Very short names (1-2 chars) are too likely to be false positives.
 */
export const MIN_NAME_LENGTH = 3;

/**
 * Result of duplicate detection for a single item
 */
export interface ItemDuplicateResult {
    /** The item ID being checked */
    itemId: string;
    /** IDs of items that are potential duplicates of this one */
    duplicateIds: string[];
    /** Whether this item has potential duplicates */
    hasDuplicates: boolean;
}

/**
 * Group of potential duplicate items
 */
export interface ItemDuplicateGroup {
    /** Representative item name (first encountered) */
    representativeName: string;
    /** Merchant name where duplicates were found */
    merchantName: string;
    /** All item IDs in this duplicate group */
    itemIds: string[];
}

/**
 * Normalize an item name for comparison.
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces to single space
 * - Remove special characters that don't affect meaning
 *
 * @param name - Item name to normalize
 * @returns Normalized name for comparison
 */
export function normalizeForDuplicateDetection(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')       // Collapse multiple spaces
        .replace(/[.,;:!?()[\]{}]/g, '') // Remove punctuation
        .replace(/\s*-\s*/g, ' ');  // Replace hyphens with space
}

/**
 * Extract all numbers from a string.
 * Used to compare product sizes/quantities.
 *
 * @param name - Item name
 * @returns Array of numbers found in the name
 */
export function extractNumbers(name: string): number[] {
    const matches = name.match(/\d+/g);
    return matches ? matches.map(Number) : [];
}

/**
 * Check if two items have the same numbers (sizes/quantities).
 * If numbers differ, they're likely different products (e.g., 700cc vs 750cc).
 *
 * @param name1 - First item name
 * @param name2 - Second item name
 * @returns true if numbers are the same or both have no numbers
 */
export function haveSameNumbers(name1: string, name2: string): boolean {
    const nums1 = extractNumbers(name1);
    const nums2 = extractNumbers(name2);

    // If both have no numbers, consider them potentially same
    if (nums1.length === 0 && nums2.length === 0) return true;

    // If different number of numeric values, different products
    if (nums1.length !== nums2.length) return false;

    // Compare sorted numbers
    const sorted1 = [...nums1].sort((a, b) => a - b);
    const sorted2 = [...nums2].sort((a, b) => a - b);

    return sorted1.every((num, i) => num === sorted2[i]);
}

/**
 * Check if two normalized names are similar enough to be potential duplicates.
 * Uses case-insensitive comparison after normalization.
 *
 * This is a quick check before running full fuzzy matching.
 *
 * @param name1 - First normalized name
 * @param name2 - Second normalized name
 * @returns true if names are identical after normalization
 */
export function areNamesIdentical(name1: string, name2: string): boolean {
    return normalizeForDuplicateDetection(name1) === normalizeForDuplicateDetection(name2);
}

/**
 * Find potential duplicate items within each merchant.
 *
 * Algorithm:
 * 1. Group items by merchant (normalized)
 * 2. Within each merchant group, use Fuse.js to find similar names
 * 3. Items with similar names (but not identical raw names) are potential duplicates
 *
 * @param items - Array of flattened items to check
 * @returns Map of item ID to array of potential duplicate IDs
 */
export function findItemDuplicates(
    items: FlattenedItem[]
): Map<string, string[]> {
    const duplicateMap = new Map<string, string[]>();

    // Skip if not enough items to have duplicates
    if (items.length < 2) {
        return duplicateMap;
    }

    // Group items by normalized merchant name
    const merchantGroups = new Map<string, FlattenedItem[]>();

    for (const item of items) {
        // Skip items with very short names
        if (item.name.length < MIN_NAME_LENGTH) continue;

        const merchantKey = normalizeForDuplicateDetection(item.merchantName || 'unknown');
        const existing = merchantGroups.get(merchantKey) || [];
        existing.push(item);
        merchantGroups.set(merchantKey, existing);
    }

    // Within each merchant group, find similar names
    for (const [, merchantItems] of merchantGroups) {
        // Skip merchants with only one item
        if (merchantItems.length < 2) continue;

        // Create a map of normalized name -> items
        const nameToItems = new Map<string, FlattenedItem[]>();
        for (const item of merchantItems) {
            const normalizedName = normalizeForDuplicateDetection(item.name);
            const existing = nameToItems.get(normalizedName) || [];
            existing.push(item);
            nameToItems.set(normalizedName, existing);
        }

        // Find groups where normalized names match but original names differ
        for (const [, itemsWithSameName] of nameToItems) {
            if (itemsWithSameName.length < 2) continue;

            // Check if any have different original names (case differences, etc.)
            const uniqueOriginalNames = new Set(itemsWithSameName.map(i => i.name));

            // If there are different original names that normalize to the same thing
            if (uniqueOriginalNames.size > 1) {
                // These are potential duplicates - but verify numbers match
                for (const item of itemsWithSameName) {
                    const duplicateIds = itemsWithSameName
                        .filter(other => {
                            if (other.id === item.id) return false;
                            // Only flag as duplicate if numbers (sizes/quantities) are the same
                            return haveSameNumbers(item.name, other.name);
                        })
                        .map(other => other.id);

                    if (duplicateIds.length > 0) {
                        duplicateMap.set(item.id, duplicateIds);
                    }
                }
            }
        }

        // Also use Fuse.js for fuzzy matching on names that are similar but not identical
        // when normalized (catches typos like "ARROZ INTEGRAL 1KG" vs "ARROZ INTEGRAL 1 KG")
        const fuseItems = merchantItems.map(item => ({
            id: item.id,
            name: item.name,
            normalizedName: normalizeForDuplicateDetection(item.name),
        }));

        const fuse = new Fuse(fuseItems, {
            keys: ['normalizedName'],
            threshold: ITEM_SIMILARITY_THRESHOLD,
            includeScore: true,
        });

        for (const item of fuseItems) {
            // Search for similar items
            const results = fuse.search(item.normalizedName);

            // Filter results: similar but not exact same normalized name, and not self
            const similarItems = results.filter(result => {
                if (!result.item || result.item.id === item.id) return false;
                // Include if similar but not identical
                const isSameNormalized = result.item.normalizedName === item.normalizedName;
                const hasScore = result.score !== undefined && result.score <= ITEM_SIMILARITY_THRESHOLD;
                // If normalized names are identical, we already handled above
                // Here we want near-matches that aren't exact after normalization
                if (isSameNormalized || !hasScore) return false;

                // Additional check: numbers (sizes/quantities) must match
                // "WHISKY 40 700CC" vs "WHISKY 40 750CC" are different products
                return haveSameNumbers(item.name, result.item.name);
            });

            if (similarItems.length > 0) {
                const existingDuplicates = duplicateMap.get(item.id) || [];
                const newDuplicateIds = similarItems.map(r => r.item.id);

                // Merge and deduplicate
                const allDuplicates = [...new Set([...existingDuplicates, ...newDuplicateIds])];
                duplicateMap.set(item.id, allDuplicates);
            }
        }
    }

    return duplicateMap;
}

/**
 * Get the set of item IDs that have potential duplicates.
 * Useful for quick lookup when rendering.
 *
 * @param items - Array of flattened items to check
 * @returns Set of item IDs that are potential duplicates
 */
export function getItemDuplicateIds(items: FlattenedItem[]): Set<string> {
    const duplicateMap = findItemDuplicates(items);
    return new Set(duplicateMap.keys());
}

/**
 * Get the count of items that have potential duplicates.
 *
 * @param items - Array of flattened items to check
 * @returns Count of items with potential duplicates
 */
export function getItemDuplicateCount(items: FlattenedItem[]): number {
    return getItemDuplicateIds(items).size;
}

/**
 * Filter items to show only those with potential duplicates.
 *
 * @param items - Array of flattened items
 * @returns Array of items that have potential duplicates
 */
export function filterToDuplicates(items: FlattenedItem[]): FlattenedItem[] {
    const duplicateIds = getItemDuplicateIds(items);
    return items.filter(item => duplicateIds.has(item.id));
}

/**
 * Filter and GROUP items by their duplicate relationships.
 * Returns items sorted so that duplicates appear next to each other.
 *
 * This makes it easy to compare duplicate items side-by-side.
 *
 * @param items - Array of flattened items
 * @returns Array of items with duplicates grouped together
 */
export function filterToDuplicatesGrouped(items: FlattenedItem[]): FlattenedItem[] {
    return filterAndGroupDuplicates(
        items,
        findItemDuplicates(items),
        item => item.id,
        // Sort groups by normalized name
        (a, b) => {
            const aName = normalizeForDuplicateDetection(a?.name || '');
            const bName = normalizeForDuplicateDetection(b?.name || '');
            return aName.localeCompare(bName);
        },
        // Sort within group by name
        (a, b) => a.name.localeCompare(b.name),
    );
}

/**
 * Check if there are any potential duplicates in the item list.
 *
 * @param items - Array of flattened items to check
 * @returns true if there are any potential duplicates
 */
export function hasPotentialDuplicates(items: FlattenedItem[]): boolean {
    return getItemDuplicateCount(items) > 0;
}
