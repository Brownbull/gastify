import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Design System/Atoms/Button",
  component: Button,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Playful Geometric button — ink border, hard offset shadow, extrabold, bounce-press on hover. Hover any button to see the lift.",
      },
    },
  },
  tags: ["autodocs"],
  args: { children: "Guardar", variant: "primary", size: "md" },
  argTypes: {
    variant: { control: "radio", options: ["primary", "secondary", "success", "ghost", "danger"] },
    size: { control: "radio", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-5 bg-gt-bg p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Guardar</Button>
        <Button variant="secondary">Editar</Button>
        <Button variant="success">Confirmar</Button>
        <Button variant="ghost">Cancelar</Button>
        <Button variant="danger">Eliminar</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="sm">Guardar</Button>
        <Button variant="secondary" size="sm">Editar</Button>
        <Button variant="success" size="sm">Confirmar</Button>
        <Button variant="ghost" size="sm">Cancelar</Button>
        <Button variant="danger" size="sm">Eliminar</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled>Guardar</Button>
        <Button variant="secondary" disabled>Editar</Button>
        <Button variant="success" disabled>Confirmar</Button>
        <Button variant="danger" disabled>Eliminar</Button>
      </div>
      {/* lg = the tall full-width footer CTA used across the scan flow */}
      <Button variant="primary" size="lg" fullWidth>Escanear boleta</Button>
      <Button variant="success" size="lg" fullWidth>Confirmar y guardar</Button>
    </div>
  ),
};
