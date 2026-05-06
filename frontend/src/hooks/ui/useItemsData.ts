import { useItemsViewData } from '@features/items/views/ItemsView/useItemsViewData';
import type { UseItemsViewDataReturn } from './types';
import { useMockData } from './MockDataProvider';

export function useItemsData(): UseItemsViewDataReturn {
  const mock = useMockData('items');
  if (mock) return mock;
  return useItemsViewData();
}
