import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TransactionEditorShell } from './TransactionEditorShell';

const meta: Meta<typeof TransactionEditorShell> = {
  title: 'Design System/Screens/Scan/TransactionEditor',
  component: TransactionEditorShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onConfirmDelete: fn(),
    onCancelDelete: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionEditorShell>;

export const MobileDefault: Story = {
  args: { layout: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileSaving: Story = {
  args: { layout: 'mobile', state: 'saving' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileDeleting: Story = {
  args: { layout: 'mobile', state: 'deleting' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const DesktopDefault: Story = {
  args: { layout: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
