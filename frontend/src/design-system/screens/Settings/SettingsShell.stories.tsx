import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SettingsShell } from './SettingsShell';

const meta: Meta<typeof SettingsShell> = {
  title: 'Design System/Screens/Settings',
  component: SettingsShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onRetry: fn(),
    onGoHome: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SettingsShell>;

/* ---------- helpers ---------- */

const mobileDecorator = (StoryFn: () => React.JSX.Element) => (
  <div style={{ width: 390, height: 844, overflow: 'hidden' }}>
    <StoryFn />
  </div>
);

const desktopDecorator = (StoryFn: () => React.JSX.Element) => (
  <div style={{ width: 1440, height: 900, overflow: 'hidden' }}>
    <StoryFn />
  </div>
);

/* ---------- default states ---------- */

export const Mobile: Story = {
  args: { layout: 'mobile' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const Desktop: Story = {
  args: { layout: 'desktop' },
  decorators: [desktopDecorator],
};

/* ---------- loading ---------- */

export const MobileLoading: Story = {
  args: { layout: 'mobile', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const DesktopLoading: Story = {
  args: { layout: 'desktop', state: 'loading' },
  decorators: [desktopDecorator],
};

/* ---------- error ---------- */

export const MobileError: Story = {
  args: {
    layout: 'mobile',
    state: 'error',
    errorMessage: 'No se pudieron cargar los ajustes. Intenta de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const DesktopError: Story = {
  args: {
    layout: 'desktop',
    state: 'error',
    errorMessage: 'No se pudieron cargar los ajustes. Intenta de nuevo.',
  },
  decorators: [desktopDecorator],
};
