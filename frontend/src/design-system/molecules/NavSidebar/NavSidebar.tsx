import type { LucideIcon } from 'lucide-react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface NavSidebarItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

interface NavSidebarProps {
  items: readonly NavSidebarItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function NavSidebar({
  items,
  activeItem,
  onItemChange,
  collapsed,
  onToggleCollapse,
  className = '',
}: NavSidebarProps) {
  return (
    <aside
      className={[
        'flex flex-col h-full transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
      role="navigation"
      aria-label="Menú lateral"
    >
      <div className="flex items-center justify-between p-3">
        {!collapsed && (
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Gastify
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg transition-colors duration-150 hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2 mt-2 flex-1">
        {items.map((item) => {
          const isActive = item.id === activeItem;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemChange(item.id)}
              className={[
                'flex items-center gap-3 rounded-lg transition-colors duration-150',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
              ].join(' ')}
              style={{
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
              }}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
