// Items screen story — fourth self-contained-screen example.
// Same shape as DashboardView / TrendsView / HistoryView stories: ItemsView
// reads everything via useItemsViewData() from Zustand stores + repositories
// backed by mocked Firestore (preview.tsx bootstraps the mocks).

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ItemsView } from './ItemsView';
import { useHistoryFiltersInit } from '@shared/hooks';
import type { UseItemsViewDataReturn } from './useItemsViewData';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState = 'default' | 'empty';

interface ItemsScreenArgs {
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
): Partial<UseItemsViewDataReturn> | undefined => {
  switch (state) {
    case 'empty':
      return { transactions: [] } as Partial<UseItemsViewDataReturn>;
    case 'default':
    default:
      return undefined;
  }
};

const ItemsScreen: React.FC<ItemsScreenArgs> = ({ platform, state }) => {
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
      {overrides ? <ItemsView _testOverrides={overrides} /> : <ItemsView />}
    </div>
  );
};

const meta: Meta<ItemsScreenArgs> = {
  title: 'Screens/Items',
  component: ItemsScreen,
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
      description: 'Hook-data shape injected into ItemsView via _testOverrides.',
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
type Story = StoryObj<ItemsScreenArgs>;

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
