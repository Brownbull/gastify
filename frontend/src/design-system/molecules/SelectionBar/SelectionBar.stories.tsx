import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { SelectionBar } from './SelectionBar';

const meta: Meta<typeof SelectionBar> = {
  title: 'Design System/Molecules/SelectionBar',
  component: SelectionBar,
  decorators: [(Story) => <div style={{ maxWidth: '480px' }}><Story /></div>],
  args: {
    count: 3,
    onDelete: fn(),
    onCategorize: fn(),
    onExport: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SelectionBar>;

export const Default: Story = {
  args: { count: 3, onDelete: fn(), onCategorize: fn(), onExport: fn(), onDismiss: fn() },
};

export const SingleItem: Story = {
  args: { count: 1, onDelete: fn(), onCategorize: fn(), onExport: fn(), onDismiss: fn() },
};

export const ManyItems: Story = {
  args: { count: 47, onDelete: fn(), onCategorize: fn(), onExport: fn(), onDismiss: fn() },
};

export const DeleteOnly: Story = {
  args: { count: 2, onDelete: fn(), onDismiss: fn() },
};

export const DismissAction: Story = {
  args: { count: 5, onDelete: fn(), onCategorize: fn(), onExport: fn(), onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dismissBtn = canvas.getByRole('button', { name: /cancelar selección/i });
    await userEvent.click(dismissBtn);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
      <SelectionBar count={1} onDelete={() => {}} onCategorize={() => {}} onExport={() => {}} onDismiss={() => {}} />
      <SelectionBar count={5} onDelete={() => {}} onCategorize={() => {}} onExport={() => {}} onDismiss={() => {}} />
      <SelectionBar count={47} onDelete={() => {}} onDismiss={() => {}} />
    </div>
  ),
};
