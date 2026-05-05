import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsShell } from './SettingsShell';

const meta: Meta<typeof SettingsShell> = {
  title: 'Design System/Screens/Settings',
  component: SettingsShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SettingsShell>;

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
