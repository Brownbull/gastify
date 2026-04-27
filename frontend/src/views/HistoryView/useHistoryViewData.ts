/**
 * Re-export shim — useHistoryViewData moved to features/history/views/
 * Story 15b-1d: Consolidate features/history/
 *
 * Consumers: HistoryViewThumbnails.test.tsx (vi.mock + type + value imports)
 */
export { useHistoryViewData } from '@features/history/views/useHistoryViewData';
export type { UseHistoryViewDataReturn, UserInfo } from '@features/history/views/useHistoryViewData';
