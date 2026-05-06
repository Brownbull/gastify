import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { CardEmpty } from './CardEmpty';

const meta: Meta<typeof CardEmpty> = {
  title: 'Design System/Molecules/CardEmpty',
  component: CardEmpty,
  decorators: [(Story) => <div style={{ maxWidth: '400px' }}><Story /></div>],
  args: { title: 'Sin transacciones', variant: 'primary' },
};

export default meta;
type Story = StoryObj<typeof CardEmpty>;

export const Primary: Story = {
  args: {
    title: 'Sin transacciones',
    description: 'Escanea tu primera boleta para comenzar a registrar tus gastos.',
    ctaLabel: 'Escanear boleta',
    onAction: fn(),
  },
};

export const FilterEmpty: Story = {
  args: {
    variant: 'filter-empty',
    title: 'Sin resultados',
    description: 'No se encontraron transacciones con los filtros aplicados.',
    ctaLabel: 'Limpiar filtros',
    onAction: fn(),
  },
};

export const FilterEmptyDuplicates: Story = {
  args: {
    variant: 'filter-empty-duplicates',
    title: 'Sin duplicados',
    description: 'No se detectaron transacciones duplicadas.',
  },
};

export const CTAClick: Story = {
  args: {
    title: 'Sin transacciones',
    ctaLabel: 'Escanear boleta',
    onAction: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Escanear boleta' });
    await userEvent.click(button);
    await expect(args.onAction).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <CardEmpty
        variant="primary"
        title="Sin transacciones"
        description="Escanea tu primera boleta para comenzar."
        ctaLabel="Escanear boleta"
        onAction={() => {}}
      />
      <CardEmpty
        variant="filter-empty"
        title="Sin resultados"
        description="No se encontraron transacciones con los filtros aplicados."
        ctaLabel="Limpiar filtros"
        onAction={() => {}}
      />
      <CardEmpty
        variant="filter-empty-duplicates"
        title="Sin duplicados"
        description="No se detectaron transacciones duplicadas."
      />
    </div>
  ),
};
