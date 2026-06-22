import type { Meta, StoryObj } from "@storybook/react-vite";
import { TreemapCell } from "./TreemapCell";
import { tokenTrueColor } from "@design-system/organisms/Treemap";
import { TREEMAP_FULL } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Molecules/TreemapCell",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The three densities side by side, at representative sizes. */
export const Densities: Story = {
  render: () => (
    <div className="flex items-stretch gap-3 bg-gt-bg p-4">
      <div className="h-40 w-40">
        <TreemapCell datum={TREEMAP_FULL[0]} widthPct={60} heightPct={60} isMainCell color={tokenTrueColor("", 0)} className="h-full w-full" />
      </div>
      <div className="h-40 w-24">
        <TreemapCell datum={TREEMAP_FULL[2]} widthPct={30} heightPct={50} color={tokenTrueColor("", 2)} className="h-full w-full" />
      </div>
      <div className="h-16 w-16">
        <TreemapCell datum={TREEMAP_FULL[7]} widthPct={8} heightPct={6} color={tokenTrueColor("", 5)} className="h-full w-full" />
      </div>
    </div>
  ),
};
