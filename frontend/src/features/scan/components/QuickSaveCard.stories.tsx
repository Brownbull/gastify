import type { Meta, StoryObj, StoryFn } from '@storybook/react-vite';
import { within, expect, userEvent, waitFor, fn } from 'storybook/test';
import { QuickSaveCard, type QuickSaveCardProps } from './QuickSaveCard';
import { useScanStore, initialScanState } from '../store';
import type { Transaction } from '@/types/transaction';

const t = (key: string): string => {
  const translations: Record<string, string> = {
    save: 'Guardar',
    edit: 'Editar',
    cancel: 'Cancelar',
    quickSaveTitle: 'Guardar rápido',
    quickSaveItems: 'artículos',
    quickSaveConfidence: 'Confianza',
    quickSaveSuccess: '¡Guardado!',
    cancelConfirmTitle: '¿Cancelar escaneo?',
    cancelConfirmMessage: 'El crédito ya fue utilizado',
    cancelConfirmYes: 'Sí, cancelar',
    cancelConfirmNo: 'No, volver',
    itemsLabel: 'Artículos',
    totalLabel: 'Total',
  };
  return translations[key] ?? key;
};

const formatCurrency = (amount: number, currency: string): string => {
  if (currency === 'CLP') return `$${amount.toLocaleString('es-CL')}`;
  return `${currency} ${amount.toFixed(2)}`;
};

const mockTransaction: Transaction = {
  id: 'tx-quicksave-1',
  merchant: 'Supermercado Jumbo',
  total: 45990,
  currency: 'CLP',
  date: '2026-05-01',
  time: '14:30',
  category: 'Supermarket',
  items: [
    { name: 'Leche Colun 1L', totalPrice: 1290, qty: 2 },
    { name: 'Pan molde integral', totalPrice: 2490, qty: 1 },
    { name: 'Queso Gouda laminado', totalPrice: 3990, qty: 1 },
    { name: 'Arroz Tucapel 1kg', totalPrice: 1590, qty: 1 },
    { name: 'Aceite Maravilla 1L', totalPrice: 2890, qty: 1 },
  ],
  country: 'Chile',
  city: 'Santiago',
  createdAt: '2026-05-01T14:30:00Z',
  updatedAt: '2026-05-01T14:30:00Z',
};

const mockTransactionNoItems: Transaction = {
  ...mockTransaction,
  id: 'tx-quicksave-no-items',
  items: [],
};

function withScanState(overrides: Record<string, unknown>) {
  return (Story: StoryFn) => {
    useScanStore.setState({ ...initialScanState, ...overrides } as never);
    return <Story />;
  };
}

const defaultArgs: QuickSaveCardProps = {
  theme: 'light',
  t,
  formatCurrency,
  currency: 'CLP',
  lang: 'es',
  transaction: mockTransaction,
  confidence: 0.92,
  onSave: fn(() => Promise.resolve()),
  onEdit: fn(),
  onCancel: fn(),
  isSaving: false,
  showItems: true,
  maxVisibleItems: 3,
  isEntering: false,
  userDefaultCountry: 'Chile',
};

const meta: Meta<QuickSaveCardProps> = {
  title: 'Features/Scan/QuickSaveCard',
  component: QuickSaveCard,
  args: defaultArgs,
  decorators: [withScanState({ phase: 'reviewing', mode: 'single', results: [mockTransaction] })],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<QuickSaveCardProps>;

// ---------------------------------------------------------------------------
// SCAN-041: QuickSave card — save flow — mobile
// ---------------------------------------------------------------------------

export const SCAN_041_QuickSaveMobile: Story = {
  name: 'SCAN-041 · QuickSave card — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
    await expect(canvas.getByTestId('quick-save-edit-button')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-042: QuickSave card — save flow — tablet/desktop
// ---------------------------------------------------------------------------

export const SCAN_042_QuickSaveDesktop: Story = {
  name: 'SCAN-042 · QuickSave card — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// Save button click
// ---------------------------------------------------------------------------

export const SCAN_041a_SaveClick: Story = {
  name: 'SCAN-041a · Save button click',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
    const saveBtn = canvas.getByTestId('quick-save-button');
    await userEvent.click(saveBtn);
    await expect(args.onSave).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// Edit button click
// ---------------------------------------------------------------------------

export const SCAN_041b_EditClick: Story = {
  name: 'SCAN-041b · Edit button click',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-edit-button')).toBeInTheDocument();
    });
    const editBtn = canvas.getByTestId('quick-save-edit-button');
    await userEvent.click(editBtn);
    await expect(args.onEdit).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// No items
// ---------------------------------------------------------------------------

export const SCAN_041c_NoItems: Story = {
  name: 'SCAN-041c · No items',
  args: { transaction: mockTransactionNoItems, showItems: false },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
    const items = canvas.queryByTestId('quick-save-item-0');
    await expect(items).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Saving state
// ---------------------------------------------------------------------------

export const SCAN_041d_SavingState: Story = {
  name: 'SCAN-041d · Saving in progress',
  args: { isSaving: true },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// High confidence
// ---------------------------------------------------------------------------

export const SCAN_041e_HighConfidence: Story = {
  name: 'SCAN-041e · High confidence (98%)',
  args: { confidence: 0.98 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// Low confidence
// ---------------------------------------------------------------------------

export const SCAN_041f_LowConfidence: Story = {
  name: 'SCAN-041f · Low confidence (45%)',
  args: { confidence: 0.45 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// Many items (shows "and X more")
// ---------------------------------------------------------------------------

export const SCAN_041g_ManyItems: Story = {
  name: 'SCAN-041g · Many items (5 items, max 3 visible)',
  args: { maxVisibleItems: 3 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// Foreign location
// ---------------------------------------------------------------------------

export const SCAN_041h_ForeignLocation: Story = {
  name: 'SCAN-041h · Foreign location (UK)',
  args: {
    transaction: { ...mockTransaction, country: 'United Kingdom', city: 'London', currency: 'GBP' },
    userDefaultCountry: 'Chile',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_041i_DarkMode: Story = {
  name: 'SCAN-041i · Dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    withScanState({ phase: 'reviewing', mode: 'single', results: [mockTransaction] }),
    (Story) => (
      <div className="dark" style={{ minHeight: '100vh', background: '#1a1a2e' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByTestId('quick-save-button')).toBeInTheDocument();
    });
  },
};

// ---------------------------------------------------------------------------
// No transaction (guard)
// ---------------------------------------------------------------------------

export const SCAN_041j_NoTransaction: Story = {
  name: 'SCAN-041j · No transaction (renders nothing)',
  args: { transaction: undefined },
  decorators: [withScanState({ phase: 'reviewing', mode: 'single', results: [] })],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
