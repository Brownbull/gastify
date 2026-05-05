import type { Meta, StoryObj } from '@storybook/react-vite';
import { ManualEntryShell } from './ManualEntryShell';

const meta: Meta<typeof ManualEntryShell> = {
  title: 'Design System/Screens/Scan/ManualEntry',
  component: ManualEntryShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManualEntryShell>;

export const MobileDefault: Story = {
  args: {
    state: 'default',
    title: 'Ingreso manual',
    submitLabel: 'Guardar',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileSubmitting: Story = {
  args: {
    state: 'submitting',
    title: 'Ingreso manual',
    submitLabel: 'Guardando...',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileSuccess: Story = {
  args: {
    state: 'success',
    successMessage: 'Gasto guardado correctamente',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
