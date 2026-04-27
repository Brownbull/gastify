/**
 * TotalMismatchDialog Component
 *
 * Story 14d.4b: Migrated to use ScanContext for scan-specific state
 *
 * Displays when the extracted total doesn't match the sum of items.
 * Allows user to choose between the extracted total or the calculated items sum.
 *
 * Features:
 * - Shows extracted total vs calculated items sum
 * - Indicates if error appears to be a missing/extra digit
 * - Options to use items sum, keep original, or cancel
 * - Follows modal overlay pattern from CurrencyMismatchDialog
 * - Dark mode support
 * - Accessibility features (ARIA labels, keyboard navigation)
 *
 * Story 14d.4b Migration:
 * - Uses useScanOptional() to read dialog state from context
 * - Falls back to props if context not available (backward compatibility)
 * - Calls resolveDialog() on user choice
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Calculator, ArrowRight, X } from 'lucide-react';
import { TotalValidationResult } from '@features/scan/utils/totalValidation';
import { formatCurrency, DEFAULT_CURRENCY } from '@/utils/currency';
// Story 14e-11: Migrated from useScanOptional (ScanContext) to Zustand store
import { useScanActiveDialog, useScanActions } from '@features/scan/store';
import { DIALOG_TYPES } from '@shared/types/scanWorkflow';

// Story 14d.6: Import centralized type from scanStateMachine
import type { TotalMismatchDialogData } from '@features/scan/types/scanStateMachine';
// Re-export for backward compatibility
export type { TotalMismatchDialogData };

export interface TotalMismatchDialogProps {
  /** Theme for styling - required, comes from app settings */
  theme: 'light' | 'dark';
  /** Translation function - required, comes from app settings */
  t: (key: string) => string;

  // === Story 14d.4b: Props below are now optional - can be read from ScanContext ===

  /** Validation result from totalValidation utility - optional if using ScanContext */
  validationResult?: TotalValidationResult;
  /** Currency code for formatting - optional if using ScanContext */
  currency?: string;
  /** Whether dialog is visible - optional if using ScanContext */
  isOpen?: boolean;
  /**
   * Callback when user chooses to use the items sum.
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onUseItemsSum?: (data?: TotalMismatchDialogData) => void;
  /**
   * Callback when user chooses to keep the extracted total.
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onKeepOriginal?: (data?: TotalMismatchDialogData) => void;
  /**
   * Callback when user cancels.
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onCancel?: (data?: TotalMismatchDialogData) => void;
}


// Default validation result for when no data is available
const DEFAULT_VALIDATION_RESULT: TotalValidationResult = {
  isValid: true,
  extractedTotal: 0,
  itemsSum: 0,
  discrepancy: 0,
  discrepancyPercent: 0,
  suggestedTotal: null,
  errorType: 'none',
};

/**
 * TotalMismatchDialog displays when extracted total doesn't match items sum.
 *
 * Story 14d.4b: Uses ScanContext for scan-specific state with prop fallback.
 */
export const TotalMismatchDialog: React.FC<TotalMismatchDialogProps> = ({
  validationResult: validationResultProp,
  currency: currencyProp,
  onUseItemsSum: onUseItemsSumProp,
  onKeepOriginal: onKeepOriginalProp,
  onCancel: onCancelProp,
  theme,
  t,
  isOpen: isOpenProp,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Story 14e-11: Use Zustand store selectors and actions
  const activeDialog = useScanActiveDialog();
  const { resolveDialog, dismissDialog } = useScanActions();

  // Story 14d.4b: Derive values from context or fall back to props
  const contextDialogData = activeDialog?.type === DIALOG_TYPES.TOTAL_MISMATCH
    ? (activeDialog.data as TotalMismatchDialogData)
    : null;

  // Determine if dialog should be open
  const isOpen = contextDialogData !== null || isOpenProp === true;

  // Get validation result from context or props
  const validationResult = contextDialogData?.validationResult ?? validationResultProp ?? DEFAULT_VALIDATION_RESULT;

  // Story 14.34: Use transaction's detected currency if available, otherwise fall back to prop/default
  // This ensures foreign currencies (USD, EUR, GBP) are formatted correctly with cents/decimals
  const currency = contextDialogData?.pendingTransaction?.currency ?? currencyProp ?? DEFAULT_CURRENCY;

  // Story 14d.6: Create handlers that pass dialog data to callbacks
  // Story 14e-11: Use Zustand actions directly (always available)
  const handleUseItemsSum = useCallback(() => {
    // Capture data before resolveDialog clears it
    const data = contextDialogData ?? undefined;

    // Story 14e-11: Zustand actions are always available
    resolveDialog(DIALOG_TYPES.TOTAL_MISMATCH, { choice: 'items_sum' });
    // Pass data to callback for context-based dialog handling
    onUseItemsSumProp?.(data);
  }, [resolveDialog, onUseItemsSumProp, contextDialogData]);

  const handleKeepOriginal = useCallback(() => {
    // Capture data before resolveDialog clears it
    const data = contextDialogData ?? undefined;

    // Story 14e-11: Zustand actions are always available
    resolveDialog(DIALOG_TYPES.TOTAL_MISMATCH, { choice: 'original' });
    // Pass data to callback for context-based dialog handling
    onKeepOriginalProp?.(data);
  }, [resolveDialog, onKeepOriginalProp, contextDialogData]);

  const handleCancel = useCallback(() => {
    // Capture data before dismissDialog clears it
    const data = contextDialogData ?? undefined;

    // Story 14e-11: Zustand actions are always available
    dismissDialog();
    // Pass data to callback for context-based dialog handling
    onCancelProp?.(data);
  }, [dismissDialog, onCancelProp, contextDialogData]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleCancel]
  );

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      dialogRef.current?.focus();
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const { extractedTotal, itemsSum, discrepancyPercent, errorType } = validationResult;
  const formattedExtracted = formatCurrency(extractedTotal, currency);
  const formattedItemsSum = formatCurrency(itemsSum, currency);

  // Get the hint message based on error type
  const getHintMessage = () => {
    if (errorType === 'missing_digit') {
      return t('totalMismatchMissingDigit');
    }
    if (errorType === 'extra_digit') {
      return t('totalMismatchExtraDigit');
    }
    return null;
  };

  const hintMessage = getHintMessage();

  // TD-18-26: Portal to document.body to avoid ancestor containing-block issues
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="total-mismatch-title"
    >
      {/* Backdrop - v9.7.0: No onClick to prevent accidental dismissal */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full max-w-sm rounded-2xl shadow-xl p-6 ${
          isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
        style={{
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleCancel}
          className={`absolute top-3 right-3 p-3 rounded-full transition-colors ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
          aria-label={t('close')}
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`p-3 rounded-full ${
              isDark ? 'bg-orange-900/30' : 'bg-orange-100'
            }`}
          >
            <AlertTriangle
              size={32}
              className={isDark ? 'text-orange-400' : 'text-orange-600'}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          id="total-mismatch-title"
          className="text-lg font-semibold text-center mb-2"
        >
          {t('totalMismatchTitle')}
        </h2>

        {/* Message */}
        <p
          className={`text-center mb-4 text-sm ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          {t('totalMismatchMessage')
            .replace('{extractedTotal}', formattedExtracted)
            .replace('{itemsSum}', formattedItemsSum)}
        </p>

        {/* Hint message if digit error detected */}
        {hintMessage && (
          <p
            className={`text-center mb-4 text-sm font-medium ${
              isDark ? 'text-orange-300' : 'text-orange-600'
            }`}
          >
            {hintMessage}
          </p>
        )}

        {/* Total comparison */}
        <div
          className={`flex items-center justify-center gap-3 mb-4 p-4 rounded-xl ${
            isDark ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div
              className={`text-xs uppercase tracking-wide mb-1 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {t('total')}
            </div>
            <div className={`text-lg font-bold ${
              errorType !== 'none'
                ? (isDark ? 'text-orange-400' : 'text-orange-600')
                : (isDark ? 'text-gray-300' : 'text-gray-700')
            }`}>
              {formattedExtracted}
            </div>
          </div>
          <ArrowRight
            size={20}
            className={isDark ? 'text-gray-500' : 'text-gray-400'}
          />
          <div className="text-center">
            <div
              className={`text-xs uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <Calculator size={12} />
              {t('itemsSum')}
            </div>
            <div
              className={`text-lg font-bold ${
                isDark ? 'text-green-400' : 'text-green-600'
              }`}
            >
              {formattedItemsSum}
            </div>
          </div>
        </div>

        {/* Discrepancy info */}
        <div
          className={`text-center text-xs mb-6 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          {discrepancyPercent}% {t('diff').toLowerCase()}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Use items sum (primary - recommended) */}
          <button
            onClick={handleUseItemsSum}
            className="w-full py-3 px-4 rounded-xl font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {t('useItemsSum').replace('{total}', formattedItemsSum)}
          </button>

          {/* Keep original (secondary) */}
          <button
            onClick={handleKeepOriginal}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
              isDark
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {t('useExtractedTotal').replace('{total}', formattedExtracted)}
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default TotalMismatchDialog;
