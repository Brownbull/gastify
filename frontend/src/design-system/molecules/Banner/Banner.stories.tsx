import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Banner } from './Banner';

const meta: Meta<typeof Banner> = {
  title: 'Design System/Molecules/Banner',
  component: Banner,
  argTypes: {
    variant: { options: ['info', 'warning', 'error', 'offline'], control: { type: 'inline-radio' } },
  },
  args: { variant: 'info', message: 'Nueva versión disponible.' },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Info: Story = { args: { variant: 'info', message: 'Se sincronizaron 5 transacciones nuevas.' } };
export const Warning: Story = { args: { variant: 'warning', message: 'Tu plan gratuito tiene 3 escaneos restantes.' } };
export const Error: Story = { args: { variant: 'error', message: 'Error al sincronizar datos. Reintenta.' } };
export const Offline: Story = { args: { variant: 'offline', message: 'Sin conexión. Los cambios se guardarán localmente.' } };

export const Dismissible: Story = {
  args: { variant: 'info', message: 'Puedes cerrar este aviso.', onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: 'Cerrar' });
    await userEvent.click(btn);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Banner variant="info" message="Información general." onDismiss={() => {}} />
      <Banner variant="warning" message="Advertencia importante." onDismiss={() => {}} />
      <Banner variant="error" message="Error crítico." onDismiss={() => {}} />
      <Banner variant="offline" message="Sin conexión a internet." />
    </div>
  ),
};
