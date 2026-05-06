import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Home,
  Settings,
  Search,
  Bell,
  Camera,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Design System/Atoms/Icon',
  component: Icon,
  argTypes: {
    size: {
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    icon: Home,
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  args: { icon: Home },
};

export const WithColor: Story = {
  args: { icon: Bell, color: 'var(--primary)' },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Icon icon={Home} size="xs" />
      <Icon icon={Home} size="sm" />
      <Icon icon={Home} size="md" />
      <Icon icon={Home} size="lg" />
      <Icon icon={Home} size="xl" />
    </div>
  ),
};

export const CommonIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Icon icon={Home} />
      <Icon icon={Settings} />
      <Icon icon={Search} />
      <Icon icon={Bell} />
      <Icon icon={Camera} />
      <Icon icon={TrendingUp} />
      <Icon icon={CreditCard} />
      <Icon icon={ShoppingCart} />
      <Icon icon={Receipt} />
      <Icon icon={BarChart3} />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Icon icon={Home} size="xs" />
        <Icon icon={Home} size="sm" />
        <Icon icon={Home} size="md" />
        <Icon icon={Home} size="lg" />
        <Icon icon={Home} size="xl" />
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Icon icon={Camera} color="var(--primary)" />
        <Icon icon={TrendingUp} color="var(--positive)" />
        <Icon icon={Bell} color="var(--warning)" />
        <Icon icon={CreditCard} color="var(--error)" />
        <Icon icon={Search} color="var(--info)" />
      </div>
    </div>
  ),
};
