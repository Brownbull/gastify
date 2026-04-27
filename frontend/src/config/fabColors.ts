/**
 * Story 14d.8: FAB Visual States - Color Configuration
 *
 * Defines the color palette for the Floating Action Button based on scan mode.
 * Colors use CSS variables with Tailwind fallback classes for consistency.
 *
 * Design System Reference:
 * - Single: Emerald green (primary theme color)
 * - Batch: Amber (super credit color)
 * - Statement: Violet (future feature)
 * - Error: Red (error state)
 *
 * @see docs/sprint-artifacts/epic14d/stories/story-14d.8-fab-visual-states.md
 */

import type { ScanMode, ScanPhase } from '@shared/types/scanWorkflow';

// =============================================================================
// Color Definitions
// =============================================================================

/**
 * FAB color scheme for each mode.
 * gradient is used for the actual button rendering.
 * Hover states are handled via CSS transforms (scale).
 */
export interface FABColorScheme {
  /** Background gradient for the button */
  gradient: string;
  /** Text color class */
  text: string;
  /** Icon color for lucide-react icons */
  iconColor: string;
}

/**
 * FAB colors organized by scan mode and error state.
 *
 * AC1: Single mode uses emerald/green
 * AC2: Batch mode uses amber/orange
 * AC3: Statement mode uses violet/purple
 * AC4: Error state uses red
 * AC5: Colors defined in design system config (this file)
 */
export const FAB_COLORS = {
  /** Single receipt scan - uses theme primary (emerald) */
  single: {
    gradient: 'linear-gradient(135deg, var(--primary), var(--primary-hover, var(--primary)))',
    text: 'text-white',
    iconColor: 'white',
  },
  /** Batch receipt scan - amber/gold (super credit color) */
  batch: {
    gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    text: 'text-white',
    iconColor: 'white',
  },
  /** Statement scan - violet/purple (future feature) */
  statement: {
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    text: 'text-white',
    iconColor: 'white',
  },
  /** Error state - red */
  error: {
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    text: 'text-white',
    iconColor: 'white',
  },
} as const satisfies Record<string, FABColorScheme>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the FAB color scheme based on scan mode and phase.
 *
 * Priority:
 * 1. Error phase -> error colors
 * 2. Batch mode -> batch colors
 * 3. Statement mode -> statement colors
 * 4. Default (single) -> single colors
 *
 * @param mode - Current scan mode
 * @param phase - Current scan phase
 * @returns Color scheme for the FAB
 */
export function getFABColorScheme(mode: ScanMode, phase: ScanPhase): FABColorScheme {
  // AC4: Error state takes priority over mode
  if (phase === 'error') {
    return FAB_COLORS.error;
  }

  switch (mode) {
    case 'batch':
      return FAB_COLORS.batch;
    case 'statement':
      return FAB_COLORS.statement;
    case 'single':
    default:
      return FAB_COLORS.single;
  }
}

/**
 * Determine if the FAB should show the shine animation.
 *
 * AC11-14: Shine animation plays during processing states.
 * - Single mode: during 'scanning' phase
 * - Batch mode: during 'scanning' phase
 * - Statement mode: during 'scanning' phase
 *
 * @param phase - Current scan phase
 * @param isProcessing - Computed isProcessing flag from context
 * @returns True if shine animation should be shown
 */
export function shouldShowShineAnimation(phase: ScanPhase, isProcessing: boolean): boolean {
  // Shine only during active processing
  return phase === 'scanning' || isProcessing;
}

/**
 * Determine if the FAB should show a subtle pulse animation.
 *
 * AC18: Batch reviewing shows subtle pulse to indicate results ready.
 *
 * @param mode - Current scan mode
 * @param phase - Current scan phase
 * @returns True if pulse animation should be shown
 */
export function shouldShowPulseAnimation(mode: ScanMode, phase: ScanPhase): boolean {
  // Only pulse in batch mode during reviewing phase
  return mode === 'batch' && phase === 'reviewing';
}

export type { ScanMode, ScanPhase };
