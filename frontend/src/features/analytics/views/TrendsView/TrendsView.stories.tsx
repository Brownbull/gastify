import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, fn } from 'storybook/test';
import { TrendsView } from './TrendsView';
import type { TrendsViewInitialState } from './TrendsView';
import { useHistoryFiltersInit } from '@shared/hooks';
import { Skeleton } from '@/design-system/atoms/Skeleton/Skeleton';
import { ErrorFallback } from '@/design-system/molecules/ErrorFallback/ErrorFallback';
import type { TrendsViewData } from './useTrendsViewData';
import type { Transaction } from '@/types/transaction';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState =
  | 'default'
  | 'empty'
  | 'loading'
  | 'error';

interface TrendsScreenArgs {
  platform: Platform;
  state: DataState;
  initialState?: TrendsViewInitialState;
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

const buildOverrides = (
  state: DataState,
): Partial<TrendsViewData> | undefined => {
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

function TrendsScreen({ platform, state, initialState }: TrendsScreenArgs) {
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
    return wrapper(<TrendsLoadingSkeleton />);
  }

  if (state === 'error') {
    return wrapper(
      <ErrorFallback
        error="No se pudieron cargar los datos analíticos. Por favor, verifica tu conexión."
        onRetry={fn()}
        onGoHome={fn()}
      />,
    );
  }

  const overrides = buildOverrides(state);
  return wrapper(
    overrides
      ? <TrendsView _testOverrides={overrides} _initialState={initialState} />
      : <TrendsView _initialState={initialState} />,
  );
}

function TrendsLoadingSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="trends-loading">
      <Skeleton shape="text" width="200px" height="28px" />
      <Skeleton shape="card" height="280px" />
      <div className="flex gap-2">
        <Skeleton shape="text" width="100px" />
        <Skeleton shape="text" width="100px" />
        <Skeleton shape="text" width="100px" />
      </div>
      <Skeleton shape="rect" height="200px" />
    </div>
  );
}

const meta: Meta<TrendsScreenArgs> = {
  title: 'Screens/Trends',
  component: TrendsScreen,
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
type Story = StoryObj<TrendsScreenArgs>;

// ─── TREND-001/004: Mobile · Default ────────────────────────────────────────

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-card')).toBeInTheDocument();
    await expect(canvas.getByTestId('carousel-content')).toBeInTheDocument();
    await expect(canvas.getByTestId('time-pills-container')).toBeInTheDocument();
  },
};

// ─── TREND-002/005: Tablet · Default ────────────────────────────────────────

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-card')).toBeInTheDocument();
    await expect(canvas.getByTestId('carousel-content')).toBeInTheDocument();
  },
};

// ─── TREND-003/006: Desktop · Default ───────────────────────────────────────

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-card')).toBeInTheDocument();
    await expect(canvas.getByTestId('carousel-content')).toBeInTheDocument();
  },
};

// ─── TREND-007: Mobile · Drill Temporal ─────────────────────────────────────

export const MobileDrillTemporal: Story = {
  name: 'Mobile · Drill Temporal',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pillsContainer = canvas.getByTestId('time-pills-container');
    await expect(pillsContainer).toBeInTheDocument();
    const periodLabel = canvas.getByTestId('period-label');
    await expect(periodLabel).toBeInTheDocument();
    const quarterPill = canvas.getByTestId('time-pill-quarter');
    await quarterPill.click();
    await expect(canvas.getByTestId('period-label')).toBeInTheDocument();
  },
};

// ─── TREND-008: Tablet/Desktop · Drill Temporal ─────────────────────────────

export const TabletDesktopDrillTemporal: Story = {
  name: 'Tablet · Drill Temporal',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const yearPill = canvas.getByTestId('time-pill-year');
    await yearPill.click();
    await expect(canvas.getByTestId('period-label')).toBeInTheDocument();
  },
};

// ─── TREND-009: Mobile · Drill Category ─────────────────────────────────────

export const MobileDrillCategory: Story = {
  name: 'Mobile · Drill Category',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('treemap-grid')).toBeInTheDocument();
    const supermarketCell = canvas.getByTestId('treemap-cell-supermarket');
    await expect(supermarketCell).toBeInTheDocument();
  },
};

// ─── TREND-010: Tablet/Desktop · Drill Category ────────────────────────────

export const TabletDesktopDrillCategory: Story = {
  name: 'Tablet · Drill Category',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('treemap-grid')).toBeInTheDocument();
    const supermarketCell = canvas.getByTestId('treemap-cell-supermarket');
    await expect(supermarketCell).toBeInTheDocument();
  },
};

// ─── TREND-011: Mobile · Chart Aggregation ──────────────────────────────────

export const MobileChartAggregation: Story = {
  name: 'Mobile · Chart Aggregation',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const countToggle = canvas.getByTestId('count-mode-toggle');
    await expect(countToggle).toBeInTheDocument();
    await countToggle.click();
  },
};

// ─── TREND-012: Tablet/Desktop · Chart Aggregation ──────────────────────────

export const TabletDesktopChartAggregation: Story = {
  name: 'Tablet · Chart Aggregation',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const countToggle = canvas.getByTestId('count-mode-toggle');
    await expect(countToggle).toBeInTheDocument();
  },
};

// ─── TREND-013: Mobile · Chart Comparison ───────────────────────────────────

export const MobileChartComparison: Story = {
  name: 'Mobile · Chart Comparison',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: { carouselSlide: 1 },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trend-list')).toBeInTheDocument();
    await expect(canvas.getByTestId('trend-viewmode-title')).toBeInTheDocument();
  },
};

// ─── TREND-014: Tablet/Desktop · Chart Comparison ──────────────────────────

export const TabletDesktopChartComparison: Story = {
  name: 'Tablet · Chart Comparison',
  args: {
    platform: 'tablet',
    state: 'default',
    initialState: { carouselSlide: 1 },
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trend-list')).toBeInTheDocument();
  },
};

// ─── TREND-015: Mobile · View Treemap ───────────────────────────────────────

export const MobileViewTreemap: Story = {
  name: 'Mobile · View Treemap',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: { distributionView: 'treemap', carouselSlide: 0 },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('treemap-grid')).toBeInTheDocument();
    await expect(canvas.getByTestId('treemap-viewmode-title')).toBeInTheDocument();
  },
};

// ─── TREND-016: Mobile · View Donut ─────────────────────────────────────────

export const MobileViewDonut: Story = {
  name: 'Mobile · View Donut',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: { distributionView: 'donut', carouselSlide: 0 },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('donut-view')).toBeInTheDocument();
    await expect(canvas.getByTestId('donut-viewmode-title')).toBeInTheDocument();
  },
};

// ─── TREND-017: Tablet/Desktop · View Donut ─────────────────────────────────

export const TabletDesktopViewDonut: Story = {
  name: 'Tablet · View Donut',
  args: {
    platform: 'tablet',
    state: 'default',
    initialState: { distributionView: 'donut', carouselSlide: 0 },
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('donut-view')).toBeInTheDocument();
  },
};

// ─── TREND-018: Mobile · View Sankey ────────────────────────────────────────

export const MobileViewSankey: Story = {
  name: 'Mobile · View Sankey',
  args: {
    platform: 'mobile',
    state: 'default',
    initialState: { carouselSlide: 1, tendenciaView: 'sankey' },
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('sankey-view')).toBeInTheDocument();
    await expect(canvas.getByTestId('sankey-title-area')).toBeInTheDocument();
  },
};

// ─── TREND-019: Tablet/Desktop · View Sankey ────────────────────────────────

export const TabletDesktopViewSankey: Story = {
  name: 'Tablet · View Sankey',
  args: {
    platform: 'tablet',
    state: 'default',
    initialState: { carouselSlide: 1, tendenciaView: 'sankey' },
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('sankey-view')).toBeInTheDocument();
  },
};

// ─── TREND-020: Mobile · View Bump ──────────────────────────────────────────
// Blocked: Bump chart view type does not exist in the codebase.
// DistributionView = 'treemap' | 'donut'; TendenciaView = 'list' | 'sankey'.

export const MobileViewBump: Story = {
  name: 'Mobile · View Bump (blocked)',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── TREND-021: Tablet/Desktop · View Bump ──────────────────────────────────

export const TabletDesktopViewBump: Story = {
  name: 'Tablet · View Bump (blocked)',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── TREND-022: Mobile · View Radar ─────────────────────────────────────────
// Blocked: Radar chart view type does not exist in the codebase.

export const MobileViewRadar: Story = {
  name: 'Mobile · View Radar (blocked)',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── TREND-023: Tablet/Desktop · View Radar ─────────────────────────────────

export const TabletDesktopViewRadar: Story = {
  name: 'Tablet · View Radar (blocked)',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── TREND-024: Mobile · Empty ──────────────────────────────────────────────

export const MobileEmpty: Story = {
  name: 'Mobile · Empty',
  args: { platform: 'mobile', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-card')).toBeInTheDocument();
  },
};

// ─── TREND-025: Tablet · Empty ──────────────────────────────────────────────

export const TabletEmpty: Story = {
  name: 'Tablet · Empty',
  args: { platform: 'tablet', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-card')).toBeInTheDocument();
  },
};

// ─── TREND-026: Desktop · Empty ─────────────────────────────────────────────

export const DesktopEmpty: Story = {
  name: 'Desktop · Empty',
  args: { platform: 'desktop', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-card')).toBeInTheDocument();
  },
};

// ─── TREND-027: Mobile · Server Error ───────────────────────────────────────

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

// ─── TREND-028: Tablet/Desktop · Server Error ───────────────────────────────

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

// ─── TREND-029: Mobile · Loading ────────────────────────────────────────────

export const MobileLoading: Story = {
  name: 'Mobile · Loading',
  args: { platform: 'mobile', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trends-loading')).toBeInTheDocument();
  },
};

// ─── TREND-030: Tablet/Desktop · Loading ────────────────────────────────────

export const TabletDesktopLoading: Story = {
  name: 'Tablet · Loading',
  args: { platform: 'tablet', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trends-loading')).toBeInTheDocument();
  },
};

// ─── TREND-031: Treemap Drill-down → History ────────────────────────────────
// Cross-feature interactivity requiring navigation from TrendsView treemap
// segment click to History with pre-filled category filter. Verifies the
// treemap renders clickable cells that would trigger navigation.

export const DrillDownToHistory: Story = {
  name: 'Mobile · Drill-down to History',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('treemap-grid')).toBeInTheDocument();
    const supermarketCell = canvas.getByTestId('treemap-cell-supermarket');
    await expect(supermarketCell).toBeInTheDocument();
  },
};
