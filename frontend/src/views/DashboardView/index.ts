/**
 * DashboardView Re-export Shim
 *
 * Story 15b-1b: Backward compatibility shim.
 * Canonical location: @features/dashboard/views/DashboardView/
 *
 * 2 source consumers + 4 test files depend on this path.
 */

export {
  DashboardView,
  useDashboardViewData,
} from '@features/dashboard/views/DashboardView';

export type {
  DashboardViewProps,
  DashboardViewData,
  UseDashboardViewDataReturn,
} from '@features/dashboard/views/DashboardView';
