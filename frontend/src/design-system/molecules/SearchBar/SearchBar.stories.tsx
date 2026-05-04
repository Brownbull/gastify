import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SearchBar } from './SearchBar';

function SearchBarDemo({ placeholder }: { placeholder?: string }) {
  const [value, setValue] = React.useState('');
  return <SearchBar value={value} onChange={setValue} placeholder={placeholder} />;
}

const meta: Meta<typeof SearchBar> = {
  title: 'Design System/Molecules/SearchBar',
  component: SearchBar,
  decorators: [(Story) => <div style={{ maxWidth: '360px' }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Empty: Story = {
  render: () => <SearchBarDemo />,
};

export const WithPlaceholder: Story = {
  render: () => <SearchBarDemo placeholder="Buscar transacciones..." />,
};

export const TypeAndClear: Story = {
  render: () => <SearchBarDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('searchbox');
    await userEvent.type(input, 'supermercado');
    await expect(input).toHaveValue('supermercado');
    const clearBtn = canvas.getByRole('button', { name: /limpiar/i });
    await userEvent.click(clearBtn);
    await expect(input).toHaveValue('');
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SearchBarDemo placeholder="Vacío..." />
      <SearchBarDemo placeholder="Buscar transacciones..." />
    </div>
  ),
};
