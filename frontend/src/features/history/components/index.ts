/**
 * History Components - Barrel Export
 *
 * Story 9.19: History Transaction Filters
 * Story 14.14: Transaction List Redesign
 * Story 14.15b: TransactionCard consolidated to transactions/ folder
 */

export { HistoryFilterBar } from './HistoryFilterBar';
export { TemporalFilterDropdown } from './TemporalFilterDropdown';
export { CategoryFilterDropdown } from './CategoryFilterDropdown';
export { LocationFilterDropdown } from './LocationFilterDropdown';

// Story 14.15b: LEGACY TransactionCard - views that import from here will continue to work
// This is the original component with individual props interface
export { TransactionCard } from './TransactionCard';
export type { TransactionCardProps, TransactionItem } from './TransactionCard';

// Story 14.15b: NEW consolidated TransactionCard in transactions/ folder
// Views should migrate to use this new simplified interface via:
// import { TransactionCard } from '../components/transactions';
// The new component accepts a Transaction object directly instead of individual props
export { DateGroupHeader, groupTransactionsByDate, formatDateGroupLabel, calculateGroupTotal } from './DateGroupHeader';
export type { DateGroupHeaderProps } from './DateGroupHeader';
export { FilterChips } from './FilterChips';
export type { FilterChipsProps } from './FilterChips';
// Story 14.14: Icon-based filter UI
export { IconFilterBar } from './IconFilterBar';
export { TimeBreadcrumb } from './TimeBreadcrumb';
export { TemporalBreadcrumb } from './TemporalBreadcrumb';
export { SearchBar } from './SearchBar';
// Story 14.15: Selection mode components
export { SelectionBar } from './SelectionBar';
export type { SelectionBarProps } from './SelectionBar';
export { DeleteTransactionsModal } from './DeleteTransactionsModal';
export type { DeleteTransactionsModalProps, TransactionPreview } from './DeleteTransactionsModal';
// Story 14.31 Session 3: Sort control for ItemsView and HistoryView
export { SortControl } from './SortControl';
export type { SortControlProps, SortOption } from './SortControl';
export { CountryFlag } from './CountryFlag';
export type { FlagSize } from './CountryFlag';
// Story 15b-2c: Extracted sub-components from HistoryView
export { HistoryHeader } from './HistoryHeader';
export type { HistoryHeaderProps } from './HistoryHeader';
export { HistoryPagination } from './HistoryPagination';
export type { HistoryPaginationProps } from './HistoryPagination';
export { HistoryEmptyStates } from './HistoryEmptyStates';
export type { HistoryEmptyStatesProps } from './HistoryEmptyStates';
