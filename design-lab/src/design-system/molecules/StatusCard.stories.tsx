import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusCard } from "./StatusCard";

const meta = {
  title: "Design System/Molecules/StatusCard",
  component: StatusCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { tone: "warning", title: "Sobre el presupuesto", children: "Gastaste $182k en Supermercado — 14% más que tu meta mensual." },
  argTypes: { tone: { control: "radio", options: ["info", "success", "warning", "error"] } },
} satisfies Meta<typeof StatusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllTones: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-gt-12 bg-gt-bg p-gt-16">
      <StatusCard tone="success" title="¡Boleta guardada!">Tu compra en Supermercado Líder se registró.</StatusCard>
      <StatusCard tone="info" title="Categoría aprendida">Farmacia → Salud y Bienestar para próximas boletas.</StatusCard>
      <StatusCard tone="warning" title="Sobre el presupuesto">Gastaste $182k en Supermercado — 14% más que tu meta.</StatusCard>
      <StatusCard tone="error" title="No se pudo escanear">Inténtalo de nuevo con mejor luz.</StatusCard>
    </div>
  ),
};
