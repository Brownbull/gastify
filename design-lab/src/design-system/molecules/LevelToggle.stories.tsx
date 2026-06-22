import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LevelToggle } from "./LevelToggle";
import type { TaxLevel } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Molecules/LevelToggle",
  component: LevelToggle,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { value: "L1", onChange: () => {} },
} satisfies Meta<typeof LevelToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => {
    const [v, setV] = useState<TaxLevel>("L1");
    return (
      <div className="bg-gt-bg p-6">
        <p className="mb-3 text-gt-sm font-bold text-gt-ink-3">
          Toca un nivel: la etiqueta cubre el control ~3s, luego revela las opciones.
        </p>
        <LevelToggle value={v} onChange={setV} />
        <p className="mt-3 text-gt-sm font-extrabold text-gt-ink">Activo: {v}</p>
      </div>
    );
  },
};
