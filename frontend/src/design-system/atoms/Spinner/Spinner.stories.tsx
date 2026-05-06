import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Design System/Atoms/Spinner',
  component: Spinner,
  argTypes: {
    size: {
      options: ['sm', 'md', 'lg'],
      control: { type: 'inline-radio' },
    },
    color: {
      options: ['primary', 'white', 'green', 'orange', 'red', 'gray'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    size: 'md',
    color: 'primary',
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const WithLabel: Story = {
  args: { label: 'Cargando datos...' },
};

export const WhiteOnDark: Story = {
  render: () => (
    <div
      style={{
        backgroundColor: 'var(--primary)',
        padding: '24px',
        borderRadius: '12px',
        display: 'inline-flex',
      }}
    >
      <Spinner color="white" />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Spinner color="primary" />
      <Spinner color="green" />
      <Spinner color="orange" />
      <Spinner color="red" />
      <Spinner color="gray" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </div>
      <Spinner label="Procesando boleta..." />
      <Spinner label="Sincronizando datos..." color="green" />
    </div>
  ),
};
