import type { UseDashboardViewDataReturn } from '@features/dashboard/views/DashboardView/useDashboardViewData';
import type { UseHistoryViewDataReturn, UserInfo as HistoryUserInfo } from '@features/history/views/useHistoryViewData';
import type { UseTrendsViewDataReturn, UserInfo as TrendsUserInfo, GroupMemberInfo } from '@features/analytics/views/TrendsView/useTrendsViewData';
import type { UseItemsViewDataReturn, UserInfo as ItemsUserInfo } from '@features/items/views/ItemsView/useItemsViewData';

export type {
  UseDashboardViewDataReturn,
  UseHistoryViewDataReturn,
  HistoryUserInfo,
  UseTrendsViewDataReturn,
  TrendsUserInfo,
  GroupMemberInfo,
  UseItemsViewDataReturn,
  ItemsUserInfo,
};

export interface ViewDataMap {
  dashboard: UseDashboardViewDataReturn;
  history: UseHistoryViewDataReturn;
  trends: UseTrendsViewDataReturn;
  items: UseItemsViewDataReturn;
}
