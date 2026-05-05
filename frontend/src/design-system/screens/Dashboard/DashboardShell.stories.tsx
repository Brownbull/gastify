import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardShell } from './DashboardShell';

const meta: Meta<typeof DashboardShell> = {
  title: 'Design System/Screens/Dashboard',
  component: DashboardShell,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof DashboardShell>;

export const Mobile: Story = {
  args: { viewport: 'mobile' },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 390, height: 844, overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export const Tablet: Story = {
  args: { viewport: 'tablet' },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 768, height: 1024, overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export const Desktop: Story = {
  args: { viewport: 'desktop' },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 1440, height: 900, overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
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
