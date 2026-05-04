import * as React from 'react';
import { Plus, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FABItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

interface FABProps {
  items: readonly FABItem[];
  onSelect: (id: string) => void;
  className?: string;
}

export function FAB({ items, onSelect, className = '' }: FABProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={['fixed bottom-6 right-6 flex flex-col-reverse items-center gap-3', className]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform duration-200"
        style={{
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {open ? <X size={24} aria-hidden="true" /> : <Plus size={24} aria-hidden="true" />}
      </button>

      {open && (
        <div className="flex flex-col-reverse items-center gap-2" role="menu">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded text-xs font-medium shadow whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.label}
                </span>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-full shadow-md transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--primary)',
                  }}
                  aria-label={item.label}
                >
                  <Icon size={20} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
