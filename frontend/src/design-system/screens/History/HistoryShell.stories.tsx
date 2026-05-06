import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HistoryShell } from './HistoryShell';

const meta: Meta<typeof HistoryShell> = {
  title: 'Design System/Screens/History',
  component: HistoryShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onRetry: fn(),
    onGoHome: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HistoryShell>;

/* ─── Viewport decorator helpers ─── */

const mobileDecorator = (Story: React.ComponentType) => (
  <div style={{ width: 390, height: 844, overflow: 'hidden' }}>
    <Story />
  </div>
);

const tabletDecorator = (Story: React.ComponentType) => (
  <div style={{ width: 768, height: 1024, overflow: 'hidden' }}>
    <Story />
  </div>
);

const desktopDecorator = (Story: React.ComponentType) => (
  <div style={{ width: 1440, height: 900, overflow: 'hidden' }}>
    <Story />
  </div>
);

/* ─── Default state (Tier 3 originals, kept as-is) ─── */

export const Mobile: Story = {
  args: { layout: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  decorators: [mobileDecorator],
};

export const Tablet: Story = {
  args: { layout: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const Desktop: Story = {
  args: { layout: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

/* ─── Loading state ─── */

export const MobileLoading: Story = {
  args: { layout: 'mobile', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  decorators: [mobileDecorator],
};

export const TabletLoading: Story = {
  args: { layout: 'tablet', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopLoading: Story = {
  args: { layout: 'desktop', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

/* ─── Empty state ─── */

export const MobileEmpty: Story = {
  args: {
    layout: 'mobile',
    state: 'empty',
    emptyTitle: 'Sin transacciones',
    emptyMessage: 'No se encontraron transacciones. Ajusta los filtros o vuelve más tarde.',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  decorators: [mobileDecorator],
};

export const TabletEmpty: Story = {
  args: {
    layout: 'tablet',
    state: 'empty',
    emptyTitle: 'Sin transacciones',
    emptyMessage: 'No se encontraron transacciones. Ajusta los filtros o vuelve más tarde.',
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopEmpty: Story = {
  args: {
    layout: 'desktop',
    state: 'empty',
    emptyTitle: 'Sin transacciones',
    emptyMessage: 'No se encontraron transacciones. Ajusta los filtros o vuelve más tarde.',
  },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

/* ─── Error state ─── */

export const MobileError: Story = {
  args: {
    layout: 'mobile',
    state: 'error',
    errorMessage: 'No se pudieron cargar las transacciones. Inténtalo de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  decorators: [mobileDecorator],
};

export const TabletError: Story = {
  args: {
    layout: 'tablet',
    state: 'error',
    errorMessage: 'No se pudieron cargar las transacciones. Inténtalo de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopError: Story = {
  args: {
    layout: 'desktop',
    state: 'error',
    errorMessage: 'No se pudieron cargar las transacciones. Inténtalo de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

/* ─── Filtered state ─── */

export const MobileFiltered: Story = {
  args: { layout: 'mobile', state: 'filtered' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  decorators: [mobileDecorator],
};

export const TabletFiltered: Story = {
  args: { layout: 'tablet', state: 'filtered' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopFiltered: Story = {
  args: { layout: 'desktop', state: 'filtered' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};
