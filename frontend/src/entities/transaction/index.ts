/**
 * Transaction Entity Module
 *
 * Public API for transaction-related types, hooks, and utilities.
 * Story 14e-19: Transaction Entity Foundation
 *
 * Transaction is a domain object (entity) used by multiple features:
 * - scan feature: creates transactions
 * - batch-review feature: creates transactions
 * - categories feature: categorizes transactions
 * - analytics feature: aggregates transactions
 * - history feature: displays transactions
 *
 * Per Feature-Sliced Design (FSD), placing it in entities/ prevents
 * circular dependencies and clarifies that Transaction is shared data,
 * not a business capability.
 *
 * @example
 * ```tsx
 * import {
 *   Transaction,
 *   TransactionItem,
 *   useTransactions,
 *   normalizeTransaction,
 * } from '@entities/transaction';
 * ```
 */

// ============================================================================
// Types - Re-exported from src/types/transaction.ts
// ============================================================================
export {
    // Types
    type CategorySource,
    type MerchantSource,
    type Transaction,
    type TransactionItem,
    // Type guards
    hasTransactionImages,
    hasTransactionThumbnail,
} from './types';

// Re-export category types
export type { StoreCategory, ItemCategory } from './types';

// ============================================================================
// Hooks - Re-exported from src/hooks/
// ============================================================================
export {
    useTransactions,
    usePaginatedTransactions,
    useActiveTransaction,
    useAnalyticsTransactions,
} from './hooks';

// ============================================================================
// Utilities - Re-exported from src/utils/
// ============================================================================
export {
    // Display normalization (time, city, country from user settings)
    normalizeTransaction,
    normalizeTransactions,
    DEFAULT_TIME,
    type UserDefaults,
    // Story 14d-v2-1-2b: Epic 14d-v2 field defaults
    ensureTransactionDefaults,
    ensureTransactionsDefaults,
    // Story 14e-41: Reconciliation utility
    reconcileItemsTotal,
    type ReconcileResult,
} from './utils';
