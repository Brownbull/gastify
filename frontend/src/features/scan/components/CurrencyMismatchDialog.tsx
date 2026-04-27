/**
 * CurrencyMismatchDialog Component
 *
 * Story 14.15b: V3 Prompt Production Integration
 * Story 14d.4b: Migrated to use ScanContext for scan-specific state
 *
 * Displays when AI-detected currency differs from user's default currency.
 * Allows user to choose which currency to use for the transaction.
 *
 * Features:
 * - Shows AI-detected currency vs user's default
 * - Options to use detected, use default, or cancel
 * - Follows modal overlay pattern from QuickSaveCard
 * - Dark mode support
 * - Accessibility features (ARIA labels, keyboard navigation)
 *
 * Story 14d.4b Migration:
 * - Uses useScanOptional() to read dialog state from context
 * - Falls back to props if context not available (backward compatibility)
 * - Calls resolveDialog() on user choice, which App.tsx bridge observes
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.15b-v3-prompt-integration.md
 * @see docs/sprint-artifacts/epic14d/stories/story-14d.4b-consumer-migration.md
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
// Story 14e-11: Migrated from useScanOptional (ScanContext) to Zustand store
import { useScanActiveDialog, useScanActions } from '@features/scan/store';
import { DIALOG_TYPES } from '@shared/types/scanWorkflow';

// Story 14d.6: Import centralized type from scanStateMachine
import type { CurrencyMismatchDialogData } from '@features/scan/types/scanStateMachine';
// Re-export for backward compatibility
export type { CurrencyMismatchDialogData };

export interface CurrencyMismatchDialogProps {
  /** User's default currency code (e.g., "CLP", "USD") - required, comes from user preferences */
  userCurrency: string;
  /** Theme for styling - required, comes from app settings */
  theme: 'light' | 'dark';
  /** Translation function - required, comes from app settings */
  t: (key: string) => string;

  // === Story 14d.4b: Props below are now optional - can be read from ScanContext ===

  /** AI-detected currency code (e.g., "GBP", "EUR") - optional if using ScanContext */
  detectedCurrency?: string;
  /** Whether dialog is visible - optional if using ScanContext (derived from activeDialog.type) */
  isOpen?: boolean;
  /**
   * Callback when user chooses detected currency.
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onUseDetected?: (data?: CurrencyMismatchDialogData) => void;
  /**
   * Callback when user chooses their default currency.
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onUseDefault?: (data?: CurrencyMismatchDialogData) => void;
  /**
   * Callback when user cancels.
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onCancel?: (data?: CurrencyMismatchDialogData) => void;
}

/**
 * Currency display name mapping for common currencies.
 * Provides user-friendly names for currency codes.
 */
const CURRENCY_NAMES: Record<string, string> = {
  CLP: 'Chilean Peso',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  MXN: 'Mexican Peso',
  ARS: 'Argentine Peso',
  BRL: 'Brazilian Real',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CNY: 'Chinese Yuan',
  KRW: 'Korean Won',
  INR: 'Indian Rupee',
  CHF: 'Swiss Franc',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
  PLN: 'Polish Zloty',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  COP: 'Colombian Peso',
  PEN: 'Peruvian Sol',
};

/**
 * Get display name for a currency code.
 */
function getCurrencyDisplayName(code: string): string {
  return CURRENCY_NAMES[code] || code;
}

/**
 * CurrencyMismatchDialog displays when AI detects a different currency than user's default.
 *
 * Story 14d.4b: Uses ScanContext for scan-specific state with prop fallback for backward compatibility.
 */
export const CurrencyMismatchDialog: React.FC<CurrencyMismatchDialogProps> = ({
  detectedCurrency: detectedCurrencyProp,
  userCurrency,
  onUseDetected: onUseDetectedProp,
  onUseDefault: onUseDefaultProp,
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
  // Context takes precedence when available - this allows gradual migration
  const contextDialogData = activeDialog?.type === DIALOG_TYPES.CURRENCY_MISMATCH
    ? (activeDialog.data as CurrencyMismatchDialogData)
    : null;

  // Determine if dialog should be open
  const isOpen = contextDialogData !== null || isOpenProp === true;

  // Get detected currency from context or props
  const detectedCurrency = contextDialogData?.detectedCurrency ?? detectedCurrencyProp ?? '';

  // Story 14d.6: Create handlers that pass dialog data to callbacks
  // Story 14e-11: Use Zustand actions directly (always available)
  // DESIGN DECISION: We capture dialog data BEFORE calling resolveDialog (which clears it),
  // then pass the data to the prop callback. This enables context-based dialog handling
  // where App.tsx reads data from the callback parameter instead of local state.
  const handleUseDetected = useCallback(() => {
    // Capture data before resolveDialog clears it
    const data = contextDialogData ?? undefined;

    // Story 14e-11: Zustand actions are always available
    resolveDialog(DIALOG_TYPES.CURRENCY_MISMATCH, { choice: 'detected' });
    // Pass data to callback for context-based dialog handling
    onUseDetectedProp?.(data);
  }, [resolveDialog, onUseDetectedProp, contextDialogData]);

  const handleUseDefault = useCallback(() => {
    // Capture data before resolveDialog clears it
    const data = contextDialogData ?? undefined;

    // Story 14e-11: Zustand actions are always available
    resolveDialog(DIALOG_TYPES.CURRENCY_MISMATCH, { choice: 'default' });
    // Pass data to callback for context-based dialog handling
    onUseDefaultProp?.(data);
  }, [resolveDialog, onUseDefaultProp, contextDialogData]);

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

  const detectedName = getCurrencyDisplayName(detectedCurrency);
  // userCurrencyName is intentionally unused - showing code instead of full name

  // TD-18-26: Portal to document.body to avoid ancestor containing-block issues
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="currency-mismatch-title"
    >
      {/* Backdrop - v9.7.0: No onClick to prevent accidental dismissal */}
      {/* User must explicitly choose an option or press X/Escape */}
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
              isDark ? 'bg-amber-900/30' : 'bg-amber-100'
            }`}
          >
            <AlertCircle
              size={32}
              className={isDark ? 'text-amber-400' : 'text-amber-600'}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          id="currency-mismatch-title"
          className="text-lg font-semibold text-center mb-2"
        >
          {t('currencyMismatchTitle')}
        </h2>

        {/* Message */}
        <p
          className={`text-center mb-6 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          {t('currencyMismatchMessage').replace('{currency}', detectedName)}
        </p>

        {/* Currency comparison */}
        <div
          className={`flex items-center justify-center gap-3 mb-6 p-4 rounded-xl ${
            isDark ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div
              className={`text-xs uppercase tracking-wide mb-1 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {t('detected')}
            </div>
            <div className="text-xl font-bold text-amber-500">
              {detectedCurrency}
            </div>
          </div>
          <ArrowRight
            size={20}
            className={isDark ? 'text-gray-500' : 'text-gray-400'}
          />
          <div className="text-center">
            <div
              className={`text-xs uppercase tracking-wide mb-1 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {t('yourDefault')}
            </div>
            <div
              className={`text-xl font-bold ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              {userCurrency}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Use detected currency (primary) */}
          <button
            onClick={handleUseDetected}
            className="w-full py-3 px-4 rounded-xl font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            {t('useDetectedCurrency').replace('{currency}', detectedCurrency)}
          </button>

          {/* Use default currency (secondary) */}
          <button
            onClick={handleUseDefault}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
              isDark
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {t('useMyDefaultCurrency').replace('{currency}', userCurrency)}
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

export default CurrencyMismatchDialog;
