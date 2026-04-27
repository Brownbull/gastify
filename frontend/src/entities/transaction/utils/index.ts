/**
 * Transaction Entity Utilities
 *
 * Re-exports transaction-related utility functions to provide a clean public API.
 *
 * Story 14e-19: Transaction Entity Foundation
 *
 * Public API utilities:
 * - normalizeTransaction: Fill missing fields with defaults
 * - normalizeTransactions: Batch normalization
 * - DEFAULT_TIME: Sentinel value for missing time
 *
 * Internal utilities (not exported here):
 * - sanitizeTransactions (src/repositories/utils.ts — shared by subscription hooks)
 * - sortByDateDesc (internal to useTransactions hook)
 */

export {
    // Functions - Display normalization (time, city, country from user settings)
    normalizeTransaction,
    normalizeTransactions,
    // Constants
    DEFAULT_TIME,
    // Types
    type UserDefaults,
} from '../../../utils/transactionNormalizer';

// Story 14d-v2-1-2b: Epic 14d-v2 field defaults (periods, updatedAt, etc.)
export {
    ensureTransactionDefaults,
    ensureTransactionsDefaults,
} from '../../../utils/transactionUtils';

// Story 14e-41: Transaction reconciliation utility
export { reconcileItemsTotal, type ReconcileResult } from './reconciliation';

// Story 18-8: Item price derivation (unitPrice ↔ totalPrice)
export {
    deriveItemPrices,
    deriveItemsPrices,
    validateItemPriceConsistency,
    PRICE_TOLERANCE,
} from './itemPriceDerivation';

// Story TD-18-14: Quantity display and input utilities (decimal support)
export {
    formatQty,
    shouldShowQty,
    sanitizeQtyInput,
    clampQtyOnBlur,
} from './qtyUtils';
