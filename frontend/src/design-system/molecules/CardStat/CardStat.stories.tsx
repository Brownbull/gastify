import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { CardStat } from './CardStat';

const meta: Meta<typeof CardStat> = {
  title: 'Design System/Molecules/CardStat',
  component: CardStat,
  decorators: [(Story) => <div style={{ maxWidth: '240px' }}><Story /></div>],
  args: { title: 'Gasto total', value: '$245.890' },
};

export default meta;
type Story = StoryObj<typeof CardStat>;

export const Default: Story = {
  args: { title: 'Gasto total', value: '$245.890' },
};

export const WithDeltaUp: Story = {
  args: { title: 'Ingresos', value: '$890.000', delta: { direction: 'up', label: '+12% vs mes anterior' } },
};

export const WithDeltaDown: Story = {
  args: { title: 'Gastos', value: '$345.200', delta: { direction: 'down', label: '-5% vs mes anterior' } },
};

export const WithDeltaFlat: Story = {
  args: { title: 'Promedio', value: '$12.500', delta: { direction: 'flat', label: 'Sin cambio' } },
};

export const Clickable: Story = {
  args: { title: 'Transacciones', value: '47', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('button');
    await userEvent.click(card);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '500px' }}>
      <CardStat title="Gasto total" value="$245.890" delta={{ direction: 'down', label: '-5%' }} />
      <CardStat title="Ingresos" value="$890.000" delta={{ direction: 'up', label: '+12%' }} />
      <CardStat title="Transacciones" value="47" delta={{ direction: 'flat', label: '0%' }} />
      <CardStat title="Promedio" value="$5.230" />
    </div>
  ),
};
