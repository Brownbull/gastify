import type { Meta, StoryObj } from '@storybook/react-vite';
import { TransactionEditorShell } from './TransactionEditorShell';

const meta: Meta<typeof TransactionEditorShell> = {
  title: 'Design System/Screens/Scan/TransactionEditor',
  component: TransactionEditorShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TransactionEditorShell>;

export const Mobile: Story = {
  args: { layout: 'mobile' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const Desktop: Story = {
  args: { layout: 'desktop' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
