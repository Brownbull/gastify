/**
 * Story 15b-2d: Pagination controls extracted from ItemsView.tsx
 *
 * Contains page navigation buttons and page size selector.
 * Internal to the ItemsView directory — NOT exported from the feature barrel.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS, type PageSizeOption } from './itemsViewConstants';

export interface ItemsViewPaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: PageSizeOption;
    onGoToPage: (page: number) => void;
    onPageSizeChange: (size: PageSizeOption) => void;
    lang: 'en' | 'es';
}

export const ItemsViewPagination: React.FC<ItemsViewPaginationProps> = ({
    currentPage,
    totalPages,
    pageSize,
    onGoToPage,
    onPageSizeChange,
    lang,
}) => {
    return (
        <div className="flex flex-col items-center gap-4 py-6">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
                <button
                    disabled={currentPage <= 1}
                    onClick={() => onGoToPage(currentPage - 1)}
                    className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border-light)',
                    }}
                    aria-label={lang === 'es' ? 'Página anterior' : 'Previous page'}
                >
                    <ChevronLeft size={20} style={{ color: 'var(--text-primary)' }} />
                </button>
                <span
                    className="py-2 text-sm min-w-[50px] text-center"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {currentPage} / {totalPages}
                </span>
                <button
                    disabled={currentPage >= totalPages}
                    onClick={() => onGoToPage(currentPage + 1)}
                    className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border-light)',
                    }}
                    aria-label={lang === 'es' ? 'Página siguiente' : 'Next page'}
                >
                    <ChevronRight size={20} style={{ color: 'var(--text-primary)' }} />
                </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2" data-testid="page-size-selector">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {lang === 'es' ? 'Por página:' : 'Per page:'}
                </span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                        key={size}
                        onClick={() => onPageSizeChange(size)}
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
        </div>
    );
};
