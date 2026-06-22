import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PeriodNav } from "./PeriodNav";
import { PERIODS } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Molecules/PeriodNav",
  component: PeriodNav,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { label: PERIODS[0], bordered: true },
} satisfies Meta<typeof PeriodNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => {
    const [i, setI] = useState(0);
    const idx = ((i % PERIODS.length) + PERIODS.length) % PERIODS.length;
    return (
      <div className="bg-gt-bg p-4">
        <PeriodNav label={PERIODS[idx]} bordered onPrev={() => setI((p) => p - 1)} onNext={() => setI((p) => p + 1)} />
      </div>
    );
  },
};

export const Plain: Story = { args: { bordered: false } };
