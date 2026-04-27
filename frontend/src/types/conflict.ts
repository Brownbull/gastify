/**
 * Conflict Types — Shared across dialog, hook, and modal manager layers
 *
 * These types define the contract for transaction conflict detection and resolution.
 * Extracted from TransactionConflictDialog.tsx to fix layer violation:
 * hooks/app/ was importing upward from components/dialogs/.
 *
 * Story 15b-0d: Layer Violation Cleanup
 * Original definition: Story 14.24 (TransactionConflictDialog)
 */

/** Reason why a transaction conflict was detected */
export type ConflictReason = 'has_unsaved_changes' | 'scan_in_progress' | 'credit_used';

/** Details about the conflicting transaction */
export interface ConflictingTransaction {
  /** Merchant name if available */
  merchant?: string;
  /** Transaction total if available */
  total?: number;
  /** Currency code */
  currency?: string;
  /** Whether credit has been used for this scan */
  creditUsed: boolean;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Whether a scan is in progress */
  isScanning: boolean;
  /** Source of the transaction */
  source: 'new_scan' | 'manual_entry' | 'editing_existing';
}
