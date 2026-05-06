import type { Meta, StoryObj, StoryFn } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import { ErrorState, type ErrorStateProps } from './ErrorState';
import { useScanStore, initialScanState } from '../../store';

const t = (key: string): string => {
  const translations: Record<string, string> = {
    scanErrorMessage: 'Algo salió mal',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    scanErrorNetwork: 'Error de red',
    scanErrorTimeout: 'Tiempo agotado',
  };
  return translations[key] ?? key;
};

function withScanState(overrides: Record<string, unknown>) {
  return (Story: StoryFn) => {
    useScanStore.setState({ ...initialScanState, ...overrides } as never);
    return <Story />;
  };
}

const meta: Meta<ErrorStateProps> = {
  title: 'Features/Scan/States/ErrorState',
  component: ErrorState,
  args: {
    t,
    theme: 'light',
    onDismiss: fn(),
    onRetry: fn(),
  },
  decorators: [withScanState({ phase: 'error', error: 'Something went wrong during scan' })],
};

export default meta;
type Story = StoryObj<ErrorStateProps>;

// ---------------------------------------------------------------------------
// SCAN-012: Single scan — error — mobile
// ---------------------------------------------------------------------------

export const SCAN_012_ErrorMobile: Story = {
  name: 'SCAN-012 · Error state — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Something went wrong during scan/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-013: Single scan — error — desktop
// ---------------------------------------------------------------------------

export const SCAN_013_ErrorDesktop: Story = {
  name: 'SCAN-013 · Error state — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Something went wrong during scan/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Network error
// ---------------------------------------------------------------------------

export const SCAN_012a_NetworkError: Story = {
  name: 'SCAN-012a · Network error',
  decorators: [withScanState({ phase: 'error', error: 'Network connection failed' })],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Network connection failed/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Timeout error
// ---------------------------------------------------------------------------

export const SCAN_012b_TimeoutError: Story = {
  name: 'SCAN-012b · Timeout error',
  decorators: [withScanState({ phase: 'error', error: 'Request timed out' })],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Request timed out/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Invalid image error
// ---------------------------------------------------------------------------

export const SCAN_012c_InvalidImageError: Story = {
  name: 'SCAN-012c · Invalid image error',
  decorators: [withScanState({ phase: 'error', error: 'Image is invalid or corrupted' })],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/invalid or corrupted/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// API error
// ---------------------------------------------------------------------------

export const SCAN_012d_ApiError: Story = {
  name: 'SCAN-012d · API server error',
  decorators: [withScanState({ phase: 'error', error: 'API server returned 500' })],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/API server returned 500/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Phase guard — renders nothing when not error
// ---------------------------------------------------------------------------

export const SCAN_012e_PhaseGuard: Story = {
  name: 'SCAN-012e · Phase guard (not error → empty)',
  decorators: [withScanState({ phase: 'idle' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const errorText = canvas.queryByText(/Something went wrong/i);
    await expect(errorText).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_012f_DarkMode: Story = {
  name: 'SCAN-012f · Dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    withScanState({ phase: 'error', error: 'Something went wrong during scan' }),
    (Story) => (
      <div className="dark" style={{ minHeight: '100vh', background: '#1a1a2e' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Something went wrong during scan/i)).toBeInTheDocument();
  },
};
