import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScanModeShell } from './ScanModeShell';

const meta: Meta<typeof ScanModeShell> = {
  title: 'Design System/Screens/Scan/ModeSelector',
  component: ScanModeShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ScanModeShell>;

export const Mobile: Story = {
  args: { layout: 'mobile', title: 'Escanear' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const Desktop: Story = {
  args: { layout: 'desktop', title: 'Escanear' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

export const MobileNoCredits: Story = {
  args: {
    layout: 'mobile',
    title: 'Escanear',
    disabled: true,
    disabledMessage: 'No te quedan creditos. Compra mas para seguir escaneando.',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
