/**
 * ItemViewToggle - Toggle between grouped and original order item views
 *
 * Story 14.38: Item View Toggle - Grouped vs Original Order
 * @see docs/sprint-artifacts/epic14/stories/story-14.38-item-view-toggle.md
 *
 * Design matches InsightsViewSwitcher pill-style toggle:
 * - Pill-shaped container with rounded background
 * - Active button has primary background with white text
 * - Inactive buttons are transparent with secondary text
 * - Smooth sliding animation when switching views
 *
 * Usage in TransactionEditorView and EditView:
 * - "By Group" (grouped): Items organized by category group, sorted by price descending
 * - "Original" (original): Items displayed in array index order (scan order)
 */

import React from 'react';

export type ItemViewMode = 'grouped' | 'original';

export interface ItemViewToggleProps {
  activeView: ItemViewMode;
  onViewChange: (view: ItemViewMode) => void;
  t: (key: string) => string;
}

interface ViewOption {
  id: ItemViewMode;
  labelKey: string;
}

const views: ViewOption[] = [
  { id: 'grouped', labelKey: 'byGroup' },
  { id: 'original', labelKey: 'originalOrder' },
];

export const ItemViewToggle: React.FC<ItemViewToggleProps> = ({
  activeView,
  onViewChange,
  t,
}) => {
  // Calculate active index for sliding background
  const activeIndex = views.findIndex(v => v.id === activeView);

  return (
    <div
      className="relative flex items-center p-1.5 rounded-full"
      style={{
        backgroundColor: 'var(--bg-tertiary, #f1f5f9)',
      }}
      role="tablist"
      aria-label={t('itemViewModes') || 'Item view modes'}
    >
      {/* Sliding background indicator */}
      <div
        className="absolute h-[calc(100%-12px)] rounded-full transition-all duration-200 ease-out"
        style={{
          backgroundColor: 'var(--primary)',
          width: `calc((100% - 12px) / ${views.length})`,
          left: `calc(6px + (${activeIndex} * (100% - 12px) / ${views.length}))`,
        }}
        aria-hidden="true"
      />

      {/* Pill buttons - larger for better touch targets */}
      {views.map((view) => {
        const isActive = activeView === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            role="tab"
            aria-selected={isActive}
            className="relative z-10 flex-1 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap"
            style={{
              fontFamily: 'var(--font-family)',
              color: isActive ? 'white' : 'var(--text-secondary)',
            }}
          >
            {t(view.labelKey) || view.labelKey}
          </button>
        );
      })}
    </div>
  );
};
