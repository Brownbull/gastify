/**
 * ReportDetailOverlay Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Story-style detail overlay for viewing full report content.
 * Opens when clicking a report row, showing hero card, insights,
 * highlights, and category breakdown.
 *
 * @example
 * ```tsx
 * <ReportDetailOverlay
 *   isOpen={showOverlay}
 *   onClose={() => setShowOverlay(false)}
 *   reportData={selectedReport}
 * />
 * ```
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Download, Receipt } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useLang } from '@shared/stores/useSettingsStore';
import { TRANSLATIONS, type Language } from '@/utils/translations';
import type { TrendDirection, ReportPeriodType, CategoryBreakdown, TransactionGroup, ItemGroup } from '@/types/report';
import { formatCurrency } from '@/types/report';
import { CategoryGroupCard } from './CategoryGroupCard';
import { ItemGroupCard } from './ItemGroupCard';
import { SpendingDonutChart, type DonutSegment } from './SpendingDonutChart';
import { formatCategoryName } from '../utils/reportUtils';
import { handlePrintReport } from '../utils/printUtils';

// ============================================================================
// Types
// ============================================================================

type Translations = (typeof TRANSLATIONS)[keyof typeof TRANSLATIONS];

export interface ReportHighlight {
  label: string;
  value: string;
}

export interface ReportDetailData {
  /** Report ID */
  id: string;
  /** Full title with temporal context (e.g., "Semana 23 · Diciembre · Q4 2025") */
  fullTitle: string;
  /** Short title for header */
  title: string;
  /** Period type */
  periodType: ReportPeriodType;
  /** Total amount */
  amount: number;
  /** Trend direction */
  trend?: TrendDirection;
  /** Trend percentage */
  trendPercent?: number;
  /** Comparison label (e.g., "vs S1", "vs Dic", "vs Q3", "vs 2025") */
  comparisonLabel?: string;
  /** Whether this is the first report of this type */
  isFirst?: boolean;
  /** Persona insight text */
  personaInsight?: string;
  /** Highlights for quarterly/yearly reports */
  highlights?: ReportHighlight[];
  /** Category breakdown */
  categories: CategoryBreakdown[];
  /** Total number of transactions in this period */
  transactionCount: number;
  /** Date range for the period (used for filtering navigation) */
  dateRange: { start: Date; end: Date };
  /**
   * Transaction groups for grouped category display (Story 14.16)
   * Weekly: Top 3 by amount, Monthly+: All sorted alphabetically
   */
  transactionGroups?: TransactionGroup[];
  /**
   * Item groups for product-level breakdown (Story 14.16)
   * Weekly: Top 3 by amount, Monthly+: All sorted alphabetically
   */
  itemGroups?: ItemGroup[];
}

export interface ReportDetailOverlayProps {
  /** Whether the overlay is open */
  isOpen: boolean;
  /** Callback when overlay is closed */
  onClose: () => void;
  /** Report data to display */
  reportData: ReportDetailData | null;
  /** Optional additional CSS classes */
  className?: string;
  /** Callback when user clicks transaction count pill to view transactions */
  onViewTransactions?: (dateRange: { start: Date; end: Date }) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Hero card showing total amount and trend
 */
interface HeroCardProps {
  amount: number;
  trend?: TrendDirection;
  trendPercent?: number;
  isFirst?: boolean;
  periodType: ReportPeriodType;
  /** Specific comparison label (e.g., "vs S1", "vs Dic", "vs Q3", "vs 2025") */
  comparisonLabel?: string;
  t: Translations;
}

const HeroCard: React.FC<HeroCardProps> = ({
  amount,
  trend,
  trendPercent,
  isFirst,
  periodType,
  comparisonLabel,
  t,
}) => {
  const hasTrend = trend && trend !== 'neutral' && trendPercent !== undefined && !isFirst;
  const periodLabel = {
    weekly: t.reportTotalWeekly,
    monthly: t.reportTotalMonthly,
    quarterly: t.reportTotalQuarterly,
    yearly: t.reportTotalYearly,
  }[periodType];

  const firstLabel = {
    weekly: t.reportFirstWeekly,
    monthly: t.reportFirstMonthly,
    quarterly: t.reportFirstQuarterly,
    yearly: t.reportFirstYearly,
  }[periodType];

  // Semantic colors for trend - up (more spending) = bad, down (less) = good
  // Use CSS variables for theme-awareness
  const trendColor = trend === 'up'
    ? 'var(--negative-primary)'  // Red - spending increased (bad)
    : 'var(--positive-primary)'; // Green - spending decreased (good)

  const trendBgColor = trend === 'up'
    ? 'var(--negative-bg)'
    : 'var(--positive-bg)';

  return (
    <div
      className="rounded-xl p-6 text-center"
      style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, var(--primary)) 100%)',
      }}
      data-testid="hero-card"
    >
      <div className="text-xs text-white/80 mb-1">{periodLabel}</div>
      <div className="text-4xl font-bold text-white mb-2">
        {formatCurrency(amount)}
      </div>
      {hasTrend && (
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{
            backgroundColor: trendBgColor,
            color: trendColor,
          }}
        >
          {/* Up/down arrow icon */}
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            {trend === 'up' ? (
              // Up arrow - spending increased (bad)
              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              // Down arrow - spending decreased (good)
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          {trend === 'up' ? '+' : '-'}{trendPercent}% {comparisonLabel || t.reportVsPreviousPeriod}
        </div>
      )}
      {isFirst && (
        <div className="text-sm text-white/80 mt-2">{firstLabel}</div>
      )}
    </div>
  );
};

/**
 * Insight card with persona text
 */
interface InsightCardProps {
  insight: string;
  t: Translations;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, t }) => (
  <div
    className="rounded-xl p-5 border"
    style={{
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--border-light)',
    }}
    data-testid="insight-card"
  >
    <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
      💡 {t.reportPersonalizedInsight}
    </div>
    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
      {insight}
    </div>
  </div>
);

/**
 * Highlights card for quarterly/yearly reports
 */
interface HighlightsCardProps {
  highlights: ReportHighlight[];
  periodType: ReportPeriodType;
  t: Translations;
}

const HighlightsCard: React.FC<HighlightsCardProps> = ({ highlights, periodType, t }) => {
  const highlightLabel = {
    weekly: t.reportHighlightsWeekly,
    monthly: t.reportHighlightsMonthly,
    quarterly: t.reportHighlightsQuarterly,
    yearly: t.reportHighlightsYearly,
  }[periodType];

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-light)',
      }}
      data-testid="highlights-card"
    >
      <div className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
        🏆 {highlightLabel}
      </div>
      <div className="flex flex-col gap-3">
        {highlights.map((h, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {h.label}
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {h.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Category breakdown card (for monthly+ reports - flat list)
 */
interface CategoryBreakdownCardProps {
  categories: CategoryBreakdown[];
  t: Translations;
  lang: Language;
}

const CategoryBreakdownCard: React.FC<CategoryBreakdownCardProps> = ({ categories, t, lang }) => (
  <div
    className="rounded-xl p-5 border"
    style={{
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--border-light)',
    }}
    data-testid="category-breakdown-card"
  >
    <div className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
      📊 {t.reportCategoryBreakdown}
    </div>
    <div className="flex flex-col gap-2.5">
      {categories.map((cat) => (
        <div key={cat.category} className="flex items-center gap-2.5">
          {/* Category icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ backgroundColor: 'var(--primary-light, rgba(59, 130, 246, 0.1))' }}
          >
            {cat.icon}
          </div>

          {/* Category info */}
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCategoryName(cat.category, lang)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {cat.transactionCount} {cat.transactionCount === 1 ? t.reportPurchaseSingular : t.reportPurchasePlural}
            </div>
          </div>

          {/* Amount */}
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(cat.amount)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Transaction groups card (Story 14.16 - grouped store types)
 */
interface TransactionGroupsCardProps {
  groups: TransactionGroup[];
  t: Translations;
}

const TransactionGroupsCard: React.FC<TransactionGroupsCardProps> = ({ groups, t }) => {
  // Build donut segments from groups
  const donutSegments: DonutSegment[] = groups.map((g) => ({
    key: g.key,
    name: g.name,
    value: g.rawTotalAmount,
    percent: g.percent,
    emoji: g.emoji,
  }));

  return (
    <div data-testid="transaction-groups-card">
      {/* Section title */}
      <div
        className="text-xs mb-3 px-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        🏪 {t.reportStoreTypeBreakdown}
      </div>

      {/* Donut chart with legend (only show if more than 1 group) */}
      {groups.length > 1 && (
        <div className="mb-4">
          <SpendingDonutChart
            segments={donutSegments}
            size={90}
            isStoreGroups={true}
          />
        </div>
      )}

      {/* Category group cards */}
      <div className="flex flex-col">
        {groups.map((group) => (
          <CategoryGroupCard key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
};

/**
 * Item groups card (Story 14.16 - grouped product types)
 */
interface ItemGroupsCardProps {
  groups: ItemGroup[];
  t: Translations;
}

const ItemGroupsCard: React.FC<ItemGroupsCardProps> = ({ groups, t }) => {
  // Build donut segments from groups
  const donutSegments: DonutSegment[] = groups.map((g) => ({
    key: g.key,
    name: g.name,
    value: g.rawTotalAmount,
    percent: g.percent,
    emoji: g.emoji,
  }));

  return (
    <div data-testid="item-groups-card">
      {/* Section title */}
      <div
        className="text-xs mb-3 px-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        🛒 {t.reportProductTypeBreakdown}
      </div>

      {/* Donut chart with legend (only show if more than 1 group) */}
      {groups.length > 1 && (
        <div className="mb-4">
          <SpendingDonutChart
            segments={donutSegments}
            size={90}
            isStoreGroups={false}
          />
        </div>
      )}

      {/* Item group cards */}
      <div className="flex flex-col">
        {groups.map((group) => (
          <ItemGroupCard key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * ReportDetailOverlay - Modal popup for report details
 *
 * Displays as a popup within the content area, keeping the main
 * "Resumen" header and bottom navigation visible.
 */
export const ReportDetailOverlay: React.FC<ReportDetailOverlayProps> = ({
  isOpen,
  onClose,
  reportData,
  className = '',
  onViewTransactions,
}) => {
  const lang = useLang();
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const prefersReducedMotion = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Focus management - focus the overlay itself for accessibility
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setTimeout(() => {
        overlayRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Restore focus when closing
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      (previousActiveElement.current as HTMLElement)?.focus?.();
    }, 0);
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Don't render if not open or no data
  if (!isOpen || !reportData) {
    return null;
  }

  return (
    <>
      {/* Semi-transparent backdrop - positioned within content area */}
      <div
        className="fixed z-[100]"
        style={{
          top: '72px', // Below main header
          left: 0,
          right: 0,
          bottom: '80px', // Above bottom nav
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal popup - centered in content area */}
      <div
        ref={overlayRef}
        className={`
          fixed z-[101]
          flex flex-col
          ${prefersReducedMotion ? '' : 'transition-all duration-200'}
          ${className}
        `}
        style={{
          top: '80px', // Below main header with some margin
          left: '12px',
          right: '12px',
          bottom: '88px', // Above bottom nav with some margin
          backgroundColor: 'var(--bg-primary, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
        data-testid="report-detail-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-overlay-title"
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{
            backgroundColor: 'var(--bg-primary, #ffffff)',
            borderColor: 'var(--border-light)',
          }}
        >
          {/* Back button and title */}
          <div
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            onClick={handleClose}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClose();
              }
            }}
          >
            <ChevronLeft size={20} className="shrink-0" style={{ color: 'var(--text-primary)' }} />
            <span
              id="report-overlay-title"
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {reportData.fullTitle}
            </span>
          </div>

          {/* Transaction count pill - clickable to view transactions */}
          <button
            type="button"
            onClick={() => {
              if (onViewTransactions && reportData.dateRange) {
                onViewTransactions(reportData.dateRange);
              }
            }}
            disabled={!onViewTransactions}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0
              ${onViewTransactions ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : 'cursor-default'}
              ${prefersReducedMotion ? '' : 'transition-colors duration-150'}
            `}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
            }}
            aria-label={t.reportTransactionsViewHistory.replace('{count}', String(reportData.transactionCount))}
            data-testid="transaction-count-pill"
          >
            <Receipt size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {reportData.transactionCount}
            </span>
          </button>

          {/* Download as PDF button */}
          <button
            ref={downloadButtonRef}
            type="button"
            onClick={() => {
              // Use JS-based print that clones content to a print container
              handlePrintReport(reportContentRef, reportData, lang);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-2"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
            aria-label={t.reportDownloadPdf}
            data-testid="download-pdf-button"
          >
            <Download size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={reportContentRef}
          className="flex-1 overflow-y-auto p-4"
          style={{
            backgroundColor: 'var(--bg-primary, #ffffff)',
          }}
          data-testid="report-content"
        >
          <div className="flex flex-col gap-4">
            {/* Print-only app branding - hidden on screen, visible when printing */}
            <div
              className="hidden print:flex items-center justify-center gap-2 pb-2 mb-2 border-b"
              style={{ borderColor: 'var(--border-light)' }}
              data-testid="print-app-branding"
            >
              <img src="/icon.svg" alt="Gastify" className="w-6 h-6" />
              <span className="text-lg font-bold" style={{ color: '#2d3a4a', letterSpacing: '-0.5px' }}>
                Gastify
              </span>
            </div>

            {/* Print-only report title - hidden on screen, visible when printing */}
            <div
              className="hidden print:block text-center mb-4"
              style={{ color: 'var(--text-primary)' }}
              data-testid="print-header"
            >
              <h1 className="text-2xl font-bold mb-1">{reportData.fullTitle}</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {reportData.transactionCount} {reportData.transactionCount === 1 ? t.transactionSingular : t.transactionPlural}
              </p>
            </div>

            {/* Hero card */}
            <HeroCard
              amount={reportData.amount}
              trend={reportData.trend}
              trendPercent={reportData.trendPercent}
              isFirst={reportData.isFirst}
              periodType={reportData.periodType}
              comparisonLabel={reportData.comparisonLabel}
              t={t}
            />

            {/* Persona insight */}
            {reportData.personaInsight && (
              <InsightCard insight={reportData.personaInsight} t={t} />
            )}

            {/* Highlights */}
            {reportData.highlights && reportData.highlights.length > 0 && (
              <HighlightsCard
                highlights={reportData.highlights}
                periodType={reportData.periodType}
                t={t}
              />
            )}

            {/* Story 14.16: Show transaction groups with inline donut chart */}
            {reportData.transactionGroups && reportData.transactionGroups.length > 0 && (
              <TransactionGroupsCard groups={reportData.transactionGroups} t={t} />
            )}

            {/* Story 14.16: Show item groups with inline donut chart */}
            {reportData.itemGroups && reportData.itemGroups.length > 0 && (
              <ItemGroupsCard groups={reportData.itemGroups} t={t} />
            )}

            {/* Fallback to flat category list if no groups available */}
            {(!reportData.transactionGroups || reportData.transactionGroups.length === 0) &&
             (!reportData.itemGroups || reportData.itemGroups.length === 0) &&
             reportData.categories && reportData.categories.length > 0 && (
              <CategoryBreakdownCard categories={reportData.categories} t={t} lang={lang} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportDetailOverlay;
