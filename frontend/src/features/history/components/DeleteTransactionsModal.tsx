/**
 * DeleteTransactionsModal Component
 *
 * Story 14.15: Transaction Selection Mode & Groups
 * Epic 14: Core Implementation
 *
 * Confirmation modal for batch deleting transactions.
 * Features:
 * - Warning icon and message
 * - Preview list of transactions to be deleted
 * - Total amount of transactions
 * - Cancel and Delete buttons
 *
 * @see docs/uxui/mockups/01_views/transaction-list.html - State 5
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/utils/currency';

// ============================================================================
// Types
// ============================================================================

export interface TransactionPreview {
    /** Transaction ID */
    id: string;
    /** Merchant name or alias */
    displayName: string;
    /** Transaction total */
    total: number;
    /** Currency code */
    currency?: string;
}

export interface DeleteTransactionsModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Transactions to be deleted (preview list) */
    transactions: TransactionPreview[];
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when delete is confirmed */
    onDelete: () => Promise<void>;
    /** Currency formatter */
    formatCurrency: (amount: number, currency: string) => string;
    /** Translation function */
    t: (key: string) => string;
    /** Language for pluralization */
    lang?: 'en' | 'es';
    /** Default currency */
    currency?: string;
}

// ============================================================================
// Component
// ============================================================================

export const DeleteTransactionsModal: React.FC<DeleteTransactionsModalProps> = ({
    isOpen,
    transactions,
    onClose,
    onDelete,
    formatCurrency,
    t,
    lang = 'es',
    currency = DEFAULT_CURRENCY,
}) => {
    const [isDeleting, setIsDeleting] = React.useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const previousActiveElement = useRef<Element | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsDeleting(false);
            previousActiveElement.current = document.activeElement;
            // Focus cancel button after render
            setTimeout(() => {
                cancelButtonRef.current?.focus();
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

    if (!isOpen) return null;

    const count = transactions.length;

    // Get title text
    const getTitleText = () => {
        if (lang === 'es') {
            return count === 1
                ? '¿Eliminar 1 transaccion?'
                : `¿Eliminar ${count} transacciones?`;
        }
        return count === 1
            ? 'Delete 1 transaction?'
            : `Delete ${count} transactions?`;
    };

    // Calculate total amount
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.total, 0);
    const displayCurrency = transactions[0]?.currency || currency;

    // Handle delete
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
        } catch (err) {
            console.error('[DeleteTransactionsModal] Delete error:', err);
            setIsDeleting(false);
        }
    };

    // Get first 3 transactions for preview (mockup shows max 2-3)
    const previewTransactions = transactions.slice(0, 3);
    const remainingCount = count - previewTransactions.length;

    // Use portal to render at document body level, bypassing parent overflow constraints
    return createPortal(
        <div
            className="fixed inset-0 z-[200]"
            onClick={handleClose}
            role="presentation"
            data-testid="delete-transactions-modal-overlay"
        >
            {/* Backdrop - covers full screen */}
            <div
                className="fixed inset-0 bg-black/40"
                aria-hidden="true"
            />

            {/* Centering container - uses fixed positioning for true center */}
            <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
                {/* Modal Card */}
                <div
                    ref={modalRef}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-modal-title"
                    aria-describedby="delete-modal-description"
                    className="relative w-full max-w-[343px] rounded-xl overflow-hidden shadow-xl pointer-events-auto"
                    style={{ backgroundColor: 'var(--bg)' }}
                    onClick={(e) => e.stopPropagation()}
                    data-testid="delete-transactions-modal"
                >
                {/* Header with warning icon */}
                <div className="p-3 pb-2 flex items-start gap-2.5">
                    {/* Warning icon circle */}
                    <div
                        className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--error-light)' }}
                    >
                        <Trash2
                            size={18}
                            strokeWidth={2}
                            style={{ color: 'var(--error)' }}
                        />
                    </div>
                    {/* Title and description */}
                    <div className="flex-1">
                        <div
                            id="delete-modal-title"
                            className="text-sm font-semibold mb-0.5"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {getTitleText()}
                        </div>
                        <div
                            id="delete-modal-description"
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}
                        >
                            {lang === 'es'
                                ? 'Esta accion no se puede deshacer.'
                                : 'This action cannot be undone.'
                            }
                        </div>
                    </div>
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-full hover:bg-opacity-10 transition-colors"
                        aria-label={t('close') || 'Close'}
                        data-testid="delete-modal-close"
                    >
                        <X size={18} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                {/* Transaction preview list */}
                <div
                    className="mx-3 p-2.5 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                    {previewTransactions.map((tx, index) => (
                        <div
                            key={tx.id}
                            className={`flex justify-between items-center py-1.5 text-xs ${
                                index !== previewTransactions.length - 1 ? 'border-b' : ''
                            }`}
                            style={{ borderColor: 'var(--border-light)' }}
                        >
                            <span
                                className="truncate pr-2"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {tx.displayName}
                            </span>
                            <span
                                className="font-medium flex-shrink-0"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {formatCurrency(tx.total, tx.currency || currency)}
                            </span>
                        </div>
                    ))}

                    {/* Show "and X more" if there are more transactions */}
                    {remainingCount > 0 && (
                        <div
                            className="pt-2 text-xs text-center"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {lang === 'es'
                                ? `y ${remainingCount} mas...`
                                : `and ${remainingCount} more...`
                            }
                        </div>
                    )}

                    {/* Total */}
                    <div
                        className="flex justify-between items-center pt-2 mt-2 border-t"
                        style={{ borderColor: 'var(--border-light)' }}
                    >
                        <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Total
                        </span>
                        <span
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {formatCurrency(totalAmount, displayCurrency)}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-3">
                    {/* Cancel button */}
                    <button
                        ref={cancelButtonRef}
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-primary)',
                        }}
                        data-testid="delete-modal-cancel"
                    >
                        <X size={14} strokeWidth={2} />
                        <span>{lang === 'es' ? 'Cancelar' : 'Cancel'}</span>
                    </button>

                    {/* Delete button */}
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
                        style={{
                            backgroundColor: 'var(--error)',
                            color: 'white',
                        }}
                        data-testid="delete-modal-confirm"
                    >
                        <Trash2 size={14} strokeWidth={2} />
                        <span>
                            {isDeleting
                                ? (lang === 'es' ? 'Eliminando...' : 'Deleting...')
                                : (lang === 'es' ? 'Eliminar' : 'Delete')
                            }
                        </span>
                    </button>
                </div>
            </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteTransactionsModal;
