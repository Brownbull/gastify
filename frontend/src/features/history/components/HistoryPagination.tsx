/**
 * HistoryPagination - Pagination controls for HistoryView
 *
 * Extracted from HistoryView.tsx (Story 15b-2c) for decomposition.
 * Page navigation, page size selector, load-more button, end-of-history indicator.
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { PageSizeOption } from '@features/history/views/historyViewConstants';

export interface HistoryPaginationProps {
    currentPage: number;
    totalFilteredPages: number;
    pageSize: PageSizeOption;
    goToPage: (page: number) => void;
    setPageSize: (size: PageSizeOption) => void;
    lang: string;
    t: (key: string) => string;
    isAtListenerLimit: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMoreTransactions: () => void;
    pageSizeOptions: readonly number[];
}

export const HistoryPagination: React.FC<HistoryPaginationProps> = ({
    currentPage,
    totalFilteredPages,
    pageSize,
    goToPage,
    setPageSize,
    lang,
    t,
    isAtListenerLimit,
    hasMore,
    isLoadingMore,
    onLoadMoreTransactions,
    pageSizeOptions,
}) => {
    return (
        <div className="flex flex-col items-center gap-3 mt-6">
            {/* Page navigation - Circular buttons with arrows */}
            <div className="flex items-center gap-4">
                <button
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border-light)',
                    }}
                    aria-label={t('previousPage')}
                >
                    <ChevronLeft size={20} style={{ color: 'var(--text-primary)' }} />
                </button>
                <span className="py-2 text-sm min-w-[50px] text-center" style={{ color: 'var(--text-secondary)' }}>
                    {currentPage} / {totalFilteredPages}
                </span>
                <button
                    disabled={currentPage >= totalFilteredPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border-light)',
                    }}
                    aria-label={t('nextPage')}
                >
                    <ChevronRight size={20} style={{ color: 'var(--text-primary)' }} />
                </button>
            </div>
            {/* Page size selector */}
            <div className="flex items-center gap-2" data-testid="page-size-selector">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {lang === 'es' ? 'Por página:' : 'Per page:'}
                </span>
                {pageSizeOptions.map((size) => (
                    <button
                        key={size}
                        onClick={() => {
                            setPageSize(size as PageSizeOption);
                            goToPage(1);
                        }}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                            pageSize === size ? 'font-semibold' : ''
                        }`}
                        style={{
                            backgroundColor: pageSize === size ? 'var(--primary)' : 'transparent',
                            color: pageSize === size ? 'white' : 'var(--text-secondary)',
                        }}
                        aria-label={`${lang === 'es' ? 'Mostrar' : 'Show'} ${size} ${lang === 'es' ? 'por página' : 'per page'}`}
                        aria-pressed={pageSize === size}
                        data-testid={`page-size-${size}`}
                    >
                        {size}
                    </button>
                ))}
            </div>

            {/* Load more button */}
            {isAtListenerLimit && hasMore && currentPage >= totalFilteredPages && (
                <button
                    onClick={onLoadMoreTransactions}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-primary)',
                    }}
                    data-testid="load-more-transactions"
                >
                    {isLoadingMore ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{lang === 'es' ? 'Cargando...' : 'Loading...'}</span>
                        </>
                    ) : (
                        <span>{lang === 'es' ? 'Cargar más transacciones' : 'Load more transactions'}</span>
                    )}
                </button>
            )}

            {/* End of history indicator */}
            {isAtListenerLimit && !hasMore && currentPage >= totalFilteredPages && (
                <span
                    className="text-xs py-2"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    {lang === 'es' ? 'Fin del historial' : 'End of history'}
                </span>
            )}
        </div>
    );
};
