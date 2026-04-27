/**
 * CelebrationView - Container for celebration mode in InsightsView
 *
 * Story 14.33d: Celebration & Personal Records Display
 * @see docs/sprint-artifacts/epic14/stories/story-14.33d-celebration-records-display.md
 *
 * PLACEHOLDER: This view shows a "coming soon" message.
 * The full achievement/celebration system is planned for a future release.
 */

import React from 'react';
import type { Firestore } from 'firebase/firestore';

export interface CelebrationViewProps {
  /** Callback when user wants to go back */
  onBack: () => void;
  /** Current theme (light/dark) */
  theme: string;
  /** Translation function */
  t: (key: string) => string;
  /** Firestore instance */
  db: Firestore | null;
  /** User ID */
  userId: string | null;
  /** App ID */
  appId: string | null;
}

/**
 * CelebrationView - Placeholder for future achievement/celebration feature.
 *
 * When fully implemented, this will display:
 * - Personal spending records (lowest week, category records)
 * - Badge unlocks for achievements
 * - Celebration animations with confetti
 * - Share functionality for achievements
 */
export const CelebrationView: React.FC<CelebrationViewProps> = () => {
  // PLACEHOLDER: Achievement/Logro system - Future Feature
  // The personal records detection and celebration system is planned for a future release
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <span style={{ fontSize: '40px' }}>🏆</span>
      </div>
      <p
        className="text-lg font-semibold mb-2"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        Logros y Records
      </p>
      <p
        className="text-sm mb-4 max-w-xs"
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        Aquí podrás celebrar tus records personales de ahorro, desbloquear insignias y ver tu progreso hacia tus metas financieras.
      </p>
      <p
        className="text-xs"
        style={{
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        Próximamente disponible
      </p>
    </div>
  );
};

export default CelebrationView;
