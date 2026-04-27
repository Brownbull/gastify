/**
 * useTrendsViewData Re-export Shim
 *
 * Story 15b-1a: Backward compatibility shim.
 * Canonical location: @features/analytics/views/TrendsView/useTrendsViewData
 *
 * 3 external test mocks depend on this deep path via vi.mock().
 */

export {
  useTrendsViewData,
} from '@features/analytics/views/TrendsView/useTrendsViewData';

export type {
  UserInfo,
  GroupMemberInfo,
  UseTrendsViewDataReturn,
  TrendsViewData,
} from '@features/analytics/views/TrendsView/useTrendsViewData';
