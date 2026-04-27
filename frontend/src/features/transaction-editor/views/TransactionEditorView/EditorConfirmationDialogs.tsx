/**
 * EditorConfirmationDialogs — Cancel, Rescan, Delete confirmation dialogs
 *
 * Story 15-5d: Extracted from TransactionEditorViewInternal.tsx
 *
 * Three modal dialogs used by the transaction editor:
 * - Cancel: warns about discarding unsaved changes (with credit warning)
 * - Rescan: confirms re-scanning an existing transaction
 * - Delete: confirms permanent transaction deletion
 */

import { ChevronLeft, Trash2, RefreshCw } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface EditorConfirmationDialogsProps {
  /** Cancel confirmation */
  showCancelConfirm: boolean;
  onDismissCancelConfirm: () => void;
  onConfirmCancel: () => void;
  creditUsed: boolean;

  /** Rescan confirmation */
  showRescanConfirm: boolean;
  onDismissRescanConfirm: () => void;
  onConfirmRescan: () => void;

  /** Delete confirmation */
  showDeleteConfirm: boolean;
  hasTransactionId: boolean;
  onDismissDeleteConfirm: () => void;
  onConfirmDelete: () => void;

  /** Shared */
  isDark: boolean;
  t: (key: string) => string;
}

// ============================================================================
// Component
// ============================================================================

export function EditorConfirmationDialogs({
  showCancelConfirm,
  onDismissCancelConfirm,
  onConfirmCancel,
  creditUsed,
  showRescanConfirm,
  onDismissRescanConfirm,
  onConfirmRescan,
  showDeleteConfirm,
  hasTransactionId,
  onDismissDeleteConfirm,
  onConfirmDelete,
  isDark,
  t,
}: EditorConfirmationDialogsProps) {
  return (
    <>
      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onDismissCancelConfirm}
        >
          <div
            className="mx-4 p-6 rounded-xl shadow-xl max-w-sm w-full"
            style={{ backgroundColor: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--primary)' }}>
              {t('discardChanges')}
            </h2>
            {creditUsed && (
              <div
                className="p-3 rounded-lg mb-4 flex items-start gap-2"
                style={{
                  backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.5)',
                }}
              >
                <span className="text-amber-500 text-lg">⚠️</span>
                <span className="text-sm font-medium" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>
                  {t('creditAlreadyUsed')}
                </span>
              </div>
            )}
            <p className="text-sm mb-6" style={{ color: 'var(--secondary)' }}>
              {t('discardChangesMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDismissCancelConfirm}
                className="flex-1 py-2 px-4 rounded-lg border font-medium flex items-center justify-center gap-2"
                style={{
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  color: 'var(--primary)',
                  backgroundColor: 'transparent',
                }}
              >
                <ChevronLeft size={16} strokeWidth={2} />
                {t('back')}
              </button>
              <button
                onClick={onConfirmCancel}
                className="flex-1 py-2 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--error)' }}
              >
                <Trash2 size={16} strokeWidth={2} />
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-scan Confirmation Dialog */}
      {showRescanConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onDismissRescanConfirm}
        >
          <div
            className="mx-4 p-6 rounded-xl shadow-xl max-w-sm w-full"
            style={{ backgroundColor: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}
              >
                <RefreshCw size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                {t('rescanConfirmTitle')}
              </h2>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--secondary)' }}>
              {t('rescanConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDismissRescanConfirm}
                className="flex-1 py-2 px-4 rounded-lg border font-medium"
                style={{
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  color: 'var(--primary)',
                  backgroundColor: 'transparent',
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={onConfirmRescan}
                className="flex-1 py-2 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <RefreshCw size={16} strokeWidth={2} />
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && hasTransactionId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onDismissDeleteConfirm}
        >
          <div
            className="mx-4 p-6 rounded-xl shadow-xl max-w-sm w-full"
            style={{ backgroundColor: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }}
              >
                <Trash2 size={20} style={{ color: 'var(--error)' }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('deleteConfirmTitle')}
              </h2>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('deleteConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDismissDeleteConfirm}
                className="flex-1 py-2 px-4 rounded-lg border font-medium flex items-center justify-center gap-2"
                style={{
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  color: 'var(--text-primary)',
                  backgroundColor: 'transparent',
                }}
              >
                <ChevronLeft size={16} strokeWidth={2} />
                {t('cancel')}
              </button>
              <button
                onClick={onConfirmDelete}
                className="flex-1 py-2 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--error)' }}
              >
                <Trash2 size={16} strokeWidth={2} />
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
