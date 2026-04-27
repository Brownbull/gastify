/**
 * ReportsView Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Reports Hub displaying collapsible accordion sections for
 * weekly, monthly, quarterly, and yearly spending summaries.
 *
 * Features:
 * - Year selector in header with swipe/arrow navigation
 * - Four collapsible sections (Semanal, Mensual, Trimestral, Anual)
 * - Report rows with unread indicators and trend display
 * - Detail overlay for full report view
 * - Only shows reports with actual data
 * - Profile dropdown with navigation options (shared component)
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ReportSection,
  ReportRow,
  ReportDetailOverlay,
  type ReportDetailData,
} from '@features/reports/components';
import { ProfileDropdown, ProfileAvatar, getInitials } from '@/components/ProfileDropdown';
import {
  getAvailableReportsForYear,
  getMaxReportsForYear,
  type ReportRowData,
} from '@features/reports/utils/reportUtils';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
// Story 14e-25c.2: Internal data hooks
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedTransactions } from '@/hooks/usePaginatedTransactions';
import { useRecentScans } from '@/hooks/useRecentScans';
import { mergeTransactionsWithRecentScans } from '@/utils/transactionMerge';
import { sanitizeInput } from '@/utils/sanitize';
// Story 14e-25c.2: Navigation via Zustand store
import { useNavigation, useNavigationActions } from '@/shared/stores/useNavigationStore';
import { isValidView } from '@/app/types';
import type { Transaction } from '@/types/transaction';
import type { ReportPeriodType } from '@/types/report';
import type { TemporalFilterState, HistoryFilterState } from '@/types/historyFilters';
import { getDefaultFilterState } from '@/shared/stores/useHistoryFiltersStore';

/**
 * Story 14e-25c.2: Minimal props interface for ReportsView.
 * Navigation callbacks migrated to useNavigation() hook.
 * Transactions obtained via internal hooks.
 */
interface ReportsViewProps {
  /** Translation function */
  t: (key: string) => string;
  /** Theme for styling */
  theme: string;
}

interface SectionState {
  isExpanded: boolean;
}

type SectionStates = Record<ReportPeriodType, SectionState>;

/**
 * Get available years from transactions
 */
function getAvailableYears(transactions: Transaction[]): number[] {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  years.add(currentYear); // Always include current year

  for (const t of transactions) {
    const year = parseInt(t.date.split('-')[0], 10);
    if (!isNaN(year)) {
      years.add(year);
    }
  }

  return Array.from(years).sort((a, b) => b - a); // Descending order
}

/**
 * ReportsView - Reports Hub with collapsible sections
 */
export const ReportsView: React.FC<ReportsViewProps> = ({
  t,
  theme,
}) => {
  // Story 14e-25c.2: Get navigation from Zustand store
  const { navigateBack, navigateToView } = useNavigation();
  const { setPendingHistoryFilters } = useNavigationActions();

  // Story 14e-25c.2: Get auth and transactions from internal hooks
  const { user, services } = useAuth();

  // Get transactions via hooks (same pattern as HistoryView)
  const {
    transactions: paginatedTransactions,
  } = usePaginatedTransactions(user, services);
  const recentScans = useRecentScans(user, services);

  // Merge recent scans with paginated transactions (deduplication)
  const transactions = useMemo(
    () => mergeTransactionsWithRecentScans(paginatedTransactions, recentScans),
    [paginatedTransactions, recentScans]
  );

  // Story 14e-25c.2: User info from auth (sanitized for defense-in-depth)
  const userName = sanitizeInput(user?.displayName ?? '', { maxLength: 100 });
  const userEmail = sanitizeInput(user?.email ?? '', { maxLength: 255 });

  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Story 14e-25c.2: Handle profile navigation via Zustand store
  const handleProfileNavigate = useCallback((view: string) => {
    if (isValidView(view)) {
      navigateToView(view);
    }
  }, [navigateToView]);

  const prefersReducedMotion = useReducedMotion();

  // Get available years from transactions
  const availableYears = useMemo(
    () => getAvailableYears(transactions),
    [transactions]
  );

  // Selected year state
  const [selectedYear, setSelectedYear] = useState(() => {
    return availableYears[0] || new Date().getFullYear();
  });

  // Section expand/collapse states
  const [sectionStates, setSectionStates] = useState<SectionStates>({
    weekly: { isExpanded: true },
    monthly: { isExpanded: true },
    quarterly: { isExpanded: true },
    yearly: { isExpanded: true },
  });

  // Selected report for detail overlay
  const [selectedReport, setSelectedReport] = useState<ReportDetailData | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Year navigation
  const currentYearIndex = availableYears.indexOf(selectedYear);
  const canGoNextYear = currentYearIndex > 0;
  const canGoPrevYear = currentYearIndex < availableYears.length - 1;

  const goToNextYear = useCallback(() => {
    if (canGoNextYear) {
      setSelectedYear(availableYears[currentYearIndex - 1]);
    }
  }, [canGoNextYear, availableYears, currentYearIndex]);

  const goToPrevYear = useCallback(() => {
    if (canGoPrevYear) {
      setSelectedYear(availableYears[currentYearIndex + 1]);
    }
  }, [canGoPrevYear, availableYears, currentYearIndex]);

  // Swipe navigation for year selector
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeNavigation({
    onSwipeLeft: goToNextYear,
    onSwipeRight: goToPrevYear,
    threshold: 50,
    enabled: availableYears.length > 1,
    hapticEnabled: !prefersReducedMotion,
  });

  // Toggle section expansion
  const toggleSection = useCallback((periodType: ReportPeriodType) => {
    setSectionStates((prev) => ({
      ...prev,
      [periodType]: {
        ...prev[periodType],
        isExpanded: !prev[periodType].isExpanded,
      },
    }));
  }, []);

  // Generate reports for each section filtered by year
  const weeklyReports = useMemo(
    () => getAvailableReportsForYear(transactions, 'weekly', selectedYear),
    [transactions, selectedYear]
  );

  const monthlyReports = useMemo(
    () => getAvailableReportsForYear(transactions, 'monthly', selectedYear),
    [transactions, selectedYear]
  );

  const quarterlyReports = useMemo(
    () => getAvailableReportsForYear(transactions, 'quarterly', selectedYear),
    [transactions, selectedYear]
  );

  const yearlyReports = useMemo(
    () => getAvailableReportsForYear(transactions, 'yearly', selectedYear),
    [transactions, selectedYear]
  );

  // Calculate max possible reports for each period type
  const maxWeeklyReports = useMemo(
    () => getMaxReportsForYear('weekly', selectedYear),
    [selectedYear]
  );

  const maxMonthlyReports = useMemo(
    () => getMaxReportsForYear('monthly', selectedYear),
    [selectedYear]
  );

  const maxQuarterlyReports = useMemo(
    () => getMaxReportsForYear('quarterly', selectedYear),
    [selectedYear]
  );

  const maxYearlyReports = useMemo(
    () => getMaxReportsForYear('yearly', selectedYear),
    [selectedYear]
  );

  // Open report detail overlay
  const openReportDetail = useCallback((report: ReportRowData) => {
    const detailData: ReportDetailData = {
      id: report.id,
      fullTitle: report.fullTitle,
      title: report.title,
      periodType: report.periodType,
      amount: report.amount,
      trend: report.trend,
      trendPercent: report.trendPercent,
      comparisonLabel: report.comparisonLabel,
      isFirst: report.isFirst,
      personaInsight: report.personaInsight,
      highlights: report.highlights,
      categories: report.categories,
      transactionCount: report.transactionCount,
      dateRange: report.dateRange,
      // Story 14.16: Pass transaction groups and item groups
      transactionGroups: report.transactionGroups,
      itemGroups: report.itemGroups,
    };
    setSelectedReport(detailData);
    setIsOverlayOpen(true);
  }, []);

  // Close report detail overlay
  const closeOverlay = useCallback(() => {
    setIsOverlayOpen(false);
    setSelectedReport(null);
  }, []);

  // Handle viewing transactions for a report period
  // Converts the date range to temporal filters and navigates to history
  // Story 14e-25c.2: Uses navigation store instead of prop callbacks
  const handleViewTransactions = useCallback((dateRange: { start: Date; end: Date }) => {
    // Determine the filter level based on the date range duration
    const startDate = dateRange.start;
    const endDate = dateRange.end;
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);

    let temporalFilter: TemporalFilterState;

    if (durationDays <= 7) {
      // Weekly: use date range filter for exact ISO week matching
      // This ensures transactions from cross-month ISO weeks are included correctly
      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // Use Thursday for year/month display (ISO standard)
      const thursday = new Date(startDate);
      thursday.setDate(thursday.getDate() + 3);
      const year = thursday.getFullYear().toString();
      const month = `${year}-${String(thursday.getMonth() + 1).padStart(2, '0')}`;
      const week = Math.ceil(thursday.getDate() / 7);

      temporalFilter = {
        level: 'week',
        year,
        month,
        week,
        // Date range ensures exact ISO week filtering regardless of month boundaries
        dateRange: {
          start: formatDate(startDate),
          end: formatDate(endDate),
        },
      };
    } else if (durationDays <= 31) {
      // Monthly
      const year = startDate.getFullYear().toString();
      const month = `${year}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      temporalFilter = {
        level: 'month',
        year,
        month,
      };
    } else if (durationDays <= 92) {
      // Quarterly
      const year = startDate.getFullYear().toString();
      const quarterNum = Math.floor(startDate.getMonth() / 3) + 1;
      const quarter = `Q${quarterNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
      temporalFilter = {
        level: 'quarter',
        year,
        quarter,
      };
    } else {
      // Yearly
      const year = startDate.getFullYear().toString();
      temporalFilter = {
        level: 'year',
        year,
      };
    }

    // Wrap temporal filter in full history filter state
    const historyFilters: HistoryFilterState = {
      ...getDefaultFilterState(),
      temporal: temporalFilter,
    };

    // Story 14e-25c.2: Set the pending filters and navigate to history via store
    setPendingHistoryFilters(historyFilters);
    closeOverlay();
    navigateToView('history');
  }, [setPendingHistoryFilters, navigateToView, closeOverlay]);

  // Get placeholder message based on period type
  const getEmptyPlaceholder = (periodType: string): string => {
    switch (periodType) {
      case 'weekly':
        return 'Agrega gastos esta semana para ver tu reporte';
      case 'monthly':
        return 'Agrega gastos este mes para ver tu reporte';
      case 'quarterly':
        return 'Agrega gastos este trimestre para ver tu reporte';
      case 'yearly':
        return 'Agrega gastos este año para ver tu reporte';
      default:
        return 'Próximamente';
    }
  };

  // Render report rows for a section
  const renderReportRows = (reports: ReportRowData[], periodType: string) => {
    if (reports.length === 0) {
      return (
        <div
          className="py-6 px-4 text-center"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
          }}
        >
          <p
            className="text-sm italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {getEmptyPlaceholder(periodType)}
          </p>
        </div>
      );
    }

    return reports.map((report) => (
      <ReportRow
        key={report.id}
        title={report.title}
        amount={report.amount}
        trend={report.trend}
        trendPercent={report.trendPercent}
        comparisonLabel={report.comparisonLabel}
        periodType={report.periodType}
        isUnread={report.isUnread}
        isFirst={report.isFirst}
        firstLabel={report.firstLabel}
        personaHook={report.personaHook}
        transactionCount={report.transactionCount}
        onClick={() => openReportDetail(report)}
      />
    ));
  };

  return (
    <div
      className="flex flex-col h-full relative"
      style={{
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100vh',
      }}
      data-testid="reports-view"
    >
      {/* Fixed Header - matches TopHeader styling */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center"
        style={{
          height: '72px',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          backgroundColor: 'var(--bg)',
        }}
      >
        {/* Full width flex container */}
        <div className="w-full flex items-center justify-between">
          {/* Left side: Back button + Title (left-aligned, close together) */}
          <div className="flex items-center gap-0">
            {/* Back button - ChevronLeft style (< without dash) */}
            <button
              onClick={navigateBack}
              className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
              aria-label="Volver"
              data-testid="back-button"
              style={{ color: 'var(--text-primary, #0f172a)' }}
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>

            {/* Title - left aligned, close to back button */}
            <h1
              className="font-semibold"
              style={{
                fontFamily: 'var(--font-family)',
                color: 'var(--text-primary, #0f172a)',
                fontWeight: 700,
                fontSize: '20px',
              }}
            >
              Resumen
            </h1>
          </div>

          {/* Right side: Year Selector + Profile Avatar */}
          <div className="flex items-center gap-3 relative">
            {/* Year Selector */}
            <div
              className="flex items-center gap-1"
              onTouchStart={(e) => onTouchStart(e.nativeEvent)}
              onTouchMove={(e) => onTouchMove(e.nativeEvent)}
              onTouchEnd={(e) => onTouchEnd(e.nativeEvent)}
              data-testid="year-selector"
            >
              <button
                type="button"
                onClick={goToPrevYear}
                disabled={!canGoPrevYear}
                className={`
                  w-6 h-6 rounded flex items-center justify-center
                  ${prefersReducedMotion ? '' : 'transition-all duration-150'}
                  ${canGoPrevYear ? 'hover:bg-[var(--bg-tertiary)] cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                `}
                aria-label="Año anterior"
              >
                <ChevronLeft size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>

              <span
                className="text-sm font-semibold min-w-[45px] text-center"
                style={{ color: 'var(--text-primary)' }}
              >
                {selectedYear}
              </span>

              <button
                type="button"
                onClick={goToNextYear}
                disabled={!canGoNextYear}
                className={`
                  w-6 h-6 rounded flex items-center justify-center
                  ${prefersReducedMotion ? '' : 'transition-all duration-150'}
                  ${canGoNextYear ? 'hover:bg-[var(--bg-tertiary)] cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                `}
                aria-label="Año siguiente"
              >
                <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Profile Avatar with Dropdown */}
            <ProfileAvatar
              ref={profileButtonRef}
              initials={getInitials(userName)}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            />
            <ProfileDropdown
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              userName={userName}
              userEmail={userEmail}
              onNavigate={handleProfileNavigate}
              theme={theme}
              t={t}
              triggerRef={profileButtonRef}
            />
          </div>
        </div>
      </header>

      {/* Scrollable content - with padding for fixed header (72px) and bottom nav */}
      <div
        className="flex-1 overflow-y-auto px-3"
        style={{
          paddingTop: '72px', // Just the header height, no extra gap
          paddingBottom: 'calc(6rem + var(--safe-bottom, 0px))', // Account for bottom nav
        }}
      >
        <div className="flex flex-col gap-2">
          {/* Weekly Section */}
          <ReportSection
            title="Semanal"
            isExpanded={sectionStates.weekly.isExpanded}
            onToggle={() => toggleSection('weekly')}
            reportCount={weeklyReports.length}
            maxReports={maxWeeklyReports}
          >
            {renderReportRows(weeklyReports, 'weekly')}
          </ReportSection>

          {/* Monthly Section */}
          <ReportSection
            title="Mensual"
            isExpanded={sectionStates.monthly.isExpanded}
            onToggle={() => toggleSection('monthly')}
            reportCount={monthlyReports.length}
            maxReports={maxMonthlyReports}
          >
            {renderReportRows(monthlyReports, 'monthly')}
          </ReportSection>

          {/* Quarterly Section */}
          <ReportSection
            title="Trimestral"
            isExpanded={sectionStates.quarterly.isExpanded}
            onToggle={() => toggleSection('quarterly')}
            reportCount={quarterlyReports.length}
            maxReports={maxQuarterlyReports}
          >
            {renderReportRows(quarterlyReports, 'quarterly')}
          </ReportSection>

          {/* Yearly Section */}
          <ReportSection
            title="Anual"
            isExpanded={sectionStates.yearly.isExpanded}
            onToggle={() => toggleSection('yearly')}
            reportCount={yearlyReports.length}
            maxReports={maxYearlyReports}
          >
            {renderReportRows(yearlyReports, 'yearly')}
          </ReportSection>
        </div>
      </div>

      {/* Report Detail Overlay */}
      <ReportDetailOverlay
        isOpen={isOverlayOpen}
        onClose={closeOverlay}
        reportData={selectedReport}
        onViewTransactions={handleViewTransactions}
      />
    </div>
  );
};

export default ReportsView;
