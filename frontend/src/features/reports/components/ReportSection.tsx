/**
 * ReportSection Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Collapsible accordion section for grouping reports by time period.
 * Each section has a header with title, time selector, and expandable content.
 *
 * @example
 * ```tsx
 * <ReportSection
 *   title="Semanal"
 *   timeValue="Diciembre"
 *   isExpanded={true}
 *   onToggle={() => setExpanded(!expanded)}
 *   onPrevTime={() => goToPrevMonth()}
 *   onNextTime={() => goToNextMonth()}
 * >
 *   <ReportRow ... />
 *   <ReportRow ... />
 * </ReportSection>
 * ```
 */

import React from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TimeSelector } from './TimeSelector';

export interface ReportSectionProps {
  /** Section title (e.g., "Semanal", "Mensual", "Trimestral", "Anual") */
  title: string;
  /** Current time period value for the time selector (optional) */
  timeValue?: string;
  /** Whether the section is expanded */
  isExpanded: boolean;
  /** Callback when section header is clicked to toggle */
  onToggle: () => void;
  /** Callback when previous time arrow is clicked (optional) */
  onPrevTime?: () => void;
  /** Callback when next time arrow is clicked (optional) */
  onNextTime?: () => void;
  /** Whether previous time navigation is available */
  canGoPrevTime?: boolean;
  /** Whether next time navigation is available */
  canGoNextTime?: boolean;
  /** Whether to show the time selector (default: false) */
  showTimeSelector?: boolean;
  /** Number of reports available in this section */
  reportCount?: number;
  /** Maximum possible reports for this period type (e.g., 52 for weekly, 12 for monthly) */
  maxReports?: number;
  /** Report rows to display when expanded */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * ReportSection - Collapsible accordion for report groups
 */
export const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  timeValue,
  isExpanded,
  onToggle,
  onPrevTime,
  onNextTime,
  canGoPrevTime = true,
  canGoNextTime = true,
  showTimeSelector = false,
  reportCount,
  maxReports,
  children,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const showReportCount = reportCount !== undefined && maxReports !== undefined;

  return (
    <div
      className={`rounded-xl overflow-hidden border ${className}`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-light)',
      }}
      data-testid="report-section"
      data-expanded={isExpanded}
    >
      {/* Section Header */}
      <div
        className={`
          flex items-center justify-between
          px-3.5 py-3
          cursor-pointer
          ${prefersReducedMotion ? '' : 'transition-colors duration-150'}
          hover:bg-[var(--bg-tertiary)]
        `}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${title}, ${isExpanded ? 'expandido' : 'contraído'}${showReportCount ? `, ${reportCount} de ${maxReports} reportes` : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        data-testid="report-section-header"
      >
        {/* Left side: Chevron + Title + Report Count */}
        <div className="flex items-center gap-2.5">
          <ChevronDown
            size={18}
            className={prefersReducedMotion ? '' : 'transition-transform duration-200'}
            style={{
              color: 'var(--text-tertiary)',
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
            data-testid="report-section-chevron"
          />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </span>

          {/* Report Count Badge */}
          {showReportCount && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
              }}
              data-testid="report-count-badge"
            >
              <FileText
                size={12}
                style={{ color: 'var(--text-tertiary)' }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {reportCount} de {maxReports}
              </span>
            </div>
          )}
        </div>

        {/* Right side: Time Selector (optional) */}
        {showTimeSelector && timeValue && onPrevTime && onNextTime && (
          <TimeSelector
            value={timeValue}
            onPrev={onPrevTime}
            onNext={onNextTime}
            canGoPrev={canGoPrevTime}
            canGoNext={canGoNextTime}
          />
        )}
      </div>

      {/* Expandable Content */}
      <div
        className={`
          overflow-hidden
          ${prefersReducedMotion ? '' : 'transition-all duration-200'}
        `}
        style={{
          maxHeight: isExpanded ? '1000px' : '0px',
          opacity: isExpanded ? 1 : 0,
          pointerEvents: isExpanded ? 'auto' : 'none',
        }}
        data-testid="report-section-content"
      >
        <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ReportSection;
