/**
 * BatchReviewView Component
 *
 * Story 12.3: Batch Review Queue
 * Main view for reviewing all processed receipts before saving.
 *
 * Features:
 * - Summary header with count and total (AC #5)
 * - Cards for each receipt (AC #1, #2, #3)
 * - Edit individual receipts (AC #4)
 * - Discard receipts (AC #7)
 * - Save all button (AC #6)
 * - Scroll navigation for large batches (AC #8)
 *
 * Story 14d.5: Optional ScanContext integration for state machine migration.
 * Component reads from ScanContext when available, falls back to props.
 *
 * @see docs/sprint-artifacts/epic12/story-12.3-batch-review-queue.md
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Save, Loader2, AlertCircle, Check, X, Trash2, RotateCcw, Zap, Camera, Info, Layers } from 'lucide-react';
import { formatCreditsDisplay } from '@/utils/creditFormatters';
import { useBatchReview, BatchReceipt } from '../hooks/useBatchReview';
import { BatchReviewCard } from '@features/batch-review/components/BatchReviewCard';
import { ProcessingResult, ImageProcessingState } from '@features/batch-review/services/batchProcessingService';
import type { Transaction } from '@/types/transaction';
import { formatCurrency } from '@/utils/currency';
import type { Currency } from '@/types/settings';
// Story 14e-11: Scan actions still from scan feature (phase-guarded)
import { useScanActions } from '@features/scan/store';
// Story 16-6: Phase, mode, batchReceipts, batchProgress from shared workflow store
import {
  useWorkflowPhase as useScanPhase,
  useWorkflowMode as useScanMode,
  useWorkflowBatchReceipts,
  useWorkflowBatchProgress,
  useNavigationActions,
} from '@shared/stores';
import { useModalActions } from '@/managers/ModalManager';

/**
 * Props for processing state display.
 * When isProcessing is true, show processing progress instead of review cards.
 */
export interface ProcessingStateProps {
  /** Whether processing is currently active */
  isProcessing: boolean;
  /** Processing progress (current/total) */
  progress: { current: number; total: number };
  /** Processing states for each image */
  states: ImageProcessingState[];
  /** Called when user cancels processing */
  onCancelProcessing?: () => void;
}

/** Credit information for header display */
export interface BatchReviewCredits {
  /** Remaining normal scan credits */
  remaining: number;
  /** Remaining super credits */
  superRemaining: number;
}

export interface BatchReviewViewProps {
  /** Processing results from Story 12.2 */
  processingResults: ProcessingResult[];
  /** Original image data URLs for display */
  imageDataUrls: string[];
  /** Current theme */
  theme: 'light' | 'dark';
  /** Display currency */
  currency: Currency;
  /** Translation function */
  t: (key: string) => string;
  /** Format currency function */
  formatCurrencyFn?: typeof formatCurrency;
  /** Called when user wants to edit a receipt */
  onEditReceipt: (receipt: BatchReceipt, batchIndex: number, batchTotal: number, allReceipts: BatchReceipt[]) => void;
  /** Called when receipt is updated from edit view */
  onReceiptUpdated?: (receiptId: string, transaction: Transaction) => void;
  /**
   * @deprecated Story 14e-25d: View uses navigateBack() from useNavigationActions() directly.
   * This prop is no longer needed.
   */
  onBack?: () => void;
  /** Called when X button is pressed to cancel/discard all (shows confirmation) */
  onCancel?: () => void;
  /** Called when all receipts are saved successfully. Story 14.15: Now includes saved transactions. */
  onSaveComplete: (savedTransactionIds: string[], savedTransactions: Transaction[]) => void;
  /** Function to save a transaction to Firestore */
  saveTransaction: (transaction: Transaction) => Promise<string>;
  /** Called when user wants to retry a failed receipt */
  onRetryReceipt?: (receipt: BatchReceipt) => void;
  /** Story 12.3: Processing state props for inline progress display */
  processingState?: ProcessingStateProps;
  /** Story 12.1 v9.7.0: Credit information for header display */
  credits?: BatchReviewCredits;
  /**
   * @deprecated Story 14e-25d: View uses openModal() from useModalActions() directly.
   * This prop is no longer needed.
   */
  onCreditInfoClick?: () => void;
}

/**
 * BatchReviewView Component
 *
 * Displays all processed receipts for review before saving.
 * Layout:
 * - Header with back button and title
 * - Summary header: "{count} boletas • ${total} total"
 * - Scrollable list of receipt cards
 * - Fixed "Guardar todo" button at bottom
 */
export const BatchReviewView: React.FC<BatchReviewViewProps> = ({
  processingResults,
  imageDataUrls,
  theme,
  currency,
  t,
  formatCurrencyFn = formatCurrency,
  onEditReceipt,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onReceiptUpdated: _onReceiptUpdated, // Reserved for parent integration
  // Story 14e-25d: onBack now unused - view uses navigateBack() directly
  onBack: _deprecatedOnBack,
  onCancel,
  onSaveComplete,
  saveTransaction,
  onRetryReceipt,
  processingState: processingStateProp,
  credits,
  // Story 14e-25d: onCreditInfoClick now unused - view uses openModal() directly
  onCreditInfoClick: _deprecatedOnCreditInfoClick,
}) => {
  // Story 14e-11: Use Zustand store selectors (migrated from ScanContext)
  const scanPhase = useScanPhase();
  const scanMode = useScanMode();
  // Story 16-6: Read from shared workflow store (source of truth)
  const batchProgress = useWorkflowBatchProgress();
  const batchReceipts = useWorkflowBatchReceipts();
  const { updateBatchReceipt, discardBatchReceipt } = useScanActions();

  // Derive batch state from Zustand
  const isBatchReviewing = scanPhase === 'reviewing' && scanMode === 'batch';
  const isBatchProcessing = scanPhase === 'scanning' && scanMode === 'batch';

  // Story 14e-25d: Direct hooks (ViewHandlersContext deleted)
  const { navigateBack } = useNavigationActions();
  const { openModal, closeModal } = useModalActions();
  const onBack = navigateBack;
  const onCreditInfoClick = () => openModal('creditInfo', {
    normalCredits: credits?.remaining ?? 0,
    superCredits: credits?.superRemaining ?? 0,
    onClose: closeModal,
  });

  // Story 14e-11: Determine if we should use context mode (Zustand store)
  // Use context when in batch reviewing phase
  const useContextMode = isBatchReviewing;

  // Story 14e-11: Create adapter object matching ScanContextForBatchReview interface
  // This allows useBatchReview to work with the Zustand store
  const scanContextAdapter = useMemo(() => ({
    state: { batchReceipts },
    updateBatchReceipt,
    discardBatchReceipt,
  }), [batchReceipts, updateBatchReceipt, discardBatchReceipt]);

  // Derive processing state from Zustand store when available
  // This allows the component to work during migration when App.tsx still manages local state
  const processingState = isBatchProcessing
    ? {
        isProcessing: true,
        progress: batchProgress
          ? { current: batchProgress.current, total: batchProgress.total }
          : { current: 0, total: 0 },
        states: [], // States are managed internally by useBatchProcessing hook
        onCancelProcessing: processingStateProp?.onCancelProcessing,
      }
    : processingStateProp;

  const isDark = theme === 'dark';

  // Story 14e-11: Use batch review hook with Zustand adapter
  // When context mode is active, receipts are read from/written to Zustand store
  // When not active (tests), receipts are managed locally
  const {
    receipts,
    totalAmount,
    detectedCurrency,
    validCount,
    reviewCount,
    errorCount,
    isSaving,
    saveProgress,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateReceipt: _updateReceipt, // Exposed via hook for parent integration
    discardReceipt,
    saveAll,
    saveOne,
    isEmpty,
  } = useBatchReview(processingResults, imageDataUrls, {
    useContext: useContextMode,
    scanContext: useContextMode ? scanContextAdapter : null,
  });

  // Use detected currency from receipts if available, otherwise fall back to user's currency
  const displayCurrency = detectedCurrency || currency;

  // State for discard confirmation
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);

  // Track if we had receipts before (to detect when all are saved/discarded)
  const hadReceiptsRef = useRef(false);
  const previousReceiptsCountRef = useRef(0);

  // Story 12.1 v9.7.0: Auto-navigate back when all receipts are saved/discarded
  useEffect(() => {
    // Only track after we've had receipts (not on initial empty state)
    if (receipts.length > 0) {
      hadReceiptsRef.current = true;
      previousReceiptsCountRef.current = receipts.length;
    }

    // If we had receipts and now it's empty, complete the batch
    // This happens when all receipts were saved individually or discarded
    if (hadReceiptsRef.current && isEmpty && !processingState?.isProcessing) {
      // Call onSaveComplete with empty arrays to signal batch is done
      // This bypasses the discard confirmation since user already acted on all receipts
      onSaveComplete([], []);
    }
  }, [isEmpty, receipts.length, onSaveComplete, processingState?.isProcessing]);

  // Note: Receipt updates are handled via the updateReceipt function from the hook
  // The onReceiptUpdated callback is called by the parent component after editing

  // Handle edit click
  const handleEdit = useCallback(
    (receipt: BatchReceipt) => {
      const batchIndex = receipts.findIndex((r) => r.id === receipt.id);
      onEditReceipt(receipt, batchIndex + 1, receipts.length, receipts);
    },
    [receipts, onEditReceipt]
  );

  // Handle discard click
  const handleDiscard = useCallback((receipt: BatchReceipt) => {
    // High confidence receipts need confirmation
    if (receipt.confidence >= 0.85 && receipt.status !== 'error') {
      setConfirmDiscardId(receipt.id);
    } else {
      discardReceipt(receipt.id);
    }
  }, [discardReceipt]);

  // Confirm discard
  const handleConfirmDiscard = useCallback(() => {
    if (confirmDiscardId) {
      discardReceipt(confirmDiscardId);
      setConfirmDiscardId(null);
    }
  }, [confirmDiscardId, discardReceipt]);

  // Cancel discard
  const handleCancelDiscard = useCallback(() => {
    setConfirmDiscardId(null);
  }, []);

  // Handle save all - Story 14.15: Now passes saved transactions for batch complete modal
  const handleSaveAll = useCallback(async () => {
    const result = await saveAll(saveTransaction);
    if (result.saved.length > 0) {
      onSaveComplete(result.saved, result.savedTransactions);
    }
  }, [saveAll, saveTransaction, onSaveComplete]);

  // Handle retry
  const handleRetry = useCallback(
    (receipt: BatchReceipt) => {
      onRetryReceipt?.(receipt);
    },
    [onRetryReceipt]
  );

  // Theme-based styling - Story 12.1 v9.7.0: Use CSS variables to match BatchCaptureView
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Format total amount using detected currency from receipts
  const formattedTotal = formatCurrencyFn(totalAmount, displayCurrency);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header - Story 12.1 v9.7.0: Matches TransactionEditorView style */}
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
              onClick={onBack}
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
            {/* Batch mode indicator icon - same color as title, no background */}
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
            {/* Close button - triggers cancel/discard confirmation */}
            <button
              onClick={onCancel || onBack}
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

      {/* Story 12.3: Show processing progress when active */}
      {processingState?.isProcessing ? (
        <>
          {/* Processing header */}
          <div className={`px-4 py-3 border-b ${borderColor}`} style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between">
              <span className={`text-base font-medium ${textPrimary}`}>
                {t('batchProcessing')} ({processingState.progress.current}/{processingState.progress.total})
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Loader2 size={12} className="animate-spin" />
                {t('processing')}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(processingState.progress.current / processingState.progress.total) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Processing states list */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            role="list"
            aria-label={t('batchProcessingList')}
          >
            {processingState.states.map((state, index) => (
              <div
                key={state.id}
                className={`rounded-lg border ${borderColor} ${isDark ? 'bg-slate-800' : 'bg-white'} p-4 flex items-center gap-3`}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {state.status === 'processing' && (
                    <Loader2 size={20} className="text-amber-500 animate-spin" />
                  )}
                  {state.status === 'ready' && (
                    <Check size={20} className="text-green-500" />
                  )}
                  {state.status === 'error' && (
                    <X size={20} className="text-red-500" />
                  )}
                  {state.status === 'pending' && (
                    <div className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
                  )}
                </div>

                {/* Receipt info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${textPrimary}`}>
                    {t('receipt')} {index + 1}
                  </p>
                  {state.status === 'ready' && state.result && (
                    <p className={`text-sm ${textSecondary}`}>
                      {state.result.merchant || t('unknown')} • {formatCurrencyFn(state.result.total || 0, currency)}
                    </p>
                  )}
                  {state.status === 'error' && state.error && (
                    <p className="text-sm text-red-500">{state.error}</p>
                  )}
                  {state.status === 'processing' && (
                    <p className={`text-sm ${textSecondary}`}>{t('analyzing')}...</p>
                  )}
                  {state.status === 'pending' && (
                    <p className={`text-sm ${textSecondary}`}>{t('waiting')}...</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cancel button during processing */}
          <div
            className={`px-4 py-4 border-t ${borderColor}`}
            style={{ backgroundColor: 'var(--bg-secondary)', paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
          >
            <button
              onClick={processingState.onCancelProcessing}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {t('cancel')}
            </button>
          </div>
        </>
      ) : (
        /* Story 12.1 v9.7.0: Main content area - matches BatchCaptureView layout */
        /* Story 14d.5: pb-32 (128px) to account for save button + nav bar so last card is visible */
        <div className="flex-1 overflow-y-auto px-3 pb-32">
          {/* Summary card - styled like BatchCaptureView main card */}
          <div
            className="rounded-2xl p-4 mb-3"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid var(--border-light)',
            }}
          >
            <div className="flex items-center justify-between">
              {/* Left: Receipt count + review warning */}
              <div className="flex items-center gap-2">
                <span className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                  {validCount} {t(validCount === 1 ? 'receipt' : 'receipts')}
                </span>
                {reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertCircle size={12} />
                    {reviewCount} {t('batchNeedReview')}
                  </span>
                )}
              </div>
              {/* Right: Total */}
              <div className="text-right">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('total')}</span>
                <span className="ml-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{formattedTotal}</span>
              </div>
            </div>
          </div>

          {/* Receipt cards (AC #1, #2, #3, #8) */}
          <div
            className="space-y-3"
            role="list"
            aria-label={t('batchReviewList')}
          >
            {isEmpty ? (
              <div className={`text-center py-8 ${textSecondary}`}>
                <p>{t('batchReviewEmpty')}</p>
              </div>
            ) : (
              receipts.map((receipt) => (
                <BatchReviewCard
                  key={receipt.id}
                  receipt={receipt}
                  theme={theme}
                  currency={currency}
                  t={t}
                  onSave={async () => {
                    await saveOne(receipt.id, saveTransaction);
                  }}
                  onEdit={() => handleEdit(receipt)}
                  onDiscard={() => handleDiscard(receipt)}
                  onRetry={
                    receipt.status === 'error' && onRetryReceipt
                      ? () => handleRetry(receipt)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Save all button (AC #6) - only show when not processing */}
      {/* Story 14d.5: Account for nav bar height (~80px) + safe area so button is visible above nav */}
      {!isEmpty && !processingState?.isProcessing && (
        <div
          className="px-4 py-4"
          style={{ backgroundColor: 'var(--bg)', paddingBottom: 'calc(80px + var(--safe-bottom, 0px))' }}
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

          {/* Error count warning */}
          {errorCount > 0 && (
            <p className="mt-2 text-center text-sm text-amber-600 dark:text-amber-400">
              {t('batchErrorExcluded').replace('{count}', String(errorCount))}
            </p>
          )}
        </div>
      )}

      {/* Discard confirmation dialog */}
      {confirmDiscardId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="alertdialog"
          aria-labelledby="discard-dialog-title"
          aria-describedby="discard-dialog-desc"
        >
          <div
            className={`rounded-xl p-6 max-w-sm w-full shadow-xl ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}
          >
            <h3
              id="discard-dialog-title"
              className={`text-lg font-bold mb-2 ${textPrimary}`}
            >
              {t('batchDiscardConfirmTitle')}
            </h3>
            <p id="discard-dialog-desc" className={`text-sm mb-6 ${textSecondary}`}>
              {t('batchDiscardConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDiscard}
                className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                {t('batchDiscardConfirmYes')}
              </button>
              <button
                onClick={handleCancelDiscard}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <RotateCcw size={16} />
                {t('batchDiscardConfirmNo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchReviewView;
