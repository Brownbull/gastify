import { Chip } from '../../atoms/Chip';

interface FilterItem {
  readonly id: string;
  readonly label: string;
}

interface FilterChipsProps {
  filters: readonly FilterItem[];
  onRemove: (id: string) => void;
  className?: string;
}

export function FilterChips({ filters, onRemove, className = '' }: FilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div
      className={[
        'flex gap-2 overflow-x-auto py-1 scrollbar-hide',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ WebkitOverflowScrolling: 'touch' }}
      role="list"
      aria-label="Filtros activos"
    >
      {filters.map((filter) => (
        <div key={filter.id} role="listitem" className="shrink-0">
          <Chip
            label={filter.label}
            variant="removable"
            onRemove={() => onRemove(filter.id)}
          />
        </div>
      ))}
    </div>
  );
}
