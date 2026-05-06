import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentScansShell } from './RecentScansShell';

const meta: Meta<typeof RecentScansShell> = {
  title: 'Design System/Screens/Scan/RecentScans',
  component: RecentScansShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RecentScansShell>;

export const MobileDefault: Story = {
  args: { state: 'default', title: 'Escaneos recientes' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileEmpty: Story = {
  args: { state: 'empty', title: 'Escaneos recientes', emptyMessage: 'No hay escaneos recientes' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileLoading: Story = {
  args: { state: 'loading', title: 'Escaneos recientes' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
