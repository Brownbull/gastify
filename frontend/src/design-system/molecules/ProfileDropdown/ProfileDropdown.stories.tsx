import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Settings, CreditCard, LogOut, HelpCircle } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';

const DEMO_ITEMS = [
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'billing', label: 'Facturación', icon: CreditCard },
  { id: 'help', label: 'Ayuda', icon: HelpCircle },
  { id: 'logout', label: 'Cerrar sesión', icon: LogOut },
] as const;

const meta: Meta<typeof ProfileDropdown> = {
  title: 'Design System/Molecules/ProfileDropdown',
  component: ProfileDropdown,
};

export default meta;
type Story = StoryObj<typeof ProfileDropdown>;

export const Default: Story = {
  args: {
    name: 'María González',
    items: DEMO_ITEMS,
    onSelect: fn(),
  },
};

export const WithAvatar: Story = {
  args: {
    name: 'Carlos López',
    avatarSrc: 'https://i.pravatar.cc/150?u=carlos',
    items: DEMO_ITEMS,
    onSelect: fn(),
  },
};

export const DropdownOpenAndClick: Story = {
  args: {
    name: 'María González',
    items: DEMO_ITEMS,
    onSelect: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const profileBtn = canvas.getByRole('button', { name: 'Menú de perfil' });
    await userEvent.click(profileBtn);
    const settingsItem = canvas.getByRole('menuitem', { name: 'Configuración' });
    await expect(settingsItem).toBeInTheDocument();
    await userEvent.click(settingsItem);
    await expect(args.onSelect).toHaveBeenCalledWith('settings');
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Sin avatar
        </p>
        <ProfileDropdown name="María González" items={DEMO_ITEMS} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Con avatar
        </p>
        <ProfileDropdown
          name="Carlos López"
          avatarSrc="https://i.pravatar.cc/150?u=carlos"
          items={DEMO_ITEMS}
        />
      </div>
    </div>
  ),
};
