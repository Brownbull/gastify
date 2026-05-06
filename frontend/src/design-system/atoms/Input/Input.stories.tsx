import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Design System/Atoms/Input',
  component: Input,
  argTypes: {
    inputSize: {
      options: ['sm', 'md', 'lg'],
      control: { type: 'inline-radio' },
    },
    type: {
      options: ['text', 'number', 'search', 'date', 'email'],
      control: { type: 'select' },
    },
    disabled: { control: 'boolean' },
  },
  args: {
    placeholder: 'Ingrese texto',
    inputSize: 'md',
    type: 'text',
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Nombre del comercio' },
};

export const WithLabel: Story = {
  args: { label: 'Comercio', placeholder: 'Ej: Jumbo' },
};

export const WithError: Story = {
  args: { label: 'Monto', value: '-100', error: 'El monto debe ser positivo' },
};

export const WithHint: Story = {
  args: { label: 'Correo', placeholder: 'correo@ejemplo.cl', hint: 'Usaremos este correo para tu cuenta' },
};

export const Disabled: Story = {
  args: { label: 'Categoría', value: 'Supermercado', disabled: true },
};

export const Small: Story = {
  args: { inputSize: 'sm', placeholder: 'Buscar...' },
};

export const Large: Story = {
  args: { inputSize: 'lg', label: 'Monto total', placeholder: '$0' },
};

export const NumberType: Story = {
  args: { type: 'number', label: 'Monto', placeholder: '0' },
};

export const SearchType: Story = {
  args: { type: 'search', placeholder: 'Buscar transacciones...' },
};

export const DateType: Story = {
  args: { type: 'date', label: 'Fecha' },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '320px' }}>
      <Input label="Default" placeholder="Texto aquí" />
      <Input label="Filled" value="Jumbo Las Condes" />
      <Input label="Error" value="-100" error="El monto debe ser positivo" />
      <Input label="Hint" placeholder="correo@ejemplo.cl" hint="Solo para facturación" />
      <Input label="Disabled" value="Bloqueado" disabled />
    </div>
  ),
};
