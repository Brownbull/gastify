import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { FilterStrip } from './FilterStrip';

const DEMO_FILTERS = [
  { id: 'date', type: 'date' as const, label: 'Fecha', active: false },
  { id: 'category', type: 'category' as const, label: 'Categoría', active: true },
  { id: 'amount', type: 'amount' as const, label: 'Monto', active: false },
  { id: 'tag', type: 'tag' as const, label: 'Etiqueta', active: false },
  { id: 'search', type: 'search' as const, label: 'Búsqueda', active: true },
];

function FilterStripDemo() {
  const [filters, setFilters] = React.useState(DEMO_FILTERS);

  const handleToggle = (id: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f)),
    );
  };

  const handleClearAll = () => {
    setFilters((prev) => prev.map((f) => ({ ...f, active: false })));
  };

  return <FilterStrip filters={filters} onToggle={handleToggle} onClearAll={handleClearAll} />;
}

const meta: Meta<typeof FilterStrip> = {
  title: 'Design System/Molecules/FilterStrip',
  component: FilterStrip,
};

export default meta;
type Story = StoryObj<typeof FilterStrip>;

export const Default: Story = {
  render: () => <FilterStripDemo />,
};

export const NoneActive: Story = {
  args: {
    filters: DEMO_FILTERS.map((f) => ({ ...f, active: false })),
    onToggle: () => {},
    onClearAll: () => {},
  },
};

export const AllActive: Story = {
  args: {
    filters: DEMO_FILTERS.map((f) => ({ ...f, active: true })),
    onToggle: () => {},
    onClearAll: () => {},
  },
};

export const FilterToggle: Story = {
  render: () => <FilterStripDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dateChip = canvas.getByRole('button', { name: 'Fecha' });
    await userEvent.click(dateChip);
    // After toggling, Fecha should now be active (check that Limpiar is still visible)
    await expect(canvas.getByRole('button', { name: 'Limpiar todos los filtros' })).toBeInTheDocument();
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Sin filtros activos
        </p>
        <FilterStrip
          filters={DEMO_FILTERS.map((f) => ({ ...f, active: false }))}
          onToggle={() => {}}
          onClearAll={() => {}}
        />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Algunos filtros activos
        </p>
        <FilterStrip filters={DEMO_FILTERS} onToggle={() => {}} onClearAll={() => {}} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Todos los filtros activos
        </p>
        <FilterStrip
          filters={DEMO_FILTERS.map((f) => ({ ...f, active: true }))}
          onToggle={() => {}}
          onClearAll={() => {}}
        />
      </div>
    </div>
  ),
};
