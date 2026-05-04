import * as React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...', className = '' }: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      className={['relative flex items-center', className].filter(Boolean).join(' ')}
    >
      <Search
        size={18}
        className="absolute left-3 pointer-events-none"
        style={{ color: 'var(--text-tertiary)' }}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border transition-colors duration-150 focus:outline-none focus:ring-2"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          '--tw-ring-color': 'var(--primary)',
        } as React.CSSProperties}
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-2 p-1 rounded-full transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Limpiar búsqueda"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
