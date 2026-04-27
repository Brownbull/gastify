/**
 * AirlockHistoryCard - Card for displaying a saved airlock
 *
 * Story 14.33c.1: Airlock Generation & Persistence
 * @see docs/sprint-artifacts/epic14/stories/story-14.33c.1-airlock-generation-persistence.md
 *
 * AC5: Airlock History List
 * - Card format similar to InsightHistoryCard
 * - Show: emoji, title, date generated, viewed/unviewed status
 *
 * AC6: Airlock Card Interaction
 * - Visual indicator for unviewed airlocks (badge/highlight)
 */

import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { AirlockRecord } from '@/types/airlock';
import type { TimestampLike } from '@/utils/timestamp';
import { toDateSafe } from '@/utils/timestamp';

interface AirlockHistoryCardProps {
  /** The airlock to display */
  airlock: AirlockRecord;
  /** Called when card is tapped */
  onClick: () => void;
  /** Called when card is long-pressed (for selection mode) */
  onLongPress?: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: string;
  /** Whether card is in selection mode */
  selectionMode?: boolean;
  /** Whether card is selected (in selection mode) */
  isSelected?: boolean;
}

/**
 * Format a Firestore Timestamp or Date for display.
 * Shows relative time for recent dates, full date for older ones.
 */
function formatDate(timestamp: TimestampLike | undefined, t: (key: string) => string): string {
  const date = toDateSafe(timestamp);
  if (!date) return '';

  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Relative time for recent dates
    if (diffDays === 0) {
      return t('today');
    } else if (diffDays === 1) {
      return t('yesterday');
    } else if (diffDays < 7) {
      return `${t('daysAgo').replace('{days}', String(diffDays))}`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1
        ? t('oneWeekAgo')
        : `${t('weeksAgo').replace('{weeks}', String(weeks))}`;
    }

    // Full date for older entries
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    // Add year if different from current
    if (date.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString(undefined, options);
  } catch {
    return '';
  }
}

/**
 * Card component for displaying a saved airlock in the history list.
 */
export const AirlockHistoryCard: React.FC<AirlockHistoryCardProps> = ({
  airlock,
  onClick,
  onLongPress,
  t,
  theme,
  selectionMode = false,
  isSelected = false,
}) => {
  const isDark = theme === 'dark';
  const isUnviewed = !airlock.viewedAt;
  const formattedDate = formatDate(airlock.createdAt, t);

  // Long press handling
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = React.useRef(false);

  const handlePointerDown = () => {
    if (onLongPress) {
      isLongPressRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, 500);
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = () => {
    // Prevent click if it was a long press
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    onClick();
  };

  // Border color - highlight unviewed airlocks or selected
  const getBorderColor = () => {
    if (isSelected) {
      return 'var(--primary)';
    }
    if (isUnviewed) {
      return 'var(--primary)';
    }
    return isDark ? '#334155' : '#e2e8f0';
  };

  // Background for unviewed airlocks or selected
  const getBackgroundColor = () => {
    if (isSelected) {
      return isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
    }
    if (isUnviewed) {
      return isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)';
    }
    return 'var(--surface)';
  };

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`
        p-3 rounded-[10px] border cursor-pointer
        transition-all duration-200
        hover:scale-[1.01] active:scale-[0.99]
        select-none
      `}
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        borderWidth: isUnviewed || isSelected ? '2px' : '1px',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${airlock.title}: ${airlock.message}. ${formattedDate}${isUnviewed ? `. ${t('newBadge')}` : ''}${isSelected ? `. ${t('selected')}` : ''}`}
      aria-selected={isSelected}
    >
      <div className="flex gap-3 items-center">
        {/* Selection checkbox - shown in selection mode */}
        {selectionMode && (
          <div
            className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
              transition-colors duration-150
            `}
            style={{
              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
              borderColor: isSelected ? 'var(--primary)' : 'var(--text-tertiary)',
            }}
          >
            {isSelected && <Check size={14} color="white" strokeWidth={3} />}
          </div>
        )}

        {/* Emoji container */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
          style={{
            backgroundColor: isUnviewed
              ? 'var(--primary-light)'
              : 'var(--bg-tertiary)',
          }}
          aria-hidden="true"
        >
          {airlock.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {airlock.title}
            </span>
            {/* AC6: Visual indicator for unviewed */}
            {isUnviewed && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                }}
              >
                {t('newBadge')}
              </span>
            )}
          </div>
          <div
            className="text-xs mt-0.5 line-clamp-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {formattedDate}
          </div>
        </div>

        {/* Chevron indicator */}
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
