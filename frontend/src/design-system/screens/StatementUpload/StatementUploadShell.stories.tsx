import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatementUploadShell } from './StatementUploadShell';

const meta: Meta<typeof StatementUploadShell> = {
  title: 'Design System/Screens/Scan/StatementUpload',
  component: StatementUploadShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof StatementUploadShell>;

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
