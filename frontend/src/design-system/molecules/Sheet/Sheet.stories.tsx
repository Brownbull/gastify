import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Sheet } from './Sheet';

function SheetDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir panel</button>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <h3 style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
          Filtrar transacciones
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Selecciona las categorías que deseas ver en el reporte mensual.
        </p>
      </Sheet>
    </>
  );
}

const meta: Meta<typeof Sheet> = {
  title: 'Design System/Molecules/Sheet',
  component: Sheet,
  args: {
    open: true,
    onClose: fn(),
    children: 'Contenido del panel inferior.',
  },
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {};

export const OpenClose: Story = {
  render: () => <SheetDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openBtn = canvas.getByRole('button', { name: 'Abrir panel' });
    await userEvent.click(openBtn);

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    const backdrop = within(document.body).getByTestId('sheet-backdrop');
    await userEvent.click(backdrop);
    await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <SheetDemo />
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--surface)',
          color: 'var(--text-secondary)',
          fontSize: '14px',
        }}
      >
        El Sheet se abre desde la parte inferior de la pantalla.
      </div>
    </div>
  ),
};
