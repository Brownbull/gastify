import * as React from 'react';
import { Search } from 'lucide-react';

type NavTopVariant = 'default' | 'elevated' | 'minimal';

interface NavTopProps {
  variant?: NavTopVariant;
  onSearch?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<NavTopVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
  },
  elevated: {
    backgroundColor: 'var(--surface)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  minimal: {
    backgroundColor: 'transparent',
  },
};

export function NavTop({ variant = 'default', onSearch, children, className = '' }: NavTopProps) {
  return (
    <header
      className={['flex items-center justify-between w-full px-4 py-3', className]
        .filter(Boolean)
        .join(' ')}
      style={VARIANT_STYLES[variant]}
      role="banner"
    >
      <span
        className="text-lg font-bold tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        Gastify
      </span>

      <div className="flex items-center gap-2">
        {children}
        {onSearch && variant !== 'minimal' && (
          <button
            type="button"
            onClick={onSearch}
            className="p-2 rounded-lg transition-colors duration-150 hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Buscar"
          >
            <Search size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
