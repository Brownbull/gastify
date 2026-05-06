import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { PWAUpdatePrompt } from './PWAUpdatePrompt';

const meta: Meta<typeof PWAUpdatePrompt> = {
  title: 'Design System/Molecules/PWAUpdatePrompt',
  component: PWAUpdatePrompt,
  decorators: [(Story) => <div style={{ maxWidth: '480px' }}><Story /></div>],
  args: {
    onRefresh: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PWAUpdatePrompt>;

export const Default: Story = {};

export const ClickRefresh: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const refreshBtn = canvas.getByRole('button', { name: /actualizar ahora/i });
    await userEvent.click(refreshBtn);
    await expect(args.onRefresh).toHaveBeenCalledTimes(1);
  },
};

export const ClickDismiss: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dismissBtn = canvas.getByRole('button', { name: /descartar/i });
    await userEvent.click(dismissBtn);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
      <PWAUpdatePrompt onRefresh={fn()} onDismiss={fn()} />
      <div style={{ maxWidth: '320px' }}>
        <PWAUpdatePrompt onRefresh={fn()} onDismiss={fn()} />
      </div>
    </div>
  ),
};
