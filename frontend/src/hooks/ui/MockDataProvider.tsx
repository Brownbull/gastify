import { createContext, useContext, type ReactNode } from 'react';
import type {
  UseDashboardViewDataReturn,
  UseHistoryViewDataReturn,
  UseTrendsViewDataReturn,
  UseItemsViewDataReturn,
} from './types';

interface MockDataContextValue {
  dashboard?: UseDashboardViewDataReturn;
  history?: UseHistoryViewDataReturn;
  trends?: UseTrendsViewDataReturn;
  items?: UseItemsViewDataReturn;
}

const MockDataContext = createContext<MockDataContextValue | null>(null);

export function useMockData<K extends keyof MockDataContextValue>(
  view: K,
): MockDataContextValue[K] | undefined {
  const ctx = useContext(MockDataContext);
  return ctx?.[view];
}

export function useMockDataContext(): MockDataContextValue | null {
  return useContext(MockDataContext);
}

interface MockDataProviderProps {
  children: ReactNode;
  data: MockDataContextValue;
}

export function MockDataProvider({ children, data }: MockDataProviderProps) {
  return (
    <MockDataContext.Provider value={data}>
      {children}
    </MockDataContext.Provider>
  );
}
