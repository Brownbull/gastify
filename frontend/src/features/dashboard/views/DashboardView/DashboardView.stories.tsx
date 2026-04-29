// Phase 6 milestone story — `Screens/Dashboard`.
//
// Pattern (mirrors the sibling Storybook setup): platform + state as args, with
// pre-baked named stories for the common (platform × state) combinations.
// Drilling into any story exposes the args panel below for live tweaking.

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardView } from './DashboardView';
import { useHistoryFiltersInit } from '@shared/hooks';
import type { UseDashboardViewDataReturn } from './useDashboardViewData';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState = 'default' | 'empty' | 'loading' | 'error';

interface DashboardScreenArgs {
  /** Platform width frame (constrains story width; viewport toolbar still works). */
  platform: Platform;
  /** Data state — default uses mocked Firestore seed; empty/loading/error inject _testOverrides. */
  state: DataState;
}

// Width caps mirror the .storybook/preview.tsx viewport presets.
const PLATFORM_WIDTH: Record<Platform, number | undefined> = {
  mobile: 390,
  tablet: 768,
  desktop: undefined, // full iframe width
};

const buildOverrides = (
  state: DataState,
): Partial<UseDashboardViewDataReturn> | undefined => {
  switch (state) {
    case 'empty':
      return { transactions: [], allTransactions: [], recentScans: [] };
    case 'loading':
    case 'error':
      // Placeholder — DashboardView's loading + error UI shape is wired off
      // useDashboardViewData hook internals; revisit when we have an explicit
      // loading/error contract on the hook return type.
      return undefined;
    case 'default':
    default:
      return undefined;
  }
};

const DashboardScreen: React.FC<DashboardScreenArgs> = ({ platform, state }) => {
  useHistoryFiltersInit();
  const overrides = buildOverrides(state);
  const width = PLATFORM_WIDTH[platform];
  return (
    <div
      style={{
        width: width ? `${width}px` : '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {overrides ? <DashboardView _testOverrides={overrides} /> : <DashboardView />}
    </div>
  );
};

const meta: Meta<DashboardScreenArgs> = {
  title: 'Screens/Dashboard',
  component: DashboardScreen,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    platform: {
      name: 'Platform',
      description: 'Viewport-frame width (mobile 390 / tablet 768 / desktop fluid).',
      options: ['mobile', 'tablet', 'desktop'],
      control: { type: 'inline-radio' },
    },
    state: {
      name: 'Data state',
      description: 'Hook-data shape injected into DashboardView via _testOverrides.',
      options: ['default', 'empty', 'loading', 'error'],
      control: { type: 'select' },
    },
  },
  args: {
    platform: 'mobile',
    state: 'default',
  },
};

export default meta;
type Story = StoryObj<DashboardScreenArgs>;

// ─── Mobile (390 × 844) ──────────────────────────────────────────────────────

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileEmpty: Story = {
  name: 'Mobile · Empty',
  args: { platform: 'mobile', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── Tablet (768 × 1024) ─────────────────────────────────────────────────────

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── Desktop (1440 × 900) ────────────────────────────────────────────────────

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
