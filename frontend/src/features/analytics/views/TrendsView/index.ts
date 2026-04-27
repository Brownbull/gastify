/**
 * TrendsView Module Exports
 *
 * Story 15b-1a: Consolidated into features/analytics/views/TrendsView/
 *
 * Re-exports TrendsView component, types, and hooks.
 */

// Main component
export { TrendsView } from './TrendsView';
export type { TrendsViewProps } from './TrendsView';

// Re-export canonical types for backward compatibility
export type { DrillDownPath, HistoryNavigationPayload } from './TrendsView';

// Export the data hook and types
export { useTrendsViewData } from './useTrendsViewData';
export type { TrendsViewData, UseTrendsViewDataReturn } from './useTrendsViewData';
