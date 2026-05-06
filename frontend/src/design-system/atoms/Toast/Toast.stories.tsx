import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Design System/Atoms/Toast',
  component: Toast,
  argTypes: {
    variant: {
      options: ['success', 'info', 'warning', 'error'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    variant: 'success',
    message: 'Boleta guardada correctamente',
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Success: Story = {
  args: { variant: 'success', message: 'Boleta guardada correctamente' },
};

export const Info: Story = {
  args: { variant: 'info', message: 'Se encontraron 3 boletas nuevas' },
};

export const Warning: Story = {
  args: { variant: 'warning', message: 'Tu saldo de escaneos es bajo' },
};

export const Error: Story = {
  args: { variant: 'error', message: 'No se pudo procesar la boleta' },
};

export const WithDismiss: Story = {
  args: {
    variant: 'info',
    message: 'Sincronizando datos...',
    onDismiss: () => {},
  },
};

export const LongMessage: Story = {
  args: {
    variant: 'warning',
    message: 'La conexión con el servidor es inestable. Los cambios se guardarán localmente hasta que se restablezca la conexión.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
      <Toast variant="success" message="Boleta guardada correctamente" onDismiss={() => {}} />
      <Toast variant="info" message="Se encontraron 3 boletas nuevas" onDismiss={() => {}} />
      <Toast variant="warning" message="Tu saldo de escaneos es bajo" onDismiss={() => {}} />
      <Toast variant="error" message="No se pudo procesar la boleta" onDismiss={() => {}} />
    </div>
  ),
};
