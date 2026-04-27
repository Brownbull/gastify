/**
 * TemporalFilterDropdown Component
 *
 * Hierarchical dropdown for filtering transactions by time period.
 * Levels: All Time → Year → Quarter → Month → Week → Day
 *
 * Story 9.19: History Transaction Filters (AC #2)
 * Story 9.20: Added quarter level for analytics navigation
 * @see docs/sprint-artifacts/epic9/story-9.19-history-transaction-filters.md
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft } from 'lucide-react';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';
import type { TemporalFilterState } from '@/types/historyFilters';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';
import {
  getWeeksInMonth,
  getDaysInWeek,
  getMonthName,
  getWeekLabel,
  getDayLabel,
  getQuartersInYear,
  getMonthsInQuarter,
  getQuarterLabel,
} from '@shared/utils/historyFilterUtils';

// ============================================================================
// Types
// ============================================================================

type NavigationLevel = 'root' | 'year' | 'quarter' | 'month' | 'week';

interface TemporalFilterDropdownProps {
  /** Available filters extracted from transactions */
  availableFilters: AvailableFilters;
  /** Theme for styling (light/dark) */
  theme?: string;
  /** Locale for date formatting (en/es) */
  locale?: string;
  /** Translation function */
  t: (key: string) => string;
}

// ============================================================================
// Component
// ============================================================================

export function TemporalFilterDropdown({
  availableFilters,
  theme = 'light',
  locale = 'en',
  t,
}: TemporalFilterDropdownProps): React.ReactElement {
  const { temporal, dispatch } = useHistoryFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [navLevel, setNavLevel] = useState<NavigationLevel>('root');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isDark = theme === 'dark';

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
    setSelectedWeek(null);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      if (prev) {
        resetNavigation();
      }
      return !prev;
    });
  }, [resetNavigation]);

  // Apply filter and close
  const applyFilter = useCallback((filter: TemporalFilterState) => {
    dispatch({ type: 'SET_TEMPORAL_FILTER', payload: filter });
    setIsOpen(false);
    resetNavigation();
    buttonRef.current?.focus();
  }, [dispatch, resetNavigation]);

  // Handle "All Time" selection
  const handleAllTime = useCallback(() => {
    applyFilter({ level: 'all' });
  }, [applyFilter]);

  // Handle year selection - now navigates to quarter level
  const handleYearSelect = useCallback((year: string) => {
    setSelectedYear(year);
    setNavLevel('year');
  }, []);

  // Handle quarter selection (Story 9.20)
  const handleQuarterSelect = useCallback((quarter: number) => {
    setSelectedQuarter(quarter);
    setNavLevel('quarter');
  }, []);

  // Handle month selection
  const handleMonthSelect = useCallback((month: string) => {
    setSelectedMonth(month);
    setNavLevel('month');
  }, []);

  // Handle week selection
  const handleWeekSelect = useCallback((week: number) => {
    setSelectedWeek(week);
    setNavLevel('week');
  }, []);

  // Apply year filter (select current level)
  const handleApplyYear = useCallback(() => {
    if (!selectedYear) return;
    applyFilter({ level: 'year', year: selectedYear });
  }, [selectedYear, applyFilter]);

  // Apply quarter filter (Story 9.20)
  const handleApplyQuarter = useCallback(() => {
    if (!selectedYear || selectedQuarter === null) return;
    applyFilter({
      level: 'quarter',
      year: selectedYear,
      quarter: getQuarterLabel(selectedQuarter),
    });
  }, [selectedYear, selectedQuarter, applyFilter]);

  // Apply month filter
  const handleApplyMonth = useCallback(() => {
    if (!selectedYear || !selectedMonth) return;
    applyFilter({ level: 'month', year: selectedYear, month: selectedMonth });
  }, [selectedYear, selectedMonth, applyFilter]);

  // Apply week filter
  const handleApplyWeek = useCallback(() => {
    if (!selectedYear || !selectedMonth || selectedWeek === null) return;
    applyFilter({
      level: 'week',
      year: selectedYear,
      month: selectedMonth,
      week: selectedWeek,
    });
  }, [selectedYear, selectedMonth, selectedWeek, applyFilter]);

  // Apply day filter
  const handleDaySelect = useCallback((day: string) => {
    if (!selectedYear || !selectedMonth || selectedWeek === null) return;
    applyFilter({
      level: 'day',
      year: selectedYear,
      month: selectedMonth,
      week: selectedWeek,
      day,
    });
  }, [selectedYear, selectedMonth, selectedWeek, applyFilter]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (navLevel) {
      case 'year':
        setNavLevel('root');
        setSelectedYear(null);
        break;
      case 'quarter':
        setNavLevel('year');
        setSelectedQuarter(null);
        break;
      case 'month':
        setNavLevel('quarter');
        setSelectedMonth(null);
        break;
      case 'week':
        setNavLevel('month');
        setSelectedWeek(null);
        break;
    }
  }, [navLevel]);

  // Get current filter label for button
  const getButtonLabel = (): string => {
    if (temporal.level === 'all') return t('allTime');
    if (temporal.day) return getDayLabel(temporal.day, locale);
    if (temporal.week !== undefined && temporal.month)
      return getWeekLabel(temporal.month, temporal.week, locale);
    if (temporal.month) return getMonthName(temporal.month, locale);
    // Quarter display (Story 9.20)
    if (temporal.quarter && temporal.year) {
      const qNum = parseInt(temporal.quarter.replace('Q', ''), 10);
      return locale === 'es' ? `${t(`q${qNum}`)}` : temporal.quarter;
    }
    if (temporal.year) return temporal.year;
    return t('allTime');
  };

  // ============================================================================
  // Styling
  // ============================================================================

  const buttonClasses = [
    'flex items-center gap-2 px-3 py-2 rounded-lg',
    'min-h-11', // 44px touch target (AC #6)
    'transition-all duration-200',
    isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100',
    isDark ? 'border-slate-700' : 'border-slate-200',
    'border',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white',
  ].join(' ');

  const dropdownClasses = [
    'absolute left-0 top-full mt-2 z-50',
    'min-w-[220px] max-w-[280px] p-2 rounded-xl',
    'shadow-lg',
    isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200',
  ].join(' ');

  const optionClasses = (isActive: boolean = false) => [
    'w-full text-left px-4 py-2.5 rounded-lg',
    'min-h-11', // 44px touch target (AC #6)
    'transition-all duration-150',
    'flex items-center justify-between',
    isActive
      ? 'text-white font-semibold'
      : isDark
        ? 'text-slate-300 hover:bg-slate-700'
        : 'text-slate-600 hover:bg-slate-100',
    'focus:outline-none',
  ].join(' ');

  const optionStyle = (isActive: boolean = false): React.CSSProperties => {
    if (isActive) {
      return { backgroundColor: 'var(--accent)' };
    }
    return {};
  };

  const backButtonClasses = [
    'flex items-center gap-1 px-2 py-1.5 rounded-lg mb-2',
    'text-sm',
    isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100',
  ].join(' ');

  // ============================================================================
  // Render
  // ============================================================================

  const renderContent = () => {
    switch (navLevel) {
      case 'root':
        return (
          <>
            {/* All Time option */}
            <button
              onClick={handleAllTime}
              className={optionClasses(temporal.level === 'all')}
              style={optionStyle(temporal.level === 'all')}
            >
              {t('allTime')}
            </button>
            {/* Years */}
            {availableFilters.years.map(year => (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={optionClasses(temporal.year === year && temporal.level === 'year')}
                style={optionStyle(temporal.year === year && temporal.level === 'year')}
              >
                <span>{year}</span>
                <span className="text-xs opacity-60">{'>'}</span>
              </button>
            ))}
          </>
        );

      case 'year':
        if (!selectedYear) return null;
        const quarters = getQuartersInYear();
        return (
          <>
            <button onClick={handleBack} className={backButtonClasses}>
              <ChevronLeft size={16} />
              {t('back')}
            </button>
            {/* Select this year option */}
            <button
              onClick={handleApplyYear}
              className={optionClasses()}
              style={{ color: 'var(--accent)' }}
            >
              {t('selectYear')}: {selectedYear}
            </button>
            <div className="border-t my-1" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
            {/* Quarters (Story 9.20) */}
            {quarters.map(quarter => {
              const qLabel = getQuarterLabel(quarter);
              const isActive = temporal.quarter === qLabel && temporal.level === 'quarter' && temporal.year === selectedYear;
              return (
                <button
                  key={quarter}
                  onClick={() => handleQuarterSelect(quarter)}
                  className={optionClasses(isActive)}
                  style={optionStyle(isActive)}
                >
                  <span>{t(`q${quarter}`)}</span>
                  <span className="text-xs opacity-60">{'>'}</span>
                </button>
              );
            })}
          </>
        );

      case 'quarter':
        if (!selectedYear || selectedQuarter === null) return null;
        const monthsInQuarter = getMonthsInQuarter(selectedYear, selectedQuarter);
        // Filter to only show months that have transactions
        const availableMonthsInQuarter = monthsInQuarter.filter(
          month => (availableFilters.monthsByYear[selectedYear] || []).includes(month)
        );
        return (
          <>
            <button onClick={handleBack} className={backButtonClasses}>
              <ChevronLeft size={16} />
              {t('back')}
            </button>
            {/* Select this quarter option */}
            <button
              onClick={handleApplyQuarter}
              className={optionClasses()}
              style={{ color: 'var(--accent)' }}
            >
              {t('selectQuarter')}: {t(`q${selectedQuarter}`)}
            </button>
            <div className="border-t my-1" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
            {/* Months in this quarter */}
            {availableMonthsInQuarter.length > 0 ? (
              availableMonthsInQuarter.map(month => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(month)}
                  className={optionClasses(temporal.month === month && temporal.level === 'month')}
                  style={optionStyle(temporal.month === month && temporal.level === 'month')}
                >
                  <span>{getMonthName(month, locale)}</span>
                  <span className="text-xs opacity-60">{'>'}</span>
                </button>
              ))
            ) : (
              // Show all months in quarter if none have transactions yet
              monthsInQuarter.map(month => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(month)}
                  className={optionClasses(false)}
                  style={optionStyle(false)}
                  disabled
                >
                  <span className="opacity-50">{getMonthName(month, locale)}</span>
                </button>
              ))
            )}
          </>
        );

      case 'month':
        if (!selectedMonth) return null;
        const weeks = getWeeksInMonth(selectedMonth);
        return (
          <>
            <button onClick={handleBack} className={backButtonClasses}>
              <ChevronLeft size={16} />
              {t('back')}
            </button>
            {/* Select this month option */}
            <button
              onClick={handleApplyMonth}
              className={optionClasses()}
              style={{ color: 'var(--accent)' }}
            >
              {t('selectMonth')}: {getMonthName(selectedMonth, locale)}
            </button>
            <div className="border-t my-1" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
            {/* Weeks */}
            {weeks.map(week => (
              <button
                key={week}
                onClick={() => handleWeekSelect(week)}
                className={optionClasses(
                  temporal.month === selectedMonth &&
                  temporal.week === week &&
                  temporal.level === 'week'
                )}
                style={optionStyle(
                  temporal.month === selectedMonth &&
                  temporal.week === week &&
                  temporal.level === 'week'
                )}
              >
                <span>{getWeekLabel(selectedMonth, week, locale)}</span>
                <span className="text-xs opacity-60">{'>'}</span>
              </button>
            ))}
          </>
        );

      case 'week':
        if (!selectedMonth || selectedWeek === null) return null;
        const days = getDaysInWeek(selectedMonth, selectedWeek);
        return (
          <>
            <button onClick={handleBack} className={backButtonClasses}>
              <ChevronLeft size={16} />
              {t('back')}
            </button>
            {/* Select this week option */}
            <button
              onClick={handleApplyWeek}
              className={optionClasses()}
              style={{ color: 'var(--accent)' }}
            >
              {t('selectWeek')}: {getWeekLabel(selectedMonth, selectedWeek, locale)}
            </button>
            <div className="border-t my-1" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
            {/* Days */}
            {days.map(day => (
              <button
                key={day}
                onClick={() => handleDaySelect(day)}
                className={optionClasses(temporal.day === day && temporal.level === 'day')}
                style={optionStyle(temporal.day === day && temporal.level === 'day')}
              >
                {getDayLabel(day, locale)}
              </button>
            ))}
          </>
        );
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${t('filterByTime')}: ${getButtonLabel()}`}
        className={buttonClasses}
        style={{ color: 'var(--primary)' }}
      >
        <Calendar size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <span className="text-sm truncate max-w-[100px]">{getButtonLabel()}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('filterByTime')}
          className={dropdownClasses}
        >
          {renderContent()}
        </div>
      )}
    </div>
  );
}

export default TemporalFilterDropdown;
