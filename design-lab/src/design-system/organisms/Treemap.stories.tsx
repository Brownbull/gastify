import type { Meta, StoryObj } from "@storybook/react-vite";
import { Treemap, tokenTrueColor } from "./Treemap";
import { TREEMAP_FULL } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Organisms/Treemap",
  component: Treemap,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { data: TREEMAP_FULL, countMode: "transactions", tint: 0.5 },
  argTypes: {
    // Live tint control — drag to find the softness for ALL diagrams (DM-13c).
    tint: { control: { type: "range", min: 0.1, max: 1, step: 0.05 } },
    countMode: { control: "radio", options: ["transactions", "items"] },
  },
} satisfies Meta<typeof Treemap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** DECIDED layout (Airy). Drag the `tint` control to dial the softness. */
export const Squarified: Story = {
  render: (args) => (
    <div className="w-80 bg-gt-bg p-4">
      <Treemap {...args} />
    </div>
  ),
};

/** A tint ladder — same treemap at 20 / 30 / 40 / 55 / 70 / 100% so you can
 *  compare softness levels side by side and pick the diagram-wide default. */
export const TintLadder: Story = {
  render: () => {
    const levels = [0.2, 0.3, 0.4, 0.55, 0.7, 1];
    return (
      <div className="grid grid-cols-3 gap-4 bg-gt-bg p-4">
        {levels.map((t) => (
          <div key={t} className="flex flex-col gap-1">
            <span className="text-gt-sm font-extrabold text-gt-ink">{Math.round(t * 100)}%</span>
            <div className="w-44">
              <Treemap data={TREEMAP_FULL} tint={t} height={224} />
            </div>
          </div>
        ))}
      </div>
    );
  },
};

/** Full-saturation palette, for reference. */
export const VividPalette: Story = {
  render: (args) => (
    <div className="w-80 bg-gt-bg p-4">
      <Treemap {...args} colorFor={tokenTrueColor} />
    </div>
  ),
};
