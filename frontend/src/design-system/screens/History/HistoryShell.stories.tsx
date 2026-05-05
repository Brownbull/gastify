import type { Meta, StoryObj } from '@storybook/react-vite';
import { HistoryShell } from './HistoryShell';

const meta: Meta<typeof HistoryShell> = {
  title: 'Design System/Screens/History',
  component: HistoryShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof HistoryShell>;

export const Mobile: Story = {
  args: { layout: 'mobile' },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 390, height: 844, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const Tablet: Story = {
  args: { layout: 'tablet' },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 768, height: 1024, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const Desktop: Story = {
  args: { layout: 'desktop' },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 1440, height: 900, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};
