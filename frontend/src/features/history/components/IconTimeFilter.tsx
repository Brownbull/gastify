/**
 * IconTimeFilter — Time Filter Dropdown for IconFilterBar
 *
 * Story 15-5e: Extracted from IconFilterBar.tsx
 * Story 14.14: Transaction List Redesign — 3-State temporal filter
 *
 * 3-State Behavior:
 * State 1 (Original): No changes, normal appearance
 * State 2 (Pending): User changed values with arrows, shows bounce/glow animation
 * State 3 (Active): User clicked label to apply filter
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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

interface TimeFilterDropdownProps {
  state: { level: string; year?: string; quarter?: string; month?: string; week?: number; day?: string };
  dispatch: (action: any) => void;
  availableFilters: AvailableFilters;
  locale: string;
  onClose: () => void;
}

/** Pending state — values that have been changed but not yet applied */
interface PendingTemporalState {
  year: string;
  quarter: string;
  month: string; // Just the 2-digit month number (e.g., "01")
  week: number | null;
  day: number | null;
}

// ============================================================================
// TimeSliderRow — 3-State Visual Feedback
// ============================================================================

interface TimeSliderRowProps {
  label: string;
  value: string;
  isActive: boolean;
  isPending?: boolean;
  onLabelClick: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  isOdd?: boolean;
}

function TimeSliderRow({
  label,
  value,
  isActive,
  isPending = false,
  onLabelClick,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  isOdd = false,
}: TimeSliderRowProps) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 gap-2"
      style={{
        backgroundColor: isOdd ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
      }}
    >
      {/* Label - clicking applies the filter */}
      <button
        onClick={onLabelClick}
        className={`
          text-xs font-medium px-2 py-1 rounded-md transition-all min-w-[70px] text-left
          ${isPending ? 'pending-pulse' : ''}
        `}
        style={{
          backgroundColor: isActive
            ? 'var(--primary-light)'
            : isPending
              ? 'var(--warning-light, rgba(245, 158, 11, 0.15))'
              : 'transparent',
          color: isActive
            ? 'var(--primary)'
            : isPending
              ? 'var(--warning, #f59e0b)'
              : 'var(--text-tertiary)',
          border: isPending ? '1px solid var(--warning, #f59e0b)' : '1px solid transparent',
        }}
        title={isPending ? (label.includes('Año') || label.includes('Year') ? 'Click to apply' : 'Clic para aplicar') : undefined}
      >
        {label}
      </button>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Value display - shows pending animation when changed */}
        <span
          className={`
            min-w-[80px] text-center text-sm font-semibold px-2 py-1 rounded-md
            transition-all duration-200
            ${isPending ? 'pending-value-pulse' : ''}
          `}
          style={{
            backgroundColor: isActive
              ? 'var(--primary-light)'
              : isPending
                ? 'var(--warning-light, rgba(245, 158, 11, 0.15))'
                : 'var(--bg-tertiary)',
            color: isActive
              ? 'var(--primary)'
              : isPending
                ? 'var(--warning, #f59e0b)'
                : 'var(--text-primary)',
            boxShadow: isPending
              ? '0 0 0 2px var(--warning, #f59e0b)'
              : 'none',
          }}
        >
          {value}
        </span>

        <button
          onClick={onNext}
          disabled={!canNext}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Keyframe animations for pending state */}
      {isPending && (
        <style>{`
          @keyframes pendingPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
          }
          .pending-pulse {
            animation: pendingPulse 1.5s ease-in-out infinite;
          }
          .pending-value-pulse {
            animation: pendingPulse 1.5s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  );
}

// ============================================================================
// TimeFilterDropdown
// ============================================================================

export function TimeFilterDropdown({
  state,
  dispatch,
  availableFilters,
  locale,
  onClose,
}: TimeFilterDropdownProps) {
  const years = availableFilters.years || [];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quartersDisplay = locale === 'es' ? ['T1', 'T2', 'T3', 'T4'] : ['Q1', 'Q2', 'Q3', 'Q4'];
  const months = locale === 'es'
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Extract initial values from committed state
  const committedYear = state.year || (years[0] || new Date().getFullYear().toString());
  const committedQuarter = state.quarter || 'Q4';
  const committedMonthFull = state.month || `${committedYear}-12`;
  const committedMonthNum = committedMonthFull.includes('-')
    ? committedMonthFull.split('-')[1]
    : committedMonthFull;
  const committedWeek = state.week || null;
  const committedDayNum = state.day ? parseInt(state.day.split('-')[2]) : null;

  // Local pending state - values that user has navigated to but NOT yet applied
  const [pending, setPending] = useState<PendingTemporalState>({
    year: committedYear,
    quarter: committedQuarter,
    month: committedMonthNum,
    week: committedWeek,
    day: committedDayNum,
  });

  // Sync pending state when committed state changes (e.g., from breadcrumb selections)
  useEffect(() => {
    setPending({
      year: committedYear,
      quarter: committedQuarter,
      month: committedMonthNum,
      week: committedWeek,
      day: committedDayNum,
    });
  }, [committedYear, committedQuarter, committedMonthNum, committedWeek, committedDayNum]);

  // Track which rows have pending changes (for animation)
  const isPendingYear = pending.year !== committedYear;
  const isPendingQuarter = pending.quarter !== committedQuarter;
  const isPendingMonth = pending.month !== committedMonthNum;
  const isPendingWeek = pending.week !== committedWeek;
  const isPendingDay = pending.day !== committedDayNum;

  // Calculate weeks available for pending month
  const getWeeksInMonth = (year: number, month: number): number => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Math.ceil(daysInMonth / 7);
  };
  const totalWeeks = getWeeksInMonth(parseInt(pending.year), parseInt(pending.month));

  // Calculate days available for pending week
  const getDaysInWeek = (year: number, month: number, week: number): number[] => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, daysInMonth);
    const days: number[] = [];
    for (let d = startDay; d <= endDay; d++) {
      days.push(d);
    }
    return days;
  };

  const availableDays = pending.week
    ? getDaysInWeek(parseInt(pending.year), parseInt(pending.month), pending.week)
    : [];

  // Arrow handlers - only update LOCAL pending state, don't dispatch
  const handleYearChange = (delta: number) => {
    const currentIndex = years.indexOf(pending.year);
    const newIndex = Math.max(0, Math.min(years.length - 1, currentIndex - delta));
    const newYear = years[newIndex];
    if (newYear) {
      setPending(prev => ({ ...prev, year: newYear }));
    }
  };

  const handleQuarterChange = (delta: number) => {
    const qIndex = quarters.indexOf(pending.quarter);
    const newIndex = (qIndex + delta + 4) % 4;
    setPending(prev => ({ ...prev, quarter: quarters[newIndex] }));
  };

  const handleMonthChange = (delta: number) => {
    const mIndex = parseInt(pending.month) - 1;
    const newIndex = (mIndex + delta + 12) % 12;
    setPending(prev => ({ ...prev, month: String(newIndex + 1).padStart(2, '0') }));
  };

  const handleWeekChange = (delta: number) => {
    const week = pending.week || 1;
    let newWeek = week + delta;
    if (newWeek < 1) newWeek = totalWeeks;
    if (newWeek > totalWeeks) newWeek = 1;
    setPending(prev => ({ ...prev, week: newWeek }));
  };

  const handleDayChange = (delta: number) => {
    if (!pending.week || availableDays.length === 0) return;

    const currentDayIndex = pending.day ? availableDays.indexOf(pending.day) : 0;
    let newIndex = currentDayIndex + delta;

    if (newIndex < 0) newIndex = availableDays.length - 1;
    if (newIndex >= availableDays.length) newIndex = 0;

    setPending(prev => ({ ...prev, day: availableDays[newIndex] }));
  };

  // Apply handlers - dispatch to context, then close menu
  const applyYearFilter = () => {
    dispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildYearFilter(pending.year) });
    onClose();
  };

  const applyQuarterFilter = () => {
    dispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildQuarterFilter(pending.year, pending.quarter) });
    onClose();
  };

  const applyMonthFilter = () => {
    const monthFull = `${pending.year}-${pending.month}`;
    dispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildMonthFilter(pending.year, monthFull) });
    onClose();
  };

  const applyWeekFilter = () => {
    const monthFull = `${pending.year}-${pending.month}`;
    const week = pending.week || 1;
    dispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildWeekFilter(pending.year, monthFull, week) });
    onClose();
  };

  const applyDayFilter = () => {
    const monthFull = `${pending.year}-${pending.month}`;
    const week = pending.week || 1;
    const day = pending.day || availableDays[0] || 1;
    const dayStr = `${pending.year}-${pending.month}-${String(day).padStart(2, '0')}`;
    dispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildDayFilter(pending.year, monthFull, week, dayStr) });
    onClose();
  };

  const clearFilter = () => {
    dispatch({ type: 'CLEAR_TEMPORAL' });
    onClose();
  };

  // Display values (from pending state)
  const quarterDisplayValue = quartersDisplay[quarters.indexOf(pending.quarter)] || pending.quarter;
  const weekDisplayValue = pending.week
    ? (locale === 'es' ? `Sem ${pending.week}` : `W${pending.week}`)
    : (locale === 'es' ? 'Sem 1' : 'W1');
  const dayDisplayValue = pending.day ? String(pending.day) : (availableDays[0] ? String(availableDays[0]) : '1');

  return (
    <div
      className="absolute top-full right-0 mt-2 min-w-[240px] rounded-xl overflow-hidden"
      style={{
        zIndex: 70,
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))',
        border: '1px solid var(--border-light)',
      }}
    >
      {/* Year Row */}
      <TimeSliderRow
        label={locale === 'es' ? 'Año' : 'Year'}
        value={pending.year}
        isActive={state.level === 'year'}
        isPending={isPendingYear}
        onLabelClick={applyYearFilter}
        onPrev={() => handleYearChange(-1)}
        onNext={() => handleYearChange(1)}
        canPrev={years.indexOf(pending.year) < years.length - 1}
        canNext={years.indexOf(pending.year) > 0}
      />

      {/* Quarter Row */}
      <TimeSliderRow
        label={locale === 'es' ? 'Trimestre' : 'Quarter'}
        value={quarterDisplayValue}
        isActive={state.level === 'quarter'}
        isPending={isPendingQuarter}
        onLabelClick={applyQuarterFilter}
        onPrev={() => handleQuarterChange(-1)}
        onNext={() => handleQuarterChange(1)}
        isOdd
      />

      {/* Month Row */}
      <TimeSliderRow
        label={locale === 'es' ? 'Mes' : 'Month'}
        value={months[parseInt(pending.month) - 1] || months[11]}
        isActive={state.level === 'month'}
        isPending={isPendingMonth}
        onLabelClick={applyMonthFilter}
        onPrev={() => handleMonthChange(-1)}
        onNext={() => handleMonthChange(1)}
      />

      {/* Week Row */}
      <TimeSliderRow
        label={locale === 'es' ? 'Semana' : 'Week'}
        value={weekDisplayValue}
        isActive={state.level === 'week'}
        isPending={isPendingWeek}
        onLabelClick={applyWeekFilter}
        onPrev={() => handleWeekChange(-1)}
        onNext={() => handleWeekChange(1)}
        isOdd
      />

      {/* Day Row */}
      <TimeSliderRow
        label={locale === 'es' ? 'Día' : 'Day'}
        value={dayDisplayValue}
        isActive={state.level === 'day'}
        isPending={isPendingDay}
        onLabelClick={applyDayFilter}
        onPrev={() => handleDayChange(-1)}
        onNext={() => handleDayChange(1)}
        canPrev={pending.week !== null}
        canNext={pending.week !== null}
      />

      {/* Clear Button */}
      {state.level !== 'all' && (
        <div className="p-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <button
            onClick={clearFilter}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={14} />
            {locale === 'es' ? 'Limpiar filtro' : 'Clear filter'}
          </button>
        </div>
      )}
    </div>
  );
}
