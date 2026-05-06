import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { ErrorFallback } from './ErrorFallback';

const meta: Meta<typeof ErrorFallback> = {
  title: 'Design System/Molecules/ErrorFallback',
  component: ErrorFallback,
  args: {
    error: 'No se pudieron cargar las transacciones. Por favor, verifica tu conexión.',
    onRetry: fn(),
    onGoHome: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ErrorFallback>;

export const Default: Story = {};

export const NetworkError: Story = {
  args: {
    error: 'Error de red: no se pudo conectar con el servidor. Revisa tu conexión a internet.',
  },
};

export const ServerError: Story = {
  args: {
    error: 'Error interno del servidor (500). El equipo ha sido notificado.',
  },
};

export const RetryClick: Story = {
  args: {
    error: 'Fallo al sincronizar los datos.',
    onRetry: fn(),
    onGoHome: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const retryBtn = canvas.getByRole('button', { name: /reintentar/i });
    await userEvent.click(retryBtn);
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const GoHomeClick: Story = {
  args: {
    error: 'Página no encontrada.',
    onRetry: fn(),
    onGoHome: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const homeBtn = canvas.getByRole('button', { name: /ir al inicio/i });
    await userEvent.click(homeBtn);
    await expect(args.onGoHome).toHaveBeenCalledTimes(1);
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '500px' }}>
      <ErrorFallback
        error="Error de conexión: no se pudieron cargar los datos."
        onRetry={() => {}}
        onGoHome={() => {}}
      />
      <ErrorFallback
        error="Error 403: no tienes permisos para acceder a este recurso."
        onRetry={() => {}}
        onGoHome={() => {}}
      />
      <ErrorFallback
        error="La sesión ha expirado. Inicia sesión nuevamente."
        onRetry={() => {}}
        onGoHome={() => {}}
      />
    </div>
  ),
};
