import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select';

const CATEGORIES = [
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'salud', label: 'Salud' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
] as const;

const meta: Meta<typeof Select> = {
  title: 'Design System/Atoms/Select',
  component: Select,
  argTypes: {
    selectSize: {
      options: ['sm', 'md', 'lg'],
      control: { type: 'inline-radio' },
    },
    disabled: { control: 'boolean' },
  },
  args: {
    options: CATEGORIES,
    placeholder: 'Seleccionar categoría',
    selectSize: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: { placeholder: 'Seleccionar categoría' },
};

export const WithLabel: Story = {
  args: { label: 'Categoría', placeholder: 'Seleccionar...' },
};

export const Selected: Story = {
  args: { label: 'Categoría', value: 'supermercado' },
};

export const WithError: Story = {
  args: { label: 'Categoría', error: 'Debe seleccionar una categoría' },
};

export const Disabled: Story = {
  args: { label: 'Categoría', value: 'supermercado', disabled: true },
};

export const Small: Story = {
  args: { selectSize: 'sm', placeholder: 'Categoría' },
};

export const Large: Story = {
  args: { selectSize: 'lg', label: 'Categoría principal', placeholder: 'Seleccionar...' },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '320px' }}>
      <Select options={CATEGORIES} placeholder="Empty" label="Empty" />
      <Select options={CATEGORIES} value="supermercado" label="Selected" />
      <Select options={CATEGORIES} placeholder="Categoría" error="Campo requerido" label="Error" />
      <Select options={CATEGORIES} value="restaurante" disabled label="Disabled" />
    </div>
  ),
};
