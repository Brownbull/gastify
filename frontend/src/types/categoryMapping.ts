import { Timestamp } from 'firebase/firestore';
import type { StoreCategory } from '../../shared/schema/categories';

/**
 * CategoryMapping represents a user's learned category preference.
 * Stored in: artifacts/{appId}/users/{userId}/category_mappings/{mappingId}
 */
export interface CategoryMapping {
    /** Firestore document ID (optional when creating) */
    id?: string;
    /** Original text from receipt (e.g., "UBER EATS") */
    originalItem: string;
    /** Lowercase, trimmed for fuzzy matching (e.g., "uber eats") */
    normalizedItem: string;
    /** The category to apply to matching items */
    targetCategory: StoreCategory;
    /** Optional merchant pattern for merchant-level rules (e.g., "uber*") */
    merchantPattern?: string;
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
 * Data required to create a new category mapping
 */
export type NewCategoryMapping = Omit<CategoryMapping, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Result from fuzzy matching
 */
export interface MatchResult {
    /** The matched mapping */
    mapping: CategoryMapping;
    /** Fuse.js score (0 = perfect match, 1 = no match) */
    score: number;
    /** Combined confidence score */
    confidence: number;
}
