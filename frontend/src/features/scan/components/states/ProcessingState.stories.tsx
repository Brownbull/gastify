import type { Meta, StoryObj, StoryFn } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import { ProcessingState, type ProcessingStateProps } from './ProcessingState';
import { useScanStore, initialScanState } from '../../store';

const t = (key: string): string => {
  const translations: Record<string, string> = {
    scanProcessing: 'Procesando boleta...',
    cancel: 'Cancelar',
    batchProcessing: 'Procesando lote...',
  };
  return translations[key] ?? key;
};

function withScanState(overrides: Record<string, unknown>) {
  return (Story: StoryFn) => {
    useScanStore.setState({ ...initialScanState, ...overrides } as never);
    return <Story />;
  };
}

const meta: Meta<ProcessingStateProps> = {
  title: 'Features/Scan/States/ProcessingState',
  component: ProcessingState,
  args: {
    t,
    theme: 'light',
    onCancel: fn(),
  },
  decorators: [withScanState({ phase: 'scanning', mode: 'single' })],
};

export default meta;
type Story = StoryObj<ProcessingStateProps>;

// ---------------------------------------------------------------------------
// SCAN-005: Single scan — capturing — mobile (indeterminate spinner)
// ---------------------------------------------------------------------------

export const SCAN_005_SingleProcessingMobile: Story = {
  name: 'SCAN-005 · Single processing — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveAttribute('aria-label', 'Procesando boleta...');
    await expect(canvas.getByText('Cancelar')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-006: Single scan — processing (SSE stream) — mobile
// ---------------------------------------------------------------------------

export const SCAN_006_SingleProcessingSSE: Story = {
  name: 'SCAN-006 · Single SSE processing — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
    await expect(canvas.getByText('Procesando boleta...')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-007: Single scan — processing (SSE stream) — desktop
// ---------------------------------------------------------------------------

export const SCAN_007_SingleProcessingDesktop: Story = {
  name: 'SCAN-007 · Single processing — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Phase guard — renders nothing when not scanning
// ---------------------------------------------------------------------------

export const SCAN_005a_PhaseGuard: Story = {
  name: 'SCAN-005a · Phase guard (not scanning → empty)',
  decorators: [withScanState({ phase: 'idle', mode: 'single' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_005b_DarkMode: Story = {
  name: 'SCAN-005b · Dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    withScanState({ phase: 'scanning', mode: 'single' }),
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
