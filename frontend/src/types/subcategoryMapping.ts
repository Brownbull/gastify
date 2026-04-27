import { Timestamp } from 'firebase/firestore';

/**
 * SubcategoryMapping represents a user's learned subcategory preference for items.
 * Stored in: artifacts/{appId}/users/{userId}/subcategory_mappings/{mappingId}
 */
export interface SubcategoryMapping {
    /** Firestore document ID (optional when creating) */
    id?: string;
    /** Original item name from receipt (e.g., "LECHE ENTERA") */
    originalItem: string;
    /** Lowercase, trimmed for fuzzy matching (e.g., "leche entera") */
    normalizedItem: string;
    /** The subcategory to apply to matching items (e.g., "Dairy") */
    targetSubcategory: string;
    /** 1.0 for user-set, 0.0-1.0 for AI suggestions */
    confidence: number;
    /** Source of this mapping */
    source: 'user' | 'ai';
    /** When the mapping was created */
    createdAt: Timestamp;
    /** When the mapping was last updated */
    updatedAt: Timestamp;
    /** Number of times this mapping has been auto-applied */
    usageCount: number;
}

/**
 * Data required to create a new subcategory mapping
 */
export type NewSubcategoryMapping = Omit<SubcategoryMapping, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Result from fuzzy matching
 */
export interface SubcategoryMatchResult {
    /** The matched mapping */
    mapping: SubcategoryMapping;
    /** Fuse.js score (0 = perfect match, 1 = no match) */
    score: number;
    /** Combined confidence score */
    confidence: number;
}
