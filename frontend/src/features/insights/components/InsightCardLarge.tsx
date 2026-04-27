/**
 * InsightCardLarge - Large format insight card for carousel
 *
 * Story 14.33b: View Switcher & Carousel Mode
 * @see docs/sprint-artifacts/epic14/stories/story-14.33b-view-switcher-carousel.md
 *
 * AC4: Carousel Card Design (InsightCardLarge)
 * - Header: icon (40x40) + label + title + close button
 * - Body: message text (13px, --text-secondary)
 * - Celebration type: gradient background linear-gradient(135deg, var(--primary-light), #dbeafe)
 * - Box shadow: --shadow-md
 * - Border-radius: --radius-lg (12px)
 */

import React from 'react';
import { X } from 'lucide-react';
import { InsightRecord } from '@/types/insight';
import {
  getInsightConfig,
  getIconByName,
  getInsightFallbackMessage,
  getVisualType,
  getVisualConfig,
} from '../utils/insightTypeConfig';

export interface InsightCardLargeProps {
  insight: InsightRecord;
  onClose?: () => void;
  theme: string;
  t: (key: string) => string;
}

/**
 * Maps visual type to label key for display
 * Note: Uses 'celebrationLabel' and 'trendLabel' to avoid conflicts with
 * existing translation keys.
 */
function getTypeLabel(visualType: string): string {
  switch (visualType) {
    case 'quirky':
      return 'observation'; // Observacion
    case 'celebration':
      return 'celebrationLabel'; // Celebracion
    case 'actionable':
      return 'opportunity'; // Oportunidad
    case 'tradeoff':
      return 'comparison'; // Comparacion
    case 'trend':
      return 'trendLabel'; // Tendencia
    default:
      return 'insight';
  }
}

export const InsightCardLarge: React.FC<InsightCardLargeProps> = ({
  insight,
  onClose,
  theme,
  t,
}) => {
  const isDark = theme === 'dark';

  // Get visual type and config for styling
  const visualType = getVisualType(insight.category, insight.insightId);
  const visualConfig = getVisualConfig(visualType);

  // Get icon configuration
  const config = getInsightConfig(insight.insightId, insight.category, isDark);
  const IconComponent = getIconByName(insight.icon || config.icon);

  // Fallback for old records without title/message
  const title =
    insight.title ||
    insight.insightId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const message = insight.message || getInsightFallbackMessage(insight.insightId);

  // Label for the insight type
  const typeLabel = t(getTypeLabel(visualType)) || getTypeLabel(visualType);

  // Celebration cards get gradient background
  const isCelebration = visualType === 'celebration';

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        background: isCelebration
          ? 'linear-gradient(135deg, var(--insight-celebration-bg), #dbeafe)'
          : 'var(--surface)',
        borderColor: isCelebration ? 'var(--primary)' : 'var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon - 40x40 per mockup */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: isCelebration
              ? 'linear-gradient(135deg, var(--insight-celebration-bg), #dbeafe)'
              : visualConfig.bgColor,
          }}
        >
          <IconComponent size={20} style={{ color: visualConfig.iconColor }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type label */}
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {typeLabel}
          </div>
          {/* Title */}
          <div
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </div>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            aria-label={t('close') || 'Close'}
          >
            <X size={16} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        )}
      </div>

      {/* Body */}
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {message}
      </div>
    </div>
  );
};
