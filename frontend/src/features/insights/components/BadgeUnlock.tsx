/**
 * BadgeUnlock - Badge unlock notification card
 *
 * Story 14.33d: Celebration & Personal Records Display
 * @see docs/sprint-artifacts/epic14/stories/story-14.33d-celebration-records-display.md
 *
 * AC3: Badge notification with secondary background
 *      Header: "Insignia Desbloqueada" (uppercase, small)
 *      Badge icon (48x48, gradient background)
 *      Badge name and description
 */

import React from 'react';

export interface BadgeUnlockProps {
  /** Badge emoji (displayed in gradient circle) */
  emoji: string;
  /** Badge name (e.g., "Ahorrador Elite") */
  name: string;
  /** Badge description (e.g., "3 semanas bajo presupuesto") */
  description: string;
  /** Current theme (light/dark) */
  theme: string;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * BadgeUnlock displays a badge unlock notification
 * with the badge icon, name, and description.
 */
export const BadgeUnlock: React.FC<BadgeUnlockProps> = ({
  emoji,
  name,
  description,
  t,
}) => {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg, 16px)',
      }}
      role="region"
      aria-label={t('badgeUnlocked') || 'Badge Unlocked'}
    >
      {/* Header - uppercase, small text */}
      <div
        className="uppercase tracking-wider font-semibold mb-4 text-center"
        style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-family)',
          letterSpacing: '0.05em',
        }}
      >
        {t('badgeUnlocked') || 'Insignia Desbloqueada'}
      </div>

      {/* Badge content */}
      <div className="flex items-center gap-4">
        {/* Badge icon with gradient background - 48x48 */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-light, #93c5fd), var(--primary))',
          }}
          aria-hidden="true"
        >
          <span style={{ fontSize: '24px' }}>{emoji}</span>
        </div>

        {/* Badge name and description */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold truncate"
            style={{
              fontSize: '16px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            {name}
          </h3>
          <p
            className="truncate"
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BadgeUnlock;
