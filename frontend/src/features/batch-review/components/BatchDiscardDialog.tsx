/**
 * BatchDiscardDialog Component
 *
 * Story 14e-16: Confirmation dialog for discarding batch receipts.
 * Supports both single receipt discard and batch cancel scenarios.
 *
 * Usage via ModalManager:
 * ```tsx
 * openModal('batchDiscard', {
 *   receiptId: 'abc123',  // For single receipt discard
 *   onConfirm: () => handleDiscard(),
 *   onCancel: closeModal,
 *   t,
 *   theme,
 * });
 *
 * // Or for batch cancel (discard all):
 * openModal('batchDiscard', {
 *   unsavedCount: 5,  // For batch cancel
 *   onConfirm: () => handleCancelBatch(),
 *   onCancel: closeModal,
 *   t,
 *   theme,
 * });
 * ```
 */
import React from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import type { BatchDiscardProps } from '@managers/ModalManager/types';

/**
 * BatchDiscardDialog - Confirmation dialog for discard actions.
 *
 * Renders a modal dialog asking user to confirm discard.
 * Works with ModalManager which handles the backdrop and open state.
 */
export const BatchDiscardDialog: React.FC<BatchDiscardProps> = ({
  unsavedCount,
  receiptId,
  onConfirm,
  onCancel,
  t,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  // Determine if this is single receipt or batch cancel
  const isSingleDiscard = !!receiptId;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
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
          className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          {t('batchDiscardConfirmTitle')}
        </h3>
        <p
          id="discard-dialog-desc"
          className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          {isSingleDiscard
            ? t('batchDiscardConfirmMessage')
            : unsavedCount && unsavedCount > 1
              ? t('batchDiscardConfirmMessagePlural') || t('batchDiscardConfirmMessage')
              : t('batchDiscardConfirmMessage')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            data-testid="discard-confirm-button"
          >
            <Trash2 size={16} />
            {t('batchDiscardConfirmYes')}
          </button>
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            data-testid="discard-cancel-button"
          >
            <RotateCcw size={16} />
            {t('batchDiscardConfirmNo')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchDiscardDialog;
