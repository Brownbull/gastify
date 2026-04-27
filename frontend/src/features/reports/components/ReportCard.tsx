/**
 * ReportCard Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Full-screen card component for displaying spending summaries in an
 * Instagram-style swipeable report carousel. Features large typography,
 * gradient backgrounds, and Rosa-friendly formatting.
 *
 * AC #1: ReportCard component with full-screen card styling
 * AC #5: Trend arrows (↑↓→) with color coding
 * AC #6: Rosa-friendly format
 *
 * @example
 * ```tsx
 * <ReportCard
 *   card={{
 *     id: 'summary',
 *     type: 'summary',
 *     title: 'Esta Semana',
 *     primaryValue: '$45.200',
 *     trend: 'up',
 *     trendPercent: 8,
 *   }}
 * />
 * ```
 */

import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ReportCard as ReportCardType, TrendDirection } from '@/types/report';
import { TREND_COLORS, getTrendDescription } from '@/types/report';

/**
 * Props for ReportCard component
 */
export interface ReportCardProps {
  /** Card data to display */
  card: ReportCardType;
  /** Optional additional CSS classes */
  className?: string;
  /** Whether this card is currently active (visible) */
  isActive?: boolean;
}

/**
 * Trend arrow icons by direction
 */
const TrendArrows: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

/**
 * Get background gradient based on card type
 */
function getCardBackground(type: ReportCardType['type']): string {
  switch (type) {
    case 'summary':
      return 'bg-gradient-to-br from-primary to-primary-hover';
    case 'category':
      return 'bg-white dark:bg-slate-800';
    case 'trend':
      return 'bg-gradient-to-br from-blue-500 to-blue-700';
    case 'milestone':
      return 'bg-gradient-to-br from-amber-400 to-orange-500';
    default:
      return 'bg-white dark:bg-slate-800';
  }
}

/**
 * Get text color based on card type
 */
function getTextColor(type: ReportCardType['type']): string {
  switch (type) {
    case 'summary':
    case 'trend':
    case 'milestone':
      return 'text-white';
    case 'category':
    default:
      return 'text-slate-900 dark:text-white';
  }
}

/**
 * Trend indicator component
 */
interface TrendIndicatorProps {
  direction: TrendDirection;
  percent: number;
  isLightBackground?: boolean;
  showDescription?: boolean;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  direction,
  percent,
  isLightBackground = false,
  showDescription = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const color = TREND_COLORS[direction];
  const arrow = TrendArrows[direction];
  const description = getTrendDescription(direction, percent);

  // For light backgrounds (summary cards), use semi-transparent background
  const bgClass = isLightBackground
    ? 'bg-white/20'
    : direction === 'up'
      ? 'bg-red-100 dark:bg-red-900/30'
      : direction === 'down'
        ? 'bg-green-100 dark:bg-green-900/30'
        : 'bg-gray-100 dark:bg-gray-800';

  const textClass = isLightBackground
    ? 'text-white'
    : direction === 'up'
      ? 'text-red-600 dark:text-red-400'
      : direction === 'down'
        ? 'text-green-600 dark:text-green-400'
        : 'text-gray-600 dark:text-gray-400';

  const ariaLabel =
    direction === 'up'
      ? `Gasto aumentó ${Math.abs(percent)}%`
      : direction === 'down'
        ? `Gasto disminuyó ${Math.abs(percent)}%`
        : 'Sin cambios significativos';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${bgClass} ${
        prefersReducedMotion ? '' : 'transition-all duration-200'
      }`}
      data-testid="trend-indicator"
      aria-label={ariaLabel}
    >
      <span
        className={`text-lg font-bold ${textClass}`}
        data-testid="trend-arrow"
        style={{ color: isLightBackground ? undefined : color }}
      >
        {arrow}
      </span>
      <span className={`text-sm font-semibold ${textClass}`}>
        {direction === 'up' ? '+' : direction === 'down' ? '' : ''}
        {percent}%
      </span>
      {showDescription && (
        <span className={`text-sm ${textClass} opacity-80 ml-1`}>
          {description}
        </span>
      )}
    </div>
  );
};

/**
 * ReportCard component
 *
 * Displays a full-screen card with spending information, trend indicators,
 * and Rosa-friendly formatting.
 */
export const ReportCard: React.FC<ReportCardProps> = ({
  card,
  className = '',
  isActive = true,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const {
    id,
    type,
    title,
    primaryValue,
    secondaryValue,
    trend,
    trendPercent,
    categoryIcon,
    description,
  } = card;

  const background = getCardBackground(type);
  const textColor = getTextColor(type);
  const isLightText = type === 'summary' || type === 'trend' || type === 'milestone';

  // ARIA label for the card
  const ariaLabel = `${title}: ${primaryValue}${
    trend && trendPercent !== undefined
      ? `, ${trend === 'up' ? 'subió' : trend === 'down' ? 'bajó' : 'sin cambio'} ${trendPercent}%`
      : ''
  }`;

  return (
    <article
      className={`
        flex flex-col items-center justify-center
        w-full h-full min-h-[400px]
        rounded-2xl p-8
        ${background}
        ${textColor}
        ${prefersReducedMotion ? '' : 'transition-all duration-300'}
        ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        ${className}
      `}
      data-testid="report-card"
      data-card-type={type}
      data-card-id={id}
      role="article"
      aria-label={ariaLabel}
    >
      {/* Category icon for category cards */}
      {categoryIcon && (
        <div className="text-5xl mb-4" aria-hidden="true">
          {categoryIcon}
        </div>
      )}

      {/* Title */}
      <h2
        className={`
          text-lg font-medium mb-2
          ${isLightText ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}
        `}
      >
        {title}
      </h2>

      {/* Primary value - Large typography for Rosa-friendly format (AC #6) */}
      <div
        className={`
          text-4xl md:text-5xl font-bold mb-4
          ${prefersReducedMotion ? '' : 'animate-fade-in'}
        `}
      >
        {primaryValue}
      </div>

      {/* Trend indicator (AC #5) */}
      {trend !== undefined && trendPercent !== undefined && (
        <div className="mb-4">
          <TrendIndicator
            direction={trend}
            percent={trendPercent}
            isLightBackground={isLightText}
            showDescription={false}
          />
        </div>
      )}

      {/* Secondary value */}
      {secondaryValue && (
        <p
          className={`
            text-base
            ${isLightText ? 'opacity-70' : 'text-slate-500 dark:text-slate-400'}
          `}
        >
          {secondaryValue}
        </p>
      )}

      {/* Rosa-friendly description (AC #6) */}
      {description && (
        <p
          className={`
            text-base font-medium mt-2
            ${isLightText ? 'opacity-90' : 'text-slate-600 dark:text-slate-300'}
          `}
        >
          {description}
        </p>
      )}
    </article>
  );
};

export default ReportCard;
