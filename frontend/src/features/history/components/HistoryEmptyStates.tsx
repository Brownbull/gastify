/**
 * HistoryEmptyStates - Empty state variants for HistoryView
 *
 * Extracted from HistoryView.tsx (Story 15b-2c) for decomposition.
 * Two variants: no transactions at all (scan prompt) and no matching filters.
 */

import React from 'react';
import { Inbox, FileText, Camera } from 'lucide-react';
import { TransitionChild } from '@/components/animation/TransitionChild';

export interface HistoryEmptyStatesProps {
    hasActiveFilters: boolean;
    showDuplicatesOnly: boolean;
    transactionsToDisplayLength: number;
    lang: string;
    t: (key: string) => string;
}

export const HistoryEmptyStates: React.FC<HistoryEmptyStatesProps> = ({
    hasActiveFilters,
    showDuplicatesOnly,
    transactionsToDisplayLength,
    lang: _lang,
    t,
}) => {
    // Empty state: No transactions at all
    if (transactionsToDisplayLength === 0 && !hasActiveFilters && !showDuplicatesOnly) {
        return (
            <TransitionChild index={0} totalItems={1}>
                <div
                    className="flex flex-col items-center justify-center py-16 text-center"
                    data-testid="empty-state"
                >
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                        <FileText size={40} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <h2
                        className="text-lg font-bold mb-2"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {t('noTransactions')}
                    </h2>
                    <p
                        className="text-sm mb-5 max-w-[240px]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {t('scanFirstReceipt')}
                    </p>
                    <button
                        className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white"
                        style={{ backgroundColor: 'var(--primary)' }}
                        aria-label={t('scanReceipt')}
                    >
                        <Camera size={18} />
                        {t('scanReceipt')}
                    </button>
                </div>
            </TransitionChild>
        );
    }

    // Empty state: No matching filters or no duplicates
    if (transactionsToDisplayLength === 0 && (hasActiveFilters || showDuplicatesOnly)) {
        return (
            <TransitionChild index={0} totalItems={1}>
                <div
                    className="flex flex-col items-center justify-center py-16 text-center"
                    data-testid="empty-filter-state"
                >
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                        <Inbox size={40} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <h2
                        className="text-lg font-bold mb-2"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {t('noMatchingTransactions')}
                    </h2>
                    <p
                        className="text-sm max-w-[240px]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {t('tryDifferentFilters')}
                    </p>
                </div>
            </TransitionChild>
        );
    }

    return null;
};
