import type { Meta, StoryObj, StoryFn } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import { IdleState, type IdleStateProps } from './IdleState';
import { useScanStore, initialScanState } from '../../store';

const t = (key: string): string => {
  const translations: Record<string, string> = {
    scanSinglePrompt: 'Toca para escanear una boleta',
    scanBatchPrompt: 'Toca para agregar más boletas',
    scan: 'Escanear',
  };
  return translations[key] ?? key;
};

function withScanState(overrides: Record<string, unknown>) {
  return (Story: StoryFn) => {
    useScanStore.setState({ ...initialScanState, ...overrides } as never);
    return <Story />;
  };
}

const meta: Meta<IdleStateProps> = {
  title: 'Features/Scan/States/IdleState',
  component: IdleState,
  args: {
    t,
    theme: 'light',
    onStartScan: fn(),
  },
  decorators: [withScanState({ phase: 'idle', mode: 'single' })],
};

export default meta;
type Story = StoryObj<IdleStateProps>;

// ---------------------------------------------------------------------------
// SCAN-003: Single scan — idle state — mobile
// ---------------------------------------------------------------------------

export const SCAN_003_SingleIdleMobile: Story = {
  name: 'SCAN-003 · Single idle — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveAttribute('aria-label', 'Toca para escanear una boleta');
  },
};

// ---------------------------------------------------------------------------
// SCAN-004: Single scan — idle state — desktop
// ---------------------------------------------------------------------------

export const SCAN_004_SingleIdleDesktop: Story = {
  name: 'SCAN-004 · Single idle — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Batch mode idle
// ---------------------------------------------------------------------------

export const SCAN_003a_BatchIdleMobile: Story = {
  name: 'SCAN-003a · Batch idle — mobile',
  decorators: [withScanState({ phase: 'idle', mode: 'batch' })],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    await expect(status).toHaveAttribute('aria-label', 'Toca para agregar más boletas');
  },
};

// ---------------------------------------------------------------------------
// With start button
// ---------------------------------------------------------------------------

export const SCAN_003b_WithStartButton: Story = {
  name: 'SCAN-003b · With start button',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scanBtn = canvas.getByRole('button', { name: 'Escanear' });
    await expect(scanBtn).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Without start button
// ---------------------------------------------------------------------------

export const SCAN_003c_WithoutStartButton: Story = {
  name: 'SCAN-003c · Without start button',
  args: { onStartScan: undefined },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scanBtn = canvas.queryByRole('button', { name: 'Escanear' });
    await expect(scanBtn).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Phase guard — renders nothing when not idle
// ---------------------------------------------------------------------------

export const SCAN_003d_PhaseGuard: Story = {
  name: 'SCAN-003d · Phase guard (not idle → empty)',
  decorators: [withScanState({ phase: 'scanning', mode: 'single' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.queryByRole('status');
    await expect(status).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_003e_DarkMode: Story = {
  name: 'SCAN-003e · Dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    withScanState({ phase: 'idle', mode: 'single' }),
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
