import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { FilterChips } from './FilterChips';

const meta: Meta<typeof FilterChips> = {
  title: 'Design System/Molecules/FilterChips',
  component: FilterChips,
  decorators: [(Story) => <div style={{ maxWidth: '400px' }}><Story /></div>],
  args: {
    filters: [
      { id: 'cat-food', label: 'Alimentación' },
      { id: 'cat-transport', label: 'Transporte' },
      { id: 'date-may', label: 'Mayo 2025' },
    ],
    onRemove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FilterChips>;

export const Default: Story = {
  args: {
    filters: [
      { id: 'cat-food', label: 'Alimentación' },
      { id: 'cat-transport', label: 'Transporte' },
      { id: 'date-may', label: 'Mayo 2025' },
    ],
    onRemove: fn(),
  },
};

export const SingleFilter: Story = {
  args: {
    filters: [{ id: 'cat-food', label: 'Alimentación' }],
    onRemove: fn(),
  },
};

export const ManyFilters: Story = {
  args: {
    filters: [
      { id: 'cat-food', label: 'Alimentación' },
      { id: 'cat-transport', label: 'Transporte' },
      { id: 'cat-health', label: 'Salud' },
      { id: 'cat-entertainment', label: 'Entretenimiento' },
      { id: 'date-may', label: 'Mayo 2025' },
      { id: 'currency-clp', label: 'CLP' },
      { id: 'type-expense', label: 'Gastos' },
    ],
    onRemove: fn(),
  },
};

export const RemoveChip: Story = {
  args: {
    filters: [
      { id: 'cat-food', label: 'Alimentación' },
      { id: 'cat-transport', label: 'Transporte' },
    ],
    onRemove: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const removeBtn = canvas.getByRole('button', { name: /eliminar alimentación/i });
    await userEvent.click(removeBtn);
    await expect(args.onRemove).toHaveBeenCalledWith('cat-food');
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>Un filtro</p>
        <FilterChips
          filters={[{ id: 'cat-food', label: 'Alimentación' }]}
          onRemove={() => {}}
        />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>Múltiples filtros</p>
        <FilterChips
          filters={[
            { id: 'cat-food', label: 'Alimentación' },
            { id: 'cat-transport', label: 'Transporte' },
            { id: 'date-may', label: 'Mayo 2025' },
          ]}
          onRemove={() => {}}
        />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>Scroll horizontal</p>
        <FilterChips
          filters={[
            { id: '1', label: 'Alimentación' },
            { id: '2', label: 'Transporte' },
            { id: '3', label: 'Salud' },
            { id: '4', label: 'Entretenimiento' },
            { id: '5', label: 'Mayo 2025' },
            { id: '6', label: 'CLP' },
            { id: '7', label: 'Gastos' },
          ]}
          onRemove={() => {}}
        />
      </div>
    </div>
  ),
};
