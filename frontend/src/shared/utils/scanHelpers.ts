/**
 * Story 14e-28 Review Follow-up: Shared scan helper utilities
 *
 * Extracted from useTransactionEditorData.ts and useTransactionEditorViewProps.ts
 * to eliminate duplication.
 *
 * These utilities are used for:
 * - Deriving scan button UI state from scan phase
 * - Computing batch context for navigation display
 */

import type { ScanPhase } from '@shared/types/scanWorkflow';

// =============================================================================
// Types
// =============================================================================

/**
 * Scan button state for UI display.
 * Used by TransactionEditorView to show appropriate button state.
 */
export type ScanButtonState = 'idle' | 'pending' | 'scanning' | 'complete' | 'error';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Derives scanButtonState from scan phase.
 * Maps internal scan state machine phases to UI button states.
 *
 * @param phase - Current scan phase from state machine
 * @returns ScanButtonState for UI display
 *
 * @example
 * deriveScanButtonState('idle')      // → 'idle'
 * deriveScanButtonState('capturing') // → 'pending'
 * deriveScanButtonState('scanning')  // → 'scanning'
 * deriveScanButtonState('reviewing') // → 'complete'
 * deriveScanButtonState('saving')    // → 'scanning'
 * deriveScanButtonState('error')     // → 'error'
 */
export function deriveScanButtonState(phase: ScanPhase): ScanButtonState {
    switch (phase) {
        case 'idle': return 'idle';
        case 'capturing': return 'pending';
        case 'scanning': return 'scanning';
        case 'reviewing': return 'complete';
        case 'saving': return 'scanning';
        case 'error': return 'error';
        default: return 'idle';
    }
}

/**
 * Computes batch context from scan state or navigation list.
 * Used to show "2 de 5" navigation indicators in TransactionEditorView.
 *
 * Priority:
 * 1. Batch editing context (from ScanStore during batch scan review)
 * 2. Transaction navigation list (from ItemsView multi-transaction browsing)
 *
 * @param batchEditingIndex - Current index in batch editing mode (0-based, null if not in batch mode)
 * @param batchReceipts - Array of batch receipts for total count
 * @param transactionNavigationList - List of transaction IDs for list navigation
 * @param currentTransactionId - ID of currently displayed transaction
 * @returns Object with 1-based index and total, or null if no navigation context
 *
 * @example
 * // Batch editing mode (editing 2nd of 5 receipts)
 * computeBatchContext(1, [{id:'a'},{id:'b'},{id:'c'},{id:'d'},{id:'e'}], null, undefined)
 * // → { index: 2, total: 5 }
 *
 * // ItemsView navigation (viewing 3rd of 10 transactions)
 * computeBatchContext(null, null, ['tx1','tx2','tx3','tx4',...], 'tx3')
 * // → { index: 3, total: 10 }
 *
 * // No context
 * computeBatchContext(null, null, null, undefined)
 * // → null
 */
export function computeBatchContext(
    batchEditingIndex: number | null,
    batchReceipts: Array<{ id: string }> | null,
    transactionNavigationList: string[] | null,
    currentTransactionId: string | undefined
): { index: number; total: number } | null {
    // Priority 1: Batch editing from ScanStore
    if (batchEditingIndex !== null && batchReceipts) {
        return { index: batchEditingIndex + 1, total: batchReceipts.length };
    }

    // Priority 2: Transaction navigation list from ItemsView
    if (transactionNavigationList && currentTransactionId) {
        const index = transactionNavigationList.indexOf(currentTransactionId);
        if (index !== -1) {
            return { index: index + 1, total: transactionNavigationList.length };
        }
    }

    return null;
}
