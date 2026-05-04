import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { TimeSelector } from './TimeSelector';

const DEFAULT_PERIODS = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: '1y', label: '1 ano' },
] as const;

const meta: Meta<typeof TimeSelector> = {
  title: 'Design System/Molecules/TimeSelector',
  component: TimeSelector,
  decorators: [(Story) => <div style={{ maxWidth: '480px' }}><Story /></div>],
  args: {
    activePeriod: '30d',
    periods: DEFAULT_PERIODS,
    onPeriodChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TimeSelector>;

export const Default: Story = {};

export const FirstActive: Story = {
  args: { activePeriod: '7d' },
};

export const LastActive: Story = {
  args: { activePeriod: '1y' },
};

export const TwoPeriods: Story = {
  args: {
    activePeriod: 'mes',
    periods: [
      { id: 'semana', label: 'Semana' },
      { id: 'mes', label: 'Mes' },
    ],
  },
};

export const SwitchPeriod: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const tab90d = canvas.getByRole('tab', { name: '90 dias' });
    await userEvent.click(tab90d);
    await expect(args.onPeriodChange).toHaveBeenCalledWith('90d');
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
      <TimeSelector activePeriod="7d" periods={DEFAULT_PERIODS} onPeriodChange={fn()} />
      <TimeSelector activePeriod="30d" periods={DEFAULT_PERIODS} onPeriodChange={fn()} />
      <TimeSelector activePeriod="90d" periods={DEFAULT_PERIODS} onPeriodChange={fn()} />
      <TimeSelector activePeriod="1y" periods={DEFAULT_PERIODS} onPeriodChange={fn()} />
      <TimeSelector
        activePeriod="hoy"
        periods={[
          { id: 'hoy', label: 'Hoy' },
          { id: 'semana', label: 'Semana' },
          { id: 'mes', label: 'Mes' },
          { id: 'trimestre', label: 'Trimestre' },
          { id: 'ano', label: 'Ano' },
          { id: 'todo', label: 'Todo' },
        ]}
        onPeriodChange={fn()}
      />
    </div>
  ),
};
