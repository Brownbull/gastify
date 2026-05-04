import type { LucideIcon } from 'lucide-react';

interface NavBottomItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly badge?: number;
}

interface NavBottomProps {
  items: readonly NavBottomItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  className?: string;
}

export function NavBottom({ items, activeItem, onItemChange, className = '' }: NavBottomProps) {
  return (
    <nav
      className={['flex items-center justify-around w-full', className].filter(Boolean).join(' ')}
      style={{
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="tablist"
      aria-label="Navegación principal"
    >
      {items.map((item) => {
        const isActive = item.id === activeItem;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-label={item.label}
            onClick={() => onItemChange(item.id)}
            className="relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[64px] transition-colors duration-150"
            style={{ color: isActive ? 'var(--primary)' : 'var(--text-tertiary)' }}
          >
            <span className="relative">
              <Icon size={22} aria-hidden="true" />
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full text-[10px] font-bold leading-none"
                  style={{
                    backgroundColor: 'var(--error)',
                    color: '#ffffff',
                    minWidth: item.badge > 1 ? '16px' : '8px',
                    height: item.badge > 1 ? '16px' : '8px',
                    padding: item.badge > 1 ? '0 4px' : '0',
                  }}
                  aria-label={`${item.badge} notificaciones`}
                >
                  {item.badge > 1 ? (item.badge > 99 ? '99+' : item.badge) : null}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
