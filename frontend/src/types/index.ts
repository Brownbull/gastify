/**
 * Types Barrel Export
 *
 * Central export point for TypeScript types used in the application.
 * Import types from this file for convenience:
 *
 * @example
 * ```typescript
 * import type { Transaction } from '@/types';
 * ```
 */

// ============================================================================
// Transaction types
// ============================================================================
export type {
    Transaction,
    TransactionItem,
    TransactionPeriods,
} from './transaction';

export type {
    CategorySource,
    MerchantSource,
} from '../../shared/schema/categories';

export {
    hasTransactionImages,
    hasTransactionThumbnail,
} from './transaction';
