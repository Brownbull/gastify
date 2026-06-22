import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast } from "./Toast";

const meta = {
  title: "Design System/Molecules/Toast",
  component: Toast,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { tone: "success", title: "Boleta guardada", onDismiss: () => {} },
  argTypes: { tone: { control: "radio", options: ["info", "success", "warning", "error"] } },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithDetail: Story = {
  args: {
    tone: "warning",
    title: "Posible duplicado",
    detail: "Esta boleta se parece a una registrada ayer en Supermercado Líder por $45.990. Puedes ignorar esta alerta o eliminar el duplicado.",
    onDismiss: () => {},
  },
};

export const ExpandedDetail: Story = {
  args: {
    tone: "warning",
    title: "Posible duplicado",
    detail: "Esta boleta se parece a una registrada ayer en Supermercado Líder por $45.990. Puedes ignorar esta alerta o eliminar el duplicado.",
    expanded: true,
    onDismiss: () => {},
  },
};

export const AllTones: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3 bg-gt-bg p-6">
      <Toast tone="success" title="¡Guardado!" onDismiss={() => {}} />
      <Toast tone="info" title="Categoría aprendida: Farmacia → Salud y Bienestar." onDismiss={() => {}} />
      <Toast tone="warning" title="Posible duplicado" detail="Esta boleta se parece a una de ayer." onDismiss={() => {}} />
      <Toast tone="error" title="No se pudo escanear" detail="Inténtalo de nuevo con mejor luz." onDismiss={() => {}} />
    </div>
  ),
};
