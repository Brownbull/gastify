import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, fn } from 'storybook/test';
import { ItemsView } from './ItemsView';
import { useHistoryFiltersInit } from '@shared/hooks';
import { Skeleton } from '@/design-system/atoms/Skeleton/Skeleton';
import { ErrorFallback } from '@/design-system/molecules/ErrorFallback/ErrorFallback';
import type { UseItemsViewDataReturn } from './useItemsViewData';
import type { Transaction } from '@/types/transaction';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState =
  | 'default'
  | 'empty'
  | 'loading'
  | 'error';

interface ItemsScreenArgs {
  platform: Platform;
  state: DataState;
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
  id: `tx-${Math.random().toString(36).slice(2, 8)}`,
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
];

const baseCallbacks = {
  onEditTransaction: fn(),
};

const buildOverrides = (
  state: DataState,
): Partial<UseItemsViewDataReturn> | undefined => {
  switch (state) {
    case 'empty':
      return { transactions: [], ...baseCallbacks };
    case 'default':
      return { transactions: MOCK_TRANSACTIONS, ...baseCallbacks };
    case 'loading':
    case 'error':
      return undefined;
    default:
      return undefined;
  }
};

function ItemsScreen({ platform, state }: ItemsScreenArgs) {
  useHistoryFiltersInit();
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
    return wrapper(<ItemsLoadingSkeleton />);
  }

  if (state === 'error') {
    return wrapper(
      <ErrorFallback
        error="No se pudieron cargar los artículos. Por favor, verifica tu conexión."
        onRetry={fn()}
        onGoHome={fn()}
      />,
    );
  }

  const overrides = buildOverrides(state);
  return wrapper(
    overrides ? <ItemsView _testOverrides={overrides} /> : <ItemsView />,
  );
}

function ItemsLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="items-loading">
      <Skeleton shape="text" width="180px" height="28px" />
      <div className="flex gap-2">
        <Skeleton shape="text" width="100px" />
        <Skeleton shape="text" width="80px" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} shape="list-item" />
      ))}
    </div>
  );
}

const meta: Meta<ItemsScreenArgs> = {
  title: 'Screens/Items',
  component: ItemsScreen,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    platform: {
      options: ['mobile', 'tablet', 'desktop'],
      control: { type: 'inline-radio' },
    },
    state: {
      options: ['default', 'empty', 'loading', 'error'],
      control: { type: 'select' },
    },
  },
  args: { platform: 'mobile', state: 'default' },
};

export default meta;
type Story = StoryObj<ItemsScreenArgs>;

// ─── ITEM-001/004: Mobile · Default ─────────────────────────────────────────

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── ITEM-002/005: Tablet · Default ─────────────────────────────────────────

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── ITEM-003/006: Desktop · Default ────────────────────────────────────────

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── ITEM-014: Mobile · Empty ───────────────────────────────────────────────

export const MobileEmpty: Story = {
  name: 'Mobile · Empty',
  args: { platform: 'mobile', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── ITEM-015: Tablet · Empty ───────────────────────────────────────────────

export const TabletEmpty: Story = {
  name: 'Tablet · Empty',
  args: { platform: 'tablet', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── ITEM-016: Desktop · Empty ──────────────────────────────────────────────

export const DesktopEmpty: Story = {
  name: 'Desktop · Empty',
  args: { platform: 'desktop', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── ITEM-007: Mobile · Filtered ────────────────────────────────────────────
// Blocked: Filter state is internal. Story renders default data.

export const MobileFiltered: Story = {
  name: 'Mobile · Filtered',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── ITEM-008: Tablet · Filtered ────────────────────────────────────────────

export const TabletFiltered: Story = {
  name: 'Tablet · Filtered',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── ITEM-009: Desktop · Filtered ───────────────────────────────────────────

export const DesktopFiltered: Story = {
  name: 'Desktop · Filtered',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── ITEM-010: Mobile · Sort Changed ────────────────────────────────────────
// Blocked: Sort state is internal useState.

export const MobileSortChanged: Story = {
  name: 'Mobile · Sort Changed',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── ITEM-011: Tablet/Desktop · Sort Changed ────────────────────────────────

export const TabletDesktopSortChanged: Story = {
  name: 'Tablet · Sort Changed',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── ITEM-012: Mobile · Search Active ───────────────────────────────────────
// Blocked: Search query is internal useState.

export const MobileSearchActive: Story = {
  name: 'Mobile · Search Active',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── ITEM-013: Tablet/Desktop · Search Active ───────────────────────────────

export const TabletDesktopSearchActive: Story = {
  name: 'Tablet · Search Active',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── ITEM-017: Mobile · Loading Next Page ───────────────────────────────────
// Blocked: Items view doesn't expose isLoadingMore via _testOverrides.
// Renders default data as placeholder.

export const MobileLoadingNextPage: Story = {
  name: 'Mobile · Loading Next Page',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── ITEM-018: Tablet/Desktop · Loading Next Page ───────────────────────────

export const TabletDesktopLoadingNextPage: Story = {
  name: 'Tablet · Loading Next Page',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── ITEM-019: Mobile · Server Error ────────────────────────────────────────

export const MobileError: Story = {
  name: 'Mobile · Server Error',
  args: { platform: 'mobile', state: 'error' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryBtn = canvas.getByRole('button', { name: /reintentar/i });
    await expect(retryBtn).toBeInTheDocument();
  },
};

// ─── ITEM-020: Tablet · Server Error ────────────────────────────────────────

export const TabletError: Story = {
  name: 'Tablet · Server Error',
  args: { platform: 'tablet', state: 'error' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryBtn = canvas.getByRole('button', { name: /reintentar/i });
    await expect(retryBtn).toBeInTheDocument();
    await expect(canvas.getByRole('alert')).toBeInTheDocument();
  },
};

// ─── ITEM-021: Desktop · Server Error ───────────────────────────────────────

export const DesktopError: Story = {
  name: 'Desktop · Server Error',
  args: { platform: 'desktop', state: 'error' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryBtn = canvas.getByRole('button', { name: /reintentar/i });
    await expect(retryBtn).toBeInTheDocument();
    await expect(canvas.getByRole('alert')).toBeInTheDocument();
  },
};
