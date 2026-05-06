import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Camera, PenLine, FileText } from 'lucide-react';
import { FAB } from './FAB';

const DEMO_ITEMS = [
  { id: 'scan', label: 'Escanear boleta', icon: Camera },
  { id: 'manual', label: 'Ingreso manual', icon: PenLine },
  { id: 'template', label: 'Desde plantilla', icon: FileText },
] as const;

const meta: Meta<typeof FAB> = {
  title: 'Design System/Molecules/FAB',
  component: FAB,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FAB>;

export const Default: Story = {
  args: { items: DEMO_ITEMS, onSelect: fn() },
};

export const MenuOpenAndSelect: Story = {
  args: { items: DEMO_ITEMS, onSelect: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const fabBtn = canvas.getByRole('button', { name: 'Abrir menú' });
    await userEvent.click(fabBtn);
    const scanItem = canvas.getByRole('menuitem', { name: 'Escanear boleta' });
    await expect(scanItem).toBeInTheDocument();
    await userEvent.click(scanItem);
    await expect(args.onSelect).toHaveBeenCalledWith('scan');
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ position: 'relative', height: '400px', backgroundColor: 'var(--background)' }}>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', padding: '16px' }}>
        Haz clic en el botón + para expandir el menú
      </p>
      <FAB items={DEMO_ITEMS} onSelect={() => {}} />
    </div>
  ),
};
