/**
 * InsightsTemporalFilter - Temporal filter for insights history
 *
 * Story 10a.4 Enhancement: Add temporal filtering to InsightsView
 *
 * Provides hierarchical date filtering: All Time → Year → Quarter → Month → Week
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronDown, X } from 'lucide-react';
import { InsightRecord } from '@/types/insight';
import { getISOWeekNumber } from '@/utils/date';
import { toDateSafe } from '@/utils/timestamp';

// ============================================================================
// Types
// ============================================================================

export type InsightTemporalLevel = 'all' | 'year' | 'quarter' | 'month' | 'week';

export interface InsightTemporalFilter {
  level: InsightTemporalLevel;
  year?: number;
  quarter?: number;  // 1-4
  month?: number;    // 0-11
  week?: number;     // ISO week number
}

interface InsightsTemporalFilterProps {
  insights: InsightRecord[];
  filter: InsightTemporalFilter;
  onFilterChange: (filter: InsightTemporalFilter) => void;
  theme: string;
  t: (key: string) => string;
}

type NavigationLevel = 'root' | 'year' | 'quarter' | 'month';

// ============================================================================
// Helper Functions
// ============================================================================

function getAvailableYears(insights: InsightRecord[]): number[] {
  const years = new Set<number>();
  insights.forEach((insight) => {
    const date = toDateSafe(insight.shownAt);
    if (date) years.add(date.getFullYear());
  });
  return Array.from(years).sort((a, b) => b - a); // Most recent first
}

function getQuartersInYear(insights: InsightRecord[], year: number): number[] {
  const quarters = new Set<number>();
  insights.forEach((insight) => {
    const date = toDateSafe(insight.shownAt);
    if (date && date.getFullYear() === year) {
      quarters.add(Math.floor(date.getMonth() / 3) + 1);
    }
  });
  return Array.from(quarters).sort((a, b) => b - a);
}

function getMonthsInQuarter(insights: InsightRecord[], year: number, quarter: number): number[] {
  const months = new Set<number>();
  const quarterStartMonth = (quarter - 1) * 3;
  insights.forEach((insight) => {
    const date = toDateSafe(insight.shownAt);
    if (date && date.getFullYear() === year) {
      const month = date.getMonth();
      if (month >= quarterStartMonth && month < quarterStartMonth + 3) {
        months.add(month);
      }
    }
  });
  return Array.from(months).sort((a, b) => b - a);
}

function getWeeksInMonth(insights: InsightRecord[], year: number, month: number): number[] {
  const weeks = new Set<number>();
  insights.forEach((insight) => {
    const date = toDateSafe(insight.shownAt);
    if (date && date.getFullYear() === year && date.getMonth() === month) {
      weeks.add(getISOWeekNumber(date));
    }
  });
  return Array.from(weeks).sort((a, b) => b - a);
}

function getMonthName(month: number, locale: string = 'en'): string {
  const date = new Date(2024, month, 1);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long' });
}

function getQuarterLabel(quarter: number): string {
  return `Q${quarter}`;
}

// ============================================================================
// Component
// ============================================================================

export function InsightsTemporalFilter({
  insights,
  filter,
  onFilterChange,
  theme,
  t,
}: InsightsTemporalFilterProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [navLevel, setNavLevel] = useState<NavigationLevel>('root');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isDark = theme === 'dark';

  // Compute available options
  const availableYears = useMemo(() => getAvailableYears(insights), [insights]);
  const availableQuarters = useMemo(
    () => (selectedYear ? getQuartersInYear(insights, selectedYear) : []),
    [insights, selectedYear]
  );
  const availableMonths = useMemo(
    () => (selectedYear && selectedQuarter ? getMonthsInQuarter(insights, selectedYear, selectedQuarter) : []),
    [insights, selectedYear, selectedQuarter]
  );
  const availableWeeks = useMemo(
    () => (selectedYear && selectedMonth !== null ? getWeeksInMonth(insights, selectedYear, selectedMonth) : []),
    [insights, selectedYear, selectedMonth]
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        resetNavigation();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        resetNavigation();
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const resetNavigation = useCallback(() => {
    setNavLevel('root');
    setSelectedYear(null);
    setSelectedQuarter(null);
    setSelectedMonth(null);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) resetNavigation();
      return !prev;
    });
  }, [resetNavigation]);

  // Get display label for current filter
  const getFilterLabel = (): string => {
    if (filter.level === 'all') return t('allTime') || 'All Time';
    if (filter.level === 'year' && filter.year) return `${filter.year}`;
    if (filter.level === 'quarter' && filter.year && filter.quarter) {
      return `${getQuarterLabel(filter.quarter)} ${filter.year}`;
    }
    if (filter.level === 'month' && filter.year && filter.month !== undefined) {
      return `${getMonthName(filter.month)} ${filter.year}`;
    }
    if (filter.level === 'week' && filter.year && filter.week) {
      return `${t('week') || 'Week'} ${filter.week}, ${filter.year}`;
    }
    return t('allTime') || 'All Time';
  };

  const isFiltered = filter.level !== 'all';

  // Navigation handlers
  const handleAllTime = () => {
    onFilterChange({ level: 'all' });
    setIsOpen(false);
    resetNavigation();
  };

  const handleYearClick = (year: number) => {
    setSelectedYear(year);
    setNavLevel('year');
  };

  const handleYearSelect = (year: number) => {
    onFilterChange({ level: 'year', year });
    setIsOpen(false);
    resetNavigation();
  };

  const handleQuarterClick = (quarter: number) => {
    setSelectedQuarter(quarter);
    setNavLevel('quarter');
  };

  const handleQuarterSelect = (quarter: number) => {
    if (selectedYear) {
      onFilterChange({ level: 'quarter', year: selectedYear, quarter });
      setIsOpen(false);
      resetNavigation();
    }
  };

  const handleMonthClick = (month: number) => {
    setSelectedMonth(month);
    setNavLevel('month');
  };

  const handleMonthSelect = (month: number) => {
    if (selectedYear) {
      onFilterChange({ level: 'month', year: selectedYear, month });
      setIsOpen(false);
      resetNavigation();
    }
  };

  const handleWeekSelect = (week: number) => {
    if (selectedYear && selectedMonth !== null) {
      onFilterChange({ level: 'week', year: selectedYear, month: selectedMonth, week });
      setIsOpen(false);
      resetNavigation();
    }
  };

  const handleBack = () => {
    if (navLevel === 'month') {
      setNavLevel('quarter');
      setSelectedMonth(null);
    } else if (navLevel === 'quarter') {
      setNavLevel('year');
      setSelectedQuarter(null);
    } else if (navLevel === 'year') {
      setNavLevel('root');
      setSelectedYear(null);
    }
  };

  // Styles - use CSS variables for theme consistency
  const buttonClasses = [
    'flex items-center gap-2 px-3 py-2 rounded-lg',
    'min-h-9',
    'text-sm font-medium',
    'transition-all duration-200',
  ].join(' ');

  // Dynamic button styles using CSS variables
  const buttonStyle: React.CSSProperties = isFiltered
    ? {
        backgroundColor: 'var(--primary)',
        color: 'white',
      }
    : {
        backgroundColor: 'var(--bg-tertiary, #f1f5f9)',
        color: 'var(--text-secondary)',
      };

  const dropdownClasses = [
    'absolute top-full right-0 mt-1 z-50',
    'min-w-48 rounded-lg shadow-lg',
    'border',
    isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200',
  ].join(' ');

  const itemClasses = [
    'flex items-center justify-between w-full px-4 py-3',
    'text-sm font-medium',
    'transition-colors',
    'cursor-pointer',
    isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700',
  ].join(' ');

  const headerClasses = [
    'flex items-center gap-2 px-4 py-3 border-b',
    isDark ? 'border-slate-600' : 'border-slate-200',
  ].join(' ');

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      {/* Clear Filter Button (when filtered) - positioned before dropdown */}
      {isFiltered && (
        <button
          onClick={handleAllTime}
          className={`mr-1 p-1.5 rounded-lg transition-colors min-h-9 min-w-9 flex items-center justify-center ${
            isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-red-50 text-red-500'
          }`}
          aria-label={t('clearFilter') || 'Clear filter'}
        >
          <X size={16} />
        </button>
      )}

      {/* Filter Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={buttonClasses}
        style={buttonStyle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Calendar size={16} />
        <span>{getFilterLabel()}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={dropdownClasses} role="listbox">
          {/* Navigation Header (when drilling down) */}
          {navLevel !== 'root' && (
            <div className={headerClasses}>
              <button
                onClick={handleBack}
                className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                {navLevel === 'year' && selectedYear}
                {navLevel === 'quarter' && selectedYear && selectedQuarter && `${getQuarterLabel(selectedQuarter)} ${selectedYear}`}
                {navLevel === 'month' && selectedYear && selectedMonth !== null && `${getMonthName(selectedMonth)} ${selectedYear}`}
              </span>
            </div>
          )}

          {/* Root Level: All Time + Years */}
          {navLevel === 'root' && (
            <>
              <button
                onClick={handleAllTime}
                className={`${itemClasses} ${filter.level === 'all' ? 'font-bold' : ''}`}
              >
                {t('allTime') || 'All Time'}
              </button>
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => handleYearClick(year)}
                  className={itemClasses}
                >
                  <span>{year}</span>
                  <ChevronDown size={16} className="-rotate-90" />
                </button>
              ))}
            </>
          )}

          {/* Year Level: Select Year or Drill to Quarters */}
          {navLevel === 'year' && selectedYear && (
            <>
              <button
                onClick={() => handleYearSelect(selectedYear)}
                className={`${itemClasses} font-semibold`}
                style={{ color: 'var(--accent)' }}
              >
                {t('selectYear') || 'Select'} {selectedYear}
              </button>
              {availableQuarters.map((quarter) => (
                <button
                  key={quarter}
                  onClick={() => handleQuarterClick(quarter)}
                  className={itemClasses}
                >
                  <span>{getQuarterLabel(quarter)}</span>
                  <ChevronDown size={16} className="-rotate-90" />
                </button>
              ))}
            </>
          )}

          {/* Quarter Level: Select Quarter or Drill to Months */}
          {navLevel === 'quarter' && selectedYear && selectedQuarter && (
            <>
              <button
                onClick={() => handleQuarterSelect(selectedQuarter)}
                className={`${itemClasses} font-semibold`}
                style={{ color: 'var(--accent)' }}
              >
                {t('selectQuarter') || 'Select'} {getQuarterLabel(selectedQuarter)}
              </button>
              {availableMonths.map((month) => (
                <button
                  key={month}
                  onClick={() => handleMonthClick(month)}
                  className={itemClasses}
                >
                  <span>{getMonthName(month)}</span>
                  <ChevronDown size={16} className="-rotate-90" />
                </button>
              ))}
            </>
          )}

          {/* Month Level: Select Month or Drill to Weeks */}
          {navLevel === 'month' && selectedYear && selectedMonth !== null && (
            <>
              <button
                onClick={() => handleMonthSelect(selectedMonth)}
                className={`${itemClasses} font-semibold`}
                style={{ color: 'var(--accent)' }}
              >
                {t('selectMonth') || 'Select'} {getMonthName(selectedMonth)}
              </button>
              {availableWeeks.map((week) => (
                <button
                  key={week}
                  onClick={() => handleWeekSelect(week)}
                  className={itemClasses}
                >
                  <span>{t('week') || 'Week'} {week}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
