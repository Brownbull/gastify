import type { Meta, StoryObj } from "@storybook/react-vite";
import { SankeyChart } from "@design-system/molecules/SankeyChart";
import { Card } from "@design-system/molecules/Card";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Sankey icon-node diagram (DM-26). The settled interactive diagram:
 * a pixel-icon disc FLOATS above each bar (picked over embedded-in-bar); a tap
 * pulses the disc's icon → its NAME for 3s (then back); and the L1·L2·L3·L4 peel
 * (LevelToggle-style pill) selects which contiguous level range the flow shows.
 * A/B/C vary canvas HEIGHT (340/460/560px) to fix legibility at 4 levels; D
 * shows the embedded-in-bar alternate. Switch `platform` to judge at width.
 */
function Board({ children }: { children: React.ReactNode }) {
  return (
    <Card title="Flujo de gasto" className="w-80">
      {children}
    </Card>
  );
}

// A · SETTLED — floating disc + level peel at the default 460px (DM-26 pick B)
function OptionA() {
  return (
    <Board>
      <SankeyChart iconNodes levelSelector />
    </Board>
  );
}

// B · Reference — shorter 340px canvas (for the per-platform tuning later)
function OptionB() {
  return (
    <Board>
      <SankeyChart iconNodes levelSelector height={340} />
    </Board>
  );
}

// C · Reference — taller 560px canvas (for the per-platform tuning later)
function OptionC() {
  return (
    <Board>
      <SankeyChart iconNodes levelSelector height={560} />
    </Board>
  );
}

// D · Embedded-in-bar alternate (for contrast against the chosen floating disc)
function OptionD() {
  return (
    <Board>
      <SankeyChart iconNodes iconPlacement="on-bar" levelSelector />
    </Board>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Settled · floating · 460px", note: "The settled diagram (DM-26 pick B): floating-disc icons + LevelToggle-style level peel at the default 460px height. Switch platform to judge how it sits on mobile/tablet/desktop.", render: () => <OptionA /> },
  { id: "B", label: "Ref · 340px shorter", note: "Reference only — the shorter canvas, kept for the per-platform height tuning later.", render: () => <OptionB /> },
  { id: "C", label: "Ref · 560px taller", note: "Reference only — the taller canvas, kept for the per-platform height tuning later.", render: () => <OptionC /> },
  { id: "D", label: "Embedded-in-bar (alt)", note: "The embedded-in-bar placement, for contrast against the chosen floating disc.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Diagram · Sankey",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike
      title="Sankey — icon-node diagram (settled, height per platform TBD)"
      intro="SETTLED (A): floating-disc icons; tap pulses icon→name for 3s; LevelToggle-style L1·L2·L3·L4 peel; default 460px canvas. B/C are shorter/taller references kept for the per-platform (mobile/tablet/desktop) height tuning later; D is the embedded-in-bar alternate. Switch platform to judge at width."
      options={OPTIONS}
      {...args}
    />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
