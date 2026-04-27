/**
 * TransactionConflictDialog Component
 *
 * Story 14.24: Persistent Transaction State & Single Active Transaction
 *
 * Modal displayed when user tries to edit a transaction while another
 * transaction is already active (pending scan or unsaved changes).
 *
 * Presents options to:
 * - Continue editing current transaction
 * - View/resume the conflicting transaction
 * - Discard the conflicting transaction and proceed
 *
 * @module TransactionConflictDialog
 * @see docs/sprint-artifacts/epic14/stories/story-14.24-persistent-transaction-state.md
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { DEFAULT_CURRENCY } from '../../utils/currency';

// ============================================================================
// Types — canonical definitions at src/types/conflict.ts (Story 15b-0d)
// Re-exported here for backward compatibility with existing consumers
// ============================================================================

export type { ConflictReason, ConflictingTransaction } from '@/types/conflict';
import type { ConflictReason, ConflictingTransaction } from '@/types/conflict';

export interface TransactionConflictDialogProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The conflicting transaction details */
  conflictingTransaction: ConflictingTransaction | null;
  /** Reason for the conflict */
  conflictReason: ConflictReason | null;
  /** Callback when user chooses to continue with current view (close dialog without action) */
  onContinueCurrent?: () => void;
  /** Callback when user chooses to view/resume the conflicting transaction */
  onViewConflicting: () => void;
  /** Callback when user chooses to discard the conflicting transaction */
  onDiscardConflicting: () => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Language for dynamic text */
  lang?: 'en' | 'es';
  /** Currency formatter */
  formatCurrency?: (amount: number, currency: string) => string;
}

// ============================================================================
// Component
// ============================================================================

export const TransactionConflictDialog: React.FC<TransactionConflictDialogProps> = ({
  isOpen,
  conflictingTransaction,
  conflictReason,
  onContinueCurrent: _onContinueCurrent, // Reserved for future use, currently same as onClose
  onViewConflicting,
  onDiscardConflicting,
  onClose,
  t,
  lang = 'es',
  formatCurrency = (amount, currency) => `${currency} ${amount.toLocaleString()}`,
}) => {
  void _onContinueCurrent; // Suppress unused warning
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Restore focus when modal closes
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      (previousActiveElement.current as HTMLElement)?.focus?.();
    }, 0);
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modalElement = modalRef.current;
    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !conflictingTransaction) return null;

  // Get title based on conflict reason
  const getTitle = () => {
    if (lang === 'es') {
      switch (conflictReason) {
        case 'scan_in_progress':
          return 'Escaneo en progreso';
        case 'credit_used':
          return 'Credito ya usado';
        case 'has_unsaved_changes':
          return 'Cambios sin guardar';
        default:
          return 'Transaccion activa';
      }
    }
    switch (conflictReason) {
      case 'scan_in_progress':
        return 'Scan in progress';
      case 'credit_used':
        return 'Credit already used';
      case 'has_unsaved_changes':
        return 'Unsaved changes';
      default:
        return 'Active transaction';
    }
  };

  // Get description based on conflict reason
  const getDescription = () => {
    if (lang === 'es') {
      switch (conflictReason) {
        case 'scan_in_progress':
          return 'Ya hay un escaneo en progreso. Esperalo o descartalo para continuar.';
        case 'credit_used':
          return 'Ya usaste 1 credito para escanear esta boleta. Si la descartas, perderas el credito.';
        case 'has_unsaved_changes':
          return 'Tienes cambios sin guardar en otra transaccion. Guardalos o descártalos para continuar.';
        default:
          return 'Ya tienes una transaccion activa.';
      }
    }
    switch (conflictReason) {
      case 'scan_in_progress':
        return 'A scan is already in progress. Wait for it to complete or discard it to continue.';
      case 'credit_used':
        return 'You already used 1 credit to scan this receipt. If you discard it, you will lose the credit.';
      case 'has_unsaved_changes':
        return 'You have unsaved changes in another transaction. Save or discard them to continue.';
      default:
        return 'You already have an active transaction.';
    }
  };

  // Get transaction summary
  const getTransactionSummary = () => {
    const { merchant, total, currency, source } = conflictingTransaction;

    if (source === 'new_scan' && !merchant) {
      return lang === 'es' ? 'Nueva boleta escaneada' : 'New scanned receipt';
    }

    if (source === 'manual_entry') {
      return lang === 'es' ? 'Entrada manual' : 'Manual entry';
    }

    if (merchant && total !== undefined && total > 0) {
      return `${merchant} - ${formatCurrency(total, currency || DEFAULT_CURRENCY)}`;
    }

    if (merchant) {
      return merchant;
    }

    return lang === 'es' ? 'Transaccion en progreso' : 'Transaction in progress';
  };

  // Button labels
  const viewButtonLabel = lang === 'es' ? 'Ver transaccion' : 'View transaction';
  const discardButtonLabel = conflictingTransaction.creditUsed
    ? (lang === 'es' ? 'Descartar (perder credito)' : 'Discard (lose credit)')
    : (lang === 'es' ? 'Descartar' : 'Discard');

  return createPortal(
    <div
      className="fixed inset-0 z-[200]"
      onClick={handleClose}
      role="presentation"
      data-testid="conflict-dialog-overlay"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden="true"
      />

      {/* Centering container */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Card */}
        <div
          ref={modalRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="conflict-modal-title"
          aria-describedby="conflict-modal-description"
          className="relative w-full max-w-[343px] rounded-xl overflow-hidden shadow-xl pointer-events-auto"
          style={{ backgroundColor: 'var(--bg)' }}
          onClick={(e) => e.stopPropagation()}
          data-testid="conflict-dialog"
        >
          {/* Header with warning icon */}
          <div className="p-3 pb-2 flex items-start gap-2.5">
            {/* Warning icon circle */}
            <div
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--warning-light, #FEF3C7)' }}
            >
              <AlertTriangle
                size={18}
                strokeWidth={2}
                style={{ color: 'var(--warning, #F59E0B)' }}
              />
            </div>
            {/* Title and description */}
            <div className="flex-1">
              <div
                id="conflict-modal-title"
                className="text-sm font-semibold mb-0.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {getTitle()}
              </div>
              <div
                id="conflict-modal-description"
                className="text-xs"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}
              >
                {getDescription()}
              </div>
            </div>
            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-opacity-10 transition-colors"
              aria-label={t('close') || 'Close'}
              data-testid="conflict-modal-close"
            >
              <X size={18} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Transaction preview */}
          <div
            className="mx-3 p-2.5 rounded-lg"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div
              className="text-xs font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {getTransactionSummary()}
            </div>
            {conflictingTransaction.creditUsed && (
              <div
                className="text-xs mt-1"
                style={{ color: 'var(--warning, #F59E0B)' }}
              >
                {lang === 'es' ? '1 credito usado' : '1 credit used'}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-3 pt-3 flex flex-col gap-2">
            {/* View/Resume button - primary action */}
            <button
              onClick={() => {
                onViewConflicting();
                handleClose();
              }}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white'
              }}
              data-testid="conflict-view-button"
            >
              <Eye size={16} strokeWidth={2} />
              {viewButtonLabel}
              <ChevronRight size={16} strokeWidth={2} className="ml-auto" />
            </button>

            {/* Discard button - destructive action */}
            <button
              onClick={() => {
                onDiscardConflicting();
              }}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: conflictingTransaction.creditUsed
                  ? 'var(--error-light, #FEE2E2)'
                  : 'var(--bg-secondary)',
                color: conflictingTransaction.creditUsed
                  ? 'var(--error, #EF4444)'
                  : 'var(--text-secondary)'
              }}
              data-testid="conflict-discard-button"
            >
              <Trash2 size={16} strokeWidth={2} />
              {discardButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TransactionConflictDialog;
