import type { Meta, StoryObj } from '@storybook/react-vite';
import { CategoryBadge } from './CategoryBadge';

const meta: Meta<typeof CategoryBadge> = {
  title: 'Design System/Molecules/CategoryBadge',
  component: CategoryBadge,
  argTypes: {
    category: {
      options: ['supermercado', 'restaurante', 'transporte', 'salud', 'servicios', 'hogar', 'educacion', 'deporte', 'entretenimiento', 'otro'],
      control: { type: 'select' },
    },
  },
  args: { category: 'supermercado', label: 'Supermercado' },
};

export default meta;
type Story = StoryObj<typeof CategoryBadge>;

export const Default: Story = {
  args: { category: 'supermercado', label: 'Supermercado' },
};

export const CustomLabel: Story = {
  args: { category: 'restaurante', label: 'Comida rápida' },
};

export const LongLabel: Story = {
  args: { category: 'entretenimiento', label: 'Entretenimiento y actividades recreativas' },
};

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <CategoryBadge category="supermercado" label="Supermercado" />
      <CategoryBadge category="restaurante" label="Restaurante" />
      <CategoryBadge category="transporte" label="Transporte" />
      <CategoryBadge category="salud" label="Salud" />
      <CategoryBadge category="servicios" label="Servicios" />
      <CategoryBadge category="hogar" label="Hogar" />
      <CategoryBadge category="educacion" label="Educación" />
      <CategoryBadge category="deporte" label="Deporte" />
      <CategoryBadge category="entretenimiento" label="Entretenimiento" />
      <CategoryBadge category="otro" label="Otro" />
    </div>
  ),
};
