import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Bell } from 'lucide-react';
import { NavTop } from './NavTop';

const meta: Meta<typeof NavTop> = {
  title: 'Design System/Molecules/NavTop',
  component: NavTop,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    variant: { options: ['default', 'elevated', 'minimal'], control: { type: 'inline-radio' } },
  },
};

export default meta;
type Story = StoryObj<typeof NavTop>;

export const Default: Story = {
  args: { variant: 'default', onSearch: fn() },
};

export const Elevated: Story = {
  args: { variant: 'elevated', onSearch: fn() },
};

export const Minimal: Story = {
  args: { variant: 'minimal' },
};

export const WithChildren: Story = {
  args: {
    variant: 'default',
    onSearch: fn(),
    children: (
      <button
        type="button"
        style={{ color: 'var(--text-secondary)', padding: '8px' }}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
      </button>
    ),
  },
};

export const SearchFocus: Story = {
  args: { variant: 'default', onSearch: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const searchBtn = canvas.getByRole('button', { name: 'Buscar' });
    await userEvent.click(searchBtn);
    await expect(args.onSearch).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Default
        </p>
        <NavTop variant="default" onSearch={() => {}} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Elevated
        </p>
        <NavTop variant="elevated" onSearch={() => {}} />
      </div>
      <div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
          Minimal
        </p>
        <NavTop variant="minimal" />
      </div>
    </div>
  ),
};
