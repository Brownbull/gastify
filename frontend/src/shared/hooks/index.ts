// Shared hooks used across multiple features

export { useToast, type ToastMessage, type ToastType } from './useToast';
export { useHistoryNavigation } from './useHistoryNavigation';
export * from './useHistoryFilters';
export { useHistoryFiltersInit } from './useHistoryFiltersInit';

// Dialog utility hooks
export { useBodyScrollLock } from './useBodyScrollLock';
export { useEscapeKey } from './useEscapeKey';
export { useFocusTrap } from './useFocusTrap';
