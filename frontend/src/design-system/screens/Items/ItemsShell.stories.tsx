import type { Meta, StoryObj } from '@storybook/react-vite';
import { ItemsShell } from './ItemsShell';

const meta: Meta<typeof ItemsShell> = {
  title: 'Design System/Screens/Items',
  component: ItemsShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ItemsShell>;

export const Mobile: Story = {
  args: { layout: 'mobile' },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 390, height: 844, overflow: 'hidden' }}>
        <StoryFn />
      </div>
    ),
  ],
};

export const Tablet: Story = {
  args: { layout: 'tablet' },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 768, height: 1024, overflow: 'hidden' }}>
        <StoryFn />
      </div>
    ),
  ],
};

export const Desktop: Story = {
  args: { layout: 'desktop' },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 1440, height: 900, overflow: 'hidden' }}>
        <StoryFn />
      </div>
    ),
  ],
};
