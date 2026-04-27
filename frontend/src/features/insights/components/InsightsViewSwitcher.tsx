/**
 * InsightsViewSwitcher - View mode toggle buttons (pill-style)
 *
 * Story 14.33b: View Switcher & Carousel Mode
 * @see docs/sprint-artifacts/epic14/stories/story-14.33b-view-switcher-carousel.md
 *
 * Design matches TrendsView time period selector:
 * - Pill-shaped container with rounded background
 * - Active button has primary background with white text
 * - Inactive buttons are transparent with secondary text
 * - Consistent font-family with rest of app
 */

import React from 'react';

export type InsightsViewMode = 'list' | 'carousel' | 'airlock' | 'celebration';

export interface InsightsViewSwitcherProps {
  activeView: InsightsViewMode;
  onViewChange: (view: InsightsViewMode) => void;
  t: (key: string) => string;
  /** Disabled views show toast when clicked */
  disabledViews?: InsightsViewMode[];
  onDisabledViewClick?: (view: InsightsViewMode) => void;
}

interface ViewOption {
  id: InsightsViewMode;
  labelKey: string;
}

const views: ViewOption[] = [
  { id: 'list', labelKey: 'list' },
  { id: 'airlock', labelKey: 'airlock' },
  { id: 'celebration', labelKey: 'achievement' },
];

export const InsightsViewSwitcher: React.FC<InsightsViewSwitcherProps> = ({
  activeView,
  onViewChange,
  t,
  disabledViews = [],
  onDisabledViewClick,
}) => {
  const handleClick = (view: InsightsViewMode) => {
    if (disabledViews.includes(view)) {
      onDisabledViewClick?.(view);
    } else {
      onViewChange(view);
    }
  };

  // Calculate active index for sliding background
  const activeIndex = views.findIndex(v => v.id === activeView);

  return (
    <div
      className="relative flex items-center p-1 rounded-full"
      style={{
        backgroundColor: 'var(--bg-tertiary, #f1f5f9)',
      }}
      role="tablist"
      aria-label={t('insightsViews') || 'Insights views'}
    >
      {/* Sliding background indicator */}
      <div
        className="absolute h-[calc(100%-8px)] rounded-full transition-all duration-200 ease-out"
        style={{
          backgroundColor: 'var(--primary)',
          width: `calc((100% - 8px) / ${views.length})`,
          left: `calc(4px + (${activeIndex} * (100% - 8px) / ${views.length}))`,
        }}
        aria-hidden="true"
      />

      {/* Pill buttons */}
      {views.map((view) => {
        const isActive = activeView === view.id;
        const isDisabled = disabledViews.includes(view.id);

        return (
          <button
            key={view.id}
            onClick={() => handleClick(view.id)}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            className="relative z-10 flex-1 px-2 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              fontFamily: 'var(--font-family)',
              color: isActive ? 'white' : 'var(--text-secondary)',
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            {t(view.labelKey) || view.labelKey}
          </button>
        );
      })}
    </div>
  );
};
