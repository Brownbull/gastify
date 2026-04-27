/**
 * Merchant Matcher Service
 *
 * Fuzzy matching engine for merchant names using fuse.js.
 * Matches receipt merchant names against learned merchant preferences.
 *
 * @module merchantMatcherService
 * @see Story 9.5: Merchant Fuzzy Matching
 * @see ADR-2: Configurable Fuzzy Threshold
 * @see ADR-3: Minimum Normalized Length Guard
 */

import Fuse, { IFuseOptions } from 'fuse.js'
import type { MerchantMapping, MerchantMatchResult } from '../types/merchantMapping'
import { normalizeMerchantName } from './merchantMappingService'

/**
 * Default threshold for merchant fuzzy matching.
 * 0.3 is stricter than category matching (0.6) because merchant names
 * should match more precisely.
 * - 0 = exact match required
 * - 1 = matches anything
 */
export const DEFAULT_THRESHOLD = 0.3

/**
 * Minimum normalized name length to prevent short string false matches.
 * Names shorter than this are skipped to avoid matching "AB" to "ABC Store".
 */
export const MIN_NORMALIZED_LENGTH = 3

/**
 * Fuse.js configuration for merchant matching.
 * Only searches the normalizedMerchant field.
 */
const fuseOptions: IFuseOptions<MerchantMapping> = {
    includeScore: true,
    threshold: DEFAULT_THRESHOLD,
    ignoreLocation: true,
    keys: ['normalizedMerchant']
}

/**
 * Finds the best matching merchant mapping for a given merchant name.
 * Uses fuzzy matching to find similar merchants in the user's learned mappings.
 *
 * Returns null if:
 * - Merchant name is empty or too short (< 3 chars normalized)
 * - No mappings provided
 * - No match found within threshold
 * - Best match score exceeds threshold (too fuzzy)
 *
 * @param merchantName - The merchant name from AI extraction to match
 * @param mappings - Array of MerchantMapping objects to search against
 * @param threshold - Optional threshold override (default 0.3, lower = stricter)
 * @returns MerchantMatchResult with mapping, score, and confidence, or null if no match
 *
 * @example
 * const match = findMerchantMatch('SUPERMERC JUMBO 123', userMappings);
 * if (match && match.confidence > 0.7) {
 *   transaction.merchant = match.mapping.targetMerchant;
 *   transaction.merchantSource = 'learned';
 * }
 */
export function findMerchantMatch(
    merchantName: string,
    mappings: MerchantMapping[],
    threshold: number = DEFAULT_THRESHOLD
): MerchantMatchResult | null {
    // Guard: empty input
    if (!merchantName) {
        return null
    }

    const normalized = normalizeMerchantName(merchantName)

    // Guard: minimum length to prevent short string false matches (ADR-3)
    if (normalized.length < MIN_NORMALIZED_LENGTH) {
        return null
    }

    // Guard: no mappings to search
    if (!mappings || mappings.length === 0) {
        return null
    }

    // Create Fuse instance with configurable threshold (ADR-2)
    const fuse = new Fuse(mappings, { ...fuseOptions, threshold })
    const results = fuse.search(normalized)

    // No results found
    if (results.length === 0) {
        return null
    }

    const best = results[0]

    // Fuse.js score: 0 = perfect match, 1 = no match
    // Reject matches that are too fuzzy (score > threshold)
    const score = best.score ?? 1
    if (score > threshold) {
        return null
    }

    // Calculate combined confidence:
    // mapping.confidence (user certainty) * (1 - score) (match quality)
    const confidence = best.item.confidence * (1 - score)

    return {
        mapping: best.item,
        score,
        confidence
    }
}

/**
 * Creates a Fuse.js matcher instance from merchant mappings.
 * The matcher can be reused for multiple searches to avoid re-initialization.
 *
 * @param mappings - Array of MerchantMapping objects to search against
 * @param threshold - Optional threshold override
 * @returns Fuse instance configured for merchant matching
 *
 * @example
 * const matcher = createMerchantMatcher(userMappings);
 * // Use for multiple searches...
 */
export function createMerchantMatcher(
    mappings: MerchantMapping[],
    threshold: number = DEFAULT_THRESHOLD
): Fuse<MerchantMapping> {
    return new Fuse(mappings, { ...fuseOptions, threshold })
}

/**
 * Finds a match using an existing Fuse matcher instance.
 * More efficient when performing multiple searches on the same mappings.
 *
 * @param matcher - Fuse.js instance created by createMerchantMatcher()
 * @param merchantName - The merchant name to search for
 * @param threshold - Threshold for score filtering (matches above rejected)
 * @returns MerchantMatchResult or null if no match
 */
export function findMerchantMatchWithMatcher(
    matcher: Fuse<MerchantMapping>,
    merchantName: string,
    threshold: number = DEFAULT_THRESHOLD
): MerchantMatchResult | null {
    // Guard: empty input
    if (!merchantName) {
        return null
    }

    const normalized = normalizeMerchantName(merchantName)

    // Guard: minimum length (ADR-3)
    if (normalized.length < MIN_NORMALIZED_LENGTH) {
        return null
    }

    const results = matcher.search(normalized)

    if (results.length === 0) {
        return null
    }

    const best = results[0]
    const score = best.score ?? 1

    if (score > threshold) {
        return null
    }

    const confidence = best.item.confidence * (1 - score)

    return {
        mapping: best.item,
        score,
        confidence
    }
}
