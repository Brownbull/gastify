/**
 * RecentScansView Component
 *
 * Story 14.31: Dedicated view for latest scanned transactions.
 *
 * Features:
 * - Shows transactions sorted by createdAt (scan date) descending
 * - Simple design: back button + transaction list
 * - Pagination with 15/30/60 items per page
 * - No filters (dedicated to showing most recent scans)
 * - Selection mode for batch operations (group assignment, delete)
 *
 * This view is accessed from "Ver todo →" link in DashboardView's
 * "Últimos Escaneados" section.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import { toMillis, toDateSafe } from '@/utils/timestamp';
import { TransactionCard } from '@/components/transactions';
import { SelectionBar } from '@features/history/components/SelectionBar';
import { useSelectionMode } from '@/hooks/useSelectionMode';

// ============================================================================
// Types
// ============================================================================

interface RecentScansViewProps {
    /** All transactions (will be sorted by createdAt internally) */
    transactions: Transaction[];
    /** Theme mode */
    theme: 'light' | 'dark';
    /** Default currency */
    currency: string;
    /** Date format preference */
    dateFormat: string;
    /** Translation function */
    t: (key: string) => string;
    /** Format currency amount */
    formatCurrency: (amount: number, currency: string) => string;
    /** Format date string */
    formatDate: (date: string, format: string) => string;
    /** Navigate back handler */
    onBack: () => void;
    /** Edit transaction handler */
    onEditTransaction: (transaction: Transaction) => void;
    /** Language for display */
    lang?: 'en' | 'es';
    /** Story 14.35b: User's default country for foreign location detection */
    defaultCountry?: string;
    /** Story 14.35b: How to display foreign locations (code or flag) */
    foreignLocationFormat?: 'code' | 'flag';
    userId?: string | null;
    onGroupSelected?: (selectedIds: string[]) => void;
    onDeleteSelected?: (selectedIds: string[]) => void;
}

// Page size options
const PAGE_SIZES = [15, 30, 60] as const;
type PageSize = typeof PAGE_SIZES[number];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sort transactions by createdAt (scan date) descending.
 */
function sortByCreatedAtDesc(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((a, b) =>
        toMillis(b.createdAt) - toMillis(a.createdAt)
    );
}

/**
 * Format createdAt timestamp for display.
 */
function formatCreatedAt(createdAt: any, lang: 'en' | 'es' = 'es'): string {
    const date = toDateSafe(createdAt);
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Relative time for recent items
    if (diffMins < 1) {
        return lang === 'es' ? 'ahora' : 'now';
    }
    if (diffMins < 60) {
        return lang === 'es' ? `hace ${diffMins} min` : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
        return lang === 'es' ? `hace ${diffHours}h` : `${diffHours}h ago`;
    }
    if (diffDays === 1) {
        return lang === 'es' ? 'ayer' : 'yesterday';
    }
    if (diffDays < 7) {
        return lang === 'es' ? `hace ${diffDays} días` : `${diffDays}d ago`;
    }

    // Absolute date for older items
    return date.toLocaleDateString(lang === 'es' ? 'es-CL' : 'en-US', {
        day: 'numeric',
        month: 'short',
    });
}

// ============================================================================
// Component
// ============================================================================

export function RecentScansView({
    transactions,
    theme,
    currency,
    dateFormat,
    t,
    formatCurrency,
    formatDate,
    onBack,
    onEditTransaction,
    lang = 'es',
    defaultCountry = '',
    foreignLocationFormat = 'code',
    userId: _userId = null,
    onGroupSelected,
    onDeleteSelected,
}: RecentScansViewProps) {
    // Pagination state
    const [pageSize, setPageSize] = useState<PageSize>(15);
    const [currentPage, setCurrentPage] = useState(1);

    const {
        isSelectionMode,
        selectedIds,
        selectedCount,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
    } = useSelectionMode();

    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const longPressMoved = useRef(false);
    const LONG_PRESS_DURATION = 500; // ms

    const handleLongPressStart = useCallback((txId: string) => {
        longPressMoved.current = false;
        longPressTimerRef.current = setTimeout(() => {
            if (!longPressMoved.current) {
                enterSelectionMode(txId);
            }
        }, LONG_PRESS_DURATION);
    }, [enterSelectionMode]);

    const handleLongPressEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleLongPressMove = useCallback(() => {
        longPressMoved.current = true;
        handleLongPressEnd();
    }, [handleLongPressEnd]);

    // Sort transactions by createdAt descending
    const sortedTransactions = useMemo(
        () => sortByCreatedAtDesc(transactions),
        [transactions]
    );

    // Calculate pagination
    const totalPages = Math.ceil(sortedTransactions.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

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

    const handleGroupAction = useCallback(() => {
        if (onGroupSelected && selectedCount > 0) {
            onGroupSelected(Array.from(selectedIds));
        }
    }, [onGroupSelected, selectedIds, selectedCount]);

    const handleDeleteAction = useCallback(() => {
        if (onDeleteSelected && selectedCount > 0) {
            onDeleteSelected(Array.from(selectedIds));
            exitSelectionMode();
        }
    }, [onDeleteSelected, selectedIds, selectedCount, exitSelectionMode]);

    // Reset to page 1 when page size changes
    const handlePageSizeChange = (newSize: PageSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    // Formatters for TransactionCard
    const formatters = {
        formatCurrency,
        formatDate,
        t,
    };

    const themeSettings = {
        mode: theme as 'light' | 'dark',
        dateFormat,
    };

    return (
        <div
            className="min-h-screen pb-24"
            style={{ backgroundColor: 'var(--bg)' }}
        >
            {/* Header - matches HistoryView/ReportsView style */}
            <div
                className="sticky px-4"
                style={{
                    top: 0,
                    zIndex: 50,
                    backgroundColor: 'var(--bg)',
                }}
            >
                {/* Fixed height header row - matches ReportsView exactly (72px) */}
                <div
                    className="flex items-center justify-between"
                    style={{
                        height: '72px',
                        paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
                    }}
                >
                    {/* Left side: Back button + Title */}
                    <div className="flex items-center gap-0">
                        <button
                            onClick={onBack}
                            className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
                            aria-label={t('back')}
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <ChevronLeft size={28} strokeWidth={2.5} />
                        </button>
                        <h1
                            className="font-semibold"
                            style={{
                                fontFamily: 'var(--font-family)',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '20px',
                            }}
                        >
                            {lang === 'es' ? 'Últimos Escaneados' : 'Recent Scans'}
                        </h1>
                    </div>

                    {/* Right side: Page size selector */}
                    <div className="flex items-center gap-2">
                        <span
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {lang === 'es' ? 'Mostrar' : 'Show'}
                        </span>
                        <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value) as PageSize)}
                            className="text-sm py-1.5 px-2.5 rounded-lg border cursor-pointer"
                            style={{
                                backgroundColor: 'var(--surface)',
                                borderColor: 'var(--border-light)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            {PAGE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {isSelectionMode && (
                <div className="px-4 py-2">
                    <SelectionBar
                        selectedCount={selectedCount}
                        onClose={exitSelectionMode}
                        onGroup={handleGroupAction}
                        onDelete={handleDeleteAction}
                        onSelectAll={handleSelectAllToggle}
                        totalVisible={visibleTransactionIds.length}
                        t={t}
                        theme={theme as 'light' | 'dark'}
                        lang={lang as 'en' | 'es'}
                    />
                </div>
            )}

            {/* Transaction count */}
            {!isSelectionMode && (
                <div className="px-4 py-2">
                    <span
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {sortedTransactions.length} {lang === 'es' ? 'transacciones' : 'transactions'}
                    </span>
                </div>
            )}

            {/* Transaction list */}
            <div className="px-4 space-y-3">
                {paginatedTransactions.map((tx, index) => (
                    <div
                        key={tx.id || index}
                        className="relative"
                        onTouchStart={() => tx.id && handleLongPressStart(tx.id)}
                        onTouchEnd={handleLongPressEnd}
                        onTouchMove={handleLongPressMove}
                        onMouseDown={() => tx.id && handleLongPressStart(tx.id)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                    >
                        {/* Scan time badge */}
                        <div
                            className="absolute -top-1 right-2 z-10 px-2 py-0.5 rounded-full text-xs"
                            style={{
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                            }}
                        >
                            {formatCreatedAt(tx.createdAt, lang)}
                        </div>

                        <TransactionCard
                            transaction={tx}
                            formatters={formatters}
                            theme={themeSettings}
                            defaultCurrency={currency}
                            userDefaultCountry={defaultCountry}
                            foreignLocationFormat={foreignLocationFormat}
                            onClick={() => {
                                if (isSelectionMode && tx.id) {
                                    toggleSelection(tx.id);
                                } else {
                                    onEditTransaction(tx);
                                }
                            }}
                            selection={isSelectionMode ? {
                                isSelectionMode,
                                isSelected: tx.id ? isSelected(tx.id) : false,
                                onToggleSelect: () => tx.id && toggleSelection(tx.id),
                            } : undefined}
                        />
                    </div>
                ))}

                {paginatedTransactions.length === 0 && (
                    <div
                        className="text-center py-12"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {lang === 'es'
                            ? 'No hay transacciones escaneadas'
                            : 'No scanned transactions'}
                    </div>
                )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
                <div
                    className="sticky bottom-20 mx-4 mt-4 px-4 py-3 rounded-xl border flex items-center justify-between"
                    style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border-light)',
                        zIndex: 40,
                    }}
                >
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                        style={{
                            backgroundColor: currentPage === 1 ? 'transparent' : 'var(--primary)',
                            color: currentPage === 1 ? 'var(--text-secondary)' : 'white',
                        }}
                    >
                        {lang === 'es' ? '← Anterior' : '← Previous'}
                    </button>

                    <span
                        className="text-sm"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {currentPage} / {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                        style={{
                            backgroundColor: currentPage === totalPages ? 'transparent' : 'var(--primary)',
                            color: currentPage === totalPages ? 'var(--text-secondary)' : 'white',
                        }}
                    >
                        {lang === 'es' ? 'Siguiente →' : 'Next →'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default RecentScansView;
