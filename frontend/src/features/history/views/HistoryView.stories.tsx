import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, fn } from 'storybook/test';
import { HistoryView } from './HistoryView';
import type { HistoryViewInitialState } from './HistoryView';
import { useHistoryFiltersInit } from '@shared/hooks';
import { historyFiltersActions } from '@/shared/stores/useHistoryFiltersStore';
import { Skeleton } from '@/design-system/atoms/Skeleton/Skeleton';
import { ErrorFallback } from '@/design-system/molecules/ErrorFallback/ErrorFallback';
import type { UseHistoryViewDataReturn } from './useHistoryViewData';
import type { Transaction } from '@/types/transaction';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState =
  | 'default'
  | 'empty'
  | 'loading'
  | 'error'
  | 'loading-more';

interface HistoryScreenArgs {
  platform: Platform;
  state: DataState;
  initialState?: HistoryViewInitialState;
  categoryFilter?: string;
}

const PLATFORM_WIDTH: Record<Platform, number | undefined> = {
  mobile: 390,
  tablet: 768,
  desktop: undefined,
};

const NOW = new Date();
const THIS_MONTH = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;

const makeTx = (
  partial: Partial<Transaction> & { merchant: string; total: number },
): Transaction => ({
  id: `tx-${partial.merchant.toLowerCase().replace(/\s+/g, '-')}-${partial.total}`,
  date: `${THIS_MONTH}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
  category: 'Supermarket',
  items: [],
  currency: 'CLP',
  country: 'CL',
  city: 'Santiago',
  ...partial,
});

const MOCK_TRANSACTIONS: Transaction[] = [
  makeTx({ merchant: 'Jumbo', total: 45200, category: 'Supermarket', date: `${THIS_MONTH}-15` }),
  makeTx({ merchant: 'Unimarc', total: 23100, category: 'Supermarket', date: `${THIS_MONTH}-14` }),
  makeTx({ merchant: 'Starbucks', total: 4800, category: 'Restaurant', date: `${THIS_MONTH}-13` }),
  makeTx({ merchant: 'Farmacia Cruz Verde', total: 12300, category: 'Pharmacy', date: `${THIS_MONTH}-12` }),
  makeTx({ merchant: 'Shell', total: 35000, category: 'GasStation', date: `${THIS_MONTH}-11` }),
  makeTx({ merchant: 'Lider', total: 67800, category: 'Supermarket', date: `${THIS_MONTH}-10` }),
  makeTx({ merchant: "McDonald's", total: 6500, category: 'Restaurant', date: `${THIS_MONTH}-09` }),
];

const baseCallbacks = {
  onEditTransaction: fn(),
};

const defaultOverrides: Partial<UseHistoryViewDataReturn> = {
  transactions: MOCK_TRANSACTIONS,
  allTransactions: MOCK_TRANSACTIONS,
  ...baseCallbacks,
};

const buildOverrides = (
  state: DataState,
): Partial<UseHistoryViewDataReturn> | undefined => {
  switch (state) {
    case 'empty':
      return { transactions: [], allTransactions: [], ...baseCallbacks };
    case 'loading-more':
      return {
        ...defaultOverrides,
        isLoadingMore: true,
        hasMore: true,
        isAtListenerLimit: true,
        loadMore: fn(),
      };
    case 'default':
      return defaultOverrides;
    case 'loading':
    case 'error':
      return undefined;
    default:
      return undefined;
  }
};

function HistoryScreen({ platform, state, initialState, categoryFilter }: HistoryScreenArgs) {
  useHistoryFiltersInit();

  React.useEffect(() => {
    if (categoryFilter) {
      historyFiltersActions.dispatch({
        type: 'SET_CATEGORY_FILTER',
        payload: { level: 'category', category: categoryFilter },
      });
    }
    return () => {
      historyFiltersActions.dispatch({ type: 'CLEAR_ALL_FILTERS' });
    };
  }, [categoryFilter]);

  const width = PLATFORM_WIDTH[platform];
  const wrapper = (children: React.ReactNode) => (
    <div
      style={{
        width: width ? `${width}px` : '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {children}
    </div>
  );

  if (state === 'loading') {
    return wrapper(<HistoryLoadingSkeleton />);
  }

  if (state === 'error') {
    return wrapper(
      <ErrorFallback
        error="No se pudieron cargar las transacciones. Por favor, verifica tu conexión."
        onRetry={fn()}
        onGoHome={fn()}
      />,
    );
  }

  const overrides = buildOverrides(state);
  return wrapper(
    <HistoryView
      _testOverrides={overrides}
      _initialState={initialState}
    />,
  );
}

function HistoryLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="history-loading">
      <div className="flex gap-2 mb-4">
        <Skeleton shape="text" width="100px" />
        <Skeleton shape="text" width="80px" />
        <Skeleton shape="text" width="60px" />
      </div>
      <Skeleton shape="text" width="100%" height="40px" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} shape="list-item" />
      ))}
    </div>
  );
}

const meta: Meta<HistoryScreenArgs> = {
  title: 'Screens/History',
  component: HistoryScreen,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    platform: {
      options: ['mobile', 'tablet', 'desktop'],
      control: { type: 'inline-radio' },
    },
    state: {
      options: ['default', 'empty', 'loading', 'error', 'loading-more'],
      control: { type: 'select' },
    },
  },
  args: { platform: 'mobile', state: 'default' },
};

export default meta;
type Story = StoryObj<HistoryScreenArgs>;

// ─── HIST-001/004: Mobile · Default ─────────────────────────────────────────

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('back-button')).toBeInTheDocument();
  },
};

// ─── HIST-002/005: Tablet · Default ─────────────────────────────────────────

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── HIST-003/006: Desktop · Default ────────────────────────────────────────

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── HIST-007: Mobile · Filtered ────────────────────────────────────────────

export const MobileFiltered: Story = {
  name: 'Mobile · Filtered',
  args: {
    platform: 'mobile',
    state: 'default',
    categoryFilter: 'Supermarket',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── HIST-008: Tablet · Filtered ────────────────────────────────────────────

export const TabletFiltered: Story = {
  name: 'Tablet · Filtered',
  args: {
    platform: 'tablet',
    state: 'default',
    categoryFilter: 'Supermarket',
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── HIST-009: Desktop · Filtered ───────────────────────────────────────────

export const DesktopFiltered: Story = {
  name: 'Desktop · Filtered',
  args: {
    platform: 'desktop',
    state: 'default',
    categoryFilter: 'Supermarket',
  },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── HIST-010: Mobile · Search Active ───────────────────────────────────────

export const MobileSearchActive: Story = {
  name: 'Mobile · Search Active',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: { searchQuery: 'Jumbo' },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/buscar/i);
    await expect(searchInput).toHaveValue('Jumbo');
  },
};

// ─── HIST-011: Tablet/Desktop · Search Active ───────────────────────────────

export const TabletDesktopSearchActive: Story = {
  name: 'Tablet · Search Active',
  args: {
    platform: 'tablet',
    state: 'default',
    initialState: { searchQuery: 'Starbucks' },
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText(/buscar|search/i);
    await expect(searchInput).toHaveValue('Starbucks');
  },
};

// ─── HIST-012: Mobile · Selection Mode ──────────────────────────────────────

export const MobileSelectionMode: Story = {
  name: 'Mobile · Selection Mode',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: {
      selectionIds: [MOCK_TRANSACTIONS[0].id!, MOCK_TRANSACTIONS[1].id!],
    },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('selection-bar')).toBeInTheDocument();
    await expect(canvas.getByTestId('selection-bar-delete')).toBeInTheDocument();
  },
};

// ─── HIST-013: Tablet/Desktop · Selection Mode ─────────────────────────────

export const TabletDesktopSelectionMode: Story = {
  name: 'Tablet · Selection Mode',
  args: {
    platform: 'tablet',
    state: 'default',
    initialState: {
      selectionIds: [MOCK_TRANSACTIONS[0].id!, MOCK_TRANSACTIONS[2].id!],
    },
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('selection-bar')).toBeInTheDocument();
  },
};

// ─── HIST-014: Mobile · Empty ───────────────────────────────────────────────

export const MobileEmpty: Story = {
  name: 'Mobile · Empty',
  args: { platform: 'mobile', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('empty-state')).toBeInTheDocument();
  },
};

// ─── HIST-015: Tablet · Empty ───────────────────────────────────────────────

export const TabletEmpty: Story = {
  name: 'Tablet · Empty',
  args: { platform: 'tablet', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('empty-state')).toBeInTheDocument();
  },
};

// ─── HIST-016: Desktop · Empty ──────────────────────────────────────────────

export const DesktopEmpty: Story = {
  name: 'Desktop · Empty',
  args: { platform: 'desktop', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('empty-state')).toBeInTheDocument();
  },
};

// ─── HIST-017: Mobile · Empty After Filter ──────────────────────────────────

export const MobileEmptyAfterFilter: Story = {
  name: 'Mobile · Empty After Filter',
  args: {
    platform: 'mobile',
    state: 'default',
    categoryFilter: 'NonExistentCategory',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('empty-filter-state')).toBeInTheDocument();
  },
};

// ─── HIST-018: Tablet/Desktop · Empty After Filter ──────────────────────────

export const TabletDesktopEmptyAfterFilter: Story = {
  name: 'Tablet · Empty After Filter',
  args: {
    platform: 'tablet',
    state: 'default',
    categoryFilter: 'NonExistentCategory',
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('empty-filter-state')).toBeInTheDocument();
  },
};

// ─── HIST-019: Mobile · Loading ─────────────────────────────────────────────

export const MobileLoading: Story = {
  name: 'Mobile · Loading',
  args: { platform: 'mobile', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('history-loading')).toBeInTheDocument();
  },
};

// ─── HIST-020: Tablet/Desktop · Loading ─────────────────────────────────────

export const TabletDesktopLoading: Story = {
  name: 'Tablet · Loading',
  args: { platform: 'tablet', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('history-loading')).toBeInTheDocument();
  },
};

// ─── HIST-021: Mobile · Loading More ────────────────────────────────────────

export const MobileLoadingMore: Story = {
  name: 'Mobile · Loading More',
  args: { platform: 'mobile', state: 'loading-more' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('load-more-transactions')).toBeInTheDocument();
    await expect(canvas.getByText('Cargando...')).toBeInTheDocument();
    await expect(canvas.getByText('Jumbo')).toBeInTheDocument();
  },
};

// ─── HIST-022: Tablet/Desktop · Loading More ────────────────────────────────

export const TabletDesktopLoadingMore: Story = {
  name: 'Tablet · Loading More',
  args: { platform: 'tablet', state: 'loading-more' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('load-more-transactions')).toBeInTheDocument();
    await expect(canvas.getByText('Cargando...')).toBeInTheDocument();
  },
};

// ─── HIST-023: Mobile · Server Error ────────────────────────────────────────

export const MobileError: Story = {
  name: 'Mobile · Server Error',
  args: { platform: 'mobile', state: 'error' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  },
};

// ─── HIST-024: Tablet · Server Error ────────────────────────────────────────

export const TabletError: Story = {
  name: 'Tablet · Server Error',
  args: { platform: 'tablet', state: 'error' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    await expect(canvas.getByRole('alert')).toBeInTheDocument();
  },
};

// ─── HIST-025: Desktop · Server Error ───────────────────────────────────────

export const DesktopError: Story = {
  name: 'Desktop · Server Error',
  args: { platform: 'desktop', state: 'error' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    await expect(canvas.getByRole('alert')).toBeInTheDocument();
  },
};

// ─── HIST-026: Mobile · Group Mode ──────────────────────────────────────────
// Blocked: isGroupMode is in UseHistoryViewDataReturn but HistoryView does not
// yet consume it for visual grouping by category. Requires component work.

export const MobileGroupMode: Story = {
  name: 'Mobile · Group Mode (blocked)',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── HIST-027: Tablet/Desktop · Group Mode ──────────────────────────────────
// Blocked: same as HIST-026.

export const TabletDesktopGroupMode: Story = {
  name: 'Tablet · Group Mode (blocked)',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── HIST-028: Mobile · Sort Changed ────────────────────────────────────────

export const MobileSortChanged: Story = {
  name: 'Mobile · Sort Changed',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: { sortBy: 'total', sortDirection: 'desc' },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── HIST-029: Tablet/Desktop · Sort Changed ────────────────────────────────

export const TabletDesktopSortChanged: Story = {
  name: 'Tablet · Sort Changed',
  args: {
    platform: 'tablet',
    state: 'default',
    initialState: { sortBy: 'total', sortDirection: 'desc' },
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── HIST-030: Mobile · Page Size 60 ────────────────────────────────────────

export const MobilePageSize60: Story = {
  name: 'Mobile · Page Size 60',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: { pageSize: 60 },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('page-size-60')).toBeInTheDocument();
  },
};

// ─── HIST-031: Tablet/Desktop · Page Size 60 ────────────────────────────────

export const TabletDesktopPageSize60: Story = {
  name: 'Tablet · Page Size 60',
  args: {
    platform: 'tablet',
    state: 'default',
    initialState: { pageSize: 60 },
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('page-size-60')).toBeInTheDocument();
  },
};

// ─── HIST-032: Drill-down from Dashboard ────────────────────────────────────
// Cross-feature interactivity: Dashboard category-card click navigates to
// /history?category=X. This story seeds the category filter to simulate that.

export const DrillDownFromDashboard: Story = {
  name: 'Mobile · Drill-down from Dashboard',
  args: {
    platform: 'mobile',
    state: 'default',
    categoryFilter: 'Restaurant',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
