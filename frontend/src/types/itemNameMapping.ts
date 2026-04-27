import { Timestamp } from 'firebase/firestore'
import type { ItemCategory } from '../../shared/schema/categories'

/**
 * ItemNameMapping represents a user's learned item name preference per merchant.
 * Stored in: artifacts/{appId}/users/{userId}/item_name_mappings/{mappingId}
 *
 * Flow:
 * - normalizedMerchant = which store this mapping applies to (scoped per-store)
 * - originalItemName = raw AI-detected item name from receipt
 * - targetItemName = user's preferred display name
 * - targetCategory = user's preferred category for this item at this store (optional)
 *
 * When user edits item name, we save: normalizedMerchant + originalItemName -> targetItemName
 * On next scan at same merchant, we match item name and auto-fill the learned name.
 *
 * v9.7.0: Per-Store Item Name Learning feature
 */
export interface ItemNameMapping {
    /** Firestore document ID (optional when creating) */
    id?: string
    /** Normalized merchant name (scope key - which store this applies to) */
    normalizedMerchant: string
    /** Original item name from AI (used as match key) */
    originalItemName: string
    /** Normalized item name for fuzzy matching (e.g., "prod lacteo 1l") */
    normalizedItemName: string
    /** User's preferred item name (the value we auto-fill on match) */
    targetItemName: string
    /** User's preferred category for this item at this store (optional, v9.7.0+) */
    targetCategory?: ItemCategory
    /** 1.0 for user-set mappings */
    confidence: number
    /** Source of this mapping - always 'user' for MVP */
    source: 'user'
    /** Number of times this mapping has been auto-applied */
    usageCount: number
    /** When the mapping was created */
    createdAt: Timestamp
    /** When the mapping was last updated */
    updatedAt: Timestamp
}

/**
 * Data required to create a new item name mapping
 */
export type NewItemNameMapping = Omit<ItemNameMapping, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Result from fuzzy matching an item name
 */
export interface ItemNameMatchResult {
    /** The matched mapping */
    mapping: ItemNameMapping
    /** Fuse.js score (0 = perfect match, 1 = no match) */
    score: number
    /** Combined confidence score */
    confidence: number
}
