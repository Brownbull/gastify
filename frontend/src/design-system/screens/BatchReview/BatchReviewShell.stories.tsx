import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchReviewShell } from './BatchReviewShell';

const meta: Meta<typeof BatchReviewShell> = {
  title: 'Design System/Screens/Scan/BatchReview',
  component: BatchReviewShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BatchReviewShell>;

export const MobileDefault: Story = {
  args: { state: 'default', confirmLabel: 'Confirmar todo' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileConfirming: Story = {
  args: { state: 'confirming', confirmLabel: 'Confirmando...' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
