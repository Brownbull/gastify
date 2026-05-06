import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Modal } from './Modal';

function ModalDemo({ size }: { size?: 'sm' | 'md' | 'lg' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir modal</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirmar acción" size={size}>
        <p>¿Estás seguro de que deseas continuar con esta operación?</p>
      </Modal>
    </>
  );
}

const meta: Meta<typeof Modal> = {
  title: 'Design System/Molecules/Modal',
  component: Modal,
  args: {
    open: true,
    title: 'Detalle de gasto',
    onClose: fn(),
    children: 'Contenido del modal aquí.',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm', title: 'Modal pequeño' },
};

export const Large: Story = {
  args: { size: 'lg', title: 'Resumen mensual de gastos' },
};

export const OpenClose: Story = {
  render: () => <ModalDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openBtn = canvas.getByRole('button', { name: 'Abrir modal' });
    await userEvent.click(openBtn);

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    const closeBtn = within(dialog).getByRole('button', { name: 'Cerrar' });
    await userEvent.click(closeBtn);
    await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const BackdropClose: Story = {
  render: () => <ModalDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir modal' }));

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    const backdrop = within(document.body).getByTestId('modal-backdrop');
    await userEvent.click(backdrop);
    await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ModalDemo size="sm" />
      <ModalDemo size="md" />
      <ModalDemo size="lg" />
    </div>
  ),
};
