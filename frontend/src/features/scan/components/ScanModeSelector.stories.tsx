import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, userEvent, fn } from 'storybook/test';
import { ScanModeSelector, type ScanModeSelectorProps } from './ScanModeSelector';

const t = (key: string, params?: Record<string, string | number>): string => {
  const translations: Record<string, string> = {
    scanModeSelectorTitle: 'Modo de escaneo',
    scanModeSingle: 'Boleta individual',
    scanModeSingleDesc: 'Escanea una boleta a la vez',
    scanModeBatch: 'Escaneo múltiple',
    scanModeBatchDesc: 'Escanea varias boletas seguidas',
    scanModeStatement: 'Estado de cuenta',
    scanModeStatementDesc: 'Importa desde tu banco',
    comingSoon: 'Próximamente',
    scanModeCredit: `${params?.count ?? 1} crédito`,
  };
  return translations[key] ?? key;
};

const defaultArgs: ScanModeSelectorProps = {
  isOpen: true,
  onClose: fn(),
  onSelectMode: fn(),
  normalCredits: 25,
  superCredits: 5,
  t,
};

const meta: Meta<ScanModeSelectorProps> = {
  title: 'Features/Scan/ScanModeSelector',
  component: ScanModeSelector,
  args: defaultArgs,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<ScanModeSelectorProps>;

// ---------------------------------------------------------------------------
// SCAN-001: Scan mode selector shell — mobile
// ---------------------------------------------------------------------------

export const SCAN_001_MobileModeSelector: Story = {
  name: 'SCAN-001 · Mode selector — mobile',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('scan-mode-selector')).toBeInTheDocument();
    await expect(canvas.getByTestId('scan-mode-single')).toBeInTheDocument();
    await expect(canvas.getByTestId('scan-mode-batch')).toBeInTheDocument();
    await expect(canvas.getByTestId('scan-mode-statement')).toBeInTheDocument();
    await expect(canvas.getByTestId('super-credits-badge')).toBeInTheDocument();
    await expect(canvas.getByTestId('normal-credits-badge')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// SCAN-002: Scan mode selector shell — tablet/desktop
// ---------------------------------------------------------------------------

export const SCAN_002_DesktopModeSelector: Story = {
  name: 'SCAN-002 · Mode selector — desktop',
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('scan-mode-selector')).toBeInTheDocument();
    await expect(canvas.getByTestId('scan-mode-single')).toBeInTheDocument();
    await expect(canvas.getByTestId('scan-mode-batch')).toBeInTheDocument();
    await expect(canvas.getByTestId('scan-mode-statement')).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Mode selection interaction
// ---------------------------------------------------------------------------

export const SCAN_001a_SelectSingleMode: Story = {
  name: 'SCAN-001a · Select single mode',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const singleBtn = canvas.getByTestId('scan-mode-single');
    await userEvent.click(singleBtn);
    await expect(args.onSelectMode).toHaveBeenCalledWith('single');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const SCAN_001b_SelectBatchMode: Story = {
  name: 'SCAN-001b · Select batch mode',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const batchBtn = canvas.getByTestId('scan-mode-batch');
    await userEvent.click(batchBtn);
    await expect(args.onSelectMode).toHaveBeenCalledWith('batch');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const SCAN_001c_SelectStatementMode: Story = {
  name: 'SCAN-001c · Select statement mode',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const statementBtn = canvas.getByTestId('scan-mode-statement');
    await userEvent.click(statementBtn);
    await expect(args.onSelectMode).toHaveBeenCalledWith('statement');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// Credit states
// ---------------------------------------------------------------------------

export const SCAN_001d_HighCredits: Story = {
  name: 'SCAN-001d · High credit balance (1K+)',
  args: { normalCredits: 2500, superCredits: 150 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const superBadge = canvas.getByTestId('super-credits-badge');
    await expect(superBadge).toHaveTextContent('150');
    const normalBadge = canvas.getByTestId('normal-credits-badge');
    await expect(normalBadge).toHaveTextContent('2K');
  },
};

export const SCAN_001e_ZeroNormalCredits: Story = {
  name: 'SCAN-001e · Zero normal credits',
  args: { normalCredits: 0, superCredits: 3 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const singleBtn = canvas.getByTestId('scan-mode-single');
    await expect(singleBtn).toBeDisabled();
    const batchBtn = canvas.getByTestId('scan-mode-batch');
    await expect(batchBtn).not.toBeDisabled();
  },
};

export const SCAN_001f_ZeroSuperCredits: Story = {
  name: 'SCAN-001f · Zero super credits',
  args: { normalCredits: 10, superCredits: 0 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const batchBtn = canvas.getByTestId('scan-mode-batch');
    await expect(batchBtn).toBeDisabled();
    const singleBtn = canvas.getByTestId('scan-mode-single');
    await expect(singleBtn).not.toBeDisabled();
  },
};

export const SCAN_001g_ZeroAllCredits: Story = {
  name: 'SCAN-001g · Zero credits (all modes disabled)',
  args: { normalCredits: 0, superCredits: 0 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('scan-mode-single')).toBeDisabled();
    await expect(canvas.getByTestId('scan-mode-batch')).toBeDisabled();
    await expect(canvas.getByTestId('scan-mode-statement')).not.toBeDisabled();
  },
};

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

export const SCAN_001h_KeyboardNavigation: Story = {
  name: 'SCAN-001h · Keyboard navigation',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('scan-mode-selector')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// Backdrop click
// ---------------------------------------------------------------------------

export const SCAN_001i_BackdropClose: Story = {
  name: 'SCAN-001i · Backdrop click closes',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const backdrop = canvas.getByTestId('scan-mode-selector-backdrop');
    await userEvent.click(backdrop);
    await expect(args.onClose).toHaveBeenCalled();
  },
};

// ---------------------------------------------------------------------------
// Closed state
// ---------------------------------------------------------------------------

export const SCAN_001j_Closed: Story = {
  name: 'SCAN-001j · Closed (renders nothing)',
  args: { isOpen: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const selector = canvas.queryByTestId('scan-mode-selector');
    await expect(selector).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

export const SCAN_001k_DarkMode: Story = {
  name: 'SCAN-001k · Dark mode',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark" style={{ minHeight: '100vh', background: '#1a1a2e' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('scan-mode-selector')).toBeInTheDocument();
  },
};
