import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pill } from './Pill';

const meta: Meta<typeof Pill> = {
  title: 'Design System/Atoms/Pill',
  component: Pill,
  argTypes: {
    color: {
      options: ['green', 'blue', 'orange', 'red', 'purple', 'gray'],
      control: { type: 'select' },
    },
  },
  args: {
    children: 'Supermercado',
    color: 'green',
  },
};

export default meta;
type Story = StoryObj<typeof Pill>;

export const Default: Story = {
  args: { children: 'Supermercado', color: 'green' },
};

export const Blue: Story = {
  args: { children: 'Transporte', color: 'blue' },
};

export const Orange: Story = {
  args: { children: 'Restaurante', color: 'orange' },
};

export const Red: Story = {
  args: { children: 'Urgente', color: 'red' },
};

export const Purple: Story = {
  args: { children: 'Entretenimiento', color: 'purple' },
};

export const Gray: Story = {
  args: { children: 'Sin categoría', color: 'gray' },
};

export const WithIcon: Story = {
  args: {
    children: 'Supermercado',
    color: 'green',
    icon: <span>🛒</span>,
  },
};

export const LongText: Story = {
  args: {
    children: 'Supermercado y productos de limpieza para el hogar',
    color: 'blue',
  },
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      <Pill color="green">Supermercado</Pill>
      <Pill color="blue">Transporte</Pill>
      <Pill color="orange">Restaurante</Pill>
      <Pill color="red">Salud</Pill>
      <Pill color="purple">Entretenimiento</Pill>
      <Pill color="gray">Sin categoría</Pill>
    </div>
  ),
};
