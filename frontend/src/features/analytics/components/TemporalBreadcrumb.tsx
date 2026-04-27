/**
 * TemporalBreadcrumb Component
 *
 * Collapsible breadcrumb showing current temporal position in the analytics hierarchy.
 * Allows users to see where they are (Year/Quarter/Month/Week/Day) and jump to any ancestor level.
 *
 * @see docs/architecture-epic7.md - Pattern 3: Breadcrumb Dropdown Pattern
 * @see docs/sprint-artifacts/epic7/story-7.2-temporal-breadcrumb-component.md
 * @see docs/sprint-artifacts/epic7/story-7.9-ux-breadcrumb-alignment.md - UX redesign
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { useAnalyticsNavigation } from '../hooks/useAnalyticsNavigation';
import { TRANSLATIONS } from '@/utils/translations';
import type { TemporalPosition, TemporalLevel } from '@/types/analytics';

// ============================================================================
// Types
// ============================================================================

interface BreadcrumbItem {
  level: TemporalLevel;
  label: string;
  levelLabel: string; // Translated level indicator (e.g., "Year", "Quarter")
  position: TemporalPosition;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets translation for a key based on current language setting.
 */
function t(key: string, language: string = 'en'): string {
  const lang = language as keyof typeof TRANSLATIONS;
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return (translations as Record<string, string>)[key] || key;
}

/**
 * Gets month name from YYYY-MM format.
 * Uses Intl.DateTimeFormat for locale-aware formatting.
 */
function getMonthName(month: string, locale: string = 'en'): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long' });
}

/**
 * Gets short month name from YYYY-MM format.
 */
function getShortMonthName(month: string, locale: string = 'en'): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
}

/**
 * Gets week label in format "Oct 1-7" or similar.
 * Week chunks are month-aligned: Oct 1-7, Oct 8-14, Oct 15-21, Oct 22-28, Oct 29-31.
 */
function getWeekLabel(month: string, week: number, locale: string = 'en'): string {
  const shortMonth = getShortMonthName(month, locale);
  const [year, monthNum] = month.split('-');
  const daysInMonth = new Date(parseInt(year, 10), parseInt(monthNum, 10), 0).getDate();

  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(week * 7, daysInMonth);

  return `${shortMonth} ${startDay}-${endDay}`;
}

/**
 * Gets day label in format "Oct 15".
 */
function getDayLabel(day: string, locale: string = 'en'): string {
  // Parse YYYY-MM-DD to avoid timezone issues
  const [year, month, dayNum] = day.split('-').map(Number);
  const date = new Date(year, month - 1, dayNum);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Gets the translated level label for a temporal level.
 */
function getLevelLabel(level: TemporalLevel, locale: string = 'en'): string {
  const levelKeys: Record<TemporalLevel, string> = {
    year: 'levelYear',
    quarter: 'levelQuarter',
    month: 'levelMonth',
    week: 'levelWeek',
    day: 'levelDay',
  };
  return t(levelKeys[level], locale);
}

/**
 * Builds the breadcrumb path from the current temporal position.
 * Returns an array of items from Year down to the current level.
 */
function buildTemporalPath(temporal: TemporalPosition, locale: string = 'en'): BreadcrumbItem[] {
  const path: BreadcrumbItem[] = [];

  // Year is always first
  path.push({
    level: 'year',
    label: temporal.year,
    levelLabel: getLevelLabel('year', locale),
    position: { level: 'year', year: temporal.year },
  });

  // Quarter (if drilling down to quarter or deeper)
  if (temporal.quarter) {
    path.push({
      level: 'quarter',
      label: temporal.quarter,
      levelLabel: getLevelLabel('quarter', locale),
      position: { level: 'quarter', year: temporal.year, quarter: temporal.quarter },
    });
  }

  // Month (if drilling down to month or deeper)
  if (temporal.month) {
    path.push({
      level: 'month',
      label: getMonthName(temporal.month, locale),
      levelLabel: getLevelLabel('month', locale),
      position: {
        level: 'month',
        year: temporal.year,
        quarter: temporal.quarter,
        month: temporal.month
      },
    });
  }

  // Week (if drilling down to week or deeper)
  if (temporal.week !== undefined && temporal.month) {
    path.push({
      level: 'week',
      label: getWeekLabel(temporal.month, temporal.week, locale),
      levelLabel: getLevelLabel('week', locale),
      position: {
        level: 'week',
        year: temporal.year,
        quarter: temporal.quarter,
        month: temporal.month,
        week: temporal.week,
      },
    });
  }

  // Day (if at day level)
  if (temporal.day) {
    path.push({
      level: 'day',
      label: getDayLabel(temporal.day, locale),
      levelLabel: getLevelLabel('day', locale),
      position: temporal,
    });
  }

  return path;
}

/**
 * Gets the display label for the collapsed breadcrumb button.
 * Shows the current level's label (e.g., "2024", "Q4", "October", "Oct 1-7", "Oct 15").
 */
function getCurrentLabel(temporal: TemporalPosition, locale: string = 'en'): string {
  switch (temporal.level) {
    case 'year':
      return temporal.year;
    case 'quarter':
      return temporal.quarter || '';
    case 'month':
      return temporal.month ? getMonthName(temporal.month, locale) : '';
    case 'week':
      return temporal.month && temporal.week !== undefined
        ? getWeekLabel(temporal.month, temporal.week, locale)
        : '';
    case 'day':
      return temporal.day ? getDayLabel(temporal.day, locale) : '';
    default:
      return '';
  }
}

// ============================================================================
// Component Props
// ============================================================================

export interface TemporalBreadcrumbProps {
  /** Theme for styling (light/dark) */
  theme?: string;
  /** Locale for date formatting (en/es) */
  locale?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TemporalBreadcrumb Component
 *
 * Displays a collapsible breadcrumb showing the current temporal position.
 * Users can tap to expand and see the full path, then tap any ancestor to navigate.
 *
 * @example
 * <TemporalBreadcrumb theme="light" locale="en" />
 */
export function TemporalBreadcrumb({
  theme = 'light',
  locale = 'en'
}: TemporalBreadcrumbProps): React.ReactElement {
  const { temporal, dispatch } = useAnalyticsNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Build the breadcrumb path
  const path = buildTemporalPath(temporal, locale);
  const currentLabel = getCurrentLabel(temporal, locale);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  // Close on outside click (AC #8)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Handle navigation to ancestor level
  const handleNavigate = useCallback((position: TemporalPosition) => {
    dispatch({ type: 'SET_TEMPORAL_LEVEL', payload: position });
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  }, [dispatch]);

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        // Opening: set focus to current level
        setFocusedIndex(path.length - 1);
      } else {
        setFocusedIndex(-1);
      }
      return !prev;
    });
  }, [path.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      // Open on Enter or Space when collapsed
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, path.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(path.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < path.length) {
          handleNavigate(path[focusedIndex].position);
        }
        break;
      case 'Tab':
        // Close dropdown on Tab out
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  }, [isOpen, focusedIndex, path, handleNavigate, handleToggle]);

  // Focus option when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // ============================================================================
  // Styling - UX Spec Aligned (Story 7.9)
  // ============================================================================

  const isDark = theme === 'dark';

  // Icon-only button with transparent background for compact layout
  // Story 7.18 extension: Minimal footprint icons that can be packed together
  const buttonClasses = [
    'flex items-center justify-center p-2 rounded-lg',
    'w-10 h-10', // 40px touch target with transparent background
    'transition-all duration-200',
    // Transparent background with hover effect
    'bg-transparent',
    isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200/50',
    isDark ? 'text-slate-300' : 'text-slate-600',
    // Focus styles
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white',
  ].join(' ');

  // Dropdown per UX spec: surface background, rounded-lg, shadow
  // Use right-0 to prevent dropdown from being cut off at screen edge (icons are on the right)
  const dropdownClasses = [
    'absolute right-0 top-full mt-2 z-50',
    'min-w-[200px] p-2 rounded-xl',
    'shadow-lg',
    isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200',
  ].join(' ');

  // Dropdown item styling per UX spec (AC #5, #6)
  // Active level uses inline style for theme-aware accent color
  const getOptionClasses = (index: number, isCurrentLevel: boolean) => {
    const isFocused = focusedIndex === index;
    return [
      'w-full text-left px-4 py-2.5 flex items-center gap-2 rounded-lg',
      'min-h-11', // 44px touch target
      'transition-all duration-150',
      // Active level gets accent background and white text (AC #6)
      // Background color set via inline style for current level
      isCurrentLevel
        ? 'text-white font-semibold'
        : isDark
          ? 'text-slate-300 hover:bg-slate-700'
          : 'text-slate-600 hover:bg-slate-100',
      // Focus state
      isFocused && !isCurrentLevel && (isDark ? 'bg-slate-700' : 'bg-slate-100'),
      'focus:outline-none',
    ].filter(Boolean).join(' ');
  };

  // Get style for dropdown option (active level needs accent background)
  const getOptionStyle = (isCurrentLevel: boolean): React.CSSProperties => {
    if (isCurrentLevel) {
      return { backgroundColor: 'var(--accent)' };
    }
    return {};
  };

  // Level indicator styling (AC #5) - smaller, slightly muted
  const levelIndicatorClasses = isDark
    ? 'text-xs opacity-70 min-w-[60px]'
    : 'text-xs opacity-60 min-w-[60px]';

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <nav
      ref={dropdownRef}
      className="relative w-full"
      role="navigation"
      aria-label="Time period"
    >
      {/* Collapsed button - Story 7.18 extension: Icon-only with fixed height */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Time period: ${currentLabel}`}
        className={buttonClasses}
      >
        {/* Icon uses CSS variable for theme-aware accent color */}
        <Calendar size={20} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--accent)' }} />
      </button>

      {/* Dropdown panel (AC #4, #5, #6, #8) */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Navigate to time period"
          className={dropdownClasses}
        >
          {path.map((item, index) => {
            const isCurrentLevel = index === path.length - 1;
            return (
              <button
                key={`${item.level}-${item.label}`}
                ref={(el) => { optionRefs.current[index] = el; }}
                role="option"
                aria-selected={isCurrentLevel}
                onClick={() => handleNavigate(item.position)}
                onKeyDown={handleKeyDown}
                className={getOptionClasses(index, isCurrentLevel)}
                style={getOptionStyle(isCurrentLevel)}
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                {/* Level indicator (AC #5) */}
                <span className={isCurrentLevel ? 'text-xs opacity-80 min-w-[60px]' : levelIndicatorClasses}>
                  {item.levelLabel}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

export default TemporalBreadcrumb;
