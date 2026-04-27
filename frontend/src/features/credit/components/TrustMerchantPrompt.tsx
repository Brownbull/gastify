/**
 * TrustMerchantPrompt Component
 *
 * Story 11.4: Trust Merchant System
 * Epic 11: Quick Save & Scan Flow Optimization
 *
 * Displays a modal prompt asking the user if they want to trust a merchant
 * for auto-save functionality. Shown after a user has successfully scanned
 * 3+ receipts from the same merchant with minimal edits.
 *
 * Features:
 * - Trust prompt with merchant name and scan count (AC #2, #3)
 * - Accept/Decline buttons (AC #4)
 * - Localized for EN/ES
 * - Dark mode support
 * - Accessibility features (ARIA labels, keyboard navigation)
 *
 * @see docs/sprint-artifacts/epic11/story-11.4-trust-merchant-system.md
 */

import React, { useState, useCallback } from 'react';
import { Handshake, Check, X } from 'lucide-react';

export interface TrustMerchantPromptProps {
    /** Merchant display name */
    merchantName: string;
    /** Number of successful scans from this merchant */
    scanCount: number;
    /** Callback when user accepts trust */
    onAccept: () => Promise<void>;
    /** Callback when user declines trust */
    onDecline: () => Promise<void>;
    /** Theme for styling ('light' | 'dark') */
    theme: 'light' | 'dark';
    /** Translation function */
    t: (key: string) => string;
}

/**
 * TrustMerchantPrompt displays a modal asking if user wants to trust a merchant.
 *
 * @example
 * ```tsx
 * <TrustMerchantPrompt
 *   merchantName="Jumbo"
 *   scanCount={3}
 *   onAccept={handleAcceptTrust}
 *   onDecline={handleDeclineTrust}
 *   theme="light"
 *   t={t}
 * />
 * ```
 */
export const TrustMerchantPrompt: React.FC<TrustMerchantPromptProps> = ({
    merchantName,
    scanCount,
    onAccept,
    onDecline,
    theme: _theme, // Theme prop kept for API compatibility; colors come from CSS variables
    t,
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    // Handle accept with loading state
    const handleAccept = useCallback(async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await onAccept();
        } finally {
            setIsProcessing(false);
        }
    }, [onAccept, isProcessing]);

    // Handle decline with loading state
    const handleDecline = useCallback(async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await onDecline();
        } finally {
            setIsProcessing(false);
        }
    }, [onDecline, isProcessing]);

    // Build localized strings with placeholder replacement
    const title = (t('trustMerchantTitle') || 'Trust {merchant}?')
        .replace('{merchant}', merchantName);

    const message = (t('trustMerchantMessage') || 'You\'ve scanned {count} receipts from {merchant} without editing. Future receipts will be auto-saved.')
        .replace('{count}', String(scanCount))
        .replace('{merchant}', merchantName);

    // Story 11.6: Modal with safe area padding (AC #3, #6)
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            style={{
                padding: 'calc(1rem + var(--safe-top, 0px)) calc(1rem + var(--safe-right, 0px)) calc(1rem + var(--safe-bottom, 0px)) calc(1rem + var(--safe-left, 0px))',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trust-merchant-title"
            aria-describedby="trust-merchant-message"
        >
            <div
                className="w-full max-w-sm rounded-2xl p-6 shadow-xl animate-slide-up"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                }}
            >
                {/* Header with handshake icon */}
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--primary-light)' }}
                    >
                        <Handshake
                            className="w-6 h-6"
                            style={{ color: 'var(--primary)' }}
                        />
                    </div>
                    <h2
                        id="trust-merchant-title"
                        className="text-xl font-semibold flex-1"
                    >
                        {title}
                    </h2>
                </div>

                {/* Message */}
                <p
                    id="trust-merchant-message"
                    className="mb-6 text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {message}
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                    {/* Accept button (AC #4) - Uses theme primary color */}
                    <button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className="flex-1 py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
                        style={{
                            backgroundColor: isProcessing ? 'var(--primary-hover)' : 'var(--primary)',
                            opacity: isProcessing ? 0.7 : 1,
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                        }}
                        aria-label={t('trustMerchantConfirm') || 'Sí, confiar'}
                    >
                        <Check className="w-5 h-5" />
                        {t('trustMerchantConfirm') || 'Sí, confiar'}
                    </button>

                    {/* Decline button (AC #4) - Uses theme secondary/neutral color */}
                    <button
                        onClick={handleDecline}
                        disabled={isProcessing}
                        className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200"
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)',
                            opacity: isProcessing ? 0.5 : 1,
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                        }}
                        aria-label={t('trustMerchantDecline') || 'No ahora'}
                    >
                        <X className="w-4 h-4" />
                        {t('trustMerchantDecline') || 'No ahora'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrustMerchantPrompt;
