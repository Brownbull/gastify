/**
 * TrustedMerchantsList Component
 *
 * Story 11.4: Trust Merchant System
 * Epic 11: Quick Save & Scan Flow Optimization
 *
 * Displays and manages the list of trusted merchants in Settings.
 * Users can view trusted merchants and revoke trust.
 *
 * Features:
 * - Display list of trusted merchants (AC #6)
 * - Revoke trust functionality (AC #7)
 * - Empty state message
 * - Loading state
 * - Dark mode support
 *
 * @see docs/sprint-artifacts/epic11/story-11.4-trust-merchant-system.md
 */

import React, { useState } from 'react';
import { CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { TrustedMerchant } from '@/types/trust';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';

export interface TrustedMerchantsListProps {
    /** List of trusted merchants */
    merchants: TrustedMerchant[];
    /** Whether the list is loading */
    loading: boolean;
    /** Callback to revoke trust for a merchant */
    onRevokeTrust: (merchantName: string) => Promise<void>;
    /** Translation function */
    t: (key: string) => string;
    /** Theme for styling */
    theme: 'light' | 'dark';
}

export const TrustedMerchantsList: React.FC<TrustedMerchantsListProps> = ({
    merchants,
    loading,
    onRevokeTrust,
    t,
    theme,
}) => {
    const isDark = theme === 'dark';
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<TrustedMerchant | null>(null);

    const handleRevokeClick = (merchant: TrustedMerchant) => {
        if (revokingId) return; // Already revoking
        setRevokeTarget(merchant);
    };

    const handleConfirmRevoke = async () => {
        if (!revokeTarget) return;
        const merchant = revokeTarget;
        setRevokeTarget(null);

        setRevokingId(merchant.id || merchant.normalizedName);
        try {
            await onRevokeTrust(merchant.merchantName);
        } finally {
            setRevokingId(null);
        }
    };

    // Filter to only show trusted merchants
    const trustedOnly = merchants.filter(m => m.trusted);

    if (loading) {
        return (
            <div className="py-4" style={{ color: 'var(--text-secondary)' }}>
                <div className="animate-pulse space-y-3">
                    <div className="h-12 rounded" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}></div>
                    <div className="h-12 rounded" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}></div>
                </div>
            </div>
        );
    }

    if (trustedOnly.length === 0) {
        return (
            <div
                className="py-6 text-center"
                role="status"
                aria-label={t('trustedMerchantsEmpty')}
            >
                <div
                    className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                >
                    <CheckCircle2 size={24} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                </div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {t('trustedMerchantsEmpty')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {t('trustedMerchantsHint')}
                </p>
            </div>
        );
    }

    return (
        <>
        <div role="list" aria-label={t('trustedMerchants')}>
            {trustedOnly.map((merchant, index) => {
                const merchantId = merchant.id || merchant.normalizedName;
                const isRevoking = revokingId === merchantId;

                return (
                    <div
                        key={merchantId}
                        className="flex items-center justify-between py-2.5"
                        style={{
                            borderBottom: index < trustedOnly.length - 1 ? `1px solid ${isDark ? '#334155' : '#e2e8f0'}` : 'none',
                        }}
                        role="listitem"
                    >
                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                            {/* Merchant name in quotes */}
                            <p
                                className="font-semibold text-sm truncate"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                "{merchant.merchantName}"
                            </p>
                            {/* Category tag and scan count */}
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: '#e0e7ff',
                                        color: '#4f46e5',
                                    }}
                                >
                                    {t('trusted') || 'Trusted'}
                                </span>
                                <span
                                    className="text-xs"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    {merchant.scanCount}x
                                </span>
                            </div>
                        </div>

                        {/* Delete/Revoke button - red per mockup */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => handleRevokeClick(merchant)}
                                disabled={isRevoking}
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                                style={{
                                    color: '#ef4444',
                                    backgroundColor: 'transparent',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                aria-label={t('removeTrust')}
                            >
                                {isRevoking ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Trash2 size={16} aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>

        <ConfirmationDialog
            isOpen={!!revokeTarget}
            title={t('removeTrust')}
            message={`${t('removeTrustConfirm')} "${revokeTarget?.merchantName || ''}"`}
            confirmText={t('confirm')}
            cancelText={t('cancel')}
            theme={theme}
            onConfirm={handleConfirmRevoke}
            onCancel={() => setRevokeTarget(null)}
            isDestructive
        />
        </>
    );
};

export default TrustedMerchantsList;
