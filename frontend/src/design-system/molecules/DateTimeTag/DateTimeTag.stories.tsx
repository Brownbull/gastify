import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateTimeTag } from './DateTimeTag';

const meta: Meta<typeof DateTimeTag> = {
  title: 'Design System/Molecules/DateTimeTag',
  component: DateTimeTag,
  argTypes: {
    mode: { options: ['relative', 'absolute'], control: { type: 'inline-radio' } },
  },
  args: { date: new Date(), mode: 'relative' },
};

export default meta;
type Story = StoryObj<typeof DateTimeTag>;

export const JustNow: Story = { args: { date: new Date() } };
export const MinutesAgo: Story = { args: { date: new Date(Date.now() - 15 * 60000) } };
export const HoursAgo: Story = { args: { date: new Date(Date.now() - 3 * 3600000) } };
export const DaysAgo: Story = { args: { date: new Date(Date.now() - 2 * 86400000) } };
export const Absolute: Story = { args: { date: new Date(2026, 4, 1, 14, 30), mode: 'absolute' } };

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <DateTimeTag date={new Date()} />
      <DateTimeTag date={new Date(Date.now() - 15 * 60000)} />
      <DateTimeTag date={new Date(Date.now() - 3 * 3600000)} />
      <DateTimeTag date={new Date(Date.now() - 2 * 86400000)} />
      <DateTimeTag date={new Date(2026, 4, 1, 14, 30)} mode="absolute" />
    </div>
  ),
};
