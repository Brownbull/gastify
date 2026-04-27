/**
 * useActiveTransaction Hook
 *
 * Story 14.24: Persistent Transaction State & Single Active Transaction
 *
 * NOTE: This hook was designed as a consolidated state machine but is NOT YET INTEGRATED
 * into App.tsx. The current implementation uses:
 * - pendingScan state + pendingScanStorage.ts for persistence
 * - hasActiveTransactionConflict() in App.tsx for conflict detection
 * - useUserCredits hook for credit reserve/confirm/refund
 *
 * This hook remains as a FUTURE REFACTORING TARGET (Task 1.3) to consolidate
 * all transaction state into a single state machine. The current scattered state
 * approach works but this hook would provide cleaner architecture.
 *
 * Central state management for the "single active transaction" paradigm.
 * Only ONE transaction can be edited at a time (new scan, manual entry, or editing existing).
 *
 * Features:
 * - State machine for transaction lifecycle (idle → draft → scanning → complete → editing)
 * - Credit management with reserve/confirm/refund pattern
 * - Conflict detection when attempting to edit while another transaction is active
 * - State persistence across navigation
 * - Dirty tracking for unsaved changes warning
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.24-persistent-transaction-state.md
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  ActiveTransaction,
  CanStartEditingResult,
} from '@/types/scan';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import {
  createIdleActiveTransaction,
  createNewActiveTransaction,
  createEditingActiveTransaction,
  hasActiveTransactionContent,
  generateScanSessionId,
} from '@/types/scan';
import type { Transaction } from '@/types/transaction';
import type { StoreCategory } from '../../../../shared/schema/categories';

/**
 * Result type for credit operations
 */
export interface CreditOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Props for useActiveTransaction hook
 */
export interface UseActiveTransactionProps {
  /** Function to deduct credits (from useUserCredits) */
  deductCredits: (amount: number) => Promise<boolean>;
  /** Function to add credits back (for refund) */
  addCredits: (amount: number) => Promise<void>;
  /** Current credit balance for validation */
  creditsRemaining: number;
  /** Default currency for new transactions */
  defaultCurrency?: string;
  /** Default country for new transactions */
  defaultCountry?: string;
  /** Default city for new transactions */
  defaultCity?: string;
}

/**
 * Return type for useActiveTransaction hook
 */
export interface UseActiveTransactionReturn {
  // State
  /** Current active transaction state */
  active: ActiveTransaction;
  /** Whether there's an active transaction (not idle) */
  isActive: boolean;
  /** Whether a scan is in progress */
  isScanning: boolean;
  /** Whether a credit has been used for the current transaction */
  isCreditUsed: boolean;

  // Derived state for TransactionEditorView
  /** Scan button state for UI */
  scanButtonState: 'idle' | 'pending' | 'scanning' | 'complete' | 'error';
  /** Editor mode for TransactionEditorView */
  editorMode: 'new' | 'existing';
  /** Pending image URL for display */
  pendingImageUrl: string | null;
  /** Thumbnail URL for display */
  thumbnailUrl: string | null;

  // Actions - Starting/Editing
  /** Start a new transaction (scan or manual) */
  startNew: (options?: { autoOpenFilePicker?: boolean }) => void;
  /** Start editing an existing transaction */
  startEdit: (transaction: Transaction) => CanStartEditingResult;
  /** Check if editing can start (without starting) */
  canStartEditing: (transactionId?: string) => CanStartEditingResult;

  // Actions - Image handling
  /** Add a pending image for scanning */
  addPendingImage: (imageDataUrl: string) => void;
  /** Clear pending images */
  clearPendingImages: () => void;

  // Actions - Scan lifecycle
  /** Reserve credit and start scanning */
  reserveCredit: () => Promise<CreditOperationResult>;
  /** Confirm credit charge after successful scan */
  confirmCredit: () => void;
  /** Refund credit after scan failure */
  refundCredit: () => Promise<CreditOperationResult>;

  // Actions - State transitions
  /** Set scanning state (called when scan starts) */
  setScanning: () => void;
  /** Set scan complete with result transaction */
  setScanComplete: (transaction: Transaction, thumbnailUrl?: string, imageUrls?: string[]) => void;
  /** Set scan error */
  setScanError: (error: string) => void;
  /** Retry after error (back to scanning state) */
  retryFromError: () => void;

  // Actions - Transaction updates
  /** Update the current transaction data */
  updateTransaction: (transaction: Transaction) => void;
  /** Mark that changes have been made */
  markDirty: () => void;

  // Actions - Cleanup
  /** Clear the active transaction (after save or discard) */
  clear: () => void;
  /** Clear with confirmation check - returns false if user should be warned first */
  clearWithCheck: () => { needsConfirmation: boolean; reason?: 'credit_used' | 'has_changes' | 'has_image' };

  // Actions - Conflict resolution
  /** Force discard current and start new */
  forceDiscardAndStartNew: () => void;
  /** Force discard current and edit existing */
  forceDiscardAndEdit: (transaction: Transaction) => void;
}

/**
 * Hook for managing the single active transaction paradigm.
 */
export function useActiveTransaction(props: UseActiveTransactionProps): UseActiveTransactionReturn {
  const {
    deductCredits,
    addCredits,
    creditsRemaining,
    defaultCurrency = DEFAULT_CURRENCY,
    defaultCountry = '',
    defaultCity = '',
  } = props;

  // Main state
  const [active, setActive] = useState<ActiveTransaction>(createIdleActiveTransaction);

  // Track if we've reserved a credit but not confirmed (for proper refund on unmount)
  const creditReservedRef = useRef(false);

  // Derived state
  const isActive = active.state !== 'idle';
  const isScanning = active.state === 'scanning';
  const isCreditUsed = active.creditCharged;

  // Map ActiveTransactionState to ScanButtonState for TransactionEditorView
  const scanButtonState = useMemo((): 'idle' | 'pending' | 'scanning' | 'complete' | 'error' => {
    switch (active.state) {
      case 'idle':
      case 'draft':
        return active.pendingImages.length > 0 ? 'pending' : 'idle';
      case 'image_pending':
        return 'pending';
      case 'scanning':
        return 'scanning';
      case 'scan_complete':
      case 'editing':
        // If we have a thumbnail, show complete; otherwise idle
        return active.thumbnailUrl ? 'complete' : 'idle';
      case 'scan_error':
        return 'error';
      default:
        return 'idle';
    }
  }, [active.state, active.pendingImages.length, active.thumbnailUrl]);

  // Editor mode for TransactionEditorView
  const editorMode = active.source;

  // Pending image URL (first image in pending list)
  const pendingImageUrl = active.pendingImages.length > 0 ? active.pendingImages[0] : null;

  // Thumbnail URL
  const thumbnailUrl = active.thumbnailUrl || null;

  /**
   * Check if editing can start (without actually starting).
   */
  const canStartEditing = useCallback((transactionId?: string): CanStartEditingResult => {
    // If idle, always allow
    if (active.state === 'idle') {
      return { allowed: true };
    }

    // If editing the same transaction, allow
    if (transactionId && active.existingId === transactionId) {
      return { allowed: true };
    }

    // Check for conflicts
    if (active.state === 'scanning') {
      return {
        allowed: false,
        conflict: active,
        conflictReason: 'scan_in_progress',
      };
    }

    if (active.creditCharged) {
      return {
        allowed: false,
        conflict: active,
        conflictReason: 'credit_used',
      };
    }

    if (hasActiveTransactionContent(active)) {
      return {
        allowed: false,
        conflict: active,
        conflictReason: 'has_unsaved_changes',
      };
    }

    // No meaningful content, allow (will clear existing)
    return { allowed: true };
  }, [active]);

  /**
   * Create a default empty transaction.
   */
  const createDefaultTransaction = useCallback((): Transaction => ({
    merchant: '',
    alias: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    total: 0,
    category: 'Supermarket' as StoreCategory,
    items: [],
    country: defaultCountry,
    city: defaultCity,
    currency: defaultCurrency,
  }), [defaultCurrency, defaultCountry, defaultCity]);

  /**
   * Start a new transaction (scan or manual entry).
   */
  const startNew = useCallback((_options?: { autoOpenFilePicker?: boolean }) => {
    const defaultTx = createDefaultTransaction();
    setActive({
      ...createNewActiveTransaction(defaultTx),
      state: 'draft',
    });
  }, [createDefaultTransaction]);

  /**
   * Start editing an existing transaction.
   * Returns conflict info if can't start immediately.
   */
  const startEdit = useCallback((transaction: Transaction): CanStartEditingResult => {
    const check = canStartEditing(transaction.id);

    if (check.allowed) {
      setActive(createEditingActiveTransaction(transaction));
    }

    return check;
  }, [canStartEditing]);

  /**
   * Add a pending image for scanning.
   */
  const addPendingImage = useCallback((imageDataUrl: string) => {
    setActive(prev => ({
      ...prev,
      pendingImages: [...prev.pendingImages, imageDataUrl],
      state: prev.state === 'idle' ? 'image_pending' : (prev.state === 'draft' ? 'image_pending' : prev.state),
    }));
  }, []);

  /**
   * Clear pending images.
   */
  const clearPendingImages = useCallback(() => {
    setActive(prev => ({
      ...prev,
      pendingImages: [],
      state: prev.state === 'image_pending' ? 'draft' : prev.state,
    }));
  }, []);

  /**
   * Reserve credit for scanning.
   * Called when user initiates a scan - deducts credit optimistically.
   */
  const reserveCredit = useCallback(async (): Promise<CreditOperationResult> => {
    if (creditsRemaining <= 0) {
      return { success: false, error: 'No credits available' };
    }

    // Deduct credit (optimistic - will be confirmed or refunded)
    const success = await deductCredits(1);

    if (success) {
      creditReservedRef.current = true;
      setActive(prev => ({
        ...prev,
        creditReserved: true,
        state: 'scanning',
      }));
      return { success: true };
    }

    return { success: false, error: 'Failed to deduct credit' };
  }, [creditsRemaining, deductCredits]);

  /**
   * Confirm credit charge after successful scan.
   * The credit was already deducted in reserveCredit - this just marks it as permanent.
   */
  const confirmCredit = useCallback(() => {
    creditReservedRef.current = false;
    setActive(prev => ({
      ...prev,
      creditReserved: false,
      creditCharged: true,
    }));
  }, []);

  /**
   * Refund credit after scan failure.
   * Adds the credit back since the scan didn't complete successfully.
   */
  const refundCredit = useCallback(async (): Promise<CreditOperationResult> => {
    if (!active.creditReserved) {
      return { success: true }; // Nothing to refund
    }

    try {
      await addCredits(1);
      creditReservedRef.current = false;
      setActive(prev => ({
        ...prev,
        creditReserved: false,
      }));
      return { success: true };
    } catch (error) {
      console.error('Failed to refund credit:', error);
      return { success: false, error: 'Failed to refund credit' };
    }
  }, [active.creditReserved, addCredits]);

  /**
   * Set scanning state.
   */
  const setScanning = useCallback(() => {
    setActive(prev => ({
      ...prev,
      state: 'scanning',
      scanError: null,
    }));
  }, []);

  /**
   * Set scan complete with result transaction.
   */
  const setScanComplete = useCallback((
    transaction: Transaction,
    newThumbnailUrl?: string,
    newImageUrls?: string[]
  ) => {
    setActive(prev => ({
      ...prev,
      state: 'scan_complete',
      transaction,
      thumbnailUrl: newThumbnailUrl || transaction.thumbnailUrl,
      imageUrls: newImageUrls || transaction.imageUrls,
      scanError: null,
      pendingImages: [], // Clear pending images after successful scan
    }));
  }, []);

  /**
   * Set scan error.
   */
  const setScanError = useCallback((error: string) => {
    setActive(prev => ({
      ...prev,
      state: 'scan_error',
      scanError: error,
    }));
  }, []);

  /**
   * Retry after error.
   */
  const retryFromError = useCallback(() => {
    setActive(prev => ({
      ...prev,
      state: 'image_pending',
      scanError: null,
    }));
  }, []);

  /**
   * Update the current transaction data.
   */
  const updateTransaction = useCallback((transaction: Transaction) => {
    setActive(prev => ({
      ...prev,
      transaction,
      hasChanges: true,
    }));
  }, []);

  /**
   * Mark that changes have been made.
   */
  const markDirty = useCallback(() => {
    setActive(prev => ({
      ...prev,
      hasChanges: true,
    }));
  }, []);

  /**
   * Clear the active transaction.
   */
  const clear = useCallback(() => {
    creditReservedRef.current = false;
    setActive(createIdleActiveTransaction());
  }, []);

  /**
   * Check if clearing needs confirmation.
   */
  const clearWithCheck = useCallback((): { needsConfirmation: boolean; reason?: 'credit_used' | 'has_changes' | 'has_image' } => {
    if (active.state === 'idle') {
      return { needsConfirmation: false };
    }

    if (active.creditCharged) {
      return { needsConfirmation: true, reason: 'credit_used' };
    }

    if (active.hasChanges) {
      return { needsConfirmation: true, reason: 'has_changes' };
    }

    if (active.pendingImages.length > 0 || active.thumbnailUrl) {
      return { needsConfirmation: true, reason: 'has_image' };
    }

    return { needsConfirmation: false };
  }, [active]);

  /**
   * Force discard current and start new.
   */
  const forceDiscardAndStartNew = useCallback(() => {
    creditReservedRef.current = false;
    const defaultTx = createDefaultTransaction();
    setActive({
      ...createNewActiveTransaction(defaultTx),
      sessionId: generateScanSessionId(),
    });
  }, [createDefaultTransaction]);

  /**
   * Force discard current and edit existing.
   */
  const forceDiscardAndEdit = useCallback((transaction: Transaction) => {
    creditReservedRef.current = false;
    setActive(createEditingActiveTransaction(transaction));
  }, []);

  return {
    // State
    active,
    isActive,
    isScanning,
    isCreditUsed,

    // Derived state
    scanButtonState,
    editorMode,
    pendingImageUrl,
    thumbnailUrl,

    // Actions - Starting/Editing
    startNew,
    startEdit,
    canStartEditing,

    // Actions - Image handling
    addPendingImage,
    clearPendingImages,

    // Actions - Scan lifecycle
    reserveCredit,
    confirmCredit,
    refundCredit,

    // Actions - State transitions
    setScanning,
    setScanComplete,
    setScanError,
    retryFromError,

    // Actions - Transaction updates
    updateTransaction,
    markDirty,

    // Actions - Cleanup
    clear,
    clearWithCheck,

    // Actions - Conflict resolution
    forceDiscardAndStartNew,
    forceDiscardAndEdit,
  };
}

export default useActiveTransaction;
