/**
 * Story 14e-37: Create useInsightStore
 *
 * Zustand-based state management for insight overlay state.
 * Consolidates 5 insight/session useState calls from App.tsx:
 * - currentInsight
 * - showInsightCard
 * - showSessionComplete
 * - sessionContext
 * - showBatchSummary
 *
 * Affected Workflows:
 * - #7 Insight Generation Flow: currentInsight, showInsightCard display insights
 * - #3 Batch Processing Flow: showBatchSummary triggered after batch completion
 * - #9 Scan Request Lifecycle: Session completion feedback post-scan
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md#ADR-018
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { devtools } from 'zustand/middleware';
import type { Insight } from '@/types/insight';
import type { SessionContext } from '@/types/session';

// =============================================================================
// Types
// =============================================================================

export interface InsightState {
  /** Current insight to display */
  currentInsight: Insight | null;
  /** Whether to show insight card */
  showInsightCard: boolean;
  /** Whether to show session complete overlay */
  showSessionComplete: boolean;
  /** Session context data for completion UI */
  sessionContext: SessionContext | null;
  /** Whether to show batch summary */
  showBatchSummary: boolean;
}

export interface InsightActions {
  /** Show insight card with given insight */
  showInsight: (insight: Insight) => void;
  /** Hide insight card and clear current insight */
  hideInsight: () => void;
  /** Show session complete overlay with context */
  showSessionCompleteOverlay: (context: SessionContext) => void;
  /** Hide session complete overlay and clear context */
  hideSessionCompleteOverlay: () => void;
  /** Show batch summary */
  showBatchSummaryOverlay: () => void;
  /** Hide batch summary */
  hideBatchSummaryOverlay: () => void;
  /** Reset all insight state to initial values */
  reset: () => void;
}

// =============================================================================
// Default State
// =============================================================================

export const defaultInsightState: InsightState = {
  currentInsight: null,
  showInsightCard: false,
  showSessionComplete: false,
  sessionContext: null,
  showBatchSummary: false,
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useInsightStore = create<InsightState & InsightActions>()(
  devtools(
    (set) => ({
      // Initial state
      ...defaultInsightState,

      // Actions
      showInsight: (insight) =>
        set(
          { currentInsight: insight, showInsightCard: true },
          false,
          'insight/showInsight'
        ),

      hideInsight: () =>
        set(
          { currentInsight: null, showInsightCard: false },
          false,
          'insight/hideInsight'
        ),

      showSessionCompleteOverlay: (context) =>
        set(
          { sessionContext: context, showSessionComplete: true },
          false,
          'insight/showSessionComplete'
        ),

      hideSessionCompleteOverlay: () =>
        set(
          { sessionContext: null, showSessionComplete: false },
          false,
          'insight/hideSessionComplete'
        ),

      showBatchSummaryOverlay: () =>
        set({ showBatchSummary: true }, false, 'insight/showBatchSummary'),

      hideBatchSummaryOverlay: () =>
        set({ showBatchSummary: false }, false, 'insight/hideBatchSummary'),

      reset: () =>
        set({ ...defaultInsightState }, false, 'insight/reset'),
    }),
    {
      name: 'insight-store',
      enabled: import.meta.env.DEV,
    }
  )
);

// =============================================================================
// Convenience Selectors (prevent unnecessary re-renders)
// =============================================================================

/** Selector for current insight */
export const useCurrentInsight = () =>
  useInsightStore((state) => state.currentInsight);

/** Selector for show insight card flag */
export const useShowInsightCard = () =>
  useInsightStore((state) => state.showInsightCard);

/** Selector for show session complete flag */
export const useShowSessionComplete = () =>
  useInsightStore((state) => state.showSessionComplete);

/** Selector for session context */
export const useSessionContext = () =>
  useInsightStore((state) => state.sessionContext);

/** Selector for show batch summary flag */
export const useShowBatchSummary = () =>
  useInsightStore((state) => state.showBatchSummary);

/**
 * Combined insight card state selector.
 * Use when you need both the insight and visibility flag together.
 * Uses shallow comparison to prevent infinite re-renders.
 *
 * @example
 * const { currentInsight, showInsightCard } = useInsightCardState();
 */
export const useInsightCardState = () =>
  useInsightStore(
    useShallow((state) => ({
      currentInsight: state.currentInsight,
      showInsightCard: state.showInsightCard,
    }))
  );

/**
 * Combined session complete state selector.
 * Use when you need both the context and visibility flag together.
 * Uses shallow comparison to prevent infinite re-renders.
 *
 * @example
 * const { sessionContext, showSessionComplete } = useSessionCompleteState();
 */
export const useSessionCompleteState = () =>
  useInsightStore(
    useShallow((state) => ({
      sessionContext: state.sessionContext,
      showSessionComplete: state.showSessionComplete,
    }))
  );

/**
 * Combined actions hook.
 * Returns all insight actions for components that need to dispatch multiple actions.
 * Uses shallow comparison to prevent infinite re-renders.
 *
 * @example
 * const actions = useInsightActions();
 * actions.showInsight(insight);
 */
export const useInsightActions = () =>
  useInsightStore(
    useShallow((state) => ({
      showInsight: state.showInsight,
      hideInsight: state.hideInsight,
      showSessionCompleteOverlay: state.showSessionCompleteOverlay,
      hideSessionCompleteOverlay: state.hideSessionCompleteOverlay,
      showBatchSummaryOverlay: state.showBatchSummaryOverlay,
      hideBatchSummaryOverlay: state.hideBatchSummaryOverlay,
      reset: state.reset,
    }))
  );

// =============================================================================
// Direct Access (for non-React code)
// =============================================================================

/**
 * Get current insight state directly (non-reactive).
 * Use this in services or non-React code where hooks can't be used.
 */
export const getInsightState = () => useInsightStore.getState();

/**
 * Insight actions for non-React code (direct store access).
 *
 * **When to use this vs hooks:**
 * - Use `insightActions` in services, utilities, or any non-React code where hooks can't be used
 * - Use `useInsightActions()` hook in React components for automatic re-rendering
 *
 * **Examples:**
 * ```typescript
 * // In a service file (non-React)
 * import { insightActions } from '@/shared/stores';
 * insightActions.showInsight(insight);
 *
 * // In a React component
 * import { useInsightActions } from '@/shared/stores';
 * const { showInsight } = useInsightActions();
 * showInsight(insight);
 * ```
 *
 * @see useInsightActions - Hook version for React components
 * @see getInsightState - Get current state snapshot (non-reactive)
 */
export const insightActions = {
  showInsight: (insight: Insight) =>
    useInsightStore.getState().showInsight(insight),
  hideInsight: () => useInsightStore.getState().hideInsight(),
  showSessionCompleteOverlay: (context: SessionContext) =>
    useInsightStore.getState().showSessionCompleteOverlay(context),
  hideSessionCompleteOverlay: () =>
    useInsightStore.getState().hideSessionCompleteOverlay(),
  showBatchSummaryOverlay: () =>
    useInsightStore.getState().showBatchSummaryOverlay(),
  hideBatchSummaryOverlay: () =>
    useInsightStore.getState().hideBatchSummaryOverlay(),
  reset: () => useInsightStore.getState().reset(),
};
