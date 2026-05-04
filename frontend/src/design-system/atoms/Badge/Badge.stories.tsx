import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Design System/Atoms/Badge',
  component: Badge,
  argTypes: {
    variant: {
      options: ['default', 'success', 'warning', 'danger'],
      control: { type: 'inline-radio' },
    },
    count: { control: { type: 'number', min: 0, max: 999 } },
  },
  args: {
    count: 3,
    variant: 'default',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { count: 3 },
};

export const Success: Story = {
  args: { count: 5, variant: 'success' },
};

export const Warning: Story = {
  args: { count: 12, variant: 'warning' },
};

export const Danger: Story = {
  args: { count: 1, variant: 'danger' },
};

export const HighCount: Story = {
  args: { count: 150 },
};

export const OnNavItem: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <span style={{ fontSize: '24px' }}>🔔</span>
        <span style={{ position: 'absolute', top: '-4px', right: '-8px' }}>
          <Badge count={3} variant="danger" />
        </span>
      </div>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <span style={{ fontSize: '24px' }}>📬</span>
        <span style={{ position: 'absolute', top: '-4px', right: '-8px' }}>
          <Badge count={99} />
        </span>
      </div>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <span style={{ fontSize: '24px' }}>⚙️</span>
        <span style={{ position: 'absolute', top: '-4px', right: '-8px' }}>
          <Badge count={150} variant="warning" />
        </span>
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Badge count={3} variant="default" />
      <Badge count={5} variant="success" />
      <Badge count={12} variant="warning" />
      <Badge count={1} variant="danger" />
      <Badge count={150} variant="default" />
    </div>
  ),
};
