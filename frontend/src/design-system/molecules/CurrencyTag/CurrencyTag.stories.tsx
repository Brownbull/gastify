import type { Meta, StoryObj } from '@storybook/react-vite';
import { CurrencyTag } from './CurrencyTag';

const meta: Meta<typeof CurrencyTag> = {
  title: 'Design System/Molecules/CurrencyTag',
  component: CurrencyTag,
  argTypes: {
    currency: { options: ['CLP', 'USD', 'EUR'], control: { type: 'inline-radio' } },
  },
  args: { amount: 15990, currency: 'CLP' },
};

export default meta;
type Story = StoryObj<typeof CurrencyTag>;

export const CLP: Story = { args: { amount: 15990, currency: 'CLP' } };
export const USD: Story = { args: { amount: 29.99, currency: 'USD' } };
export const EUR: Story = { args: { amount: 149.5, currency: 'EUR' } };

export const LargeAmount: Story = { args: { amount: 1250000, currency: 'CLP' } };

export const AllCurrencies: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <CurrencyTag amount={15990} currency="CLP" />
      <CurrencyTag amount={29.99} currency="USD" />
      <CurrencyTag amount={149.5} currency="EUR" />
    </div>
  ),
};
