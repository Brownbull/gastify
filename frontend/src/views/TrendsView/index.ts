/**
 * TrendsView Re-export Shim
 *
 * Story 15b-1a: Backward compatibility shim.
 * Canonical location: @features/analytics/views/TrendsView/
 *
 * 4 source consumers + 6 test files depend on this path.
 */

export {
  TrendsView,
  useTrendsViewData,
} from '@features/analytics/views/TrendsView';

export type {
  TrendsViewProps,
  DrillDownPath,
  HistoryNavigationPayload,
  TrendsViewData,
  UseTrendsViewDataReturn,
} from '@features/analytics/views/TrendsView';
