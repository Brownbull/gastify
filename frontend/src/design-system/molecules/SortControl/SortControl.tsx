import * as React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

type SortDirection = 'asc' | 'desc';

interface SortField {
  readonly value: string;
  readonly label: string;
}

interface SortControlProps {
  field: string;
  direction: SortDirection;
  fields: readonly SortField[];
  onSort: (field: string, direction: SortDirection) => void;
  className?: string;
}

export function SortControl({
  field,
  direction,
  fields,
  onSort,
  className = '',
}: SortControlProps) {
  const selectId = React.useId();
  const DirectionIcon = direction === 'asc' ? ArrowUp : ArrowDown;

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSort(e.target.value, direction);
  };

  const handleDirectionToggle = () => {
    const nextDirection: SortDirection = direction === 'asc' ? 'desc' : 'asc';
    onSort(field, nextDirection);
  };

  return (
    <div
      className={[
        'inline-flex items-center gap-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label="Opciones de ordenamiento"
    >
      <div className="relative">
        <label htmlFor={selectId} className="sr-only">
          Ordenar por
        </label>
        <select
          id={selectId}
          value={field}
          onChange={handleFieldChange}
          className="appearance-none pl-3 pr-7 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--primary)',
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.25rem center',
            backgroundSize: '1.25em 1.25em',
          } as React.CSSProperties}
        >
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleDirectionToggle}
        className="p-1.5 rounded-lg border transition-colors duration-150 hover:opacity-80 focus:outline-none focus:ring-2"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          '--tw-ring-color': 'var(--primary)',
        } as React.CSSProperties}
        aria-label={direction === 'asc' ? 'Orden ascendente, cambiar a descendente' : 'Orden descendente, cambiar a ascendente'}
        title={direction === 'asc' ? 'Ascendente' : 'Descendente'}
      >
        <DirectionIcon size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
