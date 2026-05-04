import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { ToastSystem } from './ToastSystem';

const SAMPLE_TOASTS = [
  { id: '1', variant: 'success' as const, message: 'Transacción guardada correctamente.' },
  { id: '2', variant: 'info' as const, message: 'Se sincronizaron 3 boletas nuevas.' },
  { id: '3', variant: 'warning' as const, message: 'Quedan 2 escaneos este mes.' },
  { id: '4', variant: 'error' as const, message: 'Error al conectar con el servidor.' },
];

function ToastSystemDemo() {
  const [toasts, setToasts] = React.useState(SAMPLE_TOASTS.slice(0, 3));

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAdd = () => {
    const next = SAMPLE_TOASTS.find((t) => !toasts.some((existing) => existing.id === t.id));
    if (next) {
      setToasts((prev) => [...prev, next]);
    }
  };

  return (
    <>
      <button type="button" onClick={handleAdd}>Agregar toast</button>
      <ToastSystem toasts={toasts} onDismiss={handleDismiss} />
    </>
  );
}

const meta: Meta<typeof ToastSystem> = {
  title: 'Design System/Molecules/ToastSystem',
  component: ToastSystem,
  args: {
    toasts: SAMPLE_TOASTS.slice(0, 2),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ToastSystem>;

export const Default: Story = {};

export const MaxThree: Story = {
  args: {
    toasts: SAMPLE_TOASTS.slice(0, 3),
  },
};

export const OverflowHidden: Story = {
  args: {
    toasts: SAMPLE_TOASTS,
    onDismiss: fn(),
  },
};

export const DismissToast: Story = {
  args: {
    toasts: [
      { id: 'dismiss-1', variant: 'success', message: 'Gasto registrado exitosamente.' },
    ],
    onDismiss: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dismissBtn = canvas.getByRole('button', { name: 'Cerrar' });
    await userEvent.click(dismissBtn);
    await expect(args.onDismiss).toHaveBeenCalledWith('dismiss-1');
  },
};

export const Interactive: Story = {
  render: () => <ToastSystemDemo />,
};

export const AllVariants: Story = {
  args: {
    toasts: [
      { id: 'v1', variant: 'success', message: 'Operación exitosa.' },
      { id: 'v2', variant: 'info', message: 'Información relevante.' },
      { id: 'v3', variant: 'warning', message: 'Atención requerida.' },
    ],
    onDismiss: fn(),
  },
};
