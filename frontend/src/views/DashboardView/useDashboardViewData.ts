/**
 * useDashboardViewData Re-export Shim
 *
 * Story 15b-1b: Backward compatibility shim.
 * Canonical location: @features/dashboard/views/DashboardView/useDashboardViewData
 *
 * DashboardView.test.tsx uses vi.mock() on this deep path.
 */

export {
  useDashboardViewData,
} from '@features/dashboard/views/DashboardView/useDashboardViewData';

export type {
  UseDashboardViewDataReturn,
  DashboardViewData,
} from '@features/dashboard/views/DashboardView/useDashboardViewData';
