/**
 * TemporalBreadcrumb Component
 *
 * Story 14.14: Transaction List Redesign
 * Five simple pill buttons for temporal navigation: Year, Quarter, Month, Week, Day
 *
 * Each button opens a dropdown with available options:
 * - Years: up to 5 years with data
 * - Quarters: T1-T4 (Spanish) or Q1-Q4 (English)
 * - Months: 12 months (3-char names)
 * - Weeks: weeks in selected month (1-5)
 * - Days: days in selected week
 *
 * @see docs/uxui/mockups/01_views/transaction-list.html
 */

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';
import {
  buildYearFilter,
  buildQuarterFilter,
  buildMonthFilter,
  buildWeekFilter,
  buildDayFilter,
} from '@shared/utils/historyFilterUtils';

// ============================================================================
// Types
// ============================================================================

interface TemporalBreadcrumbProps {
  /** Locale for month names */
  locale?: string;
  /** Available filters from transactions */
  availableFilters: AvailableFilters;
}

type DropdownType = 'year' | 'quarter' | 'month' | 'week' | 'day' | null;

// ============================================================================
// Constants
// ============================================================================

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS_ES = ['T1', 'T2', 'T3', 'T4'];
const QUARTERS_EN = ['Q1', 'Q2', 'Q3', 'Q4'];

// ============================================================================
// Helper Functions
// ============================================================================

function getWeeksInMonth(year: number, month: number): number[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const totalDays = lastDay.getDate();
  const firstWeekDay = firstDay.getDay();
  const weeksNeeded = Math.ceil((totalDays + firstWeekDay) / 7);
  return Array.from({ length: weeksNeeded }, (_, i) => i + 1);
}

function getDaysInWeek(year: number, month: number, week: number): number[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekDay = firstOfMonth.getDay();
  const startDay = (week - 1) * 7 - firstWeekDay + 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    const day = startDay + i;
    if (day >= 1 && day <= lastDayOfMonth) {
      days.push(day);
    }
  }
  return days;
}

// ============================================================================
// Dropdown Menu Component (Portal-based to escape overflow:hidden)
// ============================================================================

interface DropdownMenuProps {
  options: Array<{ value: string; label: string }>;
  selectedValue: string | null;
  onSelect: (value: string) => void;
  position?: 'left' | 'center' | 'right';
  /** Reference to the trigger button for positioning */
  triggerRef: React.RefObject<HTMLDivElement>;
  /** Use two-column grid layout (for months - 12 items = 6 rows x 2 cols) */
  twoColumn?: boolean;
  /** Use compact vertical spacing (for small lists like days) */
  compact?: boolean;
}

function DropdownMenu({ options, selectedValue, onSelect, position = 'left', triggerRef, twoColumn = false, compact = false }: DropdownMenuProps) {
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position based on trigger element
  useLayoutEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      // Position aligned with trigger button
      let left = rect.left;
      if (position === 'center') {
        left = rect.left + rect.width / 2;
      } else if (position === 'right') {
        left = rect.right;
      }

      setMenuPosition({
        top: rect.bottom + 4, // 4px gap below trigger
        left,
      });
    }
  }, [triggerRef, position]);

  // Handle click on option - call onSelect which will dispatch and close
  const handleOptionClick = (e: React.MouseEvent, value: string) => {
    e.stopPropagation(); // Prevent event from bubbling
    onSelect(value);
  };

  const menu = (
    <div
      ref={menuRef}
      className="fixed overflow-hidden rounded-xl"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        // Transform to adjust alignment based on position
        transform: position === 'center' ? 'translateX(-50%)' : position === 'right' ? 'translateX(-100%)' : 'none',
        zIndex: 9999, // Above everything
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: '0 8px 20px -4px rgba(0,0,0,0.15), 0 4px 8px -4px rgba(0,0,0,0.1)',
        border: '1px solid var(--border-light)',
      }}
      role="listbox"
    >
      <div
        className={twoColumn ? 'grid grid-cols-2 gap-0' : 'flex flex-col'}
        style={{ maxHeight: '220px', overflowY: 'auto' }}
      >
        {options.map((option, idx) => {
          // For two-column layout, alternate by row (every 2 items = 1 row)
          // For single column, alternate every item
          const rowIndex = twoColumn ? Math.floor(idx / 2) : idx;
          const isOddRow = rowIndex % 2 === 1;
          const isSelected = selectedValue === option.value;
          const baseBackground = isOddRow ? 'var(--bg-tertiary)' : 'var(--bg-secondary)';

          return (
            <button
              key={option.value}
              onClick={(e) => handleOptionClick(e, option.value)}
              className={`px-3 ${compact ? 'py-1' : 'py-2'} text-center text-sm transition-colors whitespace-nowrap`}
              style={{
                backgroundColor: isSelected ? 'var(--primary-light)' : baseBackground,
                color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                fontWeight: isSelected ? 600 : 400,
                minWidth: twoColumn ? '48px' : 'auto',
              }}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  // Slightly darker on hover
                  e.currentTarget.style.backgroundColor = isOddRow
                    ? 'var(--bg-quaternary, var(--bg-secondary))'
                    : 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = baseBackground;
                }
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render via portal to escape overflow:hidden container
  return createPortal(menu, document.body);
}

// ============================================================================
// Pill Button Component
// ============================================================================

interface PillButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function PillButton({ label, isActive, onClick, disabled = false }: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-[6px] rounded-full text-sm font-medium
        transition-all duration-150 whitespace-nowrap
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-secondary)',
        color: isActive ? '#ffffff' : 'var(--text-secondary)',
        border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-light)'}`,
      }}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Separator Component
// ============================================================================

function Separator() {
  return (
    <span
      className="flex-shrink-0 text-sm"
      style={{ color: 'var(--text-tertiary)' }}
    >
      ›
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TemporalBreadcrumb({
  locale = 'es',
  availableFilters,
}: TemporalBreadcrumbProps): React.ReactElement {
  const { state, dispatch } = useHistoryFilters();
  const { temporal } = state;
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for each pill button (used for portal dropdown positioning)
  const yearRef = useRef<HTMLDivElement>(null);
  const quarterRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);

  const months = locale === 'es' ? MONTHS_ES : MONTHS_EN;
  const quarters = locale === 'es' ? QUARTERS_ES : QUARTERS_EN;

  // Close dropdown on click outside
  // Note: Portal dropdowns are outside containerRef, so we check for role="listbox" too
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the container (pill buttons)
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      // Don't close if clicking inside a dropdown menu (portal)
      if (target.closest('[role="listbox"]') || target.closest('[role="option"]')) {
        return;
      }
      setOpenDropdown(null);
    };
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  // Get available years (max 5, most recent first)
  const years = (availableFilters.years || []).slice(0, 5);
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  // Current selections - default to current year and month
  const selectedYear = temporal.year || (years[0] || currentYear);
  const selectedQuarter = temporal.quarter || null;
  // Month from state is in YYYY-MM format, extract just MM for display
  const selectedMonthFull = temporal.month || `${selectedYear}-${currentMonth}`;
  const selectedMonthNum = selectedMonthFull.includes('-')
    ? selectedMonthFull.split('-')[1]
    : selectedMonthFull;
  const selectedWeek = temporal.week || null;
  const selectedDay = temporal.day || null;

  // Calculate quarter from month
  const monthIndex = selectedMonthNum ? parseInt(selectedMonthNum) - 1 : new Date().getMonth();
  const quarterFromMonth = Math.floor(monthIndex / 3);
  // Get quarter index from selectedQuarter (Q1-Q4 format) or from month calculation
  const quarterIndex = selectedQuarter
    ? parseInt(selectedQuarter.replace('Q', '')) - 1
    : quarterFromMonth;
  // Display quarter in locale-aware format (T1-T4 for Spanish, Q1-Q4 for English)
  const displayQuarter = quarters[quarterIndex];

  // Get weeks for selected month
  const weeksInMonth = selectedMonthNum && selectedYear
    ? getWeeksInMonth(parseInt(selectedYear), parseInt(selectedMonthNum))
    : [];

  // Get days for selected week
  const daysInWeek = selectedMonthNum && selectedYear && selectedWeek
    ? getDaysInWeek(parseInt(selectedYear), parseInt(selectedMonthNum), selectedWeek)
    : [];

  // Build options
  const yearOptions = years.map(y => ({ value: y, label: y }));
  const quarterOptions = quarters.map((q, idx) => ({
    value: `Q${idx + 1}`,
    label: q,
  }));
  const monthOptions = months.map((m, idx) => ({
    value: String(idx + 1).padStart(2, '0'),
    label: m,
  }));
  const weekOptions = weeksInMonth.map(w => ({
    value: String(w),
    label: locale === 'es' ? `Sem ${w}` : `W${w}`,
  }));
  const dayOptions = daysInWeek.map(d => ({
    value: String(d),
    label: String(d),
  }));

  // Handlers - use cascading utilities for synchronized state
  const handleYearSelect = (year: string) => {
    // When changing year, reset to year level (no lower dimensions)
    dispatch({
      type: 'SET_TEMPORAL_FILTER',
      payload: buildYearFilter(year)
    });
    setOpenDropdown(null);
  };

  const handleQuarterSelect = (quarter: string) => {
    // When changing quarter, cascade to first month of that quarter
    dispatch({
      type: 'SET_TEMPORAL_FILTER',
      payload: buildQuarterFilter(selectedYear, quarter)
    });
    setOpenDropdown(null);
  };

  const handleMonthSelect = (month: string) => {
    // Send month in YYYY-MM format as expected by filter utilities
    const monthFull = `${selectedYear}-${month}`;
    dispatch({
      type: 'SET_TEMPORAL_FILTER',
      payload: buildMonthFilter(selectedYear, monthFull)
    });
    setOpenDropdown(null);
  };

  const handleWeekSelect = (week: string) => {
    if (!selectedMonthNum) return;
    const monthFull = `${selectedYear}-${selectedMonthNum}`;
    dispatch({
      type: 'SET_TEMPORAL_FILTER',
      payload: buildWeekFilter(selectedYear, monthFull, parseInt(week))
    });
    setOpenDropdown(null);
  };

  const handleDaySelect = (day: string) => {
    if (!selectedMonthNum || !selectedWeek) return;
    const monthFull = `${selectedYear}-${selectedMonthNum}`;
    const dayStr = `${selectedYear}-${selectedMonthNum}-${day.padStart(2, '0')}`;
    dispatch({
      type: 'SET_TEMPORAL_FILTER',
      payload: buildDayFilter(selectedYear, monthFull, selectedWeek, dayStr)
    });
    setOpenDropdown(null);
  };

  // Display values
  const yearDisplay = selectedYear;
  const quarterDisplay = displayQuarter;
  const monthDisplay = months[parseInt(selectedMonthNum) - 1] || months[0];
  const weekDisplay = selectedWeek ? (locale === 'es' ? `Sem ${selectedWeek}` : `W${selectedWeek}`) : (locale === 'es' ? 'Sem' : 'Wk');
  const dayDisplay = selectedDay ? selectedDay.split('-')[2] : (locale === 'es' ? 'Día' : 'Day');

  // Check active states
  const isYearActive = temporal.level === 'year';
  const isQuarterActive = temporal.level === 'quarter';
  const isMonthActive = temporal.level === 'month' || temporal.level === 'all';
  const isWeekActive = temporal.level === 'week';
  const isDayActive = temporal.level === 'day';

  return (
    <div ref={containerRef} className="flex items-center gap-[6px] py-1">
      {/* Year */}
      <div ref={yearRef} className="relative">
        <PillButton
          label={yearDisplay}
          isActive={isYearActive}
          onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
          disabled={yearOptions.length === 0}
        />
        {openDropdown === 'year' && yearOptions.length > 0 && (
          <DropdownMenu
            options={yearOptions}
            selectedValue={selectedYear}
            onSelect={handleYearSelect}
            triggerRef={yearRef}
          />
        )}
      </div>

      <Separator />

      {/* Quarter */}
      <div ref={quarterRef} className="relative">
        <PillButton
          label={quarterDisplay}
          isActive={isQuarterActive}
          onClick={() => setOpenDropdown(openDropdown === 'quarter' ? null : 'quarter')}
        />
        {openDropdown === 'quarter' && (
          <DropdownMenu
            options={quarterOptions}
            selectedValue={`Q${quarterIndex + 1}`}
            onSelect={handleQuarterSelect}
            triggerRef={quarterRef}
          />
        )}
      </div>

      <Separator />

      {/* Month - uses two-column layout for 12 months */}
      <div ref={monthRef} className="relative">
        <PillButton
          label={monthDisplay}
          isActive={isMonthActive}
          onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
        />
        {openDropdown === 'month' && (
          <DropdownMenu
            options={monthOptions}
            selectedValue={selectedMonthNum}
            onSelect={handleMonthSelect}
            triggerRef={monthRef}
            twoColumn
          />
        )}
      </div>

      <Separator />

      {/* Week */}
      <div ref={weekRef} className="relative">
        <PillButton
          label={weekDisplay}
          isActive={isWeekActive}
          onClick={() => setOpenDropdown(openDropdown === 'week' ? null : 'week')}
          disabled={weekOptions.length === 0}
        />
        {openDropdown === 'week' && weekOptions.length > 0 && (
          <DropdownMenu
            options={weekOptions}
            selectedValue={selectedWeek ? String(selectedWeek) : null}
            onSelect={handleWeekSelect}
            position="center"
            triggerRef={weekRef}
            compact
          />
        )}
      </div>

      <Separator />

      {/* Day */}
      <div ref={dayRef} className="relative">
        <PillButton
          label={dayDisplay}
          isActive={isDayActive}
          onClick={() => setOpenDropdown(openDropdown === 'day' ? null : 'day')}
          disabled={!selectedWeek || dayOptions.length === 0}
        />
        {openDropdown === 'day' && dayOptions.length > 0 && (
          <DropdownMenu
            options={dayOptions}
            selectedValue={selectedDay ? selectedDay.split('-')[2] : null}
            onSelect={handleDaySelect}
            position="right"
            triggerRef={dayRef}
            compact
          />
        )}
      </div>
    </div>
  );
}

export default TemporalBreadcrumb;
