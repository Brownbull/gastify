import type { Meta, StoryObj } from "@storybook/react-vite";
import { CameraIcon } from "@design-system/assets/icons";
import { Button } from "@design-system/atoms/Button";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Design System/Molecules/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstScan: Story = {
  args: { title: "Aún no hay gastos este mes" },
  render: () => (
    <div className="max-w-md bg-gt-bg p-gt-24">
      <EmptyState
        iconName="fin-receipt"
        title="Aún no hay gastos este mes"
        message="Escanea tu primera boleta para ver tus compras aquí."
        actions={
          <>
            <Button>
              <CameraIcon className="h-4 w-4" />
              Escanear boleta
            </Button>
            <Button variant="secondary">Ingresar manual</Button>
          </>
        }
      />
    </div>
  ),
};

export const Minimal: Story = {
  args: { title: "Sin resultados" },
  render: () => (
    <div className="max-w-md bg-gt-bg p-gt-24">
      <EmptyState iconName="action-search" title="Sin resultados" message="Prueba con otro filtro o periodo." />
    </div>
  ),
};
