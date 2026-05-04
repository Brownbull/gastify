import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { SortControl } from './SortControl';

const SORT_FIELDS = [
  { value: 'date', label: 'Fecha' },
  { value: 'amount', label: 'Monto' },
  { value: 'merchant', label: 'Comercio' },
  { value: 'category', label: 'Categoría' },
] as const;

const meta: Meta<typeof SortControl> = {
  title: 'Design System/Molecules/SortControl',
  component: SortControl,
  decorators: [(Story) => <div style={{ maxWidth: '300px' }}><Story /></div>],
  args: {
    field: 'date',
    direction: 'desc',
    fields: SORT_FIELDS,
    onSort: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SortControl>;

export const Default: Story = {
  args: { field: 'date', direction: 'desc', fields: SORT_FIELDS, onSort: fn() },
};

export const Ascending: Story = {
  args: { field: 'amount', direction: 'asc', fields: SORT_FIELDS, onSort: fn() },
};

export const SortChange: Story = {
  args: { field: 'date', direction: 'desc', fields: SORT_FIELDS, onSort: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const toggleBtn = canvas.getByRole('button', { name: /orden descendente/i });
    await userEvent.click(toggleBtn);
    await expect(args.onSort).toHaveBeenCalledWith('date', 'asc');
  },
};

export const FieldChange: Story = {
  args: { field: 'date', direction: 'desc', fields: SORT_FIELDS, onSort: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByRole('combobox', { name: /ordenar por/i });
    await userEvent.selectOptions(select, 'amount');
    await expect(args.onSort).toHaveBeenCalledWith('amount', 'desc');
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '300px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>Fecha descendente</p>
        <SortControl field="date" direction="desc" fields={SORT_FIELDS} onSort={() => {}} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>Monto ascendente</p>
        <SortControl field="amount" direction="asc" fields={SORT_FIELDS} onSort={() => {}} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>Comercio descendente</p>
        <SortControl field="merchant" direction="desc" fields={SORT_FIELDS} onSort={() => {}} />
      </div>
    </div>
  ),
};
