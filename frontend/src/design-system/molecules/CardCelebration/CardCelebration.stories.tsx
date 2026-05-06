import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { CardCelebration } from './CardCelebration';

const meta: Meta<typeof CardCelebration> = {
  title: 'Design System/Molecules/CardCelebration',
  component: CardCelebration,
  decorators: [(Story) => <div style={{ maxWidth: '360px' }}><Story /></div>],
  argTypes: {
    variant: { options: ['first-scan', 'streak', 'savings-goal'], control: { type: 'inline-radio' } },
  },
  args: {
    variant: 'first-scan',
    title: '!Primera boleta escaneada!',
    description: 'Has dado el primer paso para controlar tus gastos.',
  },
};

export default meta;
type Story = StoryObj<typeof CardCelebration>;

export const FirstScan: Story = {
  args: {
    variant: 'first-scan',
    title: '!Primera boleta escaneada!',
    description: 'Has dado el primer paso para controlar tus gastos.',
    onDismiss: fn(),
  },
};

export const Streak: Story = {
  args: {
    variant: 'streak',
    title: '!Racha de 7 dias!',
    description: 'Llevas 7 dias seguidos registrando tus gastos. !Sigue asi!',
    streakCount: 7,
    onDismiss: fn(),
  },
};

export const SavingsGoal: Story = {
  args: {
    variant: 'savings-goal',
    title: '!Meta de ahorro alcanzada!',
    description: 'Ahorraste $150.000 este mes. Superaste tu meta en un 15%.',
    onDismiss: fn(),
  },
};

export const DismissAction: Story = {
  args: {
    variant: 'first-scan',
    title: '!Primera boleta!',
    description: 'Bienvenido a Gastify.',
    onDismiss: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const closeBtn = canvas.getByRole('button', { name: 'Cerrar' });
    await userEvent.click(closeBtn);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
      <CardCelebration
        variant="first-scan"
        title="!Primera boleta escaneada!"
        description="Has dado el primer paso para controlar tus gastos."
        onDismiss={() => {}}
      />
      <CardCelebration
        variant="streak"
        title="!Racha de 7 dias!"
        description="Llevas 7 dias seguidos registrando tus gastos."
        streakCount={7}
        onDismiss={() => {}}
      />
      <CardCelebration
        variant="savings-goal"
        title="!Meta de ahorro alcanzada!"
        description="Ahorraste $150.000 este mes. Superaste tu meta en un 15%."
        onDismiss={() => {}}
      />
    </div>
  ),
};
