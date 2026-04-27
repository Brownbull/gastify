/**
 * Session types — canonical location for session-related interfaces.
 *
 * Story 15b-0c: Extracted from SessionComplete.tsx to break
 * Cycle 4 (stores → components → stores circular dependency).
 *
 * Consumers should import from here or via the session barrel
 * (src/components/session/index.ts) for backward compatibility.
 */

import type { ReactNode } from 'react';

/**
 * Session context for message selection and summary display
 */
export interface SessionContext {
  /** Number of transactions saved in this session */
  transactionsSaved: number;
  /** Number of consecutive tracking days */
  consecutiveDays: number;
  /** Whether this is the first receipt of the week */
  isFirstOfWeek: boolean;
  /** Whether a personal record was set */
  isPersonalRecord: boolean;
  /** Total amount saved across transactions */
  totalAmount: number;
  /** Currency code for formatting */
  currency: string;
  /** Categories touched in this session */
  categoriesTouched: string[];
}

/**
 * Suggestion action types
 */
export type SessionAction = 'analytics' | 'scan' | 'history';

/**
 * Suggestion item structure
 */
export interface Suggestion {
  label: string;
  action: SessionAction;
  icon: ReactNode;
}
