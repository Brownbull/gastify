/**
 * DashboardFullListView - Full paginated transaction list view
 *
 * Story 15-TD-5b: Extracted from DashboardView early-return block.
 * Renders when "View All" is clicked and no external navigation handler exists.
 */

import React from 'react';
import { Inbox, ArrowUpDown, Filter, ChevronRight } from 'lucide-react';
import { ImageViewer } from '@/components/ImageViewer';
import { HistoryFilterBar } from '@features/history/components/HistoryFilterBar';
import type { SortType, Transaction } from './types';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';

// ============================================================================
// Types
// ============================================================================

export interface DashboardFullListViewProps {
    onBack: () => void;
    availableFilters: AvailableFilters;
    theme: string;
    lang: string;
    t: (key: string) => string;
    allTxCount: number;
    filteredTransactions: Transaction[];
    hasActiveFilters: boolean;
    sortType: SortType;
    setSortType: (sort: SortType) => void;
    showDuplicatesOnly: boolean;
    setShowDuplicatesOnly: (show: boolean) => void;
    duplicateIds: Set<string>;
    isDark: boolean;
    paginatedTransactions: Transaction[];
    historyPage: number;
    setHistoryPage: React.Dispatch<React.SetStateAction<number>>;
    totalPages: number;
    renderTransactionItem: (tx: Transaction, index: number) => React.ReactNode;
    selectedTransaction: Transaction | null;
    handleCloseViewer: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const DashboardFullListView: React.FC<DashboardFullListViewProps> = ({
    onBack,
    availableFilters,
    theme,
    lang,
    t,
    allTxCount,
    filteredTransactions,
    hasActiveFilters,
    sortType,
    setSortType,
    showDuplicatesOnly,
    setShowDuplicatesOnly,
    duplicateIds,
    isDark,
    paginatedTransactions,
    historyPage,
    setHistoryPage,
    totalPages,
    renderTransactionItem,
    selectedTransaction,
    handleCloseViewer,
}) => {
    return (
        <div className="space-y-6">
            {/* Back button to return to dashboard */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--accent)' }}
            >
                <ChevronRight size={16} className="rotate-180" />
                {t('backToDashboard') || 'Volver'}
            </button>

            {/* Filter bar */}
            <HistoryFilterBar
                availableFilters={availableFilters}
                theme={theme}
                locale={lang}
                t={t}
                totalCount={allTxCount}
                filteredCount={filteredTransactions.length}
            />

            {/* Sort and duplicates filter controls */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={14} style={{ color: 'var(--secondary)' }} />
                    <select
                        value={sortType}
                        onChange={(e) => setSortType(e.target.value as SortType)}
                        className="text-sm py-1.5 px-2 rounded-lg border min-h-[36px] cursor-pointer"
                        style={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--border-light)',
                            color: 'var(--text-primary)',
                        }}
                        aria-label={t('sortBy')}
                    >
                        <option value="transactionDate">{t('sortByTransactionDate')}</option>
                        <option value="scanDate">{t('sortByScanDate')}</option>
                    </select>
                </div>

                {duplicateIds.size > 0 && (
                    <button
                        onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                        className={`flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg border min-h-[36px] transition-colors ${
                            showDuplicatesOnly
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                                : ''
                        }`}
                        style={{
                            backgroundColor: showDuplicatesOnly
                                ? undefined
                                : 'var(--surface)',
                            borderColor: showDuplicatesOnly
                                ? '#fbbf24'
                                : isDark ? '#334155' : '#e2e8f0',
                            color: showDuplicatesOnly
                                ? isDark ? '#fbbf24' : '#d97706'
                                : 'var(--secondary)',
                        }}
                        aria-pressed={showDuplicatesOnly}
                        aria-label={t('filterDuplicates')}
                    >
                        <Filter size={14} />
                        <span>{t('filterDuplicates')}</span>
                        <span className="font-semibold">({duplicateIds.size})</span>
                    </button>
                )}
            </div>

            {/* Transaction list */}
            {filteredTransactions.length === 0 && hasActiveFilters ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Inbox size={48} className="mb-4 opacity-50" style={{ color: 'var(--secondary)' }} />
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('noMatchingTransactions')}</p>
                    <p className="text-sm opacity-75" style={{ color: 'var(--secondary)' }}>{t('tryDifferentFilters')}</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {paginatedTransactions.map((tx, index) => renderTransactionItem(tx, index))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button
                                disabled={historyPage === 1}
                                onClick={() => setHistoryPage(p => p - 1)}
                                className="px-4 py-2 border rounded-lg disabled:opacity-50 min-h-11"
                                style={{
                                    borderColor: 'var(--border-light)',
                                    backgroundColor: 'var(--surface)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {t('prev')}
                            </button>
                            <span style={{ color: 'var(--secondary)' }}>
                                {t('page')} {historyPage} / {totalPages}
                            </span>
                            <button
                                disabled={historyPage >= totalPages}
                                onClick={() => setHistoryPage(p => p + 1)}
                                className="px-4 py-2 border rounded-lg disabled:opacity-50 min-h-11"
                                style={{
                                    borderColor: 'var(--border-light)',
                                    backgroundColor: 'var(--surface)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {t('next')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Image Viewer Modal */}
            {selectedTransaction && selectedTransaction.imageUrls && selectedTransaction.imageUrls.length > 0 && (
                <ImageViewer
                    images={selectedTransaction.imageUrls}
                    merchantName={selectedTransaction.alias || selectedTransaction.merchant}
                    onClose={handleCloseViewer}
                />
            )}
        </div>
    );
};
