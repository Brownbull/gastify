import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrendChange } from "./TrendChange";

const meta = {
  title: "Design System/Atoms/TrendChange",
  component: TrendChange,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { direction: "down", percent: -12, pill: true },
  argTypes: { direction: { control: "radio", options: ["up", "down", "neutral", "new"] } },
} satisfies Meta<typeof TrendChange>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const All: Story = {
  render: () => (
    <div className="flex flex-col gap-3 bg-gt-bg p-4">
      <div className="flex items-center gap-3">
        <TrendChange direction="down" percent={-12} pill />
        <TrendChange direction="up" percent={8} pill />
        <TrendChange direction="neutral" percent={0} pill />
        <TrendChange direction="new" pill />
      </div>
      <div className="flex items-center gap-3">
        <TrendChange direction="down" percent={-12} />
        <TrendChange direction="up" percent={8} />
        <TrendChange direction="neutral" percent={0} />
        <TrendChange direction="new" />
      </div>
    </div>
  ),
};
