import type { Meta, StoryObj } from "@storybook/react-vite";
import { DonutChart } from "@design-system/molecules/DonutChart";
import { SEGMENTS, TOTAL_SPEND } from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Donut (DM-21, the REAL interactive + DRILL-DOWN donut). Palette FIXED
 * at Token-True 50% tint. Each option is the full DonutChart (ring + center +
 * count toggle + full legend with amount/count-pill/percent/drill); tapping a
 * legend chevron drills L1→L2→L3→L4 with a breadcrumb + back. A/B/C/D vary only
 * DENSITY / LAYOUT: ring thickness, ink-border-on-wedges, legend placement.
 */

// A · Airy (legacy look) — ring 14/16 flat, legend below
function OptionA() {
  return <DonutChart segments={SEGMENTS} total={TOTAL_SPEND} className="w-80" />;
}

// B · Geometric — ring 16/18, ink-bordered wedges
function OptionB() {
  return <DonutChart segments={SEGMENTS} total={TOTAL_SPEND} ring={16} selectedRing={18} inkBorder className="w-80" />;
}

// C · Focused — ring left / compact side legend right
function OptionC() {
  return <DonutChart segments={SEGMENTS} total={TOTAL_SPEND} side size={150} className="w-80" />;
}

// D · Dense dashboard — thinner ring 12/14, full legend below
function OptionD() {
  return <DonutChart segments={SEGMENTS} total={TOTAL_SPEND} ring={12} selectedRing={14} className="w-80" />;
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Airy (legacy)", note: "Ring 14/16 flat, full legend below (icon · name · amount · count-pill · percent · drill). Drill L1→L4 with breadcrumb. Closest to legacy.", render: () => <OptionA /> },
  { id: "B", label: "Geometric", note: "Ring 16/18 with 2px ink-bordered wedges. Chunkier, boldest geometric read. Same drill + full legend.", render: () => <OptionB /> },
  { id: "C", label: "Focused (side legend)", note: "Ring left / COMPACT legend right (dot · name · percent only — no amount/count pill). Horizontal, roomy. (Drill still works via the ring/selection.)", render: () => <OptionC /> },
  { id: "D", label: "Dense dashboard", note: "Thinner ring 12/14 (bigger hole), full legend below. Most info per vertical px.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Diagram · Donut",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Donut — drill-down + density/layout" intro="Real interactive donut WITH drill-down (tap a legend chevron → next taxonomy level; breadcrumb + back). Count toggle flips txns/items. Token-True 50% palette FIXED; A/B/C/D vary ring thickness, ink-border, legend placement." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
