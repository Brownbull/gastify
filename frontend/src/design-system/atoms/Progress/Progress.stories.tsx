import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Design System/Atoms/Progress',
  component: Progress,
  argTypes: {
    size: {
      options: ['sm', 'md', 'lg'],
      control: { type: 'inline-radio' },
    },
    color: {
      options: ['primary', 'green', 'orange', 'red', 'blue'],
      control: { type: 'inline-radio' },
    },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  args: {
    value: 65,
    size: 'md',
    color: 'primary',
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 65 },
};

export const Empty: Story = {
  args: { value: 0 },
};

export const Full: Story = {
  args: { value: 100 },
};

export const Indeterminate: Story = {
  args: { value: undefined },
};

export const Small: Story = {
  args: { value: 40, size: 'sm' },
};

export const Large: Story = {
  args: { value: 75, size: 'lg' },
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
      <Progress value={70} color="primary" />
      <Progress value={55} color="green" />
      <Progress value={45} color="orange" />
      <Progress value={30} color="red" />
      <Progress value={85} color="blue" />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
      <Progress value={60} size="sm" />
      <Progress value={60} size="md" />
      <Progress value={60} size="lg" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>0%</p>
        <Progress value={0} />
      </div>
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>25%</p>
        <Progress value={25} color="blue" />
      </div>
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>50%</p>
        <Progress value={50} color="orange" />
      </div>
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>100%</p>
        <Progress value={100} color="green" />
      </div>
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>Indeterminado</p>
        <Progress />
      </div>
    </div>
  ),
};
