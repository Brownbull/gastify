/**
 * Story 14e-10: ScanFeature Orchestrator Component
 * Story 14e-23a: Migrated scan overlays from AppOverlays
 * Story 14e-30: Owns file input element and ref
 *
 * Orchestrates all scan-related rendering based on Zustand store phase.
 * This is the single entry point for scan functionality in App.tsx.
 *
 * Phase → Component Mapping:
 * - idle: IdleState (optional - often handled by FAB)
 * - capturing: BatchCaptureView (batch) / CameraView (single) / StatementPlaceholder
 * - scanning: ScanOverlay (shows progress)
 * - reviewing: ReviewingState (wrapper for TransactionEditorView/BatchReviewView)
 * - saving: SavingState (saving indicator)
 * - error: ScanOverlay (error display with retry)
 *
 * Dialog Rendering (from activeDialog.type):
 * - QUICK_SAVE: QuickSaveCard
 * - BATCH_COMPLETE: BatchCompleteModal
 * - CURRENCY_MISMATCH: CurrencyMismatchDialog
 * - TOTAL_MISMATCH: TotalMismatchDialog
 *
 * File Input (Story 14e-30):
 * - Hidden file input element for image selection
 * - Exposes fileInputRef to parent via onFileInputReady callback
 * - Handles onFileSelect via prop
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-10-scan-feature-orchestrator.md
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-23a-scan-overlay-migration.md
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-30-scan-feature-handler-completion.md
 */
import React, { useRef, useEffect } from 'react';
import {
  useScanPhase,
  useScanMode,
  useScanActions,
} from './store';
import { useScanStore } from './store/useScanStore';
import {
  IdleState,
  ReviewingState,
} from './components/states';
// Story 14e-23: BatchDiscardDialog reads from scan store
import { BatchDiscardDialog } from './components/BatchDiscardDialog';
import {
  ScanOverlay,
  QuickSaveCard,
  BatchCompleteModal,
  CurrencyMismatchDialog,
  TotalMismatchDialog,
} from './components';
import { DIALOG_TYPES } from './types/scanStateMachine';
import type {
  BatchCompleteDialogData,
  QuickSaveDialogData,
  CurrencyMismatchDialogData,
  TotalMismatchDialogData,
} from './types/scanStateMachine';
// Story 16-2: overlay types from store (ScanOverlayState unused - reads via store selectors)
import type { SupportedCurrency } from '@/types/preferences';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import type { HistoryNavigationPayload } from '@/views/TrendsView';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for single mode capturing state
 * Used when user is taking a photo in single scan mode
 */
export interface SingleCaptureProps {
  /** Callback when capture is initiated */
  onCapture?: () => void;
  /** Callback to cancel and return */
  onCancel: () => void;
}

/**
 * Props for batch capture view
 * Minimal set needed by ScanFeature - full props passed through
 */
export interface BatchCaptureProps {
  /** Whether batch mode is active */
  isBatchMode: boolean;
  /** Toggle between modes */
  onToggleMode: (isBatch: boolean) => void;
  /** Process batch images */
  onProcessBatch: (images: string[]) => void;
  /** Switch to individual scan */
  onSwitchToIndividual: () => void;
  /** Go back */
  onBack: () => void;
  /** Processing state */
  isProcessing?: boolean;
  /** Theme */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Super credits available */
  superCreditsAvailable?: number;
  /** Normal credits available */
  normalCreditsAvailable?: number;
  /** Credit info click handler */
  onCreditInfoClick?: () => void;
}

// StatementPlaceholderProps - now exported from ./components/states/StatementPlaceholder

/**
 * Props for the review state wrapper
 * Can wrap existing TransactionEditorView or BatchReviewView
 */
export interface ReviewProps {
  /** Children to render (TransactionEditorView or BatchReviewView) */
  children?: React.ReactNode;
  /** Called when user wants to review/edit */
  onReview?: () => void;
  /** Called when user wants to save */
  onSave?: () => void;
}

// SavingStateProps - now exported from ./components/states/SavingState

/**
 * Active group info for quick save tagging
 * Story 14e-23a: Migrated from AppOverlays
 */
/**
 * Main props for ScanFeature orchestrator
 */
export interface ScanFeatureProps {
  /** Translation function */
  t: (key: string) => string;

  /** Theme */
  theme: 'light' | 'dark';

  /** Language for component localization */
  lang?: 'en' | 'es';

  /**
   * Current app view - used for scan overlay visibility.
   * Story 14e-23a fix: Single scan overlay should only show on scan-related views,
   * matching batch mode behavior where BatchProcessingOverlay has view-based visibility.
   */
  currentView?: string;

  /**
   * Whether to render idle state
   * Set to false if idle is handled elsewhere (e.g., FAB)
   * @default false
   */
  showIdleState?: boolean;

  /**
   * Callback when user taps to start scanning (from IdleState)
   */
  onStartScan?: () => void;

  /**
   * Callback to cancel processing
   */
  onCancelProcessing?: () => void;

  /**
   * Callback when error is dismissed
   */
  onErrorDismiss?: () => void;

  /**
   * Custom retry handler for errors
   */
  onRetry?: () => void;

  // =========================================================================
  // Capture Phase Props
  // =========================================================================

  /**
   * Component to render for batch capture
   * If provided, rendered when phase='capturing' and mode='batch'
   */
  batchCaptureView?: React.ReactNode;

  /**
   * Component to render for single capture (camera UI)
   * If provided, rendered when phase='capturing' and mode='single'
   */
  singleCaptureView?: React.ReactNode;

  /**
   * Component to render for statement capture placeholder
   * If provided, rendered when phase='capturing' and mode='statement'
   */
  statementView?: React.ReactNode;

  // =========================================================================
  // Review Phase Props
  // =========================================================================

  /**
   * Component to render for reviewing results
   * If provided, wrapped by ReviewingState when phase='reviewing'
   */
  reviewView?: React.ReactNode;

  // =========================================================================
  // Saving Phase Props
  // =========================================================================

  /**
   * Custom saving message
   */
  savingMessage?: string;

  // =========================================================================
  // ScanOverlay Props (Story 16-2: overlay state from Zustand store)
  // =========================================================================

  /** Current captured images (for thumbnail in overlay) */
  scanImages?: string[];

  /** Handler for scan overlay cancel */
  onScanOverlayCancel?: () => void;

  /** Handler for scan overlay retry */
  onScanOverlayRetry?: () => void;

  /** Handler for scan overlay dismiss */
  onScanOverlayDismiss?: () => void;

  // =========================================================================
  // QuickSaveCard Props (Story 14e-23a)
  // =========================================================================

  /** Handler for quick save */
  onQuickSave?: (dialogData?: QuickSaveDialogData) => Promise<void>;

  /** Handler for quick save edit */
  onQuickSaveEdit?: (dialogData?: QuickSaveDialogData) => void;

  /** Handler for quick save cancel */
  onQuickSaveCancel?: (dialogData?: QuickSaveDialogData) => void;

  /** Handler for quick save complete */
  onQuickSaveComplete?: () => void;

  /** Whether quick save is in progress */
  isQuickSaving?: boolean;

  /** Currency for formatting */
  currency?: string;

  /** Format currency function */
  formatCurrency?: (amount: number, currency: string) => string;

  /** User's default country for foreign location detection */
  userDefaultCountry?: string;

  // =========================================================================
  // Currency/Total Mismatch Dialog Props (Story 14e-23a)
  // =========================================================================

  /** User's default currency */
  userCurrency?: SupportedCurrency;

  /** Handler for using detected currency */
  onCurrencyUseDetected?: (dialogData?: CurrencyMismatchDialogData) => Promise<void>;

  /** Handler for using default currency */
  onCurrencyUseDefault?: (dialogData?: CurrencyMismatchDialogData) => Promise<void>;

  /** Handler for currency mismatch cancel */
  onCurrencyMismatchCancel?: (dialogData?: CurrencyMismatchDialogData) => void;

  /** Handler for using items sum */
  onTotalUseItemsSum?: (dialogData?: TotalMismatchDialogData) => void;

  /** Handler for keeping original total */
  onTotalKeepOriginal?: (dialogData?: TotalMismatchDialogData) => void;

  /** Handler for total mismatch cancel */
  onTotalMismatchCancel?: (dialogData?: TotalMismatchDialogData) => void;

  // =========================================================================
  // BatchCompleteModal Props (Story 14e-23a)
  // =========================================================================

  /** User credits remaining (for batch complete modal) */
  userCreditsRemaining?: number;

  /** Handler for batch complete dismiss */
  onBatchCompleteDismiss?: () => void;

  /** Handler for navigating to history from batch complete */
  onBatchCompleteNavigateToHistory?: (payload: HistoryNavigationPayload) => void;

  /** Handler for going home from batch complete */
  onBatchCompleteGoHome?: () => void;

  // =========================================================================
  // BatchDiscardDialog Props (Story 14e-23)
  // =========================================================================

  /** Handler for confirming batch discard */
  onBatchDiscardConfirm?: () => void;

  /** Handler for canceling batch discard */
  onBatchDiscardCancel?: () => void;

  // =========================================================================
  // Story 14e-30: File Input Props
  // =========================================================================

  /**
   * Handler for file selection from hidden input.
   * Called when user selects files via the file picker.
   */
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * Callback when file input ref is ready.
   * Parent can use this to trigger file picker via ref.current?.click()
   */
  onFileInputReady?: (ref: React.RefObject<HTMLInputElement>) => void;
}

// =============================================================================
// Inline components extracted to ./components/states/ per 14e-10 Archie review
// SavingState and StatementPlaceholder now imported from states barrel
// =============================================================================

// =============================================================================
// Main ScanFeature Component
// =============================================================================

/**
 * ScanFeature Orchestrator Component
 *
 * Reads phase/mode from Zustand store and renders appropriate UI.
 * This is the single entry point for all scan-related rendering.
 *
 * Architecture:
 * - Phase-driven rendering (not view-based)
 * - Can wrap existing views (BatchCaptureView, TransactionEditorView)
 * - Or render internal state components for simpler phases
 * - Story 14e-23a: Renders scan overlays (ScanOverlay, QuickSaveCard, etc.)
 *
 * @example
 * ```tsx
 * <ScanFeature
 *   t={t}
 *   theme={theme}
 *   onCancelProcessing={handleCancel}
 *   batchCaptureView={<BatchCaptureView {...batchProps} />}
 *   reviewView={<TransactionEditorView {...editorProps} />}
 *   scanOverlay={scanOverlay}
 *   isAnalyzing={isAnalyzing}
 *   scanImages={scanImages}
 *   onScanOverlayCancel={handleCancel}
 *   // ... other overlay props
 * />
 * ```
 */
export function ScanFeature({
  t,
  theme,
  lang = 'en',
  currentView,
  showIdleState = false,
  onStartScan,
  onCancelProcessing,
  onErrorDismiss,
  onRetry,
  batchCaptureView,
  singleCaptureView,
  statementView,
  reviewView,
  savingMessage: _savingMessage,
  // Story 16-2: scanOverlay removed — reads from Zustand store directly
  scanImages = [],
  onScanOverlayCancel,
  onScanOverlayRetry,
  onScanOverlayDismiss,
  // Story 14e-23a: QuickSaveCard props
  onQuickSave,
  onQuickSaveEdit,
  onQuickSaveCancel,
  onQuickSaveComplete,
  isQuickSaving = false,
  currency = DEFAULT_CURRENCY,
  formatCurrency,
  userDefaultCountry = 'CL',
  // Story 14e-23a: Currency/Total mismatch dialog props
  userCurrency = DEFAULT_CURRENCY,
  onCurrencyUseDetected,
  onCurrencyUseDefault,
  onCurrencyMismatchCancel,
  onTotalUseItemsSum,
  onTotalKeepOriginal,
  onTotalMismatchCancel,
  // Story 14e-23a: BatchCompleteModal props
  userCreditsRemaining = 0,
  onBatchCompleteDismiss,
  onBatchCompleteNavigateToHistory,
  onBatchCompleteGoHome,
  // Story 14e-23: BatchDiscardDialog props
  onBatchDiscardConfirm,
  onBatchDiscardCancel,
  // Story 14e-30: File input props
  onFileSelect,
  onFileInputReady,
}: ScanFeatureProps): React.ReactElement | null {
  const phase = useScanPhase();
  const mode = useScanMode();
  useScanActions(); // Keep hook call to maintain hook order

  // Story 14e-30: File input ref owned by ScanFeature
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Story 14e-30: Notify parent when file input ref is ready
  useEffect(() => {
    if (onFileInputReady && fileInputRef.current) {
      onFileInputReady(fileInputRef);
    }
  }, [onFileInputReady]);

  // Story 14e-23a: Read activeDialog from Zustand store for dialog rendering
  const activeDialog = useScanStore((state) => state.activeDialog);

  // TD-18-23: Read scan results for overlay save/edit handlers
  const scanResults = useScanStore((state) => state.results);
  const activeResultIndex = useScanStore((state) => state.activeResultIndex);

  // Story 16-2: Read overlay state from Zustand store (AC-3)
  const overlayState = useScanStore((state) => state.overlayState);
  const overlayProgress = useScanStore((state) => state.overlayProgress);
  const overlayEta = useScanStore((state) => state.overlayEta);
  const overlayError = useScanStore((state) => state.overlayError);

  // Scan-related views where overlay should be visible
  const isScanRelatedView =
    !currentView ||
    currentView === 'scan' ||
    currentView === 'scan-result' ||
    currentView === 'transaction-editor';

  // ScanOverlay visibility - shows during scanning or error phases AND on scan-related views
  const isScanOverlayVisible =
    overlayState !== 'idle' &&
    (phase === 'scanning' || phase === 'error') &&
    isScanRelatedView;

  // Check for batch complete dialog
  const batchCompleteData = activeDialog?.type === DIALOG_TYPES.BATCH_COMPLETE
    ? (activeDialog.data as BatchCompleteDialogData)
    : null;
  const showBatchCompleteModal = batchCompleteData && (batchCompleteData.transactions?.length ?? 0) > 0;

  // =========================================================================
  // Story 14e-23a: Render scan-related overlays FIRST (before phase switch)
  // These are fixed-position overlays that render regardless of phase
  // =========================================================================

  // TD-18-23: Confidence for overlay-triggered save (user explicitly accepted result)
  const OVERLAY_SAVE_CONFIDENCE = 1;

  const renderOverlays = (): React.ReactNode => {
    // Default formatCurrency if not provided
    const formatCurrencyFn = formatCurrency || ((amount: number, curr: string) => `${curr} ${amount.toFixed(2)}`);

    return (
      <>
        {/* ScanOverlay for processing/error states — Story 16-2: reads from Zustand store */}
        {/* TD-18-23: onSave/onEdit bypass QuickSaveCard — save/edit directly from overlay */}
        <ScanOverlay
          state={overlayState}
          progress={overlayProgress}
          eta={overlayEta}
          error={overlayError}
          onCancel={onScanOverlayCancel || onCancelProcessing || (() => {})}
          onRetry={onScanOverlayRetry || onRetry || (() => {})}
          onDismiss={onScanOverlayDismiss || onErrorDismiss || (() => {})}
          onSave={onQuickSave ? () => {
            const result = scanResults?.[activeResultIndex ?? 0];
            if (result) {
              onQuickSave({ transaction: result, confidence: OVERLAY_SAVE_CONFIDENCE });
            } else {
              onScanOverlayDismiss?.();
            }
          } : undefined}
          onEdit={onQuickSaveEdit ? () => {
            const result = scanResults?.[activeResultIndex ?? 0];
            if (result) {
              onQuickSaveEdit({ transaction: result, confidence: OVERLAY_SAVE_CONFIDENCE });
            } else {
              onScanOverlayDismiss?.();
            }
          } : undefined}
          theme={theme}
          t={t}
          visible={isScanOverlayVisible ?? false}
          capturedImageUrl={scanImages[0]}
        />

        {/* QuickSaveCard - rendered unconditionally, component reads from ScanContext */}
        {onQuickSave && onQuickSaveEdit && onQuickSaveCancel && (
          <QuickSaveCard
            onSave={onQuickSave}
            onEdit={onQuickSaveEdit}
            onCancel={onQuickSaveCancel}
            onSaveComplete={onQuickSaveComplete}
            theme={theme}
            t={t}
            formatCurrency={formatCurrencyFn}
            currency={currency}
            isSaving={isQuickSaving}
            lang={lang}
            userDefaultCountry={userDefaultCountry}

          />
        )}

        {/* CurrencyMismatchDialog - rendered unconditionally, component reads from ScanContext */}
        {onCurrencyUseDetected && onCurrencyUseDefault && onCurrencyMismatchCancel && (
          <CurrencyMismatchDialog
            userCurrency={userCurrency}
            onUseDetected={onCurrencyUseDetected}
            onUseDefault={onCurrencyUseDefault}
            onCancel={onCurrencyMismatchCancel}
            theme={theme}
            t={t}
          />
        )}

        {/* TotalMismatchDialog - rendered unconditionally, component reads from ScanContext */}
        {onTotalUseItemsSum && onTotalKeepOriginal && onTotalMismatchCancel && (
          <TotalMismatchDialog
            onUseItemsSum={onTotalUseItemsSum}
            onKeepOriginal={onTotalKeepOriginal}
            onCancel={onTotalMismatchCancel}
            theme={theme}
            t={t}
          />
        )}

        {/* BatchCompleteModal - shown when BATCH_COMPLETE dialog is active and all handlers provided */}
        {showBatchCompleteModal && batchCompleteData && onBatchCompleteDismiss && onBatchCompleteNavigateToHistory && onBatchCompleteGoHome && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            style={{ paddingTop: 'calc(1rem + var(--safe-top, 0px))', paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
          >
            <BatchCompleteModal
              transactions={batchCompleteData.transactions}
              creditsUsed={batchCompleteData.creditsUsed}
              creditsRemaining={userCreditsRemaining}
              theme={theme}
              t={t}
              onDismiss={onBatchCompleteDismiss}
              onNavigateToHistory={onBatchCompleteNavigateToHistory}
              onGoHome={onBatchCompleteGoHome}
              formatCurrency={formatCurrencyFn}
            />
          </div>
        )}

        {/* Story 14e-23: BatchDiscardDialog - reads visibility from scan store */}
        {onBatchDiscardConfirm && onBatchDiscardCancel && (
          <BatchDiscardDialog
            t={t}
            onConfirm={onBatchDiscardConfirm}
            onCancel={onBatchDiscardCancel}
          />
        )}

        {/* Story 14e-30: Hidden file input for image selection */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*"
          onChange={onFileSelect}
        />
      </>
    );
  };

  // =========================================================================
  // Phase-based rendering
  // =========================================================================

  // Story 14e-23a: Always render overlays, then phase-specific content
  const overlays = renderOverlays();

  switch (phase) {
    // -----------------------------------------------------------------------
    // IDLE: No active scan
    // -----------------------------------------------------------------------
    case 'idle':
      // Only render overlays if showIdleState is false
      // Usually idle is handled by FAB, not ScanFeature
      if (!showIdleState) {
        // Still render overlays (they handle their own visibility)
        return <>{overlays}</>;
      }
      return (
        <>
          {overlays}
          <IdleState
            t={t}
            theme={theme}
            onStartScan={onStartScan}
          />
        </>
      );

    // -----------------------------------------------------------------------
    // CAPTURING: Camera/file selection active
    // -----------------------------------------------------------------------
    case 'capturing':
      // Mode determines which capture UI to show
      if (mode === 'batch') {
        if (batchCaptureView) {
          return <>{overlays}{batchCaptureView}</>;
        }
        return <>{overlays}</>;
      }

      if (mode === 'statement') {
        if (statementView) {
          return <>{overlays}{statementView}</>;
        }
        return <>{overlays}</>;
      }

      // Single mode
      if (singleCaptureView) {
        return <>{overlays}{singleCaptureView}</>;
      }
      return <>{overlays}</>;

    // -----------------------------------------------------------------------
    // SCANNING: Processing receipt image
    // -----------------------------------------------------------------------
    case 'scanning':
      // Story 14e-23a: ScanOverlay handles processing state - render overlays only
      return <>{overlays}</>;

    // -----------------------------------------------------------------------
    // REVIEWING: Showing scan results for review
    // -----------------------------------------------------------------------
    case 'reviewing':
      if (!reviewView) {
        return <>{overlays}</>;
      }
      return (
        <>
          {overlays}
          <ReviewingState
            t={t}
            theme={theme}
          >
            {reviewView}
          </ReviewingState>
        </>
      );

    // -----------------------------------------------------------------------
    // SAVING: Transaction is being saved
    // -----------------------------------------------------------------------
    case 'saving':
      // QuickSaveCard handles "Guardando..." state - render overlays only
      return <>{overlays}</>;

    // -----------------------------------------------------------------------
    // ERROR: Something went wrong
    // -----------------------------------------------------------------------
    case 'error':
      // Story 14e-23a: ScanOverlay handles error state - render overlays only
      return <>{overlays}</>;

    // -----------------------------------------------------------------------
    // Default: Unknown phase - render overlays
    // -----------------------------------------------------------------------
    default:
      return <>{overlays}</>;
  }
}

export default ScanFeature;
