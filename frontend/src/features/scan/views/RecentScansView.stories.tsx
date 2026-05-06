import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import type { Transaction } from '@/types/transaction';
import { RecentScansView } from './RecentScansView';

function makeTransaction(overrides: Partial<Transaction> & { id: string; merchant: string; total: number }): Transaction {
  return {
    date: '2026-05-01',
    category: 'Supermarket',
    items: [],
    currency: 'CLP',
    createdAt: '2026-05-01T12:00:00Z',
    updatedAt: '2026-05-01T12:00:00Z',
    ...overrides,
  };
}

const mockTransactions: Transaction[] = [
  makeTransaction({ id: 'tx-1', merchant: 'Jumbo', total: 45990, createdAt: '2026-05-05T10:00:00Z' }),
  makeTransaction({ id: 'tx-2', merchant: 'Lider', total: 32500, category: 'Supermarket', createdAt: '2026-05-04T15:30:00Z' }),
  makeTransaction({ id: 'tx-3', merchant: 'Farmacia Ahumada', total: 12800, category: 'Pharmacy', createdAt: '2026-05-04T11:00:00Z' }),
  makeTransaction({ id: 'tx-4', merchant: 'Shell Costanera', total: 55000, category: 'Transport', createdAt: '2026-05-03T09:00:00Z' }),
  makeTransaction({ id: 'tx-5', merchant: 'Café Colmado', total: 8900, category: 'Restaurant', createdAt: '2026-05-03T08:00:00Z' }),
  makeTransaction({ id: 'tx-6', merchant: 'Cencosud', total: 67000, category: 'Supermarket', createdAt: '2026-05-02T14:00:00Z' }),
];

const t = (key: string): string => {
  const translations: Record<string, string> = {
    recentScansTitle: 'Últimos Escaneados',
    back: 'Volver',
    noScansYet: 'No tienes escaneos aún',
    scanFirst: 'Escanea tu primera boleta',
    showing: 'Mostrando',
    of: 'de',
    perPage: 'por página',
    page: 'Página',
    previous: 'Anterior',
    next: 'Siguiente',
  };
  return translations[key] ?? key;
};

const formatCurrency = (amount: number, currency: string): string => {
  if (currency === 'CLP') return `$${amount.toLocaleString('es-CL')}`;
  return `${currency} ${amount.toFixed(2)}`;
};

const formatDate = (date: string, _format: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

const meta: Meta<typeof RecentScansView> = {
  title: 'Features/Scan/Views/RecentScansView',
  component: RecentScansView,
  args: {
    transactions: mockTransactions,
    theme: 'light',
    currency: 'CLP',
    dateFormat: 'dd/MM/yyyy',
    t,
    formatCurrency,
    formatDate,
    onBack: fn(),
    onEditTransaction: fn(),
    lang: 'es',
    defaultCountry: 'Chile',
    foreignLocationFormat: 'flag',
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// SCAN-037: Recent scans shell — mobile
// ---------------------------------------------------------------------------

export const SCAN_037_RecentScansMobile: Story = {
  name: 'SCAN-037 · Recent scans — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Últimos Escaneados')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-038: Recent scans — default state — mobile
// ---------------------------------------------------------------------------

export const SCAN_038_RecentScansDefault: Story = {
  name: 'SCAN-038 · Recent scans default — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Jumbo')).toBeInTheDocument();
    await expect(canvas.getByText('Lider')).toBeInTheDocument();
    await expect(canvas.getByText('Farmacia Ahumada')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-039: Recent scans — default state — tablet/desktop
// ---------------------------------------------------------------------------

export const SCAN_039_RecentScansDesktop: Story = {
  name: 'SCAN-039 · Recent scans — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Últimos Escaneados')).toBeInTheDocument();
    await expect(canvas.getByText('Jumbo')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-040: Recent scans — empty — mobile
// ---------------------------------------------------------------------------

export const SCAN_040_RecentScansEmpty: Story = {
  name: 'SCAN-040 · Recent scans empty — mobile',
  args: { transactions: [] },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Últimos Escaneados')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_037a_DarkMode: Story = {
  name: 'SCAN-037a · Dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div className="dark" style={{ minHeight: '100vh', background: '#1a1a2e' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Últimos Escaneados')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Tablet
// ---------------------------------------------------------------------------

export const SCAN_037b_Tablet: Story = {
  name: 'SCAN-037b · Tablet viewport',
  parameters: { viewport: { defaultViewport: 'tablet' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Últimos Escaneados')).toBeInTheDocument();
  },
};
