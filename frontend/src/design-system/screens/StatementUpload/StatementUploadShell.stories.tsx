import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StatementUploadShell } from './StatementUploadShell';

const meta: Meta<typeof StatementUploadShell> = {
  title: 'Design System/Screens/Scan/StatementUpload',
  component: StatementUploadShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onRetry: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof StatementUploadShell>;

export const MobileDefault: Story = {
  args: {
    state: 'default',
    title: 'Subir estado de cuenta',
    submitLabel: 'Subir estado',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileUploading: Story = {
  args: {
    state: 'uploading',
    uploadProgress: 45,
    title: 'Subir estado de cuenta',
    submitLabel: 'Subiendo...',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileError: Story = {
  args: {
    state: 'error',
    title: 'Subir estado de cuenta',
    submitLabel: 'Subir estado',
    errorMessage: 'No se pudo procesar el archivo. Revisa el formato e intenta de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
