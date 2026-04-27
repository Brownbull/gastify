/**
 * Transaction Types
 *
 * Category types are imported from the unified schema (single source of truth).
 * See: shared/schema/categories.ts
 *
 * DO NOT define StoreCategory or ItemCategory here - import from unified schema.
 */

// Import for use in this file
import type { StoreCategory, ItemCategory, CategorySource, MerchantSource } from '../../shared/schema/categories';
import type { Timestamp } from 'firebase/firestore';

/**
 * Pre-computed period identifiers for efficient temporal queries.
 * Computed from transaction date using ISO standards.
 *
 * Epic 14d-v2 Architecture Decision AD-5:
 * Pre-computing periods eliminates runtime date parsing and enables
 * efficient Firestore queries (e.g., `where('periods.month', '==', '2026-01')`)
 *
 * @example
 * ```typescript
 * const periods: TransactionPeriods = {
 *   day: '2026-01-22',     // YYYY-MM-DD
 *   week: '2026-W04',      // ISO week (Monday start)
 *   month: '2026-01',      // YYYY-MM
 *   quarter: '2026-Q1',    // YYYY-Qn
 *   year: '2026'           // YYYY
 * };
 * ```
 */
export interface TransactionPeriods {
    /** Day identifier: YYYY-MM-DD (e.g., "2026-01-22") */
    day: string;
    /** ISO week identifier: YYYY-Www (e.g., "2026-W04") - Monday as week start */
    week: string;
    /** Month identifier: YYYY-MM (e.g., "2026-01") */
    month: string;
    /** Quarter identifier: YYYY-Qn (e.g., "2026-Q1") */
    quarter: string;
    /** Year identifier: YYYY (e.g., "2026") */
    year: string;
}

// CategorySource and MerchantSource imported from unified schema above

export interface TransactionItem {
    name: string;
    qty?: number;
    /** Price per single unit. Derived from totalPrice/qty if not provided by AI. */
    unitPrice?: number;
    totalPrice: number;
    /**
     * Item category from AI extraction or user edit.
     * Uses ItemCategory type from unified schema.
     * Also accepts string for backward compatibility with existing data.
     */
    category?: ItemCategory | string;
    /** Optional subcategory for more specific classification (free-form text) */
    subcategory?: string;
    /** Source of the category assignment (scan, learned, or user) */
    categorySource?: CategorySource;
    /** Source of the subcategory assignment (scan, learned, or user) */
    subcategorySource?: CategorySource;
}

export interface Transaction {
    id?: string;
    date: string;
    merchant: string;
    alias?: string;
    category: StoreCategory;
    total: number;
    items: TransactionItem[];
    imageUrls?: string[];
    thumbnailUrl?: string;

    // Timestamp fields (Firestore Timestamp | Date | string for backward compatibility)
    /** When the transaction was first created */
    createdAt?: Timestamp | Date | string;
    /**
     * When the transaction was last updated (any change).
     * Epic 14d-v2 AD-8: Auto-populated on every save/update for changelog tracking.
     * Note: Accepts multiple types for backward compatibility; Firestore uses serverTimestamp().
     */
    updatedAt?: Timestamp | Date | string;

    // v2.6.0 prompt fields (all optional for backward compatibility)
    /** Purchase time in HH:mm format (e.g., "15:01") */
    time?: string;
    /** Country name from receipt (e.g., "United Kingdom") */
    country?: string;
    /** City name from receipt (e.g., "London") */
    city?: string;
    /** ISO 4217 currency code (e.g., "GBP", "CLP") */
    currency?: string;
    /** Document type: "receipt" | "invoice" | "ticket" */
    receiptType?: string;
    /** Version of prompt used for AI extraction (e.g., "2.6.0") */
    promptVersion?: string;

    // Source tracking for transparency
    /** Source of the merchant name (scan, learned, or user) */
    merchantSource?: MerchantSource;

    /**
     * Pre-computed period identifiers for efficient temporal queries.
     * Computed from date field on save/update.
     * Enables efficient Firestore queries without runtime date parsing.
     */
    periods?: TransactionPeriods;
}

/**
 * Type guard to check if a transaction has images
 */
export function hasTransactionImages(transaction: Transaction): boolean {
    return Boolean(transaction.imageUrls && transaction.imageUrls.length > 0)
}

/**
 * Type guard to check if a transaction has a thumbnail
 */
export function hasTransactionThumbnail(transaction: Transaction): boolean {
    return Boolean(transaction.thumbnailUrl)
}

