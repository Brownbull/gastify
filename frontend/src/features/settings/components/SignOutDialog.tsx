/**
 * SignOutDialog Component
 *
 * Story 14.22: Sign out confirmation dialog
 *
 * A themed confirmation dialog for signing out with:
 * - Clear warning message
 * - Cancel and Confirm buttons with icons
 * - Theme-aware styling
 * - WCAG 2.1 Level AA accessible
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { LogOut, X } from 'lucide-react';

export interface SignOutDialogProps {
    /** Whether the dialog is visible */
    isOpen?: boolean;
    /** Called when user confirms sign out */
    onConfirm: () => void;
    /** Called when user cancels */
    onCancel: () => void;
    /** Translation function (optional - fallbacks used if not provided) */
    t?: (key: string) => string;
    /** Language for fallback text */
    lang?: 'en' | 'es';
    /** Called when modal closes (ModalManager integration) */
    onClose?: () => void;
}

/**
 * SignOutDialog Component
 *
 * A styled confirmation dialog for signing out.
 */
// Default translation function that returns empty string (fallbacks will be used)
const defaultTranslate = () => '';

export const SignOutDialog: React.FC<SignOutDialogProps> = ({
    isOpen = true,  // Default to true for ModalManager integration
    onConfirm,
    onCancel,
    t = defaultTranslate,
    lang = 'es',
    onClose,  // ModalManager integration - alias for onCancel
}) => {
    // Use onClose if provided (ModalManager), otherwise onCancel
    const handleCancel = onClose || onCancel;
    const modalRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const previousActiveElement = useRef<Element | null>(null);

    // Store the previously focused element when modal opens
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement;
            setTimeout(() => {
                cancelButtonRef.current?.focus();
            }, 0);
        }
    }, [isOpen]);

    // Restore focus when modal closes
    const handleClose = useCallback(() => {
        handleCancel();
        setTimeout(() => {
            (previousActiveElement.current as HTMLElement)?.focus?.();
        }, 0);
    }, [handleCancel]);

    // Handle Escape key to close modal
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

    // Focus trap within modal
    useEffect(() => {
        if (!isOpen || !modalRef.current) return;

        const modalElement = modalRef.current;
        const focusableElements = modalElement.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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

    // Prevent body scroll when modal is open
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

    // Translations with fallbacks
    const texts = {
        title: t('signOutTitle') || (lang === 'es' ? '¿Cerrar sesión?' : 'Sign out?'),
        message: t('signOutMessage') || (lang === 'es'
            ? 'Tendrás que iniciar sesión de nuevo para acceder a tu cuenta.'
            : 'You will need to sign in again to access your account.'),
        cancel: t('cancel') || (lang === 'es' ? 'Cancelar' : 'Cancel'),
        confirm: t('signout') || (lang === 'es' ? 'Cerrar Sesión' : 'Sign Out'),
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            role="presentation"
            data-testid="sign-out-dialog-backdrop"
        >
            {/* Full-screen backdrop */}
            <div
                className="fixed inset-0 bg-black/50"
                aria-hidden="true"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="sign-out-modal-title"
                aria-describedby="sign-out-modal-description"
                className="relative z-10 w-full max-w-sm mx-4 rounded-2xl shadow-xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                onClick={(e) => e.stopPropagation()}
                data-testid="sign-out-dialog"
            >
                {/* Content */}
                <div className="p-6 text-center">
                    {/* Icon */}
                    <div
                        className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#fee2e2' }}
                        aria-hidden="true"
                    >
                        <LogOut size={28} style={{ color: '#ef4444' }} />
                    </div>

                    {/* Title */}
                    <h2
                        id="sign-out-modal-title"
                        className="text-xl font-bold mb-2"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {texts.title}
                    </h2>

                    {/* Description */}
                    <p
                        id="sign-out-modal-description"
                        className="text-sm mb-6"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {texts.message}
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3">
                        {/* Sign out button */}
                        <button
                            onClick={onConfirm}
                            className="w-full py-3 px-4 rounded-xl text-white font-semibold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#ef4444' }}
                            data-testid="sign-out-confirm-btn"
                        >
                            <LogOut size={18} />
                            {texts.confirm}
                        </button>

                        {/* Cancel button */}
                        <button
                            ref={cancelButtonRef}
                            onClick={handleClose}
                            className="w-full py-3 px-4 rounded-xl border font-medium transition-colors flex items-center justify-center gap-2"
                            style={{
                                borderColor: 'var(--border-light)',
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--bg-tertiary)',
                            }}
                            data-testid="sign-out-cancel-btn"
                        >
                            <X size={18} />
                            {texts.cancel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignOutDialog;
