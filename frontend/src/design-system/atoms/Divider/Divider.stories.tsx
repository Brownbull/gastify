import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './Divider';

const meta: Meta<typeof Divider> = {
  title: 'Design System/Atoms/Divider',
  component: Divider,
  argTypes: {
    orientation: {
      options: ['horizontal', 'vertical'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    orientation: 'horizontal',
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const WithLabel: Story = {
  args: { label: 'o continuar con' },
};

export const Vertical: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '40px' }}>
      <span style={{ color: 'var(--text-primary)' }}>Izquierda</span>
      <Divider orientation="vertical" />
      <span style={{ color: 'var(--text-primary)' }}>Derecha</span>
    </div>
  ),
};

export const BetweenSections: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <p style={{ color: 'var(--text-primary)' }}>Resumen de gastos del mes</p>
      <Divider />
      <p style={{ color: 'var(--text-primary)' }}>Detalles por categoría</p>
      <Divider label="más información" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Los datos se actualizan cada hora
      </p>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>Horizontal simple</p>
        <Divider />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>Con etiqueta</p>
        <Divider label="o continuar con" />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>Vertical</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '40px' }}>
          <span style={{ color: 'var(--text-primary)' }}>A</span>
          <Divider orientation="vertical" />
          <span style={{ color: 'var(--text-primary)' }}>B</span>
          <Divider orientation="vertical" />
          <span style={{ color: 'var(--text-primary)' }}>C</span>
        </div>
      </div>
    </div>
  ),
};
