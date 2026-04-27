/**
 * SelectionBar Component
 *
 * Story 14.15: Transaction Selection Mode & Groups
 * Story 14.15b: Updated layout - icons on top, labels below
 * Epic 14: Core Implementation
 *
 * Action bar displayed when selection mode is active.
 * Shows selection count and batch action buttons (Group, Delete).
 * Layout matches mockup: icon above label for action buttons.
 *
 * @see docs/uxui/mockups/01_views/transaction-list.html - State 3
 */

import React from 'react';
import { X, Bookmark, Trash2, CheckSquare } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface SelectionBarProps {
  /** Number of selected transactions */
  selectedCount: number;
  /** Callback when close (X) button is clicked */
  onClose: () => void;
  /** Callback when Group button is clicked */
  onGroup: () => void;
  /** Callback when Delete button is clicked */
  onDelete: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme (light/dark) */
  theme?: 'light' | 'dark';
  /** Language for pluralization */
  lang?: 'en' | 'es';
  onSelectAll?: () => void;
  totalVisible?: number;
}

// ============================================================================
// Component
// ============================================================================

export const SelectionBar: React.FC<SelectionBarProps> = ({
  selectedCount,
  onClose,
  onGroup,
  onDelete,
  t,
  lang = 'es',
  onSelectAll,
  totalVisible = 0,
}) => {
  const allSelected = totalVisible > 0 && selectedCount === totalVisible;

  // Format selection count text
  const getSelectionText = () => {
    if (lang === 'es') {
      return selectedCount === 1
        ? '1 seleccionado'
        : `${selectedCount} seleccionados`;
    }
    return selectedCount === 1
      ? '1 selected'
      : `${selectedCount} selected`;
  };

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-xl"
      style={{
        backgroundColor: 'var(--primary)',
      }}
      role="toolbar"
      aria-label={t('selectionToolbar') || 'Selection toolbar'}
      data-testid="selection-bar"
    >
      {/* Left side: Close button + count */}
      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          }}
          aria-label={t('exitSelectionMode') || 'Exit selection mode'}
          data-testid="selection-bar-close"
        >
          <X
            size={18}
            strokeWidth={2.5}
            style={{ color: 'white' }}
          />
        </button>
        <span
          className="text-sm font-medium"
          style={{ color: 'white' }}
          aria-live="polite"
        >
          {getSelectionText()}
        </span>
      </div>

      {/* Right side: Action buttons - icons on top, labels below */}
      <div className="flex items-center gap-4">
        {onSelectAll && totalVisible > 0 && (
          <button
            onClick={onSelectAll}
            className="flex flex-col items-center gap-0.5 transition-opacity"
            aria-label={allSelected ? t('deselectAll') : t('selectAll')}
            data-testid="selection-bar-select-all"
          >
            <CheckSquare
              size={20}
              strokeWidth={1.8}
              style={{ color: 'white' }}
              fill={allSelected ? 'rgba(255, 255, 255, 0.3)' : 'none'}
            />
            <span
              className="text-xs font-medium"
              style={{ color: 'rgba(255, 255, 255, 0.9)' }}
            >
              {allSelected ? t('none') : t('selectAll')}
            </span>
          </button>
        )}

        {/* Group button - icon on top, label below */}
        <button
          onClick={onGroup}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-0.5 transition-opacity disabled:opacity-40"
          aria-label={t('assignToGroup') || 'Assign to group'}
          data-testid="selection-bar-group"
        >
          <Bookmark
            size={20}
            strokeWidth={1.8}
            style={{ color: 'white' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
          >
            {t('groupLabel')}
          </span>
        </button>

        {/* Delete button - icon on top, label below */}
        <button
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-0.5 transition-opacity disabled:opacity-40"
          aria-label={t('deleteSelected') || 'Delete selected'}
          data-testid="selection-bar-delete"
        >
          <Trash2
            size={20}
            strokeWidth={1.8}
            style={{ color: 'white' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
          >
            {t('delete')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default SelectionBar;
