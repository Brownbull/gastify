import type { Meta, StoryObj } from "@storybook/react-vite";
import { DonutChart } from "./DonutChart";
import { SEGMENTS, TOTAL_SPEND } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Molecules/DonutChart",
  component: DonutChart,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { segments: SEGMENTS, total: TOTAL_SPEND },
} satisfies Meta<typeof DonutChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <DonutChart segments={SEGMENTS} total={TOTAL_SPEND} className="w-80" />
    </div>
  ),
};
