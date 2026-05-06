import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { ListItem } from './ListItem';

const meta: Meta<typeof ListItem> = {
  title: 'Design System/Molecules/ListItem',
  component: ListItem,
  decorators: [(Story) => <div style={{ maxWidth: '400px' }}><Story /></div>],
  argTypes: {
    variant: { options: ['navigable', 'selectable', 'swipeable'], control: { type: 'inline-radio' } },
  },
  args: {
    variant: 'navigable',
    label: 'Configuración de cuenta',
  },
};

export default meta;
type Story = StoryObj<typeof ListItem>;

export const Navigable: Story = {
  args: {
    variant: 'navigable',
    label: 'Configuración de cuenta',
    description: 'Edita tu perfil, email y preferencias',
    onClick: fn(),
  },
};

export const Selectable: Story = {
  args: {
    variant: 'selectable',
    label: 'Alimentación',
    description: 'Categoría de gastos',
    selected: false,
    onSelect: fn(),
  },
};

export const SelectableSelected: Story = {
  args: {
    variant: 'selectable',
    label: 'Transporte',
    description: 'Categoría de gastos',
    selected: true,
    onSelect: fn(),
  },
};

export const Swipeable: Story = {
  args: {
    variant: 'swipeable',
    label: 'Supermercado Líder',
    description: '$45.890 — 1 mayo 2025',
    onClick: fn(),
  },
};

export const SelectionToggle: Story = {
  args: {
    variant: 'selectable',
    label: 'Entretenimiento',
    description: 'Categoría de gastos',
    selected: false,
    onSelect: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox', { name: /select/i });
    await userEvent.click(checkbox);
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ maxWidth: '400px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <ListItem
        variant="navigable"
        label="Configuración de cuenta"
        description="Edita tu perfil, email y preferencias"
        onClick={() => {}}
      />
      <ListItem
        variant="navigable"
        label="Notificaciones"
        description="Gestiona tus alertas"
        onClick={() => {}}
      />
      <ListItem
        variant="selectable"
        label="Alimentación"
        description="Categoría activa"
        selected
        onSelect={() => {}}
      />
      <ListItem
        variant="selectable"
        label="Transporte"
        description="Categoría inactiva"
        selected={false}
        onSelect={() => {}}
      />
      <ListItem
        variant="swipeable"
        label="Supermercado Líder"
        description="$45.890 — 1 mayo 2025"
        onClick={() => {}}
      />
    </div>
  ),
};
