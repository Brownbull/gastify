/**
 * Story 14e-16: BatchReviewFeature Orchestrator Component
 * Story 14e-29c: Updated to use useBatchReviewHandlers internally
 *
 * Orchestrates all batch review rendering based on Zustand store phase.
 * This is the single entry point for batch review functionality in App.tsx.
 *
 * Phase → Component Mapping:
 * - idle: returns null (not visible)
 * - loading: ProcessingState (loading progress)
 * - reviewing: Full review UI (header, summary, cards, save all)
 * - editing: Full review UI (edit mode active)
 * - saving: Full review UI (save-in-progress indicator)
 * - complete: CompleteState (success message with auto-transition)
 * - error: ErrorState (error display with retry option)
 *
 * Layout matches production BatchReviewView:
 * - Header with back button, title "Resultado", batch icon, credit badges, X close
 * - Summary card showing receipt count and total
 * - Scrollable list of BatchReviewCard components
 * - Fixed "Guardar Todo" button at bottom
 * - Discard confirmation via ModalManager (AC6 compliant)
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-16-batch-review-feature-orchestrator.md
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-29c-save-discard-handlers.md
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2,
  ChevronLeft,
  X,
  Layers,
  Zap,
  Camera,
  Info,
  Save,
} from 'lucide-react';
import { formatCreditsDisplay } from '@/utils/creditFormatters';

// ModalManager integration (AC6)
import { useModalActions } from '@managers/ModalManager';

// Store selectors and actions (AC3)
import {
  useBatchReviewPhase,
  useBatchItems,
  useBatchProgress,
  useIsBatchEmpty,
  useBatchTotalAmount,
  useValidBatchCount,
  useBatchReviewActions,
  useHadItems,
  batchReviewActions,
} from './store';

// Story 14e-29c: Import handlers hook
// Story 14e-34b: Import atomic batch actions
import { useBatchReviewHandlers, useAtomicBatchActions, type BatchReviewHandlersProps } from './hooks';

// State components (AC1, AC5) - extracted to states/ folder (Story 14e-16)
import {
  ProcessingState,
  ReviewingState,
  EmptyState,
  LoadingState,
  CompleteState,
  ErrorState,
} from './components/states';

// Types
import type { Currency } from '@/types/settings';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { ImageProcessingState } from './components';
import type { Transaction } from '@/types/transaction';

// =============================================================================
// Types
// =============================================================================

/** Credit information for header display */
export interface BatchReviewCredits {
  /** Remaining normal scan credits */
  remaining: number;
  /** Remaining super credits */
  superRemaining: number;
}

/**
 * Props for BatchReviewFeature orchestrator.
 *
 * Story 14e-29c: Updated to use handlersConfig instead of individual callbacks.
 * The feature now uses useBatchReviewHandlers internally for all handler logic.
 */
export interface BatchReviewFeatureProps {
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: 'light' | 'dark';
  /** Display currency */
  currency: Currency;
  /** Format currency function */
  formatCurrency: (amount: number, currency: string) => string;

  // ==========================================================================
  // Header props
  // ==========================================================================
  /** Credit information for header display */
  credits?: BatchReviewCredits;
  /** Called when credit badges are clicked */
  onCreditInfoClick?: () => void;

  // ==========================================================================
  // Optional: Processing state for 'loading' phase (AC5)
  // ==========================================================================
  /** Processing states for progress indicator (optional - for loading phase) */
  processingStates?: ImageProcessingState[];
  /** Processing progress override (optional - for loading phase) */
  processingProgress?: { current: number; total: number };
  /** Cancel processing callback (optional) */
  onCancelProcessing?: () => void;

  // ==========================================================================
  // Story 14e-29c: Handlers hook configuration
  // ==========================================================================
  /**
   * Configuration for useBatchReviewHandlers hook.
   * Provides all dependencies needed for internal handler creation.
   * Replaces individual callback props (onEditReceipt, onSaveReceipt, etc.)
   */
  handlersConfig: BatchReviewHandlersProps;

  // ==========================================================================
  // Story 14e-29c: Batch session for save tracking
  // ==========================================================================
  /** Current batch session for tracking saved transactions */
  batchSession?: { receipts: Transaction[] };

  // ==========================================================================
  // Callbacks (retained for special cases not handled by hook)
  // ==========================================================================
  /** Called when user wants to retry a failed receipt */
  onRetryReceipt?: (receipt: BatchReceipt) => void;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * BatchReviewFeature Orchestrator Component
 *
 * Reads phase from Zustand batch review store and renders appropriate UI.
 * This is the single entry point for all batch review rendering.
 *
 * Story 14e-29c: Now uses useBatchReviewHandlers internally for all handler logic.
 */
export function BatchReviewFeature({
  t,
  theme,
  currency,
  formatCurrency,
  credits,
  onCreditInfoClick,
  processingStates,
  processingProgress,
  onCancelProcessing,
  handlersConfig,
  batchSession,
  onRetryReceipt,
}: BatchReviewFeatureProps): React.ReactElement | null {
  // ==========================================================================
  // Store selectors (AC3)
  // ==========================================================================
  const phase = useBatchReviewPhase();
  const items = useBatchItems();
  const progress = useBatchProgress();
  const isEmpty = useIsBatchEmpty();
  const totalAmount = useBatchTotalAmount();
  const validCount = useValidBatchCount();
  const { reset } = useBatchReviewActions();
  const hadItems = useHadItems();

  // ==========================================================================
  // Story 14e-29c: Use handlers hook internally
  // ==========================================================================
  const handlers = useBatchReviewHandlers(handlersConfig);

  // ==========================================================================
  // Story 14e-34b: Atomic batch actions for race condition prevention
  // ==========================================================================
  const { discardReceiptAtomic } = useAtomicBatchActions();

  // ==========================================================================
  // Modal Manager (AC6)
  // ==========================================================================
  const { openModal, closeModal } = useModalActions();

  // ==========================================================================
  // Local State
  // ==========================================================================
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  // Track pending discard for confirmation callback
  const pendingDiscardIdRef = useRef<string | null>(null);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Story 14e-16: Auto-complete when batch becomes empty after saves.
   * Story 14e-33 AC3: Only trigger completion if items were actually SAVED (not just discarded).
   * When all items are saved (from menu or edit mode), automatically
   * trigger completion instead of showing empty state.
   * Uses store's hadItems flag which persists across component remounts.
   * Uses progress.saved to verify items were actually saved (prevents stale modal on discard).
   */
  useEffect(() => {
    // If we're in reviewing phase and empty
    if (phase === 'reviewing' && isEmpty) {
      // Case 1: Had items, now empty - check if saved or discarded
      if (hadItems) {
        // Story 14e-33 AC3: Only show completion if we actually saved something
        if (progress.saved > 0) {
          // Story 14e-29c: Use handler from hook
          const savedTransactions = batchSession?.receipts || [];
          batchReviewActions.reset();
          handlers.handleSaveComplete(savedTransactions);
        } else {
          // All items were discarded - reset and navigate away without completion modal
          batchReviewActions.reset();
          handlers.handleBack();
        }
      } else {
        // Case 2: Story 14e-33 follow-up - Never had items (stale state from cleared storage)
        // This prevents getting stuck on empty screen after localStorage clear
        batchReviewActions.reset();
        handlers.handleBack();
      }
    }
  }, [phase, isEmpty, hadItems, handlers, batchSession, progress.saved]);

  // ==========================================================================
  // Handlers - Story 14e-29c: Integrated with useBatchReviewHandlers
  // ==========================================================================

  /**
   * Handle discard receipt click (AC6: ModalManager integration).
   * Shows confirmation for high confidence receipts using ModalManager.
   * Story 14e-34b: Uses atomic discard to prevent race conditions.
   */
  const handleDiscardReceipt = useCallback(
    (receipt: BatchReceipt) => {
      // High confidence receipts need confirmation via ModalManager
      if (receipt.confidence >= 0.85 && receipt.status !== 'error') {
        pendingDiscardIdRef.current = receipt.id;
        openModal('batchDiscard', {
          receiptId: receipt.id,
          onConfirm: () => {
            const receiptId = pendingDiscardIdRef.current;
            // Story 14e-33: Close modal FIRST to prevent race condition
            // where isEmpty triggers navigation while modal is still open
            closeModal();
            if (receiptId) {
              pendingDiscardIdRef.current = null;
              // Story 14e-34b: Atomic discard - both stores updated synchronously
              discardReceiptAtomic(receiptId);
            }
          },
          onCancel: () => {
            pendingDiscardIdRef.current = null;
            closeModal();
          },
          t,
          theme,
        });
      } else {
        // Low confidence or error receipts can be discarded directly
        // Story 14e-34b: Atomic discard - both stores updated synchronously
        discardReceiptAtomic(receipt.id);
      }
    },
    [discardReceiptAtomic, openModal, closeModal, t, theme]
  );

  /**
   * Handle back button click (chevron left).
   * Story 14e-29c: Uses handleBack from hook.
   */
  const handleBackClick = useCallback(() => {
    handlers.handleBack();
  }, [handlers]);

  /**
   * Handle close button click (X) (AC6: ModalManager integration).
   * Shows cancel confirmation if there are unsaved receipts using ModalManager.
   */
  const handleCloseClick = useCallback(() => {
    if (items.length > 0) {
      openModal('batchDiscard', {
        unsavedCount: items.length,
        onConfirm: () => {
          closeModal();
          reset();
          handlers.handleDiscardConfirm();
        },
        onCancel: closeModal,
        t,
        theme,
      });
    } else {
      reset();
      handlers.handleBack();
    }
  }, [items.length, reset, handlers, openModal, closeModal, t, theme]);

  /**
   * Handle save single receipt.
   * Story 14e-29c: Uses handleSaveTransaction from hook.
   * Story 14e-34b: Uses atomic discard for race condition prevention.
   */
  const handleSaveReceipt = useCallback(
    async (receiptId: string) => {
      const receipt = items.find((item) => item.id === receiptId);
      if (!receipt) return;

      try {
        await handlers.handleSaveTransaction(receipt.transaction);
        // Story 14e-34b: Atomic discard - both stores updated synchronously
        // This prevents race conditions where effects observe intermediate state
        discardReceiptAtomic(receiptId);

        // Check if batch is now empty after this save
        const remainingCount = items.length - 1;
        if (remainingCount <= 0) {
          const savedTransactions = batchSession?.receipts || [];
          batchReviewActions.reset();
          handlers.handleSaveComplete(savedTransactions);
        }
      } catch (error) {
        console.error('[BatchReviewFeature] Failed to save receipt:', receiptId, error);
      }
    },
    [items, handlers, discardReceiptAtomic, batchSession]
  );

  /**
   * Handle Save All button click.
   * Story 14e-29c: Uses handleSaveTransaction from hook for each receipt.
   */
  const handleSaveAll = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveProgress(0);

    const validReceipts = items.filter((r) => r.status !== 'error');
    const savedTransactions: Transaction[] = [];

    // Start save operation in batch review store
    batchReviewActions.saveStart();

    try {
      for (const receipt of validReceipts) {
        try {
          await handlers.handleSaveTransaction(receipt.transaction);
          savedTransactions.push(receipt.transaction);
          // Track successful save in store
          batchReviewActions.saveItemSuccess(receipt.id);
          setSaveProgress((prev) => prev + 1);
        } catch (error) {
          console.error('[BatchReviewFeature] Failed to save receipt:', receipt.id, error);
          batchReviewActions.saveItemFailure(receipt.id, String(error));
        }
      }

      // Complete batch save operation in store
      batchReviewActions.saveComplete();
      batchReviewActions.reset();

      // Show completion modal and navigate
      handlers.handleSaveComplete(savedTransactions);
    } finally {
      setIsSaving(false);
    }
  }, [items, handlers, isSaving]);

  /**
   * Handle edit receipt.
   * Story 14e-29c: Uses handleEditReceipt from hook.
   */
  const handleEditReceipt = useCallback(
    (receipt: BatchReceipt) => {
      const batchIndex = items.findIndex((item) => item.id === receipt.id);
      // editBatchReceipt expects 1-indexed (converts to 0-indexed internally)
      handlers.handleEditReceipt(receipt, batchIndex >= 0 ? batchIndex + 1 : 1);
    },
    [items, handlers]
  );

  /**
   * Handle save complete - reset store and notify parent.
   */
  const handleSaveCompleteInternal = useCallback(() => {
    const savedTransactions = batchSession?.receipts || [];
    reset();
    batchReviewActions.reset();
    handlers.handleSaveComplete(savedTransactions);
  }, [reset, handlers, batchSession]);

  /**
   * Handle retry all after error.
   */
  const handleRetryAll = useCallback(() => {
    reset();
  }, [reset]);

  /**
   * Handle back/dismiss from error state.
   */
  const handleErrorDismiss = useCallback(() => {
    reset();
    handlers.handleBack();
  }, [reset, handlers]);

  // Format total for display
  const formattedTotal = formatCurrency(totalAmount, currency);

  // ==========================================================================
  // Phase-based rendering (AC1, AC7)
  // ==========================================================================

  switch (phase) {
    // -------------------------------------------------------------------------
    // IDLE: No active batch review (AC7)
    // -------------------------------------------------------------------------
    case 'idle':
      return null;

    // -------------------------------------------------------------------------
    // LOADING: Preparing batch receipts (AC5)
    // -------------------------------------------------------------------------
    case 'loading':
      // If we have processing states, show the ProcessingState component
      if (processingStates && processingStates.length > 0) {
        return (
          <ProcessingState
            t={t}
            theme={theme}
            states={processingStates}
            formatCurrency={formatCurrency}
            currency={currency}
            onCancel={onCancelProcessing}
            progress={processingProgress}
          />
        );
      }
      // Otherwise show simple loading state
      return <LoadingState t={t} theme={theme} />;

    // -------------------------------------------------------------------------
    // REVIEWING / EDITING / SAVING: Main review UI (AC1, AC3)
    // -------------------------------------------------------------------------
    case 'reviewing':
    case 'editing':
    case 'saving':
      return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg)' }}>
          {/* Header - Matches BatchReviewView */}
          <div
            className="sticky px-4"
            style={{
              top: 0,
              zIndex: 50,
              backgroundColor: 'var(--bg)',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                height: '72px',
                paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
              }}
            >
              {/* Left side: Back button + Title + Batch icon */}
              <div className="flex items-center gap-0">
                <button
                  onClick={handleBackClick}
                  className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
                  aria-label={t('back')}
                  style={{ color: 'var(--text-primary)' }}
                  disabled={isSaving}
                >
                  <ChevronLeft size={28} strokeWidth={2.5} />
                </button>
                <h1
                  className="font-semibold whitespace-nowrap"
                  style={{
                    fontFamily: 'var(--font-family)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '20px',
                  }}
                >
                  {t('batchResult')}
                </h1>
                {/* Batch mode indicator icon */}
                <Layers
                  size={20}
                  strokeWidth={2}
                  className="ml-2 flex-shrink-0"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>

              {/* Right side: Credit badges + Close button */}
              <div className="flex items-center gap-2">
                {/* Credit badges */}
                {credits && (
                  <button
                    onClick={onCreditInfoClick}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all active:scale-95"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                    }}
                    aria-label={t('creditInfo')}
                  >
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                    >
                      <Zap size={10} strokeWidth={2.5} />
                      <span>{formatCreditsDisplay(credits.superRemaining)}</span>
                    </div>
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
                    >
                      <Camera size={10} strokeWidth={2.5} />
                      <span>{formatCreditsDisplay(credits.remaining)}</span>
                    </div>
                    <Info size={12} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                )}
                {/* Close button - triggers cancel confirmation */}
                <button
                  onClick={handleCloseClick}
                  className="min-w-10 min-h-10 flex items-center justify-center"
                  aria-label={t('cancel')}
                  style={{ color: 'var(--text-primary)' }}
                  disabled={isSaving}
                >
                  <X size={24} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Main content area with padding for save button */}
          <div className="flex-1 overflow-y-auto px-3 pb-32">
            {/* Summary card */}
            <div
              className="rounded-2xl p-4 mb-3"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '2px solid var(--border-light)',
              }}
            >
              <div className="flex items-center justify-between">
                {/* Left: Receipt count */}
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                    {validCount} {t(validCount === 1 ? 'receipt' : 'receipts')}
                  </span>
                </div>
                {/* Right: Total */}
                <div className="text-right">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('total')}
                  </span>
                  <span
                    className="ml-2 text-base font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formattedTotal}
                  </span>
                </div>
              </div>
            </div>

            {/* Receipt cards list */}
            {isEmpty ? (
              <EmptyState t={t} theme={theme} />
            ) : (
              <ReviewingState
                receipts={items}
                theme={theme}
                currency={currency}
                t={t}
                onSaveReceipt={handleSaveReceipt}
                onEditReceipt={handleEditReceipt}
                onDiscardReceipt={handleDiscardReceipt}
                onRetryReceipt={onRetryReceipt}
              />
            )}
          </div>

          {/* Save All button - fixed at bottom */}
          {!isEmpty && (
            <div
              className="px-4 py-4"
              style={{
                backgroundColor: 'var(--bg)',
                paddingBottom: 'calc(80px + var(--safe-bottom, 0px))',
              }}
            >
              <button
                onClick={handleSaveAll}
                disabled={isSaving || validCount === 0}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--primary)',
                  cursor: isSaving || validCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: isSaving || validCount === 0 ? 0.7 : 1,
                }}
                aria-label={t('batchSaveAll')}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('batchSaving')} ({saveProgress}/{validCount})
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {t('batchSaveAll')} ({validCount})
                  </>
                )}
              </button>
            </div>
          )}

          {/* AC6: Discard confirmations now handled by ModalManager */}
        </div>
      );

    // -------------------------------------------------------------------------
    // COMPLETE: All receipts saved (auto-dismiss)
    // -------------------------------------------------------------------------
    case 'complete':
      return (
        <CompleteState
          t={t}
          theme={theme}
          savedCount={progress.saved}
          failedCount={progress.failed}
          onDismiss={handleSaveCompleteInternal}
        />
      );

    // -------------------------------------------------------------------------
    // ERROR: Fatal error during batch review
    // -------------------------------------------------------------------------
    case 'error':
      return (
        <ErrorState
          t={t}
          theme={theme}
          onRetry={handleRetryAll}
          onDismiss={handleErrorDismiss}
        />
      );

    // -------------------------------------------------------------------------
    // Default: Unknown phase - render nothing
    // -------------------------------------------------------------------------
    default:
      return null;
  }
}

export default BatchReviewFeature;
