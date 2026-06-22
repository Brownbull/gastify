import type { Meta, StoryObj } from "@storybook/react-vite";
import { SankeyChart } from "./SankeyChart";
import { Card } from "./Card";

const meta = {
  title: "Design System/Molecules/SankeyChart",
  component: SankeyChart,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof SankeyChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The settled Sankey (DM-22→26): floating-disc pixel-icon nodes (tap a disc →
 * its icon swaps to the NAME for 3s, then reverts, with amount/% + adjacency
 * dim), the LevelToggle-style L1·L2·L3·L4 peel selecting which contiguous level
 * range the flow shows, on the default 460px canvas. This is the canonical
 * Sankey; the screen embeds use it as-is.
 */
export const Default: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Flujo de gasto" className="w-80">
        <SankeyChart iconNodes levelSelector />
      </Card>
    </div>
  ),
};

/**
 * Plain text-label variant (no icon nodes / no level peel) — the bare ECharts
 * flow, kept as a reference for embeds that want a static 3-level snippet.
 */
export const TextLabels: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Flujo de gasto" className="w-80">
        <SankeyChart />
      </Card>
    </div>
  ),
};

/**
 * Embedded-in-bar alternate — the icon sits flush IN a fattened ink-bordered
 * bar (vs. the chosen floating disc). Kept for reference / the per-platform pass.
 */
export const EmbeddedInBar: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Flujo de gasto" className="w-80">
        <SankeyChart iconNodes levelSelector iconPlacement="on-bar" />
      </Card>
    </div>
  ),
};
