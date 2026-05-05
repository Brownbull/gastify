import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchCaptureShell } from './BatchCaptureShell';

const meta: Meta<typeof BatchCaptureShell> = {
  title: 'Design System/Screens/Scan/BatchCapture',
  component: BatchCaptureShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BatchCaptureShell>;

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
