import type { Meta, StoryObj, StoryFn } from '@storybook/react-vite';
import { within, expect, userEvent, fn } from 'storybook/test';
import { StatementScanView, type StatementScanViewProps } from './StatementScanView';
import { useScanStore, initialScanState } from '../store';

const t = (key: string): string => {
  const translations: Record<string, string> = {
    back: 'Volver',
    statementScanTitle: 'Estado de Cuenta',
    comingSoon: 'Próximamente',
    statementScanDescription:
      'Pronto podrás escanear estados de cuenta de tarjetas de crédito y añadir transacciones automáticamente.',
    returnToHome: 'Volver al inicio',
  };
  return translations[key] ?? key;
};

function withScanState(overrides: Record<string, unknown>) {
  return (Story: StoryFn) => {
    useScanStore.setState({ ...initialScanState, ...overrides } as never);
    return <Story />;
  };
}

const meta: Meta<StatementScanViewProps> = {
  title: 'Features/Scan/Views/StatementScanView',
  component: StatementScanView,
  args: {
    theme: 'light',
    t,
    onBack: fn(),
  },
  decorators: [withScanState({ phase: 'idle', mode: 'statement' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<StatementScanViewProps>;

// ---------------------------------------------------------------------------
// SCAN-032: Statement upload shell — mobile
// ---------------------------------------------------------------------------

export const SCAN_032_StatementMobile: Story = {
  name: 'SCAN-032 · Statement view — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('statement-scan-view')).toBeInTheDocument();
    await expect(canvas.getByTestId('credit-card-icon')).toBeInTheDocument();
    await expect(canvas.getByText('Próximamente')).toBeInTheDocument();
    await expect(canvas.getByTestId('back-button')).toBeInTheDocument();
    await expect(canvas.getByTestId('return-button')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Desktop variant
// ---------------------------------------------------------------------------

export const SCAN_032a_StatementDesktop: Story = {
  name: 'SCAN-032a · Statement view — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('statement-scan-view')).toBeInTheDocument();
    await expect(canvas.getByText('Próximamente')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Back button interaction
// ---------------------------------------------------------------------------

export const SCAN_032b_BackButton: Story = {
  name: 'SCAN-032b · Back button navigates',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const backBtn = canvas.getByTestId('back-button');
    await userEvent.click(backBtn);
    await expect(args.onBack).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// Return button interaction
// ---------------------------------------------------------------------------

export const SCAN_032c_ReturnButton: Story = {
  name: 'SCAN-032c · Return to home button',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const returnBtn = canvas.getByTestId('return-button');
    await userEvent.click(returnBtn);
    await expect(args.onBack).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_032d_DarkMode: Story = {
  name: 'SCAN-032d · Dark mode',
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    withScanState({ phase: 'idle', mode: 'statement' }),
    (Story) => (
      <div className="dark" style={{ minHeight: '100vh', background: '#1a1a2e' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('statement-scan-view')).toBeInTheDocument();
    await expect(canvas.getByText('Estado de Cuenta')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Icon and violet theme
// ---------------------------------------------------------------------------

export const SCAN_032e_VioletTheme: Story = {
  name: 'SCAN-032e · Violet theme credit card icon',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('icon-container')).toBeInTheDocument();
    await expect(canvas.getByTestId('credit-card-icon')).toBeInTheDocument();
  },
};
