import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrendList } from "@design-system/molecules/TrendList";
import { Card } from "@design-system/molecules/Card";
import { TRENDS_RICH } from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Trend list (DM-30). The row layout is now the FAITHFUL legacy
 * distribution (no more invented densities): icon · name + count-pill (stacked,
 * flex-1) · a tight right cluster of a SMALL fixed 56px sparkline butted to the
 * amount/change stack · drill chevron. The spark no longer dominates. The only
 * real remaining choice is the sparkline COLOR (direction vs category); drill is
 * built in. Switch platform to judge at width.
 */
function Board({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title} className="w-80">
      {children}
    </Card>
  );
}

// A · The faithful legacy row — direction-colored sparkline (the default)
function OptionA() {
  return (
    <Board title="Tendencia">
      <TrendList data={TRENDS_RICH} colorMode="direction" />
    </Board>
  );
}

// B · Same row, sparkline colored by the locked category palette
function OptionB() {
  return (
    <Board title="Tendencia">
      <TrendList data={TRENDS_RICH} colorMode="category" />
    </Board>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Spark color: direction (legacy)", note: "The faithful legacy row. Sparkline stroke by spend DIRECTION — up=red/down=green/neutral=grey, coordinated with the ±% badge. At-a-glance good/bad. The recommended default.", render: () => <OptionA /> },
  { id: "B", label: "Spark color: category (palette)", note: "Same row, sparkline stroke = the category's Token-True 50% hue (ties to donut/treemap). Loses the good/bad signal.", render: () => <OptionB /> },
];

const meta = {
  title: "Design System/Spikes/Diagram · Trend",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike
      title="Trend — faithful legacy row (spark-color choice)"
      intro="Row layout = the legacy distribution (icon · name+count stacked · tight [56px spark + amount/change] cluster · chevron) — the spark no longer dominates. Built-in drill-down (tap a chevron). The only open choice: sparkline COLOR — A direction (legacy red/green) vs B category (palette). Switch platform to judge at width."
      options={OPTIONS}
      {...args}
    />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
