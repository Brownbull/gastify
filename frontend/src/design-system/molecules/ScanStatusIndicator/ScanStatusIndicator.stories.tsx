import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScanStatusIndicator } from './ScanStatusIndicator';

const meta: Meta<typeof ScanStatusIndicator> = {
  title: 'Design System/Molecules/ScanStatusIndicator',
  component: ScanStatusIndicator,
  argTypes: {
    status: { options: ['idle', 'processing', 'complete', 'error'], control: { type: 'inline-radio' } },
  },
  args: { status: 'idle' },
};

export default meta;
type Story = StoryObj<typeof ScanStatusIndicator>;

export const Idle: Story = { args: { status: 'idle' } };
export const Processing: Story = { args: { status: 'processing' } };
export const Complete: Story = { args: { status: 'complete' } };
export const Error: Story = { args: { status: 'error' } };

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <ScanStatusIndicator status="idle" />
      <ScanStatusIndicator status="processing" />
      <ScanStatusIndicator status="complete" />
      <ScanStatusIndicator status="error" />
    </div>
  ),
};
