import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { QuickSaveCard } from './QuickSaveCard';

const meta: Meta<typeof QuickSaveCard> = {
  title: 'Design System/Molecules/QuickSaveCard',
  component: QuickSaveCard,
  decorators: [(Story) => <div style={{ maxWidth: '380px' }}><Story /></div>],
  args: {
    merchant: 'Jumbo',
    amount: '$23.490',
    category: 'Supermercado',
    onSave: fn(),
    onEdit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof QuickSaveCard>;

export const Default: Story = {};

export const LongMerchant: Story = {
  args: {
    merchant: 'Farmacias Cruz Verde - Sucursal Las Condes',
    amount: '$8.990',
    category: 'Salud',
  },
};

export const HighAmount: Story = {
  args: {
    merchant: 'Falabella',
    amount: '$1.234.567',
    category: 'Entretenimiento',
  },
};

export const ClickSave: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const saveBtn = canvas.getByRole('button', { name: /guardar transaccion/i });
    await userEvent.click(saveBtn);
    await expect(args.onSave).toHaveBeenCalledTimes(1);
  },
};

export const ClickEdit: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const editBtn = canvas.getByRole('button', { name: /editar transaccion/i });
    await userEvent.click(editBtn);
    await expect(args.onEdit).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '380px' }}>
      <QuickSaveCard merchant="Jumbo" amount="$23.490" category="Supermercado" onSave={fn()} onEdit={fn()} />
      <QuickSaveCard merchant="Shell" amount="$45.000" category="Transporte" onSave={fn()} onEdit={fn()} />
      <QuickSaveCard merchant="Farmacias Cruz Verde" amount="$8.990" category="Salud" onSave={fn()} onEdit={fn()} />
    </div>
  ),
};
