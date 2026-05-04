import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Design System/Atoms/Chip',
  component: Chip,
  argTypes: {
    variant: {
      options: ['default', 'selected', 'removable'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    label: 'Supermercado',
    variant: 'default',
  },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: { label: 'Supermercado' },
};

export const Selected: Story = {
  args: { label: 'Supermercado', variant: 'selected' },
};

export const Removable: Story = {
  args: { label: 'Supermercado', variant: 'removable' },
};

export const WithCount: Story = {
  args: { label: 'Alimentación', count: 12 },
};

export const SelectedWithCount: Story = {
  args: { label: 'Alimentación', variant: 'selected', count: 5 },
};

export const HighCount: Story = {
  args: { label: 'Transporte', count: 150 },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Chip label="Default" />
      <Chip label="Seleccionado" variant="selected" />
      <Chip label="Removible" variant="removable" />
      <Chip label="Con conteo" count={7} />
      <Chip label="Seleccionado + conteo" variant="selected" count={3} />
    </div>
  ),
};

export const FilterBar: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Chip label="Todos" variant="selected" />
      <Chip label="Supermercado" count={23} />
      <Chip label="Farmacia" count={8} />
      <Chip label="Transporte" count={15} />
      <Chip label="Restaurante" count={4} />
    </div>
  ),
};
