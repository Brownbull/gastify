import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";

const meta = {
  title: "Design System/Atoms/Input",
  component: Input,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { label: "Comercio", placeholder: "Supermercado Líder" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-5 bg-gt-bg p-6">
      <Input label="Comercio" placeholder="Supermercado Líder" />
      <Input label="Monto" defaultValue="$45.990" hint="Pesos chilenos, sin decimales" />
      <Input label="Fecha" defaultValue="32/06/2026" error="Fecha inválida" />
      <Input label="Notas" placeholder="Deshabilitado" disabled />
    </div>
  ),
};
