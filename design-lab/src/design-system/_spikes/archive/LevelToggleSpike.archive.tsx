import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { LevelToggle } from "@design-system/molecules/LevelToggle";
import { LEVELS, type TaxLevel } from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Level toggle: the L1–L4 taxonomy switch. All select one of four
 * levels; they differ in whether labels show, icon size, and shape. A/B build
 * on the LevelToggle molecule (SegmentedToggle); C/D are alternative forms.
 */
function useLevel() {
  const [v, setV] = useState<TaxLevel>("L1");
  return { v, setV };
}

// A · Icons only (molecule, primary tone).
function OptionA() {
  const { v, setV } = useLevel();
  return <LevelToggle value={v} onChange={setV} />;
}

// B · Icon + Lx label (molecule, showLabels).
function OptionB() {
  const { v, setV } = useLevel();
  return <LevelToggle value={v} onChange={setV} />;
}

// C · Circle icons with label below active (bigger touch targets).
function OptionC() {
  const { v, setV } = useLevel();
  return (
    <div className="flex items-end justify-center gap-3">
      {LEVELS.map((l) => {
        const active = v === l.id;
        return (
          <button key={l.id} type="button" onClick={() => setV(l.id)} className="flex flex-col items-center gap-1">
            <span className={`grid h-11 w-11 place-items-center rounded-full border-2 transition-all duration-150 ${active ? "border-gt-line-strong bg-gt-primary shadow-gt-sm" : "border-gt-line-strong bg-gt-surface hover:bg-gt-bg-3"}`}>
              <PixelIcon name={l.icon} size={22} />
            </span>
            <span className={`text-gt-xs font-extrabold ${active ? "text-gt-primary" : "text-gt-ink-3"}`}>{active ? l.label : l.id}</span>
          </button>
        );
      })}
    </div>
  );
}

// D · Full-width segmented bar with icon + Lx (native-app pattern).
function OptionD() {
  const { v, setV } = useLevel();
  return (
    <div className="flex w-72 overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg">
      {LEVELS.map((l) => {
        const active = v === l.id;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => setV(l.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-r-2 border-gt-line py-2 last:border-r-0 transition-colors ${active ? "bg-gt-primary text-white shadow-gt-sm" : "text-gt-ink-3 hover:bg-gt-bg-3"}`}
          >
            <PixelIcon name={l.icon} size={16} />
            <span className="text-gt-xs font-extrabold">{l.id}</span>
          </button>
        );
      })}
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Icons only (pill)", note: "SegmentedToggle, icon-only segments. Compactest; relies on icon recognition.", render: () => <OptionA /> },
  { id: "B", label: "Icon + Lx (pill)", note: "SegmentedToggle with the L1..L4 label beside each icon. Clearer level identity.", render: () => <OptionB /> },
  { id: "C", label: "Circles + label", note: "Large circle icons, label below the active one. Biggest touch targets, most visual.", render: () => <OptionC /> },
  { id: "D", label: "Segmented bar", note: "Full-width segmented control, icon + Lx. Strongest hierarchy; familiar native pattern.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Analytics · Level Toggle",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Level toggle — L1–L4 switch" intro="Pick one of four taxonomy levels. Label vs icon-only, size, shape." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
