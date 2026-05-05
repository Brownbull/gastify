import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentScansShell } from './RecentScansShell';

const meta: Meta<typeof RecentScansShell> = {
  title: 'Design System/Screens/Scan/RecentScans',
  component: RecentScansShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RecentScansShell>;

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
