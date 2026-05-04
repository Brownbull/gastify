import { X } from 'lucide-react';
import { Chip } from '../../atoms/Chip';

type FilterType = 'date' | 'category' | 'amount' | 'tag' | 'search';

interface FilterItem {
  readonly id: string;
  readonly type: FilterType;
  readonly label: string;
  readonly active: boolean;
}

interface FilterStripProps {
  filters: readonly FilterItem[];
  onToggle: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterStrip({ filters, onToggle, onClearAll, className = '' }: FilterStripProps) {
  const hasActiveFilters = filters.some((f) => f.active);

  return (
    <div
      className={[
        'flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-hide',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label="Filtros"
    >
      {filters.map((filter) => (
        <Chip
          key={filter.id}
          label={filter.label}
          variant={filter.active ? 'selected' : 'default'}
          onClick={() => onToggle(filter.id)}
        />
      ))}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors duration-150 hover:opacity-80"
          style={{ color: 'var(--error)' }}
          aria-label="Limpiar todos los filtros"
        >
          <X size={14} aria-hidden="true" />
          Limpiar
        </button>
      )}
    </div>
  );
}
