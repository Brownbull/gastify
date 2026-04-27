/**
 * SearchBar Component
 *
 * Story 14.14: Transaction List Redesign
 * Search input for filtering transactions by merchant name or items.
 *
 * @see docs/uxui/mockups/01_views/transaction-list.html
 */

import React from 'react';
import { Search } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar transacciones...',
}: SearchBarProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-[10px] px-[14px] py-[10px] rounded-full border"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-light)',
      }}
    >
      <Search
        size={18}
        strokeWidth={2}
        style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none text-sm"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-family)',
        }}
        aria-label={placeholder}
      />
    </div>
  );
}

export default SearchBar;
