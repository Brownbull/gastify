import type { Meta, StoryObj } from "@storybook/react-vite";
import { DonutCenterLabel } from "./DonutCenterLabel";

const meta = {
  title: "Design System/Atoms/DonutCenterLabel",
  component: DonutCenterLabel,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { primary: "$385k", label: "Total" },
} satisfies Meta<typeof DonutCenterLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

// rendered inside a faux ring box so the absolute overlay positions
export const Total: Story = {
  render: (args) => (
    <div className="relative h-44 w-44 rounded-gt-pill border-[14px] border-gt-line bg-gt-bg">
      <DonutCenterLabel {...args} />
    </div>
  ),
};

export const Selected: Story = {
  render: () => (
    <div className="relative h-44 w-44 rounded-gt-pill border-[14px] border-gt-line bg-gt-bg">
      <DonutCenterLabel primary="$182k" label="Supermercados" hint="47%" />
    </div>
  ),
};
