import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ItemsShell } from './ItemsShell';

const meta: Meta<typeof ItemsShell> = {
  title: 'Design System/Screens/Items',
  component: ItemsShell,
  parameters: { layout: 'fullscreen' },
  args: {
    onRetry: fn(),
    onGoHome: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ItemsShell>;

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

export const Tablet: Story = {
  args: { layout: 'tablet' },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 768, height: 1024, overflow: 'hidden' }}>
        <StoryFn />
      </div>
    ),
  ],
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

/* ---------- empty ---------- */

export const MobileEmpty: Story = {
  args: { layout: 'mobile', state: 'empty' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const DesktopEmpty: Story = {
  args: { layout: 'desktop', state: 'empty' },
  decorators: [desktopDecorator],
};

/* ---------- error ---------- */

export const MobileError: Story = {
  args: {
    layout: 'mobile',
    state: 'error',
    errorMessage: 'No se pudieron cargar los items. Intenta de nuevo.',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};

export const DesktopError: Story = {
  args: {
    layout: 'desktop',
    state: 'error',
    errorMessage: 'No se pudieron cargar los items. Intenta de nuevo.',
  },
  decorators: [desktopDecorator],
};

/* ---------- filtered ---------- */

export const MobileFiltered: Story = {
  args: { layout: 'mobile', state: 'filtered' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [mobileDecorator],
};
