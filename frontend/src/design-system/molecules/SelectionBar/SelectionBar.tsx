import { Trash2, Tag, Download, X } from 'lucide-react';

interface SelectionBarProps {
  count: number;
  onDelete?: () => void;
  onCategorize?: () => void;
  onExport?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface ActionButton {
  icon: typeof Trash2;
  label: string;
  handler: (() => void) | undefined;
  color: string;
}

export function SelectionBar({
  count,
  onDelete,
  onCategorize,
  onExport,
  onDismiss,
  className = '',
}: SelectionBarProps) {
  const actions: readonly ActionButton[] = [
    { icon: Tag, label: 'Categorizar', handler: onCategorize, color: 'var(--info)' },
    { icon: Download, label: 'Exportar', handler: onExport, color: 'var(--primary)' },
    { icon: Trash2, label: 'Eliminar', handler: onDelete, color: 'var(--error)' },
  ];

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-2.5 rounded-xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
      role="toolbar"
      aria-label={`${count} elemento${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}`}
    >
      <span
        className="text-sm font-medium whitespace-nowrap"
        style={{ color: 'var(--text-primary)' }}
      >
        {count} seleccionado{count !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-1 flex-1 justify-end">
        {actions.map((action) =>
          action.handler ? (
            <button
              key={action.label}
              type="button"
              onClick={action.handler}
              className="p-2 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: action.color }}
              aria-label={action.label}
              title={action.label}
            >
              <action.icon size={18} />
            </button>
          ) : null,
        )}

        {onDismiss && (
          <>
            <div
              className="w-px h-5 mx-1"
              style={{ backgroundColor: 'var(--border)' }}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={onDismiss}
              className="p-2 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Cancelar selección"
            >
              <X size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
