import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Design System/Atoms/Avatar',
  component: Avatar,
  argTypes: {
    size: {
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      control: { type: 'inline-radio' },
    },
    color: {
      options: ['primary', 'green', 'orange', 'purple'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    name: 'Carlos Muñoz',
    size: 'md',
    color: 'primary',
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: { name: 'Carlos Muñoz' },
};

export const WithImage: Story = {
  args: {
    name: 'Ana López',
    src: 'https://i.pravatar.cc/150?u=ana',
  },
};

export const BrokenImage: Story = {
  args: {
    name: 'Ana López',
    src: 'https://invalid-url.example/broken.jpg',
  },
};

export const SingleName: Story = {
  args: { name: 'Admin' },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Avatar name="Carlos Muñoz" size="xs" />
      <Avatar name="Carlos Muñoz" size="sm" />
      <Avatar name="Carlos Muñoz" size="md" />
      <Avatar name="Carlos Muñoz" size="lg" />
      <Avatar name="Carlos Muñoz" size="xl" />
    </div>
  ),
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Avatar name="Ana López" color="primary" />
      <Avatar name="Beto Ríos" color="green" />
      <Avatar name="Carla Díaz" color="orange" />
      <Avatar name="Diego Soto" color="purple" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Avatar name="Carlos Muñoz" size="xs" />
        <Avatar name="Carlos Muñoz" size="sm" />
        <Avatar name="Carlos Muñoz" size="md" />
        <Avatar name="Carlos Muñoz" size="lg" />
        <Avatar name="Carlos Muñoz" size="xl" />
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Avatar name="Ana López" color="primary" />
        <Avatar name="Beto Ríos" color="green" />
        <Avatar name="Carla Díaz" color="orange" />
        <Avatar name="Diego Soto" color="purple" />
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Avatar name="Ana López" src="https://i.pravatar.cc/150?u=ana" />
        <Avatar name="Beto Ríos" src="https://invalid-url.example/broken.jpg" />
      </div>
    </div>
  ),
};
