import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ScanSingleShell } from './ScanSingleShell';

const meta: Meta<typeof ScanSingleShell> = {
  title: 'Design System/Screens/Scan/SingleScan',
  component: ScanSingleShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onRetry: fn(),
    onGoHome: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ScanSingleShell>;

export const MobileIdle: Story = {
  args: { layout: 'mobile', state: 'idle' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileCapturing: Story = {
  args: { layout: 'mobile', state: 'capturing' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileProcessing: Story = {
  args: { layout: 'mobile', state: 'processing' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileSuccess: Story = {
  args: { layout: 'mobile', state: 'success' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileError: Story = {
  args: { layout: 'mobile', state: 'error' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const DesktopIdle: Story = {
  args: { layout: 'desktop', state: 'idle' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
