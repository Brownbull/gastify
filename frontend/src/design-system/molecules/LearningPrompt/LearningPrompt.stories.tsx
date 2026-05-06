import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { LearningPrompt } from './LearningPrompt';

const meta: Meta<typeof LearningPrompt> = {
  title: 'Design System/Molecules/LearningPrompt',
  component: LearningPrompt,
  decorators: [(Story) => <div style={{ maxWidth: '400px' }}><Story /></div>],
  args: {
    merchant: 'Jumbo',
    suggestedCategory: 'Supermercado',
    confidence: 92,
    onAccept: fn(),
    onReject: fn(),
    alwaysLearn: false,
    onAlwaysLearnChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof LearningPrompt>;

export const HighConfidence: Story = {
  args: { confidence: 92 },
};

export const MediumConfidence: Story = {
  args: { merchant: 'Copec', suggestedCategory: 'Transporte', confidence: 65 },
};

export const LowConfidence: Story = {
  args: { merchant: 'Tienda Desconocida', suggestedCategory: 'Otro', confidence: 25 },
};

export const AlwaysLearnChecked: Story = {
  args: { alwaysLearn: true },
};

export const ClickAccept: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const acceptBtn = canvas.getByRole('button', { name: /aceptar sugerencia/i });
    await userEvent.click(acceptBtn);
    await expect(args.onAccept).toHaveBeenCalledTimes(1);
  },
};

export const ClickReject: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const rejectBtn = canvas.getByRole('button', { name: /rechazar sugerencia/i });
    await userEvent.click(rejectBtn);
    await expect(args.onReject).toHaveBeenCalledTimes(1);
  },
};

export const ToggleAlwaysLearn: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox', { name: /siempre aprender/i });
    await userEvent.click(checkbox);
    await expect(args.onAlwaysLearnChange).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <LearningPrompt merchant="Jumbo" suggestedCategory="Supermercado" confidence={92} onAccept={fn()} onReject={fn()} alwaysLearn={false} onAlwaysLearnChange={fn()} />
      <LearningPrompt merchant="Copec" suggestedCategory="Transporte" confidence={65} onAccept={fn()} onReject={fn()} alwaysLearn={true} onAlwaysLearnChange={fn()} />
      <LearningPrompt merchant="Tienda Desconocida" suggestedCategory="Otro" confidence={25} onAccept={fn()} onReject={fn()} alwaysLearn={false} onAlwaysLearnChange={fn()} />
    </div>
  ),
};
