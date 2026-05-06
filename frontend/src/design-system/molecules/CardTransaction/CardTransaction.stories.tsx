import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { CardTransaction } from './CardTransaction';

const meta: Meta<typeof CardTransaction> = {
  title: 'Design System/Molecules/CardTransaction',
  component: CardTransaction,
  decorators: [(Story) => <div style={{ maxWidth: '420px' }}><Story /></div>],
  args: {
    merchant: 'Supermercado Líder',
    amount: 45890,
    currency: 'CLP',
    category: 'Alimentación',
    date: new Date('2025-05-01'),
    type: 'expense',
  },
};

export default meta;
type Story = StoryObj<typeof CardTransaction>;

export const Expense: Story = {
  args: {
    merchant: 'Supermercado Líder',
    amount: 45890,
    currency: 'CLP',
    category: 'Alimentación',
    date: new Date('2025-05-01'),
    type: 'expense',
  },
};

export const Income: Story = {
  args: {
    merchant: 'Transferencia recibida',
    amount: 890000,
    currency: 'CLP',
    category: 'Hogar',
    date: new Date('2025-04-28'),
    type: 'income',
  },
};

export const USD: Story = {
  args: {
    merchant: 'Amazon.com',
    amount: 59.99,
    currency: 'USD',
    category: 'Entretenimiento',
    date: new Date('2025-04-30'),
    type: 'expense',
  },
};

export const EUR: Story = {
  args: {
    merchant: 'Booking.com',
    amount: 120.5,
    currency: 'EUR',
    category: 'Transporte',
    date: new Date('2025-04-25'),
    type: 'expense',
  },
};

export const Selected: Story = {
  args: {
    merchant: 'Farmacia Ahumada',
    amount: 12300,
    currency: 'CLP',
    category: 'Salud',
    date: new Date('2025-05-02'),
    type: 'expense',
    selected: true,
    onSelect: fn(),
  },
};

export const ExpandCollapse: Story = {
  args: {
    merchant: 'Copec Estación',
    amount: 35000,
    currency: 'CLP',
    category: 'Transporte',
    date: new Date('2025-05-03'),
    type: 'expense',
    expanded: false,
    onExpand: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const expandBtn = canvas.getByRole('button', { name: /expandir/i });
    await userEvent.click(expandBtn);
    await expect(args.onExpand).toHaveBeenCalledTimes(1);
  },
};

export const Expanded: Story = {
  args: {
    merchant: 'Copec Estación',
    amount: 35000,
    currency: 'CLP',
    category: 'Transporte',
    date: new Date('2025-05-03'),
    type: 'expense',
    expanded: true,
    onExpand: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const collapseBtn = canvas.getByRole('button', { name: /contraer/i });
    await userEvent.click(collapseBtn);
    await expect(args.onExpand).toHaveBeenCalledTimes(1);
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '420px' }}>
      <CardTransaction
        merchant="Supermercado Líder"
        amount={45890}
        currency="CLP"
        category="Alimentación"
        date={new Date('2025-05-01')}
        type="expense"
      />
      <CardTransaction
        merchant="Transferencia recibida"
        amount={890000}
        currency="CLP"
        category="Hogar"
        date={new Date('2025-04-28')}
        type="income"
      />
      <CardTransaction
        merchant="Amazon.com"
        amount={59.99}
        currency="USD"
        category="Entretenimiento"
        date={new Date('2025-04-30')}
        type="expense"
        selected
        onSelect={() => {}}
      />
      <CardTransaction
        merchant="Copec Estación"
        amount={35000}
        currency="CLP"
        category="Transporte"
        date={new Date('2025-05-03')}
        type="expense"
        expanded
        onExpand={() => {}}
      />
    </div>
  ),
};
