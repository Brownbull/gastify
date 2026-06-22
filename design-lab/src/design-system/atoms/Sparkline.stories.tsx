import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkline } from "./Sparkline";

const meta = {
  title: "Design System/Atoms/Sparkline",
  component: Sparkline,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { points: [10, 32, 28, 50, 44, 70, 96], color: "var(--positive-primary)" },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-6 bg-gt-bg p-4">
      <Sparkline points={[10, 32, 48, 70, 96, 132, 182]} color="var(--negative-primary)" />
      <Sparkline points={[40, 36, 30, 28, 22, 18, 12]} color="var(--positive-primary)" />
      <Sparkline points={[50]} color="var(--text-tertiary)" />
    </div>
  ),
};
