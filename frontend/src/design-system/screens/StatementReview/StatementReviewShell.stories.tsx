import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatementReviewShell } from './StatementReviewShell';

const meta: Meta<typeof StatementReviewShell> = {
  title: 'Design System/Screens/Scan/StatementReview',
  component: StatementReviewShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof StatementReviewShell>;

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
