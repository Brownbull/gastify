/**
 * HistoryView - Transaction History with Filtering
 *
 * Story 9.19: History Transaction Filters
 * Story 14.14: Transaction List Redesign
 * Story 15b-2c: Decomposed into sub-files
 *
 * Features:
 * - Card-based transaction display with expandable items
 * - Date grouping with sticky headers
 * - Filter chips for active filters
 * - Swipe navigation for time periods
 * - PageTransition and staggered card animations
 * - Empty state with scan prompt
 *
 * @see docs/sprint-artifacts/epic9/story-9.19-history-transaction-filters.md
 * @see docs/sprint-artifacts/epic14/stories/story-14.14-transaction-list-redesign.md
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageViewer } from '@/components/ImageViewer';
// Story 14.15b: Use consolidated TransactionCard from shared transactions folder
import { TransactionCard } from '@/components/transactions';
import { DateGroupHeader, groupTransactionsByDate, formatDateGroupLabel, calculateGroupTotal } from '@features/history/components/DateGroupHeader';
// Story 14.31 Session 3: Sort control
import { SelectionBar } from '@features/history/components/SelectionBar';
// Story 14e-5: DeleteTransactionsModal now uses Modal Manager
import type { TransactionPreview } from '@features/history/components/DeleteTransactionsModal';
import { useModalActions } from '@managers/ModalManager';
import { PageTransition } from '@/components/animation/PageTransition';
import { TransitionChild } from '@/components/animation/TransitionChild';
// Story 14.13: Duplicate detection for transactions
import { getDuplicateIds, getDuplicateCount, filterToDuplicatesGrouped } from '@/services/duplicateDetectionService';
import { normalizeTransaction } from '@/utils/transactionNormalizer';
import {
    extractAvailableFilters,
    filterTransactionsByHistoryFilters,
} from '@shared/utils/historyFilterUtils';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSelectionMode } from '@/hooks/useSelectionMode';
import { useTransactionRepository } from '@/repositories';
// Story 14.15c: CSV Export utilities
import { downloadMonthlyTransactions, downloadYearlyStatistics } from '@/utils/csvExport';
// Story 14e-25d: Direct navigation from store (ViewHandlersContext deleted)
import { useNavigationActions } from '@/shared/stores';
// Story 14c-refactor.27: View type for navigation
import type { View } from '@app/types';
// Story 14e-25a.2b: HistoryView data hook
import { useHistoryViewData, type UseHistoryViewDataReturn } from './useHistoryViewData';
// Story 14e-25a.2b: Use imported Transaction type from shared types
import type { Transaction } from '@/types/transaction';
// Story 15b-2c: Extracted constants, hook, and sub-components
import {
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE,
    HISTORY_SORT_OPTIONS,
    DEFAULT_HISTORY_SORT_KEY,
    DEFAULT_HISTORY_SORT_DIRECTION,
    sortTransactionsWithinGroups,
} from './historyViewConstants';
import type { HistorySortKey, PageSizeOption } from './historyViewConstants';
import { useCollapsibleHeader } from './useCollapsibleHeader';
import { HistoryHeader } from '@features/history/components/HistoryHeader';
import { HistoryEmptyStates } from '@features/history/components/HistoryEmptyStates';
import { HistoryPagination } from '@features/history/components/HistoryPagination';

// ============================================================================
// Types
// ============================================================================

/**
 * Story 14e-25a.2b: HistoryView Props
 *
 * HistoryView now owns its data via useHistoryViewData hook.
 * Props are minimal - only test overrides for testing.
 */
interface HistoryViewProps {
    /**
     * Optional overrides for testing.
     * Allows tests to inject mock data without needing to mock hooks.
     */
    _testOverrides?: Partial<UseHistoryViewDataReturn>;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Inner component that uses the history filters store.
 * Parent view must call useHistoryFiltersInit() before rendering.
 *
 * Story 14e-25a.2b: Now owns its data via useHistoryViewData hook.
 * Receives NO props from App.tsx except optional test overrides.
 */
const HistoryViewInner: React.FC<HistoryViewProps> = ({ _testOverrides }) => {
    // Story 14e-25a.2b: Get all data from hook
    const hookData = useHistoryViewData();

    // Merge hook data with test overrides (test overrides take precedence)
    // Story 14e-25a.2b: Only destructure values actually used by the component
    const {
        transactions,
        allTransactions,
        hasMore,
        loadMore: onLoadMoreTransactions,
        isLoadingMore,
        isAtListenerLimit,
        user,
        appId,
        theme,
        colorTheme,
        lang,
        currency,
        dateFormat,
        defaultCity,
        defaultCountry,
        foreignLocationFormat,
        t,
        formatCurrency,
        formatDate,
        onEditTransaction,
    } = { ...hookData, ..._testOverrides };

    // Story 15b-3a: DAL migration — repository replaces direct service imports
    const txRepo = useTransactionRepository();

    // Derive additional values from hook data
    const userId = user.uid;
    const userName = user.displayName || '';
    const userEmail = user.email || '';

    // Story 14e-25d: Direct navigation from store (ViewHandlersContext deleted)
    const { navigateBack, setView } = useNavigationActions();
    const onBack = navigateBack;
    const onNavigateToView = setView;

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    // Story 14.14: Search functionality
    const [searchQuery, setSearchQuery] = useState('');
    // Story 14.14: Page size state (15, 30, or 60 items per page)
    const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);
    // Story 14.14: Internal page state - ignore historyPage prop, manage internally
    const [currentPage, setCurrentPage] = useState(1);
    // Story 15b-2c: Collapsible header extracted to useCollapsibleHeader hook
    const { isHeaderCollapsed, containerRef, scrollContainerRef } = useCollapsibleHeader();
    // Story 14.15: Selection mode for batch operations
    // Story 14e-25a.2b: Only destructure values actually used
    const {
        isSelectionMode,
        selectedIds,
        selectedCount,
        exitSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
        handleLongPressStart,
        handleLongPressEnd,
        handleLongPressMove,
    } = useSelectionMode();
    // Story 14e-5: Delete modal now uses Modal Manager
    const { openModal, closeModal } = useModalActions();
    // Story 14.15c: Export state
    const [isExporting, setIsExporting] = useState(false);
    // Story 14.31 Session 3: Sort state
    const [sortBy, setSortBy] = useState<HistorySortKey>(DEFAULT_HISTORY_SORT_KEY);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_HISTORY_SORT_DIRECTION);
    // Story 14.13: Duplicate filter state
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    // Story 14.15b: Profile dropdown state
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileButtonRef = useRef<HTMLButtonElement>(null);

    // Story 14.15b: Handle profile navigation
    const handleProfileNavigate = useCallback((view: string) => {
        setIsProfileOpen(false);
        // Story 14c-refactor.27: Cast string to View type for navigation
        onNavigateToView(view as View);
    }, [onNavigateToView]);

    const {
        state: filterState,
        hasActiveFilters,
        goNextPeriod,
        goPrevPeriod,
        canGoNext,
        canGoPrev,
        hasTemporalFilter,
    } = useHistoryFilters();

    // Story 14.14: Animation and swipe hooks
    const prefersReducedMotion = useReducedMotion();
    // Story 14.27: Track when "load more" completes to scroll to top
    const wasLoadingMore = useRef(false);

    // Story 14.14 AC #4: Swipe navigation for time periods
    const {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        isSwiping,
        swipeDirection,
        swipeProgress,
    } = useSwipeNavigation({
        onSwipeLeft: goNextPeriod,
        onSwipeRight: goPrevPeriod,
        enabled: hasTemporalFilter,
        hapticEnabled: !prefersReducedMotion,
    });

    // Use all transactions for filtering (not just current page)
    const transactionsToFilter = allTransactions.length > 0 ? allTransactions : transactions;

    // Story 9.19: Extract available filters from ALL transactions (AC #7 - memoized)
    const availableFilters = useMemo(() => {
        return extractAvailableFilters(transactionsToFilter as any);
    }, [transactionsToFilter]);

    // Story 9.19: Apply filters to transactions (AC #7 - memoized for performance)
    // Story 14.14: Also apply search query filter
    const filteredTransactions = useMemo(() => {
        let result = filterTransactionsByHistoryFilters(transactionsToFilter as any, filterState);

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((tx: any) => {
                const merchantMatch = tx.merchant?.toLowerCase().includes(query);
                const aliasMatch = tx.alias?.toLowerCase().includes(query);
                const itemsMatch = tx.items?.some((item: any) =>
                    item.name?.toLowerCase().includes(query)
                );
                return merchantMatch || aliasMatch || itemsMatch;
            });
        }

        return result;
    }, [transactionsToFilter, filterState, searchQuery]);

    // Story 14.13: Detect potential duplicate transactions in filtered results
    const duplicateCount = useMemo(() => {
        return getDuplicateCount(filteredTransactions as any);
    }, [filteredTransactions]);

    const hasAnyDuplicates = duplicateCount > 0;

    // Story 14.13: Get duplicate transactions grouped together when filter is active
    const duplicateTransactions = useMemo(() => {
        if (showDuplicatesOnly) {
            return filterToDuplicatesGrouped(filteredTransactions as any);
        }
        return [];
    }, [filteredTransactions, showDuplicatesOnly]);

    // Story 9.19 AC #5: Reset pagination when filters change
    const prevFilterStateRef = useRef<string | null>(null);
    useEffect(() => {
        const currentFilterKey = JSON.stringify(filterState);
        if (prevFilterStateRef.current !== null && prevFilterStateRef.current !== currentFilterKey) {
            setCurrentPage(1);
        }
        prevFilterStateRef.current = currentFilterKey;
    }, [filterState]);

    // Story 14.27: Scroll to top when "load more" completes
    useEffect(() => {
        if (wasLoadingMore.current && !isLoadingMore) {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        wasLoadingMore.current = isLoadingMore;
    }, [isLoadingMore]);

    // Story 14.27: Helper to scroll to top (used for page navigation)
    const scrollToTop = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    // Story 14.27: Navigate to page and scroll to top
    const goToPage = useCallback((page: number) => {
        setCurrentPage(page);
        scrollToTop();
    }, [scrollToTop]);

    // Paginate filtered results - Story 14.14: Variable page size (15/30/60)
    // Story 14.31 Session 3: Apply sorting before pagination
    // Story 14.13: Use duplicate transactions when filter is active
    const transactionsToDisplay = showDuplicatesOnly ? duplicateTransactions : filteredTransactions;
    const totalFilteredPages = Math.max(1, Math.ceil(transactionsToDisplay.length / pageSize));
    const paginatedTransactions = useMemo(() => {
        const sorted = sortTransactionsWithinGroups(transactionsToDisplay as Transaction[], sortBy, sortDirection);
        const startIndex = (currentPage - 1) * pageSize;
        return sorted.slice(startIndex, startIndex + pageSize);
    }, [transactionsToDisplay, currentPage, pageSize, sortBy, sortDirection]);

    // Story 14.14 AC #2: Group transactions by date
    const groupedTransactions = useMemo(() => {
        return groupTransactionsByDate(paginatedTransactions);
    }, [paginatedTransactions]);

    // Story 9.11 AC #4, #6, #7: Calculate duplicate IDs for visual warning
    const duplicateIds = useMemo(() => {
        return getDuplicateIds(transactionsToFilter as any);
    }, [transactionsToFilter]);

    const visibleTransactionIds = useMemo(() => {
        return paginatedTransactions.map(tx => tx.id).filter((id): id is string => !!id);
    }, [paginatedTransactions]);

    const handleSelectAllToggle = useCallback(() => {
        const allVisibleSelected = visibleTransactionIds.length > 0 &&
            visibleTransactionIds.every(id => selectedIds.has(id));
        if (allVisibleSelected) {
            clearSelection();
        } else {
            selectAll(visibleTransactionIds);
        }
    }, [visibleTransactionIds, selectedIds, selectAll, clearSelection]);

    // Story 9.11 AC #1, #2: Normalize transactions with defaults
    const userDefaults = useMemo(() => ({
        city: defaultCity,
        country: defaultCountry,
    }), [defaultCity, defaultCountry]);

    const handleThumbnailClick = useCallback((transaction: Transaction) => {
        setSelectedTransaction(transaction);
    }, []);

    const handleCloseViewer = useCallback(() => {
        setSelectedTransaction(null);
    }, []);

    // Story 14.15c: Determine export type based on temporal filter level
    const isStatisticsExport = useMemo(() => {
        const level = filterState.temporal.level;
        return level === 'year' || level === 'quarter' || level === 'all';
    }, [filterState.temporal.level]);

    // Story 14.15c: Handle export based on temporal filter level
    const handleExport = useCallback(async () => {
        if (isExporting || filteredTransactions.length === 0) return;

        setIsExporting(true);
        try {
            const level = filterState.temporal.level;
            const year = filterState.temporal.year || new Date().getFullYear().toString();
            const month = filterState.temporal.month?.split('-')[1] || '01';

            if (level === 'year' || level === 'quarter' || level === 'all') {
                downloadYearlyStatistics(filteredTransactions as any, year);
            } else {
                downloadMonthlyTransactions(filteredTransactions as any, year, month);
            }
        } catch (err) {
            console.error('[HistoryView] Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    }, [isExporting, filteredTransactions, filterState.temporal]);

    // Story 14.31 Session 3: Handle sort change
    const handleSortChange = useCallback((key: string, direction: 'asc' | 'desc') => {
        setSortBy(key as HistorySortKey);
        setSortDirection(direction);
        goToPage(1);
    }, [goToPage]);

    // Calculate total item count for stagger animation
    const totalItems = useMemo(() => {
        let count = 0;
        groupedTransactions.forEach((txs) => {
            count += 1; // Header
            count += txs.length; // Cards
        });
        return count;
    }, [groupedTransactions]);

    // Touch event handlers for swipe
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        onTouchStart(e.nativeEvent);
    }, [onTouchStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        onTouchMove(e.nativeEvent);
    }, [onTouchMove]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        onTouchEnd(e.nativeEvent);
    }, [onTouchEnd]);

    // Story 14.15: Get selected transactions for modals
    const getSelectedTransactions = useCallback((): Transaction[] => {
        const allTx = allTransactions.length > 0 ? allTransactions : transactions;
        return allTx.filter((tx: Transaction) => tx.id && selectedIds.has(tx.id));
    }, [allTransactions, transactions, selectedIds]);

    // Story 14.15: Get transaction previews for delete modal
    const getTransactionPreviews = useCallback((): TransactionPreview[] => {
        return getSelectedTransactions().map((tx) => ({
            id: tx.id!, // Safe: filtered to have IDs
            displayName: tx.alias || tx.merchant,
            total: tx.total,
            currency: tx.currency || currency,
        }));
    }, [getSelectedTransactions, currency]);

    // Story 14.15: Handle batch delete
    // Story 14e-5: Now uses Modal Manager
    const handleDeleteTransactions = useCallback(async () => {
        if (!userId) {
            throw new Error('User not authenticated');
        }

        const transactionIds = Array.from(selectedIds);
        if (!txRepo) throw new Error('Not authenticated');

        try {
            await txRepo.deleteBatch(transactionIds);
            closeModal(); // Story 14e-5: Use Modal Manager to close
            exitSelectionMode();
        } catch (err) {
            console.error('[HistoryView] Failed to delete transactions:', err);
            throw err; // Re-throw so modal can show error
        }
    }, [userId, appId, selectedIds, exitSelectionMode, closeModal]);

    return (
        <PageTransition viewKey="history" direction="forward">
            <div
                ref={containerRef}
                className="relative"
                style={{
                    paddingBottom: 'calc(6rem + var(--safe-bottom, 0px))',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Story 15b-2c: Header extracted to HistoryHeader component */}
                <HistoryHeader
                    lang={lang}
                    t={t}
                    onBack={onBack}
                    userName={userName}
                    userEmail={userEmail}
                    isProfileOpen={isProfileOpen}
                    setIsProfileOpen={setIsProfileOpen}
                    handleProfileNavigate={handleProfileNavigate}
                    profileButtonRef={profileButtonRef}
                    theme={theme}
                    availableFilters={availableFilters}
                    isHeaderCollapsed={isHeaderCollapsed}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    sortOptions={HISTORY_SORT_OPTIONS}
                    handleSortChange={handleSortChange}
                    filteredTransactionsLength={filteredTransactions.length}
                    isStatisticsExport={isStatisticsExport}
                    isExporting={isExporting}
                    handleExport={handleExport}
                    hasAnyDuplicates={hasAnyDuplicates}
                    duplicateCount={duplicateCount}
                    showDuplicatesOnly={showDuplicatesOnly}
                    setShowDuplicatesOnly={setShowDuplicatesOnly}
                    duplicateTransactionsLength={duplicateTransactions.length}
                    setCurrentPage={setCurrentPage}
                />

                {/* Content area with horizontal padding - matches header padding */}
                <div className="px-3">
                    {/* Story 14.15: Selection Bar (shown when selection mode is active) */}
                    {isSelectionMode && (
                        <div className="mb-3">
                            <SelectionBar
                            selectedCount={selectedCount}
                            onClose={exitSelectionMode}
                            onGroup={() => { /* shared groups removed */ }}
                            onDelete={() => {
                                // Story 14e-5: Use Modal Manager for delete confirmation
                                openModal('deleteTransactions', {
                                    transactions: getTransactionPreviews(),
                                    onClose: closeModal,
                                    onDelete: handleDeleteTransactions,
                                    formatCurrency,
                                    t,
                                    lang: lang as 'en' | 'es',
                                    currency,
                                });
                            }}
                            onSelectAll={handleSelectAllToggle}
                            totalVisible={visibleTransactionIds.length}
                            t={t}
                            theme={theme as 'light' | 'dark'}
                            lang={lang as 'en' | 'es'}
                        />
                    </div>
                )}

                {/* Swipe indicator (AC #4) */}
                {isSwiping && hasTemporalFilter && !prefersReducedMotion && (
                    <div
                        className="fixed top-1/2 left-0 right-0 flex justify-center items-center pointer-events-none z-50"
                        style={{ opacity: Math.min(swipeProgress * 1.5, 1) }}
                    >
                        <div
                            className="flex items-center gap-2 px-4 py-2 rounded-full"
                            style={{
                                backgroundColor: 'var(--surface)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                        >
                            {swipeDirection === 'right' && canGoPrev && (
                                <>
                                    <ChevronLeft size={20} style={{ color: 'var(--primary)' }} />
                                    <span style={{ color: 'var(--text-primary)' }}>{t('previousPeriod')}</span>
                                </>
                            )}
                            {swipeDirection === 'left' && canGoNext && (
                                <>
                                    <span style={{ color: 'var(--text-primary)' }}>{t('nextPeriod')}</span>
                                    <ChevronRight size={20} style={{ color: 'var(--primary)' }} />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Story 15b-2c: Empty states extracted to HistoryEmptyStates component */}
                <HistoryEmptyStates
                    hasActiveFilters={hasActiveFilters}
                    showDuplicatesOnly={showDuplicatesOnly}
                    transactionsToDisplayLength={transactionsToDisplay.length}
                    lang={lang}
                    t={t}
                />

                {/* Transaction list with date grouping (Story 14.14 AC #2) */}
                {filteredTransactions.length > 0 && (
                    <div className="space-y-2">
                        {(() => {
                            let itemIndex = 0;
                            const elements: React.ReactNode[] = [];

                            groupedTransactions.forEach((transactions, dateKey) => {
                                // Date group header
                                const headerIndex = itemIndex++;
                                elements.push(
                                    <TransitionChild
                                        key={`header-${dateKey}-${currentPage}`}
                                        index={headerIndex}
                                        totalItems={totalItems}
                                        initialDelayMs={0}
                                        staggerMs={0}
                                    >
                                        <DateGroupHeader
                                            label={formatDateGroupLabel(dateKey, lang, t)}
                                            total={calculateGroupTotal(transactions)}
                                            currency={currency}
                                            theme={theme}
                                            formatCurrency={formatCurrency}
                                        />
                                    </TransitionChild>
                                );

                                // Transaction cards for this date
                                transactions.forEach((tx) => {
                                    const cardIndex = itemIndex++;
                                    const normalizedTx = normalizeTransaction(tx as any, userDefaults);
                                    const isDuplicate = tx.id ? duplicateIds.has(tx.id) : false;
                                    const displayCurrency = tx.currency || currency;

                                    elements.push(
                                        <TransitionChild
                                            key={`${tx.id}-${currentPage}`}
                                            index={cardIndex}
                                            totalItems={totalItems}
                                            initialDelayMs={0}
                                            staggerMs={0}
                                        >
                                            <div
                                                onTouchStart={() => handleLongPressStart(tx.id!)}
                                                onTouchEnd={handleLongPressEnd}
                                                onTouchMove={handleLongPressMove}
                                                onMouseDown={() => handleLongPressStart(tx.id!)}
                                                onMouseUp={handleLongPressEnd}
                                                onMouseLeave={handleLongPressEnd}
                                            >
                                                <TransactionCard
                                                    transaction={{
                                                        id: tx.id,
                                                        merchant: tx.merchant,
                                                        alias: tx.alias,
                                                        date: tx.date,
                                                        time: tx.time,
                                                        total: tx.total,
                                                        category: tx.category as any,
                                                        city: normalizedTx.city,
                                                        country: tx.country,
                                                        currency: displayCurrency,
                                                        thumbnailUrl: tx.thumbnailUrl,
                                                        imageUrls: tx.imageUrls,
                                                        items: tx.items || [],
                                                    }}
                                                    formatters={{
                                                        formatCurrency,
                                                        formatDate: formatDate as (date: string, format: string) => string,
                                                        t,
                                                    }}
                                                    theme={{
                                                        mode: theme === 'dark' ? 'dark' : 'light',
                                                        colorTheme,
                                                        dateFormat,
                                                    }}
                                                    defaultCurrency={currency}
                                                    userDefaultCountry={defaultCountry}
                                                    foreignLocationFormat={foreignLocationFormat}
                                                    lang={lang}
                                                    isDuplicate={isDuplicate}
                                                    onClick={() => onEditTransaction(tx)}
                                                    onThumbnailClick={() => handleThumbnailClick(tx)}
                                                    selection={{
                                                        isSelectionMode,
                                                        isSelected: isSelected(tx.id!),
                                                        onToggleSelect: () => toggleSelection(tx.id!),
                                                    }}
                                                />
                                            </div>
                                        </TransitionChild>
                                    );
                                });
                            });

                            return elements;
                        })()}
                    </div>
                )}

                {/* Story 15b-2c: Pagination extracted to HistoryPagination component */}
                {filteredTransactions.length > 0 && (
                    <HistoryPagination
                        currentPage={currentPage}
                        totalFilteredPages={totalFilteredPages}
                        pageSize={pageSize}
                        goToPage={goToPage}
                        setPageSize={setPageSize}
                        lang={lang}
                        t={t}
                        isAtListenerLimit={isAtListenerLimit}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMoreTransactions={onLoadMoreTransactions}
                        pageSizeOptions={PAGE_SIZE_OPTIONS}
                    />
                )}
                </div>

                {/* Image Viewer Modal */}
                {selectedTransaction && selectedTransaction.imageUrls && selectedTransaction.imageUrls.length > 0 && (
                    <ImageViewer
                        images={selectedTransaction.imageUrls}
                        merchantName={selectedTransaction.alias || selectedTransaction.merchant}
                        onClose={handleCloseViewer}
                    />
                )}

                {/* Story 14e-5: Delete Transactions Modal now uses Modal Manager */}
                {/* Rendered by ModalManager component via openModal('deleteTransactions', {...}) */}
            </div>
        </PageTransition>
    );
};

/**
 * HistoryView - Main export
 *
 * Story 15b-3g: Requires useHistoryFiltersInit() to be called by the parent
 * wrapper component (e.g., HistoryViewWithFilters in viewRenderers.tsx).
 */
export const HistoryView: React.FC<HistoryViewProps> = (props) => {
    return <HistoryViewInner {...props} />;
};
