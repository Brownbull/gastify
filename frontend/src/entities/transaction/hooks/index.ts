/**
 * Transaction Entity Hooks
 *
 * Re-exports transaction-related hooks to provide a clean public API.
 *
 * Story 14e-19: Transaction Entity Foundation
 * Hooks remain in src/hooks/ (their original location) but are
 * re-exported here for consumers who want to import from the entity.
 *
 * Usage:
 *   import { useTransactions } from '@entities/transaction';
 *   // or
 *   import { useTransactions } from '@entities/transaction/hooks';
 */

// Main subscription hook - real-time transactions with React Query
export { useTransactions } from '../../../hooks/useTransactions';

// Paginated transactions for large datasets
export { usePaginatedTransactions } from '../../../hooks/usePaginatedTransactions';

// Single transaction access
export { useActiveTransaction } from '../../../hooks/useActiveTransaction';

// Analytics-optimized transaction access
export { useAnalyticsTransactions } from '@features/analytics/hooks/useAnalyticsTransactions';
