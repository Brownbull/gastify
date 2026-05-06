import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, fn } from 'storybook/test';
import { DashboardView } from './DashboardView';
import { useHistoryFiltersInit } from '@shared/hooks';
import { Skeleton } from '@/design-system/atoms/Skeleton/Skeleton';
import { ErrorFallback } from '@/design-system/molecules/ErrorFallback/ErrorFallback';
import type { UseDashboardViewDataReturn } from './useDashboardViewData';
import type { Transaction } from '@/types/transaction';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState =
  | 'default'
  | 'empty'
  | 'loading'
  | 'error'
  | 'recent-scan'
  | 'concentration-flag';

interface DashboardScreenArgs {
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

const makeTx = (partial: Partial<Transaction> & { merchant: string; total: number }): Transaction => ({
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
  makeTx({ merchant: 'Lider', total: 67800, category: 'Supermarket', date: `${THIS_MONTH}-10` }),
  makeTx({ merchant: 'McDonald\'s', total: 6500, category: 'Restaurant', date: `${THIS_MONTH}-09` }),
];

const MOCK_RECENT_SCANS: Transaction[] = [
  makeTx({ merchant: 'Santa Isabel', total: 28900, category: 'Supermarket', date: `${THIS_MONTH}-15` }),
  makeTx({ merchant: 'Copec', total: 42000, category: 'GasStation', date: `${THIS_MONTH}-14` }),
];

const buildOverrides = (
  state: DataState,
): Partial<UseDashboardViewDataReturn> | undefined => {
  const baseCallbacks = {
    onCreateNew: fn(),
    onViewTrends: fn(),
    onEditTransaction: fn(),
    onTriggerScan: fn(),
    onViewRecentScans: fn(),
  };

  switch (state) {
    case 'empty':
      return {
        transactions: [],
        allTransactions: [],
        recentScans: [],
        ...baseCallbacks,
      };
    case 'recent-scan':
      return {
        transactions: MOCK_TRANSACTIONS,
        allTransactions: MOCK_TRANSACTIONS,
        recentScans: [...MOCK_RECENT_SCANS, ...MOCK_TRANSACTIONS.slice(0, 3)],
        ...baseCallbacks,
      };
    case 'default':
      return {
        transactions: MOCK_TRANSACTIONS,
        allTransactions: MOCK_TRANSACTIONS,
        recentScans: MOCK_TRANSACTIONS.slice(0, 3),
        ...baseCallbacks,
      };
    case 'loading':
    case 'error':
    case 'concentration-flag':
      return undefined;
    default:
      return undefined;
  }
};

function DashboardScreen({ platform, state }: DashboardScreenArgs) {
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
    return wrapper(<DashboardLoadingSkeleton />);
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
    overrides ? <DashboardView _testOverrides={overrides} /> : <DashboardView />,
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-2 p-4" data-testid="dashboard-loading">
      <Skeleton shape="card" height="320px" />
      <div className="flex gap-2">
        <Skeleton shape="text" width="120px" />
        <Skeleton shape="text" width="80px" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} shape="list-item" />
      ))}
    </div>
  );
}

const meta: Meta<DashboardScreenArgs> = {
  title: 'Screens/Dashboard',
  component: DashboardScreen,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    platform: {
      options: ['mobile', 'tablet', 'desktop'],
      control: { type: 'inline-radio' },
    },
    state: {
      options: ['default', 'empty', 'loading', 'error', 'recent-scan', 'concentration-flag'],
      control: { type: 'select' },
    },
  },
  args: { platform: 'mobile', state: 'default' },
};

export default meta;
type Story = StoryObj<DashboardScreenArgs>;

// ─── DASH-001/004: Mobile · Default (shell + default state) ─────────────────

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
    await expect(canvas.getByTestId('carousel-content')).toBeInTheDocument();
  },
};

// ─── DASH-002/005: Tablet · Default (shell + default state) ─────────────────

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
  },
};

// ─── DASH-003/006: Desktop · Default (shell + default state) ────────────────

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
  },
};

// ─── DASH-007: Mobile · Empty ───────────────────────────────────────────────

export const MobileEmpty: Story = {
  name: 'Mobile · Empty',
  args: { platform: 'mobile', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
  },
};

// ─── DASH-008: Tablet · Empty ───────────────────────────────────────────────

export const TabletEmpty: Story = {
  name: 'Tablet · Empty',
  args: { platform: 'tablet', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
  },
};

// ─── DASH-009: Desktop · Empty ──────────────────────────────────────────────

export const DesktopEmpty: Story = {
  name: 'Desktop · Empty',
  args: { platform: 'desktop', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
  },
};

// ─── DASH-010: Mobile · Loading ─────────────────────────────────────────────

export const MobileLoading: Story = {
  name: 'Mobile · Loading',
  args: { platform: 'mobile', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── DASH-011: Tablet · Loading ─────────────────────────────────────────────

export const TabletLoading: Story = {
  name: 'Tablet · Loading',
  args: { platform: 'tablet', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── DASH-012: Desktop · Loading ────────────────────────────────────────────

export const DesktopLoading: Story = {
  name: 'Desktop · Loading',
  args: { platform: 'desktop', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── DASH-013: Mobile · Server Error ────────────────────────────────────────

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

// ─── DASH-014: Tablet/Desktop · Server Error ────────────────────────────────

export const TabletDesktopError: Story = {
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

// ─── DASH-015: Mobile · With Recent Scan ────────────────────────────────────

export const MobileRecentScan: Story = {
  name: 'Mobile · Recent Scan',
  args: { platform: 'mobile', state: 'recent-scan' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
  },
};

// ─── DASH-016: Tablet/Desktop · With Recent Scan ────────────────────────────

export const TabletDesktopRecentScan: Story = {
  name: 'Tablet · Recent Scan',
  args: { platform: 'tablet', state: 'recent-scan' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('carousel-card')).toBeInTheDocument();
  },
};

// ─── DASH-017: Mobile · Concentration Flag ──────────────────────────────────
// Blocked: DashboardView does not yet have a concentration banner component.
// Requires component work before story can be implemented.

export const MobileConcentrationFlag: Story = {
  name: 'Mobile · Concentration Flag',
  args: { platform: 'mobile', state: 'concentration-flag' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
