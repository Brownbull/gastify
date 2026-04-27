/**
 * Story 14e-40: Scan Feature Utilities
 *
 * Utility functions extracted from App.tsx for reuse and testability.
 *
 * @module scan/utils
 */

export {
    hasActiveTransactionConflict,
    type ConflictResult,
    type ConflictingTransaction,
    type ConflictReason,
} from './conflictDetection';

export {
    validateTotal,
    calculateItemsSum,
    calculateDiscrepancy,
    needsTotalValidation,
    TOTAL_DISCREPANCY_THRESHOLD,
    type TotalValidationResult,
} from './totalValidation';
