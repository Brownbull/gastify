import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Design System/Atoms/Skeleton',
  component: Skeleton,
  argTypes: {
    shape: {
      options: ['text', 'circle', 'rect', 'card', 'list-item'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    shape: 'text',
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Text: Story = {
  args: { shape: 'text' },
};

export const Circle: Story = {
  args: { shape: 'circle' },
};

export const Rect: Story = {
  args: { shape: 'rect' },
};

export const Card: Story = {
  args: { shape: 'card' },
};

export const ListItem: Story = {
  args: { shape: 'list-item' },
};

export const CustomSize: Story = {
  args: { shape: 'rect', width: '200px', height: '100px' },
};

export const AllShapes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <Skeleton shape="text" />
      <Skeleton shape="text" width="60%" />
      <Skeleton shape="circle" />
      <Skeleton shape="rect" />
      <Skeleton shape="card" />
      <Skeleton shape="list-item" />
      <Skeleton shape="list-item" />
    </div>
  ),
};
