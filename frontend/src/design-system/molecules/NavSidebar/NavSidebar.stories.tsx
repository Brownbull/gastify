import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Home, Receipt, BarChart3, Settings, Tag } from 'lucide-react';
import { NavSidebar } from './NavSidebar';

const DEMO_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'expenses', label: 'Gastos', icon: Receipt },
  { id: 'categories', label: 'Categorías', icon: Tag },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
] as const;

function NavSidebarDemo({ startCollapsed = false }: { startCollapsed?: boolean }) {
  const [active, setActive] = React.useState('home');
  const [collapsed, setCollapsed] = React.useState(startCollapsed);
  return (
    <div style={{ height: '400px' }}>
      <NavSidebar
        items={DEMO_ITEMS}
        activeItem={active}
        onItemChange={setActive}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
    </div>
  );
}

const meta: Meta<typeof NavSidebar> = {
  title: 'Design System/Molecules/NavSidebar',
  component: NavSidebar,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof NavSidebar>;

export const Expanded: Story = {
  render: () => <NavSidebarDemo />,
};

export const Collapsed: Story = {
  render: () => <NavSidebarDemo startCollapsed />,
};

export const ToggleCollapse: Story = {
  render: () => <NavSidebarDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const collapseBtn = canvas.getByRole('button', { name: 'Colapsar menú' });
    await userEvent.click(collapseBtn);
    const expandBtn = canvas.getByRole('button', { name: 'Expandir menú' });
    await expect(expandBtn).toBeInTheDocument();
    await userEvent.click(expandBtn);
    await expect(canvas.getByRole('button', { name: 'Colapsar menú' })).toBeInTheDocument();
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Expandido
        </p>
        <div style={{ height: '400px' }}>
          <NavSidebar
            items={DEMO_ITEMS}
            activeItem="home"
            onItemChange={() => {}}
            collapsed={false}
            onToggleCollapse={() => {}}
          />
        </div>
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Colapsado
        </p>
        <div style={{ height: '400px' }}>
          <NavSidebar
            items={DEMO_ITEMS}
            activeItem="reports"
            onItemChange={() => {}}
            collapsed={true}
            onToggleCollapse={() => {}}
          />
        </div>
      </div>
    </div>
  ),
};
