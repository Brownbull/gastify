/**
 * ItemsView - Items History with Filtering
 *
 * Story 14.31: Items History View
 * Story 14e-31: ItemsView Data Ownership (refactored to use useItemsViewData)
 * Story 15b-2d: Decomposed into sub-files (constants, empty state, filters, header, pagination)
 * Epic 14: Core Implementation
 *
 * Features:
 * - Flat list of all purchased items across transactions
 * - Search by item name
 * - Filter by item category, date range (temporal breadcrumb)
 * - Date grouping with sticky headers
 * - Click to navigate to parent transaction
 * - CSV export
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.31-items-history-view.md
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-31-itemsview-data-ownership.md
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ItemCard, AggregatedItemCard } from '@features/items/components';
import { PageTransition } from '@/components/animation/PageTransition';
import { TransitionChild } from '@/components/animation/TransitionChild';
import { useDerivedItems } from '@features/items/hooks/useDerivedItems';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { aggregateItems, sortAggregatedItems, sortItemsByPrice, sortItemsByName, sortItemsByDate } from '@features/items/hooks/useItems';
import { filterToDuplicatesGrouped, getItemDuplicateCount } from '@features/items/services/itemDuplicateDetectionService';
import { extractAvailableFilters } from '@shared/utils/historyFilterUtils';
import type { FlattenedItem, ItemFilters, AggregatedItem } from '@/types/item';
import { downloadAggregatedItemsCSV } from '@/utils/csvExport';
import { useNavigationActions } from '@/shared/stores';
import type { View } from '@app/types';
import { useItemsViewData } from './useItemsViewData';
import {
    DEFAULT_PAGE_SIZE,
    DEFAULT_SORT_KEY,
    DEFAULT_SORT_DIRECTION,
    type PageSizeOption,
    type ItemSortKey,
    type ItemsViewProps,
} from './itemsViewConstants';
import { EmptyState } from './ItemsViewEmptyState';
import { applyAllItemsFilters } from './itemsViewFilters';
import { ItemsViewHeader } from './ItemsViewHeader';
import { ItemsViewPagination } from './ItemsViewPagination';

// ============================================================================
// Main Component
// ============================================================================

export const ItemsView: React.FC<ItemsViewProps> = ({
    _testOverrides,
    initialCategory,
    initialSearchTerm,
}) => {
    // Story 14e-31: Data ownership via internal hook
    const hookData = useItemsViewData();

    // Merge hook data with test overrides (for handler injection from App.tsx)
    const {
        transactions,
        userName,
        userEmail,
        userId: _userId,
        theme,
        colorTheme,
        lang,
        currency,
        dateFormat,
        defaultCountry,
        t,
        formatCurrency,
        formatDate: formatDateHook,
        onEditTransaction,
    } = { ...hookData, ..._testOverrides };

    // Widen the formatDate type to match component expectations (string format)
    const formatDate = formatDateHook as (date: string, format: string) => string;

    // Story 14e-25d: Direct navigation from store (ViewHandlersContext deleted)
    const { navigateBack, setView } = useNavigationActions();
    const onBack = navigateBack;
    const onNavigateToView = setView;

    // Profile dropdown state
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileButtonRef = useRef<HTMLButtonElement>(null);

    // Header collapse state
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);
    const scrollThreshold = 80;

    // Export state
    const [isExporting, setIsExporting] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);

    // Story 14.31 Session 2: Duplicate filter state
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

    // Story 14.31 Session 3: Sort state
    const [sortBy, setSortBy] = useState<ItemSortKey>(DEFAULT_SORT_KEY);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);

    // Animation preference
    const prefersReducedMotion = useReducedMotion();

    // Story 14.31 Session 2: Use useHistoryFilters (Zustand) for temporal navigation
    const {
        state: filterState,
        dispatch: filterDispatch,
        hasActiveFilters: hasTemporalOrCategoryFilters,
    } = useHistoryFilters();

    // Items hook - uses React Query caching for derived items
    const {
        filteredItems: baseFilteredItems,
        filters,
        setFilters,
        searchTerm,
        setSearchTerm,
        clearFilters: clearItemFilters,
    } = useDerivedItems(transactions, false);

    // Extract available temporal filters from transactions (for breadcrumb)
    const availableFilters = useMemo(() => {
        return extractAvailableFilters(transactions as any);
    }, [transactions]);

    // Story 15b-2d: Filter logic extracted to itemsViewFilters.ts
    const filteredItems = useMemo(
        () => applyAllItemsFilters(baseFilteredItems, filterState.temporal, filterState.category),
        [baseFilteredItems, filterState.temporal, filterState.category],
    );

    // Story 14.31 Session 2: Detect potential duplicates in filtered items
    const duplicateCount = useMemo(() => {
        return getItemDuplicateCount(filteredItems);
    }, [filteredItems]);

    const hasAnyDuplicates = duplicateCount > 0;

    // Story 14.31 Session 2: Aggregate items by product name + merchant
    const aggregatedItems = useMemo((): AggregatedItem[] => {
        const aggregated = aggregateItems(filteredItems);
        return sortAggregatedItems(aggregated, sortBy, sortDirection);
    }, [filteredItems, sortBy, sortDirection]);

    // Story 14.31 Session 2: Flat items for duplicate view
    const duplicateItems = useMemo((): FlattenedItem[] => {
        if (showDuplicatesOnly) {
            const dupes = filterToDuplicatesGrouped(filteredItems);
            switch (sortBy) {
                case 'totalAmount':
                    return sortItemsByPrice(dupes, sortDirection);
                case 'name':
                    return sortItemsByName(dupes, sortDirection);
                case 'lastPurchaseDate':
                default:
                    return sortItemsByDate(dupes, sortDirection);
            }
        }
        return [];
    }, [filteredItems, showDuplicatesOnly, sortBy, sortDirection]);

    // Initialize filters from props
    useEffect(() => {
        if (initialCategory || initialSearchTerm) {
            const newFilters: ItemFilters = { ...filters };
            if (initialCategory) {
                newFilters.category = initialCategory;
            }
            setFilters(newFilters);
            if (initialSearchTerm) {
                setSearchTerm(initialSearchTerm);
            }
        }
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate total pages
    const totalPages = useMemo(() => {
        const itemCount = showDuplicatesOnly ? duplicateItems.length : aggregatedItems.length;
        return Math.max(1, Math.ceil(itemCount / pageSize));
    }, [aggregatedItems.length, duplicateItems.length, showDuplicatesOnly, pageSize]);

    // Paginate aggregated items (normal view)
    const paginatedAggregatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return aggregatedItems.slice(startIndex, startIndex + pageSize);
    }, [aggregatedItems, currentPage, pageSize]);

    // Paginate duplicate items (duplicate filter view)
    const paginatedDuplicateItems = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return duplicateItems.slice(startIndex, startIndex + pageSize);
    }, [duplicateItems, currentPage, pageSize]);

    // Check if any filters are active
    const hasActiveFilters = !!(
        filters.category ||
        filters.dateRange ||
        filters.merchantName ||
        filters.city ||
        searchTerm.trim() ||
        hasTemporalOrCategoryFilters ||
        showDuplicatesOnly
    );

    // Handle profile navigation
    const handleProfileNavigate = useCallback((view: string) => {
        setIsProfileOpen(false);
        onNavigateToView(view as View);
    }, [onNavigateToView]);

    // Handle item click - navigate to parent transaction
    const handleItemClick = useCallback((item: FlattenedItem) => {
        onEditTransaction(item.transactionId);
    }, [onEditTransaction]);

    // Handle transaction count click
    const handleTransactionCountClick = useCallback((transactionIds: string[]) => {
        if (transactionIds.length > 0) {
            onEditTransaction(transactionIds[0], transactionIds);
        }
    }, [onEditTransaction]);

    // Handle page navigation with scroll to top
    const goToPage = useCallback((page: number) => {
        const validPage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(validPage);
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [totalPages]);

    // Handle export
    const handleExport = useCallback(async () => {
        if (aggregatedItems.length === 0) return;

        setIsExporting(true);
        try {
            const monthLabel = filterState.temporal.month || undefined;
            downloadAggregatedItemsCSV(aggregatedItems, lang, monthLabel);
        } catch (error) {
            console.error('[ItemsView] Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    }, [aggregatedItems, lang, filterState.temporal.month]);

    // Handle search change with reset
    const handleSearchChange = useCallback((term: string) => {
        setSearchTerm(term);
        goToPage(1);
    }, [setSearchTerm, goToPage]);

    // Handle clear all filters
    const handleClearFilters = useCallback(() => {
        clearItemFilters();
        filterDispatch({ type: 'CLEAR_ALL_FILTERS' });
        setShowDuplicatesOnly(false);
        goToPage(1);
    }, [clearItemFilters, filterDispatch, goToPage]);

    // Handle page size change
    const handlePageSizeChange = useCallback((size: PageSizeOption) => {
        setPageSize(size);
        goToPage(1);
    }, [goToPage]);

    // Handle sort change
    const handleSortChange = useCallback((key: string, direction: 'asc' | 'desc') => {
        setSortBy(key as ItemSortKey);
        setSortDirection(direction);
        goToPage(1);
    }, [goToPage]);

    // Handle duplicate toggle
    const handleToggleDuplicates = useCallback(() => {
        setShowDuplicatesOnly(!showDuplicatesOnly);
        setCurrentPage(1);
    }, [showDuplicatesOnly]);

    // Scroll handler for header collapse
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = containerRef.current?.scrollTop ?? window.scrollY;
            const delta = scrollY - lastScrollY.current;

            if (scrollY > scrollThreshold && delta > 15) {
                setIsHeaderCollapsed(true);
            } else if (scrollY < scrollThreshold || delta < -15) {
                setIsHeaderCollapsed(false);
            }

            lastScrollY.current = scrollY;
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // Reset page when temporal filters change
    const prevTemporalRef = useRef<string | null>(null);
    useEffect(() => {
        const currentKey = JSON.stringify(filterState.temporal);
        if (prevTemporalRef.current !== null && prevTemporalRef.current !== currentKey) {
            goToPage(1);
        }
        prevTemporalRef.current = currentKey;
    }, [filterState.temporal, goToPage]);

    return (
        <PageTransition viewKey="items" direction="forward">
            <div
                ref={containerRef}
                className="relative h-full overflow-y-auto"
                style={{
                    paddingBottom: 'calc(6rem + var(--safe-bottom, 0px))',
                }}
            >
                {/* Story 15b-2d: Header extracted to ItemsViewHeader */}
                <ItemsViewHeader
                    lang={lang}
                    isHeaderCollapsed={isHeaderCollapsed}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    availableFilters={availableFilters}
                    t={t}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                    aggregatedItemsCount={aggregatedItems.length}
                    duplicateItemsCount={duplicateItems.length}
                    duplicateCount={duplicateCount}
                    showDuplicatesOnly={showDuplicatesOnly}
                    onToggleDuplicates={handleToggleDuplicates}
                    hasAnyDuplicates={hasAnyDuplicates}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={handleClearFilters}
                    temporalLevel={filterState.temporal.level}
                    isExporting={isExporting}
                    onExport={handleExport}
                    onBack={onBack}
                    userName={userName}
                    userEmail={userEmail}
                    isProfileOpen={isProfileOpen}
                    onToggleProfile={() => setIsProfileOpen(!isProfileOpen)}
                    onCloseProfile={() => setIsProfileOpen(false)}
                    onProfileNavigate={handleProfileNavigate}
                    profileButtonRef={profileButtonRef}
                    theme={theme}
                />

                {/* Content Area */}
                <div className="px-3">
                    {(showDuplicatesOnly ? duplicateItems.length : aggregatedItems.length) === 0 ? (
                        <EmptyState
                            hasFilters={hasActiveFilters}
                            lang={lang}
                        />
                    ) : showDuplicatesOnly ? (
                        /* Duplicate view: Show flat items with ItemCard */
                        <div className="space-y-2">
                            {paginatedDuplicateItems.map((item: FlattenedItem, index: number) => (
                                <TransitionChild
                                    key={item.id}
                                    index={index}
                                    enabled={!prefersReducedMotion}
                                >
                                    <ItemCard
                                        item={item}
                                        formatters={{
                                            formatCurrency,
                                            formatDate,
                                            t,
                                        }}
                                        theme={{
                                            mode: theme as 'light' | 'dark',
                                            colorTheme,
                                            dateFormat,
                                        }}
                                        defaultCurrency={currency}
                                        userDefaultCountry={defaultCountry}
                                        lang={lang}
                                        onClick={() => handleItemClick(item)}
                                    />
                                </TransitionChild>
                            ))}
                        </div>
                    ) : (
                        /* Normal view: Show aggregated items with AggregatedItemCard */
                        <div className="space-y-2">
                            {paginatedAggregatedItems.map((item: AggregatedItem, index: number) => (
                                <TransitionChild
                                    key={item.id}
                                    index={index}
                                    enabled={!prefersReducedMotion}
                                >
                                    <AggregatedItemCard
                                        item={item}
                                        formatters={{
                                            formatCurrency,
                                            formatDate,
                                            t,
                                        }}
                                        theme={{
                                            mode: theme as 'light' | 'dark',
                                            colorTheme,
                                            dateFormat,
                                        }}
                                        defaultCurrency={currency}
                                        lang={lang}
                                        onTransactionCountClick={handleTransactionCountClick}
                                    />
                                </TransitionChild>
                            ))}
                        </div>
                    )}

                    {/* Story 15b-2d: Pagination extracted to ItemsViewPagination */}
                    {(showDuplicatesOnly ? duplicateItems.length : aggregatedItems.length) > 0 && (
                        <ItemsViewPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            pageSize={pageSize}
                            onGoToPage={goToPage}
                            onPageSizeChange={handlePageSizeChange}
                            lang={lang}
                        />
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default ItemsView;
