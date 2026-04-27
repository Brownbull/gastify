/**
 * ConfirmationDialog — Shared confirmation dialog component
 *
 * Story 15-3a: Promoted from batch/ to shared/ with enhanced accessibility.
 * Replaces window.confirm() and inline DeleteConfirmModal across the app.
 *
 * Features:
 * - Theme-aware styling (light/dark)
 * - Focus trap (Tab/Shift+Tab cycle)
 * - ESC key to cancel
 * - Body scroll lock
 * - Focus restoration on close
 * - Destructive variant (red confirm button)
 * - data-testid attributes for E2E testing
 *
 * @module components/shared/ConfirmationDialog
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmationDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Text for confirm button (default: "Confirm") */
  confirmText?: string;
  /** Text for cancel button (default: "Cancel") */
  cancelText?: string;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Make confirm button destructive (red) */
  isDestructive?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  theme,
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  const isDark = theme === 'dark';
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Focus confirm button when dialog opens, store previous focus for restoration
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Restore focus when dialog closes
  const handleClose = useCallback(() => {
    onCancel();
    setTimeout(() => {
      (previousActiveElement.current as HTMLElement)?.focus?.();
    }, 0);
  }, [onCancel]);

  // ESC key to cancel
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

  // Focus trap within dialog
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modalElement = modalRef.current;
    const getFocusableElements = () =>
      modalElement.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

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

  // Body scroll lock
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

  if (!isOpen) return null;

  // Theme-aware colors
  const overlayBg = 'bg-black/50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Warning styling
  const warningBg = isDark ? 'bg-amber-900/30' : 'bg-amber-50';
  const warningIcon = isDark ? 'text-amber-400' : 'text-amber-500';

  // Button colors
  const confirmBg = isDestructive
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-blue-600 hover:bg-blue-700';
  const cancelStyles = isDark
    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
    : 'border-slate-300 text-slate-700 hover:bg-slate-50';

  return (
    <div
      className={`fixed inset-0 ${overlayBg} flex items-center justify-center z-50 p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      onClick={handleClose}
      data-testid="confirmation-dialog"
    >
      <div
        ref={modalRef}
        className={`w-full max-w-sm rounded-2xl border ${cardBorder} ${cardBg} shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${warningBg}`}>
              <AlertTriangle className={warningIcon} size={24} />
            </div>
            <h2
              id="confirmation-dialog-title"
              className={`text-lg font-semibold ${textPrimary}`}
            >
              {title}
            </h2>
          </div>

          {/* Message */}
          <p className={`text-sm ${textSecondary}`}>{message}</p>
        </div>

        {/* Action buttons */}
        <div className="p-4 pt-0 flex gap-3">
          <button
            onClick={handleClose}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${cancelStyles}`}
            type="button"
            data-testid="cancel-button"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-colors ${confirmBg}`}
            type="button"
            data-testid="confirm-button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
