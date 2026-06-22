import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CountModeToggle } from "@design-system/molecules/CountModeToggle";
import { COUNT_MODES, type CountMode } from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Count mode toggle: transactions vs items. All flip between two modes;
 * they differ in icon-only vs labelled, and single-button vs two-segment.
 */
function useMode() {
  const [v, setV] = useState<CountMode>("transactions");
  return { v, setV };
}

// A · Two-segment icons only (molecule).
function OptionA() {
  const { v, setV } = useMode();
  return <CountModeToggle value={v} onChange={setV} />;
}

// B · Two-segment with labels (molecule).
function OptionB() {
  const { v, setV } = useMode();
  return <CountModeToggle value={v} onChange={setV} />;
}

// C · Single toggle button that flips (icon + current label).
function OptionC() {
  const { v, setV } = useMode();
  const cur = COUNT_MODES.find((m) => m.id === v)!;
  return (
    <button
      type="button"
      onClick={() => setV(v === "transactions" ? "items" : "transactions")}
      className="inline-flex items-center gap-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-3 py-1.5 text-gt-md font-extrabold text-gt-ink shadow-gt-sm transition hover:-translate-y-0.5 hover:shadow-gt-md"
    >
      <PixelIcon name={cur.icon} size={16} />
      {cur.label}
    </button>
  );
}

// D · Icon-only square switch (compact, for a tight toolbar corner).
function OptionD() {
  const { v, setV } = useMode();
  return (
    <div className="inline-flex overflow-hidden rounded-gt-md border-2 border-gt-line-strong bg-gt-bg">
      {COUNT_MODES.map((m) => {
        const active = v === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setV(m.id)}
            title={m.label}
            className={`grid h-9 w-9 place-items-center transition-colors ${active ? "bg-gt-primary" : "hover:bg-gt-bg-3"}`}
          >
            <PixelIcon name={m.icon} size={16} />
          </button>
        );
      })}
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Two-segment icons", note: "SegmentedToggle, receipt vs pantry icon. Both modes visible at once.", render: () => <OptionA /> },
  { id: "B", label: "Two-segment labelled", note: "SegmentedToggle with 'Transacciones' / 'Ítems' labels. Most explicit; widest.", render: () => <OptionB /> },
  { id: "C", label: "Single flip button", note: "One pill showing the current mode; tapping flips it. Compact but hides the alternative.", render: () => <OptionC /> },
  { id: "D", label: "Icon square switch", note: "Tiny two-segment square — for a tight toolbar corner.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Analytics · Count Toggle",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Count toggle — transactions vs items" intro="Flip the dashboard between transaction count and item count." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
