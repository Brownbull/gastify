import type { Meta, StoryObj, StoryFn } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { SavingState, type SavingStateProps } from './SavingState';
import { useScanStore, initialScanState } from '../../store';

const t = (key: string): string => {
  const translations: Record<string, string> = {
    saving: 'Guardando...',
  };
  return translations[key] ?? key;
};

function withScanState(overrides: Record<string, unknown>) {
  return (Story: StoryFn) => {
    useScanStore.setState({ ...initialScanState, ...overrides } as never);
    return <Story />;
  };
}

const meta: Meta<SavingStateProps> = {
  title: 'Features/Scan/States/SavingState',
  component: SavingState,
  args: {
    t,
    theme: 'light',
  },
  decorators: [withScanState({ phase: 'saving' })],
};

export default meta;
type Story = StoryObj<SavingStateProps>;

// ---------------------------------------------------------------------------
// Default saving state
// ---------------------------------------------------------------------------

export const SavingDefault: Story = {
  name: 'Saving — default message',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveAttribute('aria-label', 'Guardando...');
  },
};

// ---------------------------------------------------------------------------
// Custom message
// ---------------------------------------------------------------------------

export const SavingCustomMessage: Story = {
  name: 'Saving — custom message',
  args: { message: 'Guardando transacción...' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    await expect(status).toHaveAttribute('aria-label', 'Guardando transacción...');
  },
};

// ---------------------------------------------------------------------------
// Phase guard
// ---------------------------------------------------------------------------

export const SavingPhaseGuard: Story = {
  name: 'Phase guard (not saving → empty)',
  decorators: [withScanState({ phase: 'idle' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SavingDarkMode: Story = {
  name: 'Saving — dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    withScanState({ phase: 'saving' }),
    (Story) => (
      <div className="dark" style={{ minHeight: '100vh', background: '#1a1a2e' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Desktop
// ---------------------------------------------------------------------------

export const SavingDesktop: Story = {
  name: 'Saving — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};
