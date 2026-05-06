import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Form } from './Form';

const DEMO_STEPS = [
  { id: 'details', label: 'Detalles' },
  { id: 'category', label: 'Categoría' },
  { id: 'confirm', label: 'Confirmar' },
] as const;

function FormDemo() {
  const [step, setStep] = React.useState(0);

  return (
    <Form
      steps={DEMO_STEPS}
      activeStep={step}
      onNext={() => setStep((s) => Math.min(s + 1, DEMO_STEPS.length - 1))}
      onBack={() => setStep((s) => Math.max(s - 1, 0))}
    >
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      >
        <p style={{ color: 'var(--text-primary)' }}>
          Contenido del paso: <strong>{DEMO_STEPS[step].label}</strong>
        </p>
      </div>
    </Form>
  );
}

const meta: Meta<typeof Form> = {
  title: 'Design System/Molecules/Form',
  component: Form,
};

export default meta;
type Story = StoryObj<typeof Form>;

export const Default: Story = {
  render: () => <FormDemo />,
};

export const StepOne: Story = {
  args: {
    steps: DEMO_STEPS,
    activeStep: 0,
    children: <p style={{ color: 'var(--text-primary)' }}>Paso 1: Detalles de la transacción</p>,
  },
};

export const StepTwo: Story = {
  args: {
    steps: DEMO_STEPS,
    activeStep: 1,
    children: <p style={{ color: 'var(--text-primary)' }}>Paso 2: Seleccionar categoría</p>,
  },
};

export const StepThree: Story = {
  args: {
    steps: DEMO_STEPS,
    activeStep: 2,
    children: <p style={{ color: 'var(--text-primary)' }}>Paso 3: Revisar y confirmar</p>,
  },
};

export const StepNavigation: Story = {
  render: () => <FormDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nextBtn = canvas.getByRole('button', { name: 'Next' });
    await userEvent.click(nextBtn);
    const backBtn = canvas.getByRole('button', { name: 'Back' });
    await expect(backBtn).not.toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(canvas.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {DEMO_STEPS.map((_, index) => (
        <div key={index}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '8px' }}>
            Paso {index + 1} de {DEMO_STEPS.length}
          </p>
          <Form steps={DEMO_STEPS} activeStep={index}>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            >
              <p style={{ color: 'var(--text-primary)' }}>{DEMO_STEPS[index].label}</p>
            </div>
          </Form>
        </div>
      ))}
    </div>
  ),
};
