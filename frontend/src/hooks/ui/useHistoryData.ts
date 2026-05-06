import { useHistoryViewData } from '@features/history/views/useHistoryViewData';
import type { UseHistoryViewDataReturn } from './types';
import { useMockData } from './MockDataProvider';

export function useHistoryData(): UseHistoryViewDataReturn {
  const mock = useMockData('history');
  if (mock) return mock;
  return useHistoryViewData();
}
