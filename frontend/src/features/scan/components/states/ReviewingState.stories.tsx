import type { Meta, StoryObj, StoryFn } from '@storybook/react-vite';
import { within, expect, userEvent, fn } from 'storybook/test';
import { ReviewingState, type ReviewingStateProps } from './ReviewingState';
import { useScanStore, initialScanState } from '../../store';
import type { Transaction } from '@/types/transaction';

const t = (key: string): string => {
  const translations: Record<string, string> = {
    reviewTitle: 'Revisar Transacción',
    reviewMessage: 'Revisa y confirma tu transacción',
    batchReviewTitle: 'Revisión de Lote',
    batchReviewMessage: '{count} boletas listas para revisión',
    review: 'Revisar',
    save: 'Guardar',
  };
  return translations[key] ?? key;
};

const mockTransaction: Transaction = {
  id: 'tx-review-1',
  merchant: 'Supermercado Jumbo',
  total: 45990,
  currency: 'CLP',
  date: '2026-05-01',
  category: 'Supermarket',
  items: [],
  createdAt: '2026-05-01T12:00:00Z',
  updatedAt: '2026-05-01T12:00:00Z',
};

function withScanState(overrides: Record<string, unknown>) {
  return (Story: StoryFn) => {
    useScanStore.setState({ ...initialScanState, ...overrides } as never);
    return <Story />;
  };
}

const meta: Meta<ReviewingStateProps> = {
  title: 'Features/Scan/States/ReviewingState',
  component: ReviewingState,
  args: {
    t,
    theme: 'light',
    onReview: fn(),
    onSave: fn(),
  },
  decorators: [
    withScanState({
      phase: 'reviewing',
      mode: 'single',
      results: [mockTransaction],
      activeResultIndex: 0,
    }),
  ],
};

export default meta;
type Story = StoryObj<ReviewingStateProps>;

// ---------------------------------------------------------------------------
// SCAN-009: Single scan — review — mobile
// ---------------------------------------------------------------------------

export const SCAN_009_SingleReviewMobile: Story = {
  name: 'SCAN-009 · Single review — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
    await expect(canvas.getByText('Revisar Transacción')).toBeInTheDocument();
    await expect(canvas.getByText('Revisa y confirma tu transacción')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-010: Single scan — review — desktop
// ---------------------------------------------------------------------------

export const SCAN_010_SingleReviewDesktop: Story = {
  name: 'SCAN-010 · Single review — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Review + Save buttons
// ---------------------------------------------------------------------------

export const SCAN_009a_ReviewButton: Story = {
  name: 'SCAN-009a · Review button click',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const reviewBtn = canvas.getByRole('button', { name: 'Revisar' });
    await userEvent.click(reviewBtn);
    await expect(args.onReview).toHaveBeenCalled();
  },
};

export const SCAN_009b_SaveButton: Story = {
  name: 'SCAN-009b · Save button click (single mode)',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const saveBtn = canvas.getByRole('button', { name: 'Guardar' });
    await userEvent.click(saveBtn);
    await expect(args.onSave).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// Batch review mode
// ---------------------------------------------------------------------------

export const SCAN_009c_BatchReview: Story = {
  name: 'SCAN-009c · Batch review mode',
  decorators: [
    withScanState({
      phase: 'reviewing',
      mode: 'batch',
      results: [mockTransaction, { ...mockTransaction, id: 'tx-review-2' }, { ...mockTransaction, id: 'tx-review-3' }],
    }),
  ],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Revisión de Lote')).toBeInTheDocument();
    await expect(canvas.getByText(/3 boletas listas para revisión/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Batch mode hides save button
// ---------------------------------------------------------------------------

export const SCAN_009d_BatchNoSaveButton: Story = {
  name: 'SCAN-009d · Batch mode hides save button',
  decorators: [
    withScanState({
      phase: 'reviewing',
      mode: 'batch',
      results: [mockTransaction],
    }),
  ],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const saveBtn = canvas.queryByRole('button', { name: 'Guardar' });
    await expect(saveBtn).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Children wrapper mode
// ---------------------------------------------------------------------------

export const SCAN_009e_ChildrenWrapper: Story = {
  name: 'SCAN-009e · Children wrapper mode',
  args: {
    children: <div data-testid="custom-review-ui">Custom review content</div>,
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('custom-review-ui')).toBeInTheDocument();
    await expect(canvas.getByText('Custom review content')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Phase guard
// ---------------------------------------------------------------------------

export const SCAN_009f_PhaseGuard: Story = {
  name: 'SCAN-009f · Phase guard (not reviewing → empty)',
  decorators: [withScanState({ phase: 'idle' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_009g_DarkMode: Story = {
  name: 'SCAN-009g · Dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    withScanState({
      phase: 'reviewing',
      mode: 'single',
      results: [mockTransaction],
    }),
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
