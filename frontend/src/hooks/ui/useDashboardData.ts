import { useDashboardViewData } from '@features/dashboard/views/DashboardView/useDashboardViewData';
import type { UseDashboardViewDataReturn } from './types';
import { useMockData } from './MockDataProvider';

export function useDashboardData(): UseDashboardViewDataReturn {
  const mock = useMockData('dashboard');
  if (mock) return mock;
  return useDashboardViewData();
}
