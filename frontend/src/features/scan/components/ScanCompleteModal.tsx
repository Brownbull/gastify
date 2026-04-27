/**
 * ScanCompleteModal Component
 *
 * Story 14.23: Unified Transaction Editor
 * Story 14d.4b: Migrated to use ScanContext for scan-specific state
 * Story 14e-9b: Migrated to use Zustand store instead of ScanContext
 * Epic 14: Core Implementation
 *
 * Centered modal displayed after a NEW transaction scan completes.
 * Gives user the choice to save immediately or edit first.
 *
 * Features:
 * - Centered modal with transaction summary (merchant, total, item count)
 * - Two clear action buttons: "Guardar" and "Editar"
 * - Slide-up animation with spring easing
 * - Dark mode support
 * - Respects reduced motion preferences
 *
 * Note: Only shown for NEW transactions. Re-scans go straight to edit mode.
 *
 * Story 14e-9b Migration:
 * - Uses useScanActiveDialog() to read dialog state from Zustand store
 * - Uses useScanActions() for resolveDialog/dismissDialog actions
 * - Falls back to props if store data not available (backward compatibility)
 * - Store provides: transaction via activeDialog.data
 *
 * @see /home/khujta/.claude/plans/fancy-doodling-island.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Check, Pencil, X, Receipt } from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { translateCategory } from '@/utils/categoryTranslations';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASING } from '@/components/animation/constants';
import type { Language } from '@/utils/translations';
import { useScanActiveDialog, useScanActions } from '@features/scan/store';
import { DIALOG_TYPES } from '../types/scanStateMachine';

/**
 * Story 14d.4b: Data structure for scan_complete dialog.
 * Story 14e-9b: Used with Zustand store activeDialog.
 */
export interface ScanCompleteDialogData {
  transaction: Transaction;
}

/**
 * Props for ScanCompleteModal component
 */
export interface ScanCompleteModalProps {
  /** Theme for styling - required, from app settings */
  theme: 'light' | 'dark';
  /** Translation function - required, from app settings */
  t: (key: string) => string;
  /** Currency format function - required, from app settings */
  formatCurrency: (amount: number, currency: string) => string;
  /** Currency code - required, from app settings */
  currency: string;
  /** Language for category translation - required, from app settings */
  lang?: Language;

  // === Story 14e-9b: Props below are now optional - can be read from Zustand store ===

  /** Whether the modal is visible - optional if using Zustand store */
  visible?: boolean;
  /** Transaction data from scan result - optional if using Zustand store */
  transaction?: Transaction | null;
  /** Callback when user clicks "Guardar" (Save) - optional if using Zustand store */
  onSave?: () => void;
  /** Callback when user clicks "Editar" (Edit) - optional if using Zustand store */
  onEdit?: () => void;
  /** Callback when user clicks backdrop or X button - optional if using Zustand store */
  onDismiss?: () => void;
  /** Whether save is in progress - optional if using Zustand store */
  isSaving?: boolean;
}

/**
 * ScanCompleteModal - Centered modal for "Save now or Edit?" choice
 *
 * Story 14e-9b: Uses Zustand store for scan-specific state with prop fallback.
 */
export const ScanCompleteModal: React.FC<ScanCompleteModalProps> = ({
  visible: visibleProp,
  transaction: transactionProp,
  onSave: onSaveProp,
  onEdit: onEditProp,
  onDismiss: onDismissProp,
  theme,
  t,
  formatCurrency,
  currency,
  lang = 'es',
  isSaving: isSavingProp = false,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  // Story 14e-9b: Get scan state from Zustand store
  const activeDialog = useScanActiveDialog();
  const { resolveDialog, dismissDialog } = useScanActions();

  // Story 14e-9b: Derive values from store or fall back to props
  const storeDialogData = activeDialog?.type === DIALOG_TYPES.SCAN_COMPLETE
    ? (activeDialog.data as ScanCompleteDialogData)
    : null;

  // Determine if modal should be visible
  const visible = storeDialogData !== null || visibleProp === true;

  // Get transaction from store or props
  const transaction = storeDialogData?.transaction ?? transactionProp;

  // isSaving could come from store in future
  const isSaving = isSavingProp;

  // Story 14e-9b: Create wrapped handlers that dispatch to store and call props
  const handleSave = useCallback(() => {
    resolveDialog(DIALOG_TYPES.SCAN_COMPLETE, { choice: 'save' });
    onSaveProp?.();
  }, [resolveDialog, onSaveProp]);

  const handleEdit = useCallback(() => {
    resolveDialog(DIALOG_TYPES.SCAN_COMPLETE, { choice: 'edit' });
    onEditProp?.();
  }, [resolveDialog, onEditProp]);

  const handleDismiss = useCallback(() => {
    dismissDialog();
    onDismissProp?.();
  }, [dismissDialog, onDismissProp]);

  // Handle visibility animation
  useEffect(() => {
    if (visible) {
      // Small delay to trigger animation
      const timer = setTimeout(() => setIsAnimatingIn(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [visible]);

  // Don't render if not visible and not animating
  if (!visible && !isAnimatingIn) {
    return null;
  }

  const itemCount = transaction?.items?.length || 0;
  const merchantName = transaction?.alias || transaction?.merchant || t('unknown');
  const total = transaction?.total || 0;
  const category = transaction?.category || 'Other';
  const categoryEmoji = getCategoryEmoji(category);
  const translatedCategory = translateCategory(category, lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-complete-title"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity ${
        isAnimatingIn ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
      }}
    >
      {/* Backdrop - v9.7.0: No onClick to prevent accidental dismissal */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm`}
      />

      {/* Modal content */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all ${
          isAnimatingIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${isDark ? 'bg-slate-800' : 'bg-white'}`}
        style={{
          transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.SLOW}ms`,
          transitionTimingFunction: EASING.SPRING,
        }}
      >
        {/* Header with close button */}
        <div className={`relative px-6 pt-6 pb-4 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          {/* Story 14e-9b: Always show close button since dismissDialog is always available from store */}
          {(onDismissProp || storeDialogData) && (
            <button
              onClick={handleDismiss}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                isDark
                  ? 'hover:bg-slate-700 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
              aria-label={t('close') || 'Close'}
            >
              <X size={20} />
            </button>
          )}

          {/* Success icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
              }`}
            >
              <Check
                size={32}
                className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                strokeWidth={3}
              />
            </div>
          </div>

          {/* Title */}
          <h2
            id="scan-complete-title"
            className={`text-xl font-bold text-center ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {t('scanComplete') || '¡Escaneo completo!'}
          </h2>
        </div>

        {/* Transaction summary */}
        <div className={`px-6 py-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          {/* Merchant */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{categoryEmoji}</span>
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold truncate ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {merchantName}
              </p>
              <p
                className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {translatedCategory}
              </p>
            </div>
          </div>

          {/* Total and items */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {itemCount} {itemCount === 1 ? (t('item') || 'ítem') : (t('items') || 'ítems')}
              </span>
            </div>
            <p
              className={`text-xl font-bold ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(total, currency)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 py-5 space-y-3">
          {/* Primary: Save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            style={{
              boxShadow: isDark
                ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                : '0 4px 12px rgba(5, 150, 105, 0.3)',
            }}
          >
            {isSaving ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('saving') || 'Guardando...'}
              </>
            ) : (
              <>
                <Check size={20} strokeWidth={2.5} />
                {t('saveNow') || 'Guardar ahora'}
              </>
            )}
          </button>

          {/* Secondary: Edit */}
          <button
            onClick={handleEdit}
            disabled={isSaving}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Pencil size={18} />
            {t('editFirst') || 'Editar primero'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanCompleteModal;
