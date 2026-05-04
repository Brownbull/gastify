import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { MappingsList } from './MappingsList';

const MOCK_MAPPINGS = [
  { id: '1', key: 'JUMBO', value: 'Supermercado' },
  { id: '2', key: 'COPEC', value: 'Transporte' },
  { id: '3', key: 'CRUZ VERDE', value: 'Salud' },
  { id: '4', key: 'ENTEL', value: 'Servicios' },
] as const;

const meta: Meta<typeof MappingsList> = {
  title: 'Design System/Molecules/MappingsList',
  component: MappingsList,
  decorators: [(Story) => <div style={{ maxWidth: '480px' }}><Story /></div>],
  args: {
    mappings: MOCK_MAPPINGS,
    onEdit: fn(),
    onDelete: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MappingsList>;

export const Default: Story = {};

export const SingleMapping: Story = {
  args: {
    mappings: [{ id: '1', key: 'JUMBO', value: 'Supermercado' }],
  },
};

export const EmptyList: Story = {
  args: { mappings: [] },
};

export const ClickEdit: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const editBtn = canvas.getByRole('button', { name: /editar mapeo JUMBO/i });
    await userEvent.click(editBtn);
    await expect(args.onEdit).toHaveBeenCalledWith('1');
  },
};

export const ClickDelete: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const deleteBtn = canvas.getByRole('button', { name: /eliminar mapeo COPEC/i });
    await userEvent.click(deleteBtn);
    await expect(args.onDelete).toHaveBeenCalledWith('2');
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
      <MappingsList mappings={MOCK_MAPPINGS} onEdit={fn()} onDelete={fn()} />
      <MappingsList mappings={[{ id: '1', key: 'SHELL', value: 'Combustible' }]} onEdit={fn()} onDelete={fn()} />
      <MappingsList mappings={[]} onEdit={fn()} onDelete={fn()} />
    </div>
  ),
};
