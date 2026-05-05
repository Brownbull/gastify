import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchCaptureShell } from './BatchCaptureShell';

const meta: Meta<typeof BatchCaptureShell> = {
  title: 'Design System/Screens/Scan/BatchCapture',
  component: BatchCaptureShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BatchCaptureShell>;

export const MobileCapturing: Story = {
  args: { state: 'capturing', capturedCount: 3 },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileLimitReached: Story = {
  args: { state: 'limit-reached', capturedCount: 10 },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
