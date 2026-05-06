import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Design System/Atoms/Toggle',
  component: Toggle,
  args: {
    checked: false,
    label: 'Modo oscuro',
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

function ToggleDemo(props: { label?: string; disabled?: boolean; defaultChecked?: boolean }) {
  const [checked, setChecked] = React.useState(props.defaultChecked ?? false);
  return <Toggle checked={checked} onChange={setChecked} label={props.label} disabled={props.disabled} />;
}

export const Off: Story = {
  render: () => <ToggleDemo label="Modo oscuro" />,
};

export const On: Story = {
  render: () => <ToggleDemo label="Modo oscuro" defaultChecked />,
};

export const Disabled: Story = {
  render: () => <ToggleDemo label="No disponible" disabled />,
};

export const DisabledOn: Story = {
  render: () => <ToggleDemo label="Siempre activo" disabled defaultChecked />,
};

export const NoLabel: Story = {
  render: () => <ToggleDemo />,
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ToggleDemo label="Apagado" />
      <ToggleDemo label="Encendido" defaultChecked />
      <ToggleDemo label="Deshabilitado apagado" disabled />
      <ToggleDemo label="Deshabilitado encendido" disabled defaultChecked />
    </div>
  ),
};
