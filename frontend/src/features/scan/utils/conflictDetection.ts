/**
 * Story 14e-40: Conflict Detection Utility
 *
 * Pure utility function that determines if navigating to a transaction would
 * conflict with an active scan state. Extracted from App.tsx to enable reuse
 * and improve testability.
 *
 * @module conflictDetection
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-40-extract-conflict-detection.md
 */

import type { ScanState } from '../types/scanStateMachine';
import type { View } from '@app/types';
import type {
    ConflictingTransaction,
    ConflictReason,
} from '@/components/dialogs/TransactionConflictDialog';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of conflict detection check.
 */
export interface ConflictResult {
    /** Whether there is a conflict with the current scan state */
    hasConflict: boolean;
    /** Details about the conflict if one exists */
    conflictInfo?: {
        /** The conflicting transaction details */
        transaction: ConflictingTransaction;
        /** Reason for the conflict */
        reason: ConflictReason;
    };
}

// Re-export types for consumers
export type { ConflictingTransaction, ConflictReason };

// =============================================================================
// Safe Default
// =============================================================================

/**
 * Safe default result returned on error (AC6: Error Boundary Protection).
 */
const SAFE_DEFAULT: ConflictResult = { hasConflict: false };

// =============================================================================
// Main Function
// =============================================================================

/**
 * Detects if navigating to a transaction would conflict with active scan state.
 *
 * This is a pure function with no side effects that checks the current scan
 * state to determine if:
 * 1. A scan is in progress (scanning phase)
 * 2. A scanned transaction is being reviewed (credit already used)
 * 3. There are unsaved images (capturing phase with images)
 *
 * Returns a safe default `{ hasConflict: false }` on any error to prevent
 * blocking user navigation (AC6: Error Boundary Protection).
 *
 * @param scanState - Current scan state from Zustand store
 * @param currentView - Current active view
 * @returns Conflict detection result with details if conflict exists
 *
 * @example
 * ```tsx
 * import { hasActiveTransactionConflict } from '@features/scan';
 *
 * const result = hasActiveTransactionConflict(scanState, view);
 * if (result.hasConflict) {
 *   // Handle conflict - auto-navigate or show dialog
 *   console.log('Conflict reason:', result.conflictInfo?.reason);
 * }
 * ```
 */
export function hasActiveTransactionConflict(
    scanState: ScanState,
    currentView: View
): ConflictResult {
    try {
        // AC6: Handle null/undefined input gracefully
        if (!scanState) {
            console.warn('[hasActiveTransactionConflict] Received null/undefined scanState');
            return SAFE_DEFAULT;
        }

        // Idle phase = no conflict
        if (scanState.phase === 'idle') {
            return { hasConflict: false };
        }

        // Already on transaction-editor = no conflict (editing same transaction)
        if (currentView === 'transaction-editor') {
            return { hasConflict: false };
        }

        // Safe access with defaults for arrays that might be missing
        const results = scanState.results || [];
        const images = scanState.images || [];

        const hasAnalyzedTransaction = results.length > 0;
        const hasImages = images.length > 0;
        const isScanning = scanState.phase === 'scanning';

        // Scanning in progress is a conflict
        if (isScanning) {
            const transaction = results[0];
            return {
                hasConflict: true,
                conflictInfo: {
                    transaction: {
                        merchant: transaction?.merchant,
                        total: transaction?.total,
                        currency: transaction?.currency,
                        creditUsed: true,
                        hasChanges: false,
                        isScanning: true,
                        source: 'new_scan',
                    },
                    reason: 'scan_in_progress',
                },
            };
        }

        // Analyzed transaction (credit was used) is a conflict
        if (hasAnalyzedTransaction && scanState.phase === 'reviewing') {
            const transaction = results[0];
            return {
                hasConflict: true,
                conflictInfo: {
                    transaction: {
                        merchant: transaction?.merchant,
                        total: transaction?.total,
                        currency: transaction?.currency,
                        creditUsed: true,
                        hasChanges: true,
                        isScanning: false,
                        source: 'new_scan',
                    },
                    reason: 'credit_used',
                },
            };
        }

        // If we have images but no analysis yet, that's unsaved content
        if (hasImages && !hasAnalyzedTransaction) {
            return {
                hasConflict: true,
                conflictInfo: {
                    transaction: {
                        creditUsed: false,
                        hasChanges: true,
                        isScanning: false,
                        source: 'new_scan',
                    },
                    reason: 'has_unsaved_changes',
                },
            };
        }

        // Error phase with images = unsaved content
        if (scanState.phase === 'error' && hasImages) {
            return {
                hasConflict: true,
                conflictInfo: {
                    transaction: {
                        creditUsed: false,
                        hasChanges: true,
                        isScanning: false,
                        source: 'new_scan',
                    },
                    reason: 'has_unsaved_changes',
                },
            };
        }

        // Saving phase indicates active transaction
        if (scanState.phase === 'saving') {
            const transaction = results[0];
            return {
                hasConflict: true,
                conflictInfo: {
                    transaction: {
                        merchant: transaction?.merchant,
                        total: transaction?.total,
                        currency: transaction?.currency,
                        creditUsed: true,
                        hasChanges: true,
                        isScanning: false,
                        source: 'new_scan',
                    },
                    reason: 'credit_used',
                },
            };
        }

        return { hasConflict: false };
    } catch (error) {
        // AC6: Log error and return safe default - never crash the app
        console.warn('[hasActiveTransactionConflict] Error during conflict detection:', error);
        return SAFE_DEFAULT;
    }
}
