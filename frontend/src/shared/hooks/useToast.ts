import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface ToastMessage {
    text: string;
    type: ToastType;
}

/**
 * Hook for managing toast notification state with auto-dismiss.
 *
 * @param autoDismissMs - Time in milliseconds before toast auto-dismisses (default: 3000)
 * @returns Toast state and control functions
 *
 * @example
 * ```tsx
 * const { toastMessage, showToast, dismissToast } = useToast();
 *
 * // Show a toast
 * showToast('Save successful', 'success');
 *
 * // Manually dismiss
 * dismissToast();
 * ```
 */
export const useToast = (autoDismissMs = 3000) => {
    const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

    const showToast = useCallback((text: string, type: ToastType = 'info') => {
        setToastMessage({ text, type });
    }, []);

    const dismissToast = useCallback(() => {
        setToastMessage(null);
    }, []);

    // Auto-dismiss effect — errors stay longer for readability
    useEffect(() => {
        if (toastMessage) {
            const duration = toastMessage.type === 'error' ? autoDismissMs * 2 : autoDismissMs;
            const timer = setTimeout(dismissToast, duration);
            return () => clearTimeout(timer);
        }
    }, [toastMessage, autoDismissMs, dismissToast]);

    return { toastMessage, showToast, dismissToast };
};
