import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Home, Receipt, Camera, BarChart3, User } from 'lucide-react';
import { NavBottom } from './NavBottom';

const DEMO_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'expenses', label: 'Gastos', icon: Receipt, badge: 3 },
  { id: 'scan', label: 'Escanear', icon: Camera },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'profile', label: 'Perfil', icon: User },
] as const;

function NavBottomDemo() {
  const [active, setActive] = React.useState('home');
  return <NavBottom items={DEMO_ITEMS} activeItem={active} onItemChange={setActive} />;
}

const meta: Meta<typeof NavBottom> = {
  title: 'Design System/Molecules/NavBottom',
  component: NavBottom,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof NavBottom>;

export const Default: Story = {
  render: () => <NavBottomDemo />,
};

export const WithBadges: Story = {
  args: {
    items: [
      { id: 'home', label: 'Inicio', icon: Home },
      { id: 'expenses', label: 'Gastos', icon: Receipt, badge: 5 },
      { id: 'scan', label: 'Escanear', icon: Camera },
      { id: 'reports', label: 'Reportes', icon: BarChart3, badge: 1 },
      { id: 'profile', label: 'Perfil', icon: User, badge: 120 },
    ],
    activeItem: 'home',
    onItemChange: () => {},
  },
};

export const TabSwitch: Story = {
  render: () => <NavBottomDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const gastosTab = canvas.getByRole('tab', { name: 'Gastos' });
    await userEvent.click(gastosTab);
    await expect(gastosTab).toHaveAttribute('aria-selected', 'true');
    const homeTab = canvas.getByRole('tab', { name: 'Inicio' });
    await expect(homeTab).toHaveAttribute('aria-selected', 'false');
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Inicio activo
        </p>
        <NavBottom items={DEMO_ITEMS} activeItem="home" onItemChange={() => {}} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Escanear activo
        </p>
        <NavBottom items={DEMO_ITEMS} activeItem="scan" onItemChange={() => {}} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Perfil activo
        </p>
        <NavBottom items={DEMO_ITEMS} activeItem="profile" onItemChange={() => {}} />
      </div>
    </div>
  ),
};
