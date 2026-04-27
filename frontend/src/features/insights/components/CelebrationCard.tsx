/**
 * CelebrationCard - Celebration display with stats and share button
 *
 * Story 14.33d: Celebration & Personal Records Display
 * @see docs/sprint-artifacts/epic14/stories/story-14.33d-celebration-records-display.md
 *
 * AC1: Gradient background with primary-light to blue-100
 * AC2: Large emoji with bounce animation, title, subtitle, stats row
 * AC5: Bounce animation respects prefers-reduced-motion
 * AC6: Share button triggers Web Share API or clipboard fallback
 */

import React from 'react';
import { Share2 } from 'lucide-react';

export interface CelebrationStat {
  value: string;
  label: string;
}

export interface CelebrationCardProps {
  /** Celebration emoji (48px, bouncing) */
  emoji: string;
  /** Title (e.g., "Nuevo Record Personal!") */
  title: string;
  /** Subtitle (dynamic message about the achievement) */
  subtitle: string;
  /** Stats row (2 metrics with value and label) */
  stats: CelebrationStat[];
  /** Share button click handler */
  onShare: () => void;
  /** Current theme (light/dark) */
  theme: string;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * CelebrationCard displays a personal record or achievement
 * with bouncing emoji, stats, and share button.
 */
export const CelebrationCard: React.FC<CelebrationCardProps> = ({
  emoji,
  title,
  subtitle,
  stats,
  onShare,
  t,
}) => {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{
        background: 'linear-gradient(135deg, var(--primary-light, #93c5fd), #dbeafe)',
        border: '1px solid var(--primary)',
        borderRadius: 'var(--radius-lg, 16px)',
      }}
      role="region"
      aria-label={title}
    >
      {/* Bouncing emoji - AC5: Uses CSS animation with reduced-motion fallback */}
      <div
        className="celebration-emoji"
        style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}
        aria-hidden="true"
      >
        {emoji}
      </div>

      {/* Title */}
      <h2
        className="font-bold mb-2"
        style={{
          fontSize: '20px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {title}
      </h2>

      {/* Subtitle */}
      <p
        className="mb-6"
        style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {subtitle}
      </p>

      {/* Stats row - AC2 */}
      {stats.length > 0 && (
        <div
          className="flex justify-center gap-8 mb-6"
          role="list"
          aria-label={t('stats') || 'Statistics'}
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center"
              role="listitem"
            >
              <span
                className="font-bold"
                style={{
                  fontSize: '24px',
                  color: 'var(--primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Share button - AC6 */}
      <button
        onClick={onShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors"
        style={{
          backgroundColor: 'var(--primary)',
          color: 'white',
          fontFamily: 'var(--font-family)',
          fontSize: '14px',
        }}
        aria-label={t('shareAchievement') || 'Share achievement'}
      >
        <Share2 size={16} />
        {t('shareAchievement') || 'Compartir logro'}
      </button>

      {/* CSS for bounce animation - injected via style tag */}
      <style>{`
        @keyframes celebration-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .celebration-emoji {
          animation: celebration-bounce 1s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .celebration-emoji {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CelebrationCard;
