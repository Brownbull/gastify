import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnalyticsShell } from './AnalyticsShell';

const meta: Meta<typeof AnalyticsShell> = {
  title: 'Design System/Screens/Analytics',
  component: AnalyticsShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AnalyticsShell>;

export const Mobile: Story = {
  args: { layout: 'mobile' },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', height: '844px', margin: '0 auto', overflow: 'hidden' }}>
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
      <div style={{ width: '768px', height: '1024px', margin: '0 auto', overflow: 'hidden' }}>
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
      <div style={{ width: '1440px', height: '900px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};
