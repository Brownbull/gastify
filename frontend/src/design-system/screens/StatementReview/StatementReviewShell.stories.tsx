import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatementReviewShell } from './StatementReviewShell';

const meta: Meta<typeof StatementReviewShell> = {
  title: 'Design System/Screens/Scan/StatementReview',
  component: StatementReviewShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof StatementReviewShell>;

export const MobileDefault: Story = {
  args: {
    state: 'default',
    confirmLabel: 'Confirmar todo',
    rejectLabel: 'Rechazar seleccion',
    summaryLabel: '15 transacciones encontradas',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileConfirming: Story = {
  args: {
    state: 'confirming',
    confirmLabel: 'Confirmando...',
    rejectLabel: 'Rechazar seleccion',
    summaryLabel: '15 transacciones encontradas',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
