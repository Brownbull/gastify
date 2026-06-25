import { ChevronLeftIcon } from "@design-system/assets/icons";

/**
 * Pagination — page controls for long lists. Layout:
 *   « first ·  ‹ prev ·  [n-1] [n] [n+1]  · next › · last »
 * The first/prev/next/last controls are arrow-only buttons; the numbers show the
 * current page plus its immediate neighbours (clamped at the ends). Hidden when
 * there is only one page.
 */
export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  className?: string;
}

function PageArrow({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}

export function Pagination({ page, pageCount, onPage, className = "" }: PaginationProps) {
  if (pageCount <= 1) return null;
  const nums = [page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount);

  return (
    <nav aria-label="Paginación" className={`flex items-center justify-center gap-gt-4 ${className}`}>
      <PageArrow label="Primera página" disabled={page === 1} onClick={() => onPage(1)}>
        <span className="flex">
          <ChevronLeftIcon className="-mr-2 h-4 w-4" />
          <ChevronLeftIcon className="h-4 w-4" />
        </span>
      </PageArrow>
      <PageArrow label="Página anterior" disabled={page === 1} onClick={() => onPage(page - 1)}>
        <ChevronLeftIcon className="h-4 w-4" />
      </PageArrow>

      {nums.map((n) => {
        const current = n === page;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Página ${n}`}
            aria-current={current ? "page" : undefined}
            onClick={() => onPage(n)}
            className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong px-gt-6 font-gt-display text-gt-sm font-extrabold shadow-gt-xs transition duration-150 ease-gt-bounce ${
              current ? "bg-gt-primary text-white" : "bg-gt-surface text-gt-ink hover:-translate-y-0.5"
            }`}
          >
            {n}
          </button>
        );
      })}

      <PageArrow label="Página siguiente" disabled={page === pageCount} onClick={() => onPage(page + 1)}>
        <ChevronLeftIcon className="h-4 w-4 rotate-180" />
      </PageArrow>
      <PageArrow label="Última página" disabled={page === pageCount} onClick={() => onPage(pageCount)}>
        <span className="flex">
          <ChevronLeftIcon className="-mr-2 h-4 w-4 rotate-180" />
          <ChevronLeftIcon className="h-4 w-4 rotate-180" />
        </span>
      </PageArrow>
    </nav>
  );
}
