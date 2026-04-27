/**
 * Toast - Notification component for feedback messages
 *
 * Story 14e-23: Extracted from App.tsx to shared UI component
 * Story 15-2h: Added error/warning types with distinct styling
 *
 * @example
 * ```tsx
 * const { toastMessage, showToast } = useToast();
 *
 * <Toast message={toastMessage} />
 * ```
 */
import React from 'react';
import type { ToastMessage, ToastType } from '../hooks/useToast';

interface ToastProps {
    message: ToastMessage | null;
}

const TOAST_COLORS: Record<ToastType, string> = {
    success: 'var(--primary)',
    info: 'var(--accent)',
    error: '#ef4444',
    warning: '#f59e0b',
};

function ToastIcon({ type }: { type: ToastType }): React.ReactElement {
    const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    if (type === 'success') {
        return (
            <svg {...props}>
                <polyline points="20 6 9 17 4 12" />
            </svg>
        );
    }

    if (type === 'error') {
        return (
            <svg {...props}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        );
    }

    if (type === 'warning') {
        return (
            <svg {...props}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        );
    }

    // info (default)
    return (
        <svg {...props}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}

/**
 * Toast notification component with theme-aware styling.
 * Renders a fixed-position notification at the bottom of the screen.
 *
 * Types: success (green), info (accent), error (red), warning (amber)
 */
export function Toast({ message }: ToastProps): React.ReactElement | null {
    if (!message) return null;

    return (
        <div
            role="status"
            aria-live={message.type === 'error' ? 'assertive' : 'polite'}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg z-50 animate-fade-in flex items-center gap-2"
            style={{
                backgroundColor: TOAST_COLORS[message.type],
                color: '#ffffff',
                fontFamily: 'var(--font-family)',
                fontSize: '14px',
                fontWeight: 500,
            }}
        >
            <ToastIcon type={message.type} />
            {message.text}
        </div>
    );
}

export default Toast;
