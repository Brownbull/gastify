import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CountModeToggle } from "./CountModeToggle";
import type { CountMode } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Molecules/CountModeToggle",
  component: CountModeToggle,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { value: "transactions", onChange: () => {} },
} satisfies Meta<typeof CountModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Switch: Story = {
  render: () => {
    const [v, setV] = useState<CountMode>("transactions");
    return (
      <div className="flex items-center gap-3 bg-gt-bg p-6">
        <CountModeToggle value={v} onChange={setV} />
        <span className="text-gt-sm font-extrabold text-gt-ink">{v}</span>
      </div>
    );
  },
};
