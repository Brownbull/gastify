import type { Meta, StoryObj } from '@storybook/react-vite';
import { ManualEntryShell } from './ManualEntryShell';

const meta: Meta<typeof ManualEntryShell> = {
  title: 'Design System/Screens/Scan/ManualEntry',
  component: ManualEntryShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManualEntryShell>;

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
