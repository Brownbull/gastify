import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DonutLegend } from "./DonutLegend";
import { SEGMENTS } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Molecules/DonutLegend",
  component: DonutLegend,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { segments: SEGMENTS, selected: null, onSelect: () => {} },
} satisfies Meta<typeof DonutLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  render: () => {
    const [sel, setSel] = useState<string | null>(null);
    return (
      <div className="w-80 bg-gt-bg p-gt-16">
        <DonutLegend segments={SEGMENTS} selected={sel} onSelect={setSel} canDrill={(id) => id !== "otros"} />
      </div>
    );
  },
};

export const Compact: Story = {
  render: () => {
    const [sel, setSel] = useState<string | null>("restaurantes");
    return (
      <div className="w-64 bg-gt-bg p-gt-16">
        <DonutLegend segments={SEGMENTS} selected={sel} onSelect={setSel} compact />
      </div>
    );
  },
};
