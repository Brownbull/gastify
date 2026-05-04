import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Drawer } from './Drawer';

function DrawerDemo({ side, title }: { side?: 'left' | 'right'; title?: string }) {
  const [open, setOpen] = React.useState(false);
  const label = side === 'left' ? 'Abrir izquierda' : 'Abrir derecha';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>{label}</button>
      <Drawer open={open} onClose={() => setOpen(false)} side={side} title={title}>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ color: 'var(--text-primary)' }}>Inicio</li>
            <li style={{ color: 'var(--text-secondary)' }}>Transacciones</li>
            <li style={{ color: 'var(--text-secondary)' }}>Reportes</li>
            <li style={{ color: 'var(--text-secondary)' }}>Configuración</li>
          </ul>
        </nav>
      </Drawer>
    </>
  );
}

const meta: Meta<typeof Drawer> = {
  title: 'Design System/Molecules/Drawer',
  component: Drawer,
  args: {
    open: true,
    onClose: fn(),
    side: 'right',
    title: 'Menú',
    children: 'Contenido del drawer.',
  },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Right: Story = {};

export const Left: Story = {
  args: { side: 'left', title: 'Navegación' },
};

export const WithoutTitle: Story = {
  args: { title: undefined },
};

export const OpenClose: Story = {
  render: () => <DrawerDemo side="right" title="Menú principal" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir derecha' }));

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    const closeBtn = within(dialog).getByRole('button', { name: 'Cerrar' });
    await userEvent.click(closeBtn);
    await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const BackdropClose: Story = {
  render: () => <DrawerDemo side="left" title="Panel" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abrir izquierda' }));

    await within(document.body).findByRole('dialog');
    const backdrop = within(document.body).getByTestId('drawer-backdrop');
    await userEvent.click(backdrop);
    await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px' }}>
      <DrawerDemo side="left" title="Izquierda" />
      <DrawerDemo side="right" title="Derecha" />
    </div>
  ),
};
