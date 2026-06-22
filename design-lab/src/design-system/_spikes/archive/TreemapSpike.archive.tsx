import type { Meta, StoryObj } from "@storybook/react-vite";
import { Treemap, tokenTrueColor } from "@design-system/organisms/Treemap";
import { TREEMAP_FULL } from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Treemap (DM-13, the REAL squarified diagram). Token-true palette is
 * FIXED (gt-chart-1..6 rotation, the user's chosen direction). The A/B/C/D
 * options vary DENSITY / LAYOUT treatment of the actual treemap — gutters, ink
 * borders, how many categories pack in, and main-cell emphasis — so you tune
 * the diagram's STRUCTURE, not its colors. Switch platform to judge at width.
 */

// 5-category subset (fewer, bigger cells) vs the full 8 (denser pack).
const FEW = TREEMAP_FULL.slice(0, 5);
const ALL = TREEMAP_FULL;

// A · Airy — full 8 categories, 2px gutters, no ink border (legacy look).
function OptionA() {
  return (
    <div className="w-80">
      <Treemap data={ALL} colorFor={tokenTrueColor} gutter={2} />
    </div>
  );
}

// B · Geometric — full 8, chunky 4px gutters + 2px ink border + hard shadow
//     on every cell (full Playful Geometric grammar on the diagram).
function OptionB() {
  return (
    <div className="w-80">
      <Treemap data={ALL} colorFor={tokenTrueColor} gutter={4} inkBorder />
    </div>
  );
}

// C · Focused — fewer (5) bigger cells, 3px gutters, no border. Each cell gets
//     more room → more standard-density cells, less tiny/compact crowding.
function OptionC() {
  return (
    <div className="w-80">
      <Treemap data={FEW} colorFor={tokenTrueColor} gutter={3} />
    </div>
  );
}

// D · Focused geometric — fewer bigger cells WITH ink borders + chunky gutters.
function OptionD() {
  return (
    <div className="w-80">
      <Treemap data={FEW} colorFor={tokenTrueColor} gutter={4} inkBorder />
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Airy (full · thin gutter)", note: "All 8 categories, 2px gutters, no cell border (closest to legacy). Densest pack — small categories become tiny/compact cells.", render: () => <OptionA /> },
  { id: "B", label: "Geometric (full · ink borders)", note: "All 8, chunky 4px gutters + 2px ink border + hard shadow on every cell. Full geometric grammar applied to the diagram.", render: () => <OptionB /> },
  { id: "C", label: "Focused (fewer · roomy)", note: "Top 5 categories, 3px gutters, no border. Bigger cells → mostly standard density, less crowding. (Tail folds to 'Más'.)", render: () => <OptionC /> },
  { id: "D", label: "Focused geometric", note: "Top 5 bigger cells WITH ink borders + chunky gutters. Boldest, most legible — fewest cells, strongest separation.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Diagram · Treemap",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike
      title="Treemap — density & layout treatment"
      intro="Real squarified treemap, Token-true palette fixed. A/B/C/D vary gutter, ink border, category count, and cell emphasis — tune the structure."
      options={OPTIONS}
      {...args}
    />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
