import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { CardFeature } from './CardFeature';

const meta: Meta<typeof CardFeature> = {
  title: 'Design System/Molecules/CardFeature',
  component: CardFeature,
  decorators: [(Story) => <div style={{ maxWidth: '360px' }}><Story /></div>],
  argTypes: {
    variant: { options: ['promotion', 'cohort', 'upgrade'], control: { type: 'inline-radio' } },
  },
  args: {
    variant: 'promotion',
    title: 'Oferta especial',
    description: 'Obtén un 20% de descuento en tu próxima suscripción premium.',
    ctaLabel: 'Ver oferta',
  },
};

export default meta;
type Story = StoryObj<typeof CardFeature>;

export const Promotion: Story = {
  args: {
    variant: 'promotion',
    title: 'Oferta especial',
    description: 'Obtén un 20% de descuento en tu próxima suscripción premium.',
    ctaLabel: 'Ver oferta',
    onAction: fn(),
    onDismiss: fn(),
  },
};

export const Cohort: Story = {
  args: {
    variant: 'cohort',
    title: 'Comparte con tu grupo',
    description: 'Invita a amigos para comparar gastos de forma anónima y encontrar oportunidades de ahorro.',
    ctaLabel: 'Invitar amigos',
    onAction: fn(),
    onDismiss: fn(),
  },
};

export const Upgrade: Story = {
  args: {
    variant: 'upgrade',
    title: 'Pasa a Premium',
    description: 'Escaneo ilimitado de boletas, reportes avanzados y soporte multi-divisa.',
    ctaLabel: 'Mejorar plan',
    onAction: fn(),
    onDismiss: fn(),
  },
};

export const CTAClick: Story = {
  args: {
    variant: 'upgrade',
    title: 'Pasa a Premium',
    description: 'Desbloquea todas las funcionalidades.',
    ctaLabel: 'Mejorar plan',
    onAction: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cta = canvas.getByRole('button', { name: 'Mejorar plan' });
    await userEvent.click(cta);
    await expect(args.onAction).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
      <CardFeature
        variant="promotion"
        title="Oferta especial"
        description="Obtén un 20% de descuento en tu próxima suscripción premium."
        ctaLabel="Ver oferta"
        onAction={() => {}}
        onDismiss={() => {}}
      />
      <CardFeature
        variant="cohort"
        title="Comparte con tu grupo"
        description="Invita a amigos para comparar gastos de forma anónima."
        ctaLabel="Invitar amigos"
        onAction={() => {}}
        onDismiss={() => {}}
      />
      <CardFeature
        variant="upgrade"
        title="Pasa a Premium"
        description="Escaneo ilimitado de boletas, reportes avanzados y soporte multi-divisa."
        ctaLabel="Mejorar plan"
        onAction={() => {}}
        onDismiss={() => {}}
      />
    </div>
  ),
};
