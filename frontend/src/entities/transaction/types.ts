/**
 * Transaction Entity Types
 *
 * Re-exports from the canonical source at src/types/transaction.ts
 * to provide a clean public API through the entity module.
 *
 * Story 14e-19: Transaction Entity Foundation
 * Per Feature-Sliced Design (FSD), entities re-export from shared types.
 */

// Re-export all types and type guards from the canonical source
export {
    // Types
    type Transaction,
    type TransactionItem,
    // Type guards
    hasTransactionImages,
    hasTransactionThumbnail,
} from '../../types/transaction';

// Category types from unified schema (single source of truth)
export type {
    CategorySource,
    MerchantSource,
    StoreCategory,
    ItemCategory,
} from '../../../shared/schema/categories';
