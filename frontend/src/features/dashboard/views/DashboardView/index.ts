/**
 * DashboardView Module Exports
 *
 * Story 15-TD-5: Resolved file/directory naming collision
 * DashboardView.tsx moved into DashboardView/ directory
 *
 * Re-exports DashboardView component, types, and hooks.
 */

// Main component (now co-located in this directory)
export { DashboardView } from './DashboardView';
export type { DashboardViewProps } from './DashboardView';

// Export the data hook and types
export { useDashboardViewData } from './useDashboardViewData';
export type { DashboardViewData, UseDashboardViewDataReturn } from './useDashboardViewData';
