import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SegmentedToggle, type ToggleSegment } from "./SegmentedToggle";

const meta = {
  title: "Design System/Atoms/SegmentedToggle",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const TWO: ToggleSegment[] = [
  { id: "grouped", label: "Por Grupo" },
  { id: "original", label: "Original" },
];

export const TwoLabels: Story = {
  render: () => {
    const [v, setV] = useState("grouped");
    return <SegmentedToggle segments={TWO} value={v} onChange={setV} fill className="w-72" />;
  },
};

export const IconOnly: Story = {
  render: () => {
    const [v, setV] = useState("txn");
    return (
      <SegmentedToggle
        tone="primary"
        value={v}
        onChange={setV}
        segments={[
          { id: "txn", icon: <PixelIcon name="fin-receipt" size={16} />, title: "Transacciones" },
          { id: "items", icon: <PixelIcon name="item-pantry" size={16} />, title: "Ítems" },
        ]}
      />
    );
  },
};

export const FourIconLabel: Story = {
  render: () => {
    const [v, setV] = useState("L1");
    return (
      <SegmentedToggle
        size="sm"
        value={v}
        onChange={setV}
        segments={[
          { id: "L1", icon: <PixelIcon name="rubro-supermercados" size={14} />, label: "L1" },
          { id: "L2", icon: <PixelIcon name="store-supermarket" size={14} />, label: "L2" },
          { id: "L3", icon: <PixelIcon name="familia-food-fresh" size={14} />, label: "L3" },
          { id: "L4", icon: <PixelIcon name="item-pantry" size={14} />, label: "L4" },
        ]}
      />
    );
  },
};

export const Tones: Story = {
  render: () => {
    const [v, setV] = useState("a");
    const segs: ToggleSegment[] = [
      { id: "a", label: "Uno" },
      { id: "b", label: "Dos" },
    ];
    return (
      <div className="flex flex-col gap-3 bg-gt-bg p-4">
        <SegmentedToggle tone="amber" segments={segs} value={v} onChange={setV} />
        <SegmentedToggle tone="primary" segments={segs} value={v} onChange={setV} />
        <SegmentedToggle tone="ink" segments={segs} value={v} onChange={setV} />
      </div>
    );
  },
};
