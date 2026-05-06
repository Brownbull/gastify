import { useTrendsViewData } from '@features/analytics/views/TrendsView/useTrendsViewData';
import type { UseTrendsViewDataReturn } from './types';
import { useMockData } from './MockDataProvider';

export function useTrendsData(): UseTrendsViewDataReturn {
  const mock = useMockData('trends');
  if (mock) return mock;
  return useTrendsViewData();
}
