import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AnalyticsShell } from './AnalyticsShell';

const meta: Meta<typeof AnalyticsShell> = {
  title: 'Design System/Screens/Analytics',
  component: AnalyticsShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onRetry: fn(),
    onGoHome: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AnalyticsShell>;

// ---------------------------------------------------------------------------
// Default states (Tier 3 — existing)
// ---------------------------------------------------------------------------

export const Mobile: Story = {
  args: { layout: 'mobile' },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', height: '844px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const Tablet: Story = {
  args: { layout: 'tablet' },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '768px', height: '1024px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const Desktop: Story = {
  args: { layout: 'desktop' },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '1440px', height: '900px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

// ---------------------------------------------------------------------------
// Loading states (Tier 4)
// ---------------------------------------------------------------------------

export const MobileLoading: Story = {
  args: { layout: 'mobile', state: 'loading' },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', height: '844px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const TabletLoading: Story = {
  args: { layout: 'tablet', state: 'loading' },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '768px', height: '1024px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const DesktopLoading: Story = {
  args: { layout: 'desktop', state: 'loading' },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '1440px', height: '900px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

// ---------------------------------------------------------------------------
// Empty states (Tier 4)
// ---------------------------------------------------------------------------

export const MobileEmpty: Story = {
  args: {
    layout: 'mobile',
    state: 'empty',
    emptyTitle: 'Sin datos suficientes',
    emptyMessage: 'Comienza a escanear boletas o agregar transacciones para ver tus tendencias de gasto aquí.',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', height: '844px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const TabletEmpty: Story = {
  args: {
    layout: 'tablet',
    state: 'empty',
    emptyTitle: 'Sin datos suficientes',
    emptyMessage: 'Comienza a escanear boletas o agregar transacciones para ver tus tendencias de gasto aquí.',
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '768px', height: '1024px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const DesktopEmpty: Story = {
  args: {
    layout: 'desktop',
    state: 'empty',
    emptyTitle: 'Sin datos suficientes',
    emptyMessage: 'Comienza a escanear boletas o agregar transacciones para ver tus tendencias de gasto aquí.',
  },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '1440px', height: '900px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

// ---------------------------------------------------------------------------
// Error states (Tier 4)
// ---------------------------------------------------------------------------

export const MobileError: Story = {
  args: {
    layout: 'mobile',
    state: 'error',
    errorMessage: 'No pudimos cargar tus datos de analítica. Por favor intenta de nuevo.',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', height: '844px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const TabletError: Story = {
  args: {
    layout: 'tablet',
    state: 'error',
    errorMessage: 'No pudimos cargar tus datos de analítica. Por favor intenta de nuevo.',
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '768px', height: '1024px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export const DesktopError: Story = {
  args: {
    layout: 'desktop',
    state: 'error',
    errorMessage: 'No pudimos cargar tus datos de analítica. Por favor intenta de nuevo.',
  },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '1440px', height: '900px', margin: '0 auto', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};
