import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { MetaPill } from "./MetaPill";

const meta = {
  title: "Design System/Atoms/MetaPill",
  component: MetaPill,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { children: "17 Mar 2026" },
} satisfies Meta<typeof MetaPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Date_: Story = { args: { icon: <PixelIcon name="chart-calendar" size={14} />, children: "17 Mar 2026" } };
export const Time_: Story = { args: { children: "17:10" } };

export const Row: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2 bg-gt-bg p-4">
      <MetaPill icon={<MapPinIcon className="h-3.5 w-3.5" />}>Villarrica, Chile</MetaPill>
      <MetaPill icon={<PixelIcon name="chart-calendar" size={14} />}>17 Mar 2026</MetaPill>
      <MetaPill>17:10</MetaPill>
      <MetaPill>$</MetaPill>
      <MetaPill icon={<PixelIcon name="chart-calendar" size={14} />} onClick={() => {}}>
        Editable
      </MetaPill>
    </div>
  ),
};
