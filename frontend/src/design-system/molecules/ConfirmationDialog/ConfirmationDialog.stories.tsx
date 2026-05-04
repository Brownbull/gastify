import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { ConfirmationDialog } from './ConfirmationDialog';

function ConfirmDialogDemo({ variant }: { variant?: 'default' | 'danger' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Mostrar diálogo</button>
      <ConfirmationDialog
        open={open}
        title={variant === 'danger' ? 'Eliminar transacción' : 'Confirmar acción'}
        message={
          variant === 'danger'
            ? 'Esta acción no se puede deshacer. ¿Deseas eliminar esta transacción?'
            : '¿Estás seguro de que deseas continuar?'
        }
        confirmLabel={variant === 'danger' ? 'Eliminar' : 'Confirmar'}
        cancelLabel="Cancelar"
        variant={variant}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

const meta: Meta<typeof ConfirmationDialog> = {
  title: 'Design System/Molecules/ConfirmationDialog',
  component: ConfirmationDialog,
  args: {
    open: true,
    title: 'Confirmar acción',
    message: '¿Deseas guardar los cambios realizados?',
    confirmLabel: 'Guardar',
    cancelLabel: 'Cancelar',
    variant: 'default',
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmationDialog>;

export const Default: Story = {};

export const Danger: Story = {
  args: {
    title: 'Eliminar gasto',
    message: 'Esta acción eliminará el registro permanentemente. ¿Continuar?',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    variant: 'danger',
  },
};

export const ConfirmAction: Story = {
  args: {
    title: 'Confirmar pago',
    message: '¿Registrar este pago de $45.000 CLP?',
    confirmLabel: 'Registrar',
    cancelLabel: 'Volver',
    onConfirm: fn(),
    onCancel: fn(),
  },
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('alertdialog');
    const confirmBtn = within(dialog).getByRole('button', { name: 'Registrar' });
    await userEvent.click(confirmBtn);
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

export const CancelAction: Story = {
  args: {
    title: 'Descartar cambios',
    message: 'Tienes cambios sin guardar. ¿Deseas descartarlos?',
    confirmLabel: 'Descartar',
    cancelLabel: 'Seguir editando',
    variant: 'danger',
    onConfirm: fn(),
    onCancel: fn(),
  },
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('alertdialog');
    const cancelBtn = within(dialog).getByRole('button', { name: 'Seguir editando' });
    await userEvent.click(cancelBtn);
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px' }}>
      <ConfirmDialogDemo variant="default" />
      <ConfirmDialogDemo variant="danger" />
    </div>
  ),
};
