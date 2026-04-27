import { Timestamp } from 'firebase/firestore'
import type { StoreCategory } from '../../shared/schema/categories'

/**
 * MerchantMapping represents a user's learned merchant→alias preference.
 * Stored in: artifacts/{appId}/users/{userId}/merchant_mappings/{mappingId}
 *
 * Flow:
 * - merchant = raw name from receipt (e.g., "SUPERMERC JUMBO 123") - stays as-is
 * - alias = user's preferred display name (e.g., "Jumbo") - what we learn
 * - storeCategory = user's preferred category for this merchant (e.g., "Supermarket")
 *
 * When user edits alias, we save: originalMerchant → targetMerchant (which is the alias)
 * When user changes category, we save: originalMerchant → storeCategory
 * On next scan, we match merchant name and auto-fill both alias and category.
 *
 * Simplified model per ADR-1: No merchantPattern field, source always 'user' for MVP.
 */
export interface MerchantMapping {
    /** Firestore document ID (optional when creating) */
    id?: string
    /** Original merchant name from AI (used as the match key) */
    originalMerchant: string
    /** Normalized merchant name for fuzzy matching (e.g., "supermerc jumbo 123") */
    normalizedMerchant: string
    /** User's preferred alias (the value we auto-fill on match) */
    targetMerchant: string
    /** User's preferred store category for this merchant (optional, v9.6.1+) */
    storeCategory?: StoreCategory
    /** 1.0 for user-set mappings */
    confidence: number
    /** Source of this mapping - always 'user' for MVP */
    source: 'user'
    /** When the mapping was created */
    createdAt: Timestamp
    /** When the mapping was last updated */
    updatedAt: Timestamp
    /** Number of times this mapping has been auto-applied */
    usageCount: number
}

/**
 * Data required to create a new merchant mapping
 */
export type NewMerchantMapping = Omit<MerchantMapping, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Result from fuzzy matching a merchant name
 */
export interface MerchantMatchResult {
    /** The matched mapping */
    mapping: MerchantMapping
    /** Fuse.js score (0 = perfect match, 1 = no match) */
    score: number
    /** Combined confidence score */
    confidence: number
}
