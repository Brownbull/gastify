import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateGroupHeader } from './DateGroupHeader';

const meta: Meta<typeof DateGroupHeader> = {
  title: 'Design System/Molecules/DateGroupHeader',
  component: DateGroupHeader,
};

export default meta;
type Story = StoryObj<typeof DateGroupHeader>;

export const Today: Story = {
  args: { date: new Date() },
};

export const Yesterday: Story = {
  args: { date: new Date(Date.now() - 86400000) },
};

export const OlderDate: Story = {
  args: { date: new Date(2026, 3, 15) },
};

export const Sticky: Story = {
  args: { date: new Date(), sticky: true },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <DateGroupHeader date={new Date()} />
      <DateGroupHeader date={new Date(Date.now() - 86400000)} />
      <DateGroupHeader date={new Date(2026, 3, 15)} />
      <DateGroupHeader date={new Date(2025, 11, 25)} />
    </div>
  ),
};
