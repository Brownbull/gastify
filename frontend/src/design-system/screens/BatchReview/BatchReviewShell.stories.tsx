import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchReviewShell } from './BatchReviewShell';

const meta: Meta<typeof BatchReviewShell> = {
  title: 'Design System/Screens/Scan/BatchReview',
  component: BatchReviewShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BatchReviewShell>;

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
