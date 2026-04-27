/**
 * Category Matcher Utilities
 *
 * Fuzzy matching engine for category mappings using fuse.js.
 * Matches receipt items against learned category preferences.
 *
 * @module categoryMatcher
 * @see Story 6.2: Fuzzy Matching Engine
 * @see ADR-013: Client-Side Fuzzy Matching Strategy
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import type { CategoryMapping, MatchResult } from '../types/categoryMapping';
import type { Transaction } from '../types/transaction';

/**
 * Fuse.js configuration for category matching.
 * Threshold of 0.3 provides a balance between strict and fuzzy matching.
 * - 0 = exact match required
 * - 1 = matches anything
 *
 * Keys are weighted:
 * - normalizedItem (70%): Primary match on item name
 * - merchantPattern (30%): Secondary match on merchant patterns
 */
const fuseOptions: IFuseOptions<CategoryMapping> = {
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
    keys: [
        { name: 'normalizedItem', weight: 0.7 },
        { name: 'merchantPattern', weight: 0.3 },
    ],
};

/**
 * Normalizes an item name for fuzzy matching.
 * Converts to lowercase, trims whitespace, removes special characters,
 * and collapses multiple spaces.
 *
 * @param name - The item name to normalize
 * @returns Normalized item name suitable for fuzzy matching
 *
 * @example
 * normalizeItemName('UBER EATS') // Returns 'uber eats'
 * normalizeItemName('  Café 50%  ') // Returns 'caf 50'
 * normalizeItemName('Uber-Eats!') // Returns 'ubereats'
 */
export function normalizeItemName(name: string): string {
    if (!name) return '';

    return name
        .toLowerCase()
        .trim()
        // Remove special characters (keep alphanumeric and spaces)
        .replace(/[^a-z0-9\s]/gi, '')
        // Collapse multiple spaces into single space
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Creates a Fuse.js matcher instance from category mappings.
 * The matcher can be reused for multiple searches to avoid re-initialization.
 *
 * @param mappings - Array of CategoryMapping objects to search against
 * @returns Fuse instance configured for category matching
 *
 * @example
 * const matcher = createMatcher(userMappings);
 * const result = findCategoryMatch(matcher, 'UBER EATS');
 */
export function createMatcher(mappings: CategoryMapping[]): Fuse<CategoryMapping> {
    return new Fuse(mappings, fuseOptions);
}

/**
 * Finds the best matching category for an item name.
 * Uses fuzzy matching to find similar items in the user's learned mappings.
 *
 * Returns null if:
 * - No mappings match the search term
 * - Best match score exceeds threshold (too fuzzy)
 *
 * @param matcher - Fuse.js instance created by createMatcher()
 * @param itemName - The item name to search for (will be normalized)
 * @param _merchant - Optional merchant name for additional context (reserved for future use)
 * @returns MatchResult with mapping, score, and confidence, or null if no match
 *
 * @example
 * const match = findCategoryMatch(matcher, 'UBER EATS');
 * if (match && match.confidence > 0.7) {
 *   // Apply the matched category
 *   transaction.category = match.mapping.targetCategory;
 * }
 */
export function findCategoryMatch(
    matcher: Fuse<CategoryMapping>,
    itemName: string,
    _merchant?: string
): MatchResult | null {
    if (!itemName) return null;

    const normalizedName = normalizeItemName(itemName);
    if (!normalizedName) return null;

    const results = matcher.search(normalizedName);

    if (results.length === 0) return null;

    const best = results[0];

    // Fuse.js score: 0 = perfect match, 1 = no match
    // Reject matches that are too fuzzy (score > threshold)
    const score = best.score ?? 1;
    if (score > 0.3) return null;

    // Calculate combined confidence:
    // mapping.confidence (user certainty) * (1 - score) (match quality)
    const confidence = best.item.confidence * (1 - score);

    return {
        mapping: best.item,
        score,
        confidence,
    };
}

/**
 * Confidence threshold for automatically applying category mappings.
 * Mappings with confidence below this threshold are not applied.
 */
export const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Result of applying category mappings to a transaction.
 * Includes the modified transaction and list of mappings that were applied.
 */
export interface ApplyMappingsResult {
    /** Transaction with learned categories applied */
    transaction: Transaction;
    /** Array of mapping IDs that were applied (for usage tracking) */
    appliedMappingIds: string[];
}

/**
 * Applies learned category mappings to a transaction.
 * Checks the merchant name for store-level category and each item for item-level categories.
 *
 * Returns a new transaction object with categories applied (does not mutate original),
 * along with a list of mapping IDs that were applied for usage tracking.
 *
 * @param transaction - The transaction to apply mappings to
 * @param mappings - Array of CategoryMapping objects
 * @returns Object with new transaction and array of applied mapping IDs
 *
 * @example
 * const scannedTransaction = await scanReceipt(image);
 * const { transaction, appliedMappingIds } = applyCategoryMappings(scannedTransaction, userMappings);
 * // Increment usage for applied mappings
 * appliedMappingIds.forEach(id => incrementMappingUsage(db, userId, appId, id));
 */
export function applyCategoryMappings(
    transaction: Transaction,
    mappings: CategoryMapping[]
): ApplyMappingsResult {
    const appliedMappingIds: string[] = [];

    if (!mappings || mappings.length === 0) {
        return { transaction, appliedMappingIds };
    }

    const matcher = createMatcher(mappings);

    // Create a shallow copy to avoid mutating the original
    let result: Transaction = { ...transaction };

    // Check store category first (from merchant name)
    const merchantMatch = findCategoryMatch(matcher, transaction.merchant);
    if (merchantMatch && merchantMatch.confidence > AUTO_APPLY_CONFIDENCE_THRESHOLD) {
        result = {
            ...result,
            category: merchantMatch.mapping.targetCategory,
        };
        // Track the applied mapping (if it has an ID)
        if (merchantMatch.mapping.id) {
            appliedMappingIds.push(merchantMatch.mapping.id);
        }
    }

    // Then check individual items (for item-level category)
    if (transaction.items && transaction.items.length > 0) {
        result = {
            ...result,
            items: transaction.items.map((item) => {
                const itemMatch = findCategoryMatch(matcher, item.name);
                if (itemMatch && itemMatch.confidence > AUTO_APPLY_CONFIDENCE_THRESHOLD) {
                    // Track the applied mapping (if it has an ID and not already tracked)
                    if (itemMatch.mapping.id && !appliedMappingIds.includes(itemMatch.mapping.id)) {
                        appliedMappingIds.push(itemMatch.mapping.id);
                    }
                    // Only mark as 'learned' if the category actually changed
                    const newCategory = itemMatch.mapping.targetCategory;
                    const originalCategory = item.category;
                    return {
                        ...item,
                        category: newCategory,
                        // Mark as 'learned' only if category is different from original
                        categorySource: newCategory !== originalCategory ? 'learned' as const : item.categorySource,
                    };
                }
                return item;
            }),
        };
    }

    return { transaction: result, appliedMappingIds };
}
