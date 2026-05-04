import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <nav
      className="flex items-center justify-between gap-4 flex-wrap"
      aria-label="Paginación"
    >
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isPrevDisabled}
          className="inline-flex items-center justify-center rounded-lg p-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Page numbers */}
        {visiblePages.map((page, idx) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex items-center justify-center w-9 h-9 text-sm"
                style={{ color: 'var(--text-tertiary)' }}
                aria-hidden="true"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
              }}
              aria-label={`Página ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isNextDisabled}
          className="inline-flex items-center justify-center rounded-lg p-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Página siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Page size selector */}
      {pageSize != null && pageSizeOptions && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="page-size-select"
            className="text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Mostrar
          </label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border px-2 py-1 text-sm"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            per page
          </span>
        </div>
      )}
    </nav>
  );
}
