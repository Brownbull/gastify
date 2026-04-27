/**
 * InsightHistoryCard - Display a single historical insight
 *
 * Story 10a.4: Insights History View
 * @see docs/sprint-artifacts/epic10a/story-10a.4-insights-history-view.md
 *
 * Story 14.33a: Insight Card Types & Styling
 * @see docs/sprint-artifacts/epic14/stories/story-14.33a-insight-card-types-styling.md
 *
 * Story 14.33a.1: Theme-Aware Insight Type Colors
 * @see docs/sprint-artifacts/epic14/stories/story-14.33a.1-insight-theme-colors.md
 *
 * AC3: Insight Card Display - Shows icon, title, message, date
 * AC6: Backward Compatibility - Falls back to insightId if title/message missing
 * AC1-5 (14.33a): Type-specific styling with 5 visual types
 * AC1-6 (14.33a.1): Theme-aware colors via CSS variables
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { InsightRecord } from '@/types/insight';
import {
  getInsightConfig,
  getIconByName,
  getInsightFallbackMessage,
  getVisualType,
  getVisualConfig,
} from '../utils/insightTypeConfig';
import { toDateSafe, type TimestampLike } from '@/utils/timestamp';

interface InsightHistoryCardProps {
  insight: InsightRecord;
  onClick: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  theme: string;
}

export const InsightHistoryCard: React.FC<InsightHistoryCardProps> = ({
  insight,
  onClick,
  onLongPressStart,
  onLongPressEnd,
  isSelected = false,
  selectionMode = false,
  theme,
}) => {
  const isDark = theme === 'dark';

  // Story 14.33a: Get visual type for 5-type styling system
  // Story 14.33a.1: getVisualConfig now returns CSS variables that auto-adapt to theme/mode
  const visualType = getVisualType(insight.category, insight.insightId);
  const visualConfig = getVisualConfig(visualType);

  // Get config based on insight type (for icon fallback)
  const config = getInsightConfig(insight.insightId, insight.category, isDark);
  const IconComponent = getIconByName(insight.icon || config.icon);

  // Format date - show year only if different from current year
  const formatDate = (timestamp: unknown) => {
    const date = toDateSafe(timestamp as TimestampLike);
    if (!date) return '';
    const currentYear = new Date().getFullYear();
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== currentYear && { year: 'numeric' }),
    };
    return date.toLocaleDateString(undefined, options);
  };

  const formattedDate = formatDate(insight.shownAt);

  // AC6: Fallback for old records without title/message
  // Convert snake_case insightId to readable title (e.g., "merchant_frequency" -> "Merchant Frequency")
  const title = insight.title || insight.insightId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  // Use insight-specific fallback message for old records
  const message = insight.message || getInsightFallbackMessage(insight.insightId);

  // Border color based on selection state - uses theme primary for selected
  const getBorderColor = () => {
    if (isSelected) return 'var(--primary)';
    return isDark ? '#334155' : '#e2e8f0';
  };

  // Keyboard handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
    // Shift+Enter to toggle selection (accessibility for long-press alternative)
    if (e.key === 'Enter' && e.shiftKey && onLongPressStart) {
      e.preventDefault();
      onLongPressStart();
      // Immediately trigger selection (no delay for keyboard)
      setTimeout(() => onLongPressEnd?.(), 10);
    }
  };

  // Story 14.33a AC2: Hover border color uses type color
  const getHoverBorderColor = () => visualConfig.iconColor;

  return (
    <div
      onClick={onClick}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onTouchCancel={onLongPressEnd}
      // Story 14.33a AC4: Card padding 12px, border-radius matches --radius-md
      className="p-3 rounded-[10px] border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        backgroundColor: isSelected
          ? 'var(--primary-bg)'
          : 'var(--surface)',
        borderColor: getBorderColor(),
        borderWidth: isSelected ? '2px' : '1px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected && !selectionMode) {
          e.currentTarget.style.borderColor = getHoverBorderColor();
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !selectionMode) {
          e.currentTarget.style.borderColor = getBorderColor();
        }
        // Also trigger onLongPressEnd if it exists
        onLongPressEnd?.();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${title}${message ? `: ${message}` : ''}${formattedDate ? ` - ${formattedDate}` : ''}`}
      aria-pressed={selectionMode ? isSelected : undefined}
    >
      {/* Story 14.33a AC4: Layout matches mockup - icon (36x36) | content | chevron */}
      <div className="flex gap-3 items-center">
        {/* Selection checkbox in selection mode - uses theme primary color */}
        {selectionMode && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors"
            style={{
              borderColor: isSelected ? 'var(--primary)' : (isDark ? '#6b7280' : '#9ca3af'),
              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
            }}
            aria-hidden="true"
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
        )}

        {/* Story 14.33a AC2: Icon container uses type background color (36x36 per mockup) */}
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: visualConfig.bgColor }}
          aria-hidden="true"
          data-visual-type={visualType}
        >
          <IconComponent size={18} style={{ color: visualConfig.iconColor }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Story 14.33a AC4: Title 14px, weight 500, --text-primary */}
          <div
            className="text-sm font-medium capitalize truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </div>
          {/* Story 14.33a AC4: Meta text 12px, --text-tertiary */}
          {message && (
            <div
              className="text-xs mt-0.5 line-clamp-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {message}
            </div>
          )}
        </div>

        {/* Story 14.33a AC2: Chevron indicator on right side */}
        <ChevronRight
          size={16}
          className="flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
