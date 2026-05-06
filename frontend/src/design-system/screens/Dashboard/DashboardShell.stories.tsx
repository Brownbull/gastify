import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DashboardShell } from './DashboardShell';

const meta: Meta<typeof DashboardShell> = {
  title: 'Design System/Screens/Dashboard',
  component: DashboardShell,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onRetry: fn(),
    onGoHome: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DashboardShell>;

// ---------------------------------------------------------------------------
// Viewport decorators
// ---------------------------------------------------------------------------

const mobileDecorator = (Story: React.ComponentType) => (
  <div style={{ width: 390, height: 844, overflow: 'auto' }}>
    <Story />
  </div>
);

const tabletDecorator = (Story: React.ComponentType) => (
  <div style={{ width: 768, height: 1024, overflow: 'auto' }}>
    <Story />
  </div>
);

const desktopDecorator = (Story: React.ComponentType) => (
  <div style={{ width: 1440, height: 900, overflow: 'auto' }}>
    <Story />
  </div>
);

// ---------------------------------------------------------------------------
// Tier 3 — existing screen-shell stories (default state, preserved as-is)
// ---------------------------------------------------------------------------

export const Mobile: Story = {
  args: { viewport: 'mobile' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const Tablet: Story = {
  args: { viewport: 'tablet' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const Desktop: Story = {
  args: { viewport: 'desktop' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

export const AllViewports: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 16 }}>
      <section>
        <h2 style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
          Mobile (390 x 844)
        </h2>
        <div
          style={{
            width: 390,
            height: 844,
            overflow: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <DashboardShell viewport="mobile" />
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
          Tablet (768 x 1024)
        </h2>
        <div
          style={{
            width: 768,
            height: 1024,
            overflow: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <DashboardShell viewport="tablet" />
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
          Desktop (1440 x 900)
        </h2>
        <div
          style={{
            width: 1440,
            height: 900,
            overflow: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <DashboardShell viewport="desktop" />
        </div>
      </section>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Tier 4 — screen-state stories: Default
// ---------------------------------------------------------------------------

export const MobileDefault: Story = {
  args: { viewport: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const TabletDefault: Story = {
  args: { viewport: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopDefault: Story = {
  args: { viewport: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

// ---------------------------------------------------------------------------
// Tier 4 — screen-state stories: Loading
// ---------------------------------------------------------------------------

export const MobileLoading: Story = {
  args: { viewport: 'mobile', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const TabletLoading: Story = {
  args: { viewport: 'tablet', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopLoading: Story = {
  args: { viewport: 'desktop', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

// ---------------------------------------------------------------------------
// Tier 4 — screen-state stories: Empty
// ---------------------------------------------------------------------------

export const MobileEmpty: Story = {
  args: {
    viewport: 'mobile',
    state: 'empty',
    emptyMessage: 'Aún no tienes transacciones. ¡Escanea tu primera boleta!',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const TabletEmpty: Story = {
  args: {
    viewport: 'tablet',
    state: 'empty',
    emptyMessage: 'Aún no tienes transacciones. ¡Escanea tu primera boleta!',
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopEmpty: Story = {
  args: {
    viewport: 'desktop',
    state: 'empty',
    emptyMessage: 'Aún no tienes transacciones. ¡Escanea tu primera boleta!',
  },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};

// ---------------------------------------------------------------------------
// Tier 4 — screen-state stories: Error
// ---------------------------------------------------------------------------

export const MobileError: Story = {
  args: {
    viewport: 'mobile',
    state: 'error',
    errorMessage: 'No se pudieron cargar los datos del dashboard. Por favor intenta de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const TabletError: Story = {
  args: {
    viewport: 'tablet',
    state: 'error',
    errorMessage: 'No se pudieron cargar los datos del dashboard. Por favor intenta de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'tablet' } },
  decorators: [tabletDecorator],
};

export const DesktopError: Story = {
  args: {
    viewport: 'desktop',
    state: 'error',
    errorMessage: 'No se pudieron cargar los datos del dashboard. Por favor intenta de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [desktopDecorator],
};
