import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { StateTabs, useStateTabs } from './StateTabs';

const DEMO_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expense', label: 'Gastos' },
] as const;

function StateTabsDemo({ variant }: { variant?: 'pill' | 'flat' }) {
  const { activeTab, onTabChange } = useStateTabs(DEMO_TABS);
  return <StateTabs tabs={DEMO_TABS} activeTab={activeTab} onTabChange={onTabChange} variant={variant} />;
}

const meta: Meta<typeof StateTabs> = {
  title: 'Design System/Molecules/StateTabs',
  component: StateTabs,
  argTypes: {
    variant: { options: ['pill', 'flat'], control: { type: 'inline-radio' } },
  },
};

export default meta;
type Story = StoryObj<typeof StateTabs>;

export const Pill: Story = {
  render: () => <StateTabsDemo variant="pill" />,
};

export const Flat: Story = {
  render: () => <StateTabsDemo variant="flat" />,
};

export const FiveTabs: Story = {
  render: () => {
    const tabs = [
      { id: 'all', label: 'Todos' },
      { id: 'food', label: 'Comida' },
      { id: 'transport', label: 'Transporte' },
      { id: 'health', label: 'Salud' },
      { id: 'other', label: 'Otros' },
    ];
    const Demo = () => {
      const state = useStateTabs(tabs);
      return <StateTabs tabs={tabs} {...state} />;
    };
    return <Demo />;
  },
};

export const TabSwitch: Story = {
  render: () => <StateTabsDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const expenseTab = canvas.getByRole('tab', { name: 'Gastos' });
    await userEvent.click(expenseTab);
    await expect(expenseTab).toHaveAttribute('aria-selected', 'true');
    const allTab = canvas.getByRole('tab', { name: 'Todos' });
    await expect(allTab).toHaveAttribute('aria-selected', 'false');
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>Pill</p>
        <StateTabsDemo variant="pill" />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>Flat</p>
        <StateTabsDemo variant="flat" />
      </div>
    </div>
  ),
};
