import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar } from '../../atoms/Avatar';

interface ProfileDropdownItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

interface ProfileDropdownProps {
  name: string;
  avatarSrc?: string;
  items: readonly ProfileDropdownItem[];
  onSelect?: (id: string) => void;
  className?: string;
}

export function ProfileDropdown({
  name,
  avatarSrc,
  items,
  onSelect,
  className = '',
}: ProfileDropdownProps) {
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
    <div ref={containerRef} className={['relative inline-block', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors duration-150 hover:opacity-80"
        style={{ backgroundColor: 'transparent' }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de perfil"
      >
        <Avatar name={name} src={avatarSrc} size="sm" />
        <span className="text-sm font-medium hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
          {name}
        </span>
        <ChevronDown
          size={16}
          className="transition-transform duration-200"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[180px] py-1 rounded-lg shadow-lg z-50"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
          role="menu"
          aria-label="Opciones de perfil"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelect?.(item.id);
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors duration-150 hover:opacity-80"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'transparent',
                }}
              >
                <Icon size={16} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
