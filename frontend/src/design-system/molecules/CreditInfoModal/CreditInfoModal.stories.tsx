import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { CreditInfoModal } from './CreditInfoModal';

const meta: Meta<typeof CreditInfoModal> = {
  title: 'Design System/Molecules/CreditInfoModal',
  component: CreditInfoModal,
  args: {
    open: true,
    credits: 42,
    onClose: fn(),
    onPurchase: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CreditInfoModal>;

export const Default: Story = {};

export const FullCredits: Story = {
  args: { credits: 100 },
};

export const LowCredits: Story = {
  args: { credits: 5 },
};

export const ZeroCredits: Story = {
  args: { credits: 0 },
};

export const Closed: Story = {
  args: { open: false },
};

export const ClickClose: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const closeBtn = canvas.getByRole('button', { name: /cerrar/i });
    await userEvent.click(closeBtn);
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const ClickPurchase: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const purchaseBtn = canvas.getByRole('button', { name: /comprar creditos/i });
    await userEvent.click(purchaseBtn);
    await expect(args.onPurchase).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {[100, 75, 42, 10, 0].map((credits) => (
        <div key={credits} style={{ position: 'relative', width: '340px', height: '360px', border: '1px dashed var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <CreditInfoModal open credits={credits} onClose={fn()} onPurchase={fn()} />
        </div>
      ))}
    </div>
  ),
};
