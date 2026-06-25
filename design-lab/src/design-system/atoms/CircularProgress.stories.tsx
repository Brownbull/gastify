import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircularProgress } from "./CircularProgress";

const meta = {
  title: "Design System/Atoms/CircularProgress",
  component: CircularProgress,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { percent: 47, size: 48, color: "var(--primary)" },
} satisfies Meta<typeof CircularProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 bg-gt-bg p-4">
      <CircularProgress percent={35} size={28} strokeWidth={3} color="var(--chart-1)" />
      <CircularProgress percent={62} size={40} color="var(--chart-3)" />
      <CircularProgress percent={88} size={56} strokeWidth={5} color="var(--chart-4)" />
    </div>
  ),
};
