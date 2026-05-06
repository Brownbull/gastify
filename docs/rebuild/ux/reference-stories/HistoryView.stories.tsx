// History screen story — third self-contained-screen example.
// Same shape as DashboardView.stories.tsx + TrendsView.stories.tsx: HistoryView
// reads everything via useHistoryViewData() from Zustand stores + repositories
// backed by mocked Firestore (preview.tsx bootstraps the mocks).

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { HistoryView } from './HistoryView';
import { useHistoryFiltersInit } from '@shared/hooks';
import type { UseHistoryViewDataReturn } from './useHistoryViewData';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState = 'default' | 'empty';

interface HistoryScreenArgs {
  platform: Platform;
  state: DataState;
}

const PLATFORM_WIDTH: Record<Platform, number | undefined> = {
  mobile: 390,
  tablet: 768,
  desktop: undefined,
};

const buildOverrides = (
  state: DataState,
): Partial<UseHistoryViewDataReturn> | undefined => {
  switch (state) {
    case 'empty':
      return { transactions: [], allTransactions: [] } as Partial<UseHistoryViewDataReturn>;
    case 'default':
    default:
      return undefined;
  }
};

const HistoryScreen: React.FC<HistoryScreenArgs> = ({ platform, state }) => {
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
      {overrides ? <HistoryView _testOverrides={overrides} /> : <HistoryView />}
    </div>
  );
};

const meta: Meta<HistoryScreenArgs> = {
  title: 'Screens/History',
  component: HistoryScreen,
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
      description: 'Hook-data shape injected into HistoryView via _testOverrides.',
      options: ['default', 'empty'],
      control: { type: 'select' },
    },
  },
  args: {
    platform: 'mobile',
    state: 'default',
  },
};

export default meta;
type Story = StoryObj<HistoryScreenArgs>;

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

export const MobileEmpty: Story = {
  name: 'Mobile · Empty',
  args: { platform: 'mobile', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
