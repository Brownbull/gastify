import { Pencil, Trash2, ArrowRight } from 'lucide-react';

interface Mapping {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

interface MappingsListProps {
  mappings: readonly Mapping[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function MappingsList({ mappings, onEdit, onDelete, className = '' }: MappingsListProps) {
  if (mappings.length === 0) {
    return (
      <div
        className={['flex items-center justify-center p-6 rounded-xl', className].filter(Boolean).join(' ')}
        style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No hay mapeos configurados
        </span>
      </div>
    );
  }

  return (
    <div
      className={['flex flex-col rounded-xl overflow-hidden', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      role="list"
      aria-label="Lista de mapeos"
    >
      {mappings.map((mapping, index) => (
        <div
          key={mapping.id}
          className="flex items-center gap-3 px-4 py-3"
          style={index < mappings.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
          role="listitem"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {mapping.key}
            </span>
            <ArrowRight size={14} aria-hidden="true" className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <span
              className="text-sm truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {mapping.value}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => onEdit(mapping.id)}
              aria-label={`Editar mapeo ${mapping.key}`}
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--error)' }}
              onClick={() => onDelete(mapping.id)}
              aria-label={`Eliminar mapeo ${mapping.key}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
