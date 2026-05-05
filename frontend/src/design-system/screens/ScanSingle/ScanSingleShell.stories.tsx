import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScanSingleShell } from './ScanSingleShell';

const meta: Meta<typeof ScanSingleShell> = {
  title: 'Design System/Screens/Scan/SingleScan',
  component: ScanSingleShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ScanSingleShell>;

export const Mobile: Story = {
  args: { layout: 'mobile' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const Desktop: Story = {
  args: { layout: 'desktop' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
