import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { StepperButton } from "@design-system/atoms/StepperButton";
import { PERIODS } from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Period nav: how the analytics period stepper (prev · label · next)
 * presents. Variations explore chrome (plain vs bordered vs pill), label
 * weight, and whether a calendar affordance appears.
 */
function usePeriod() {
  const [i, setI] = useState(0);
  const idx = ((i % PERIODS.length) + PERIODS.length) % PERIODS.length;
  return { label: PERIODS[idx], prev: () => setI((p) => p - 1), next: () => setI((p) => p + 1) };
}

// A · Plain steppers + label (current).
function OptionA() {
  const p = usePeriod();
  return (
    <div className="inline-flex items-center gap-1.5">
      <StepperButton direction="prev" label="Anterior" onClick={p.prev} />
      <span className="min-w-16 text-center text-gt-md font-extrabold text-gt-ink">{p.label}</span>
      <StepperButton direction="next" label="Siguiente" onClick={p.next} />
    </div>
  );
}

// B · Bordered steppers (geometric tiles).
function OptionB() {
  const p = usePeriod();
  return (
    <div className="inline-flex items-center gap-2">
      <StepperButton direction="prev" label="Anterior" variant="bordered" onClick={p.prev} />
      <span className="min-w-16 text-center text-gt-md font-extrabold text-gt-ink">{p.label}</span>
      <StepperButton direction="next" label="Siguiente" variant="bordered" onClick={p.next} />
    </div>
  );
}

// C · Pill capsule: label in a bordered pill, steppers attached.
function OptionC() {
  const p = usePeriod();
  return (
    <div className="inline-flex items-center overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
      <button type="button" onClick={p.prev} aria-label="Anterior" className="grid h-9 w-9 place-items-center hover:bg-gt-bg-3">
        <PixelIcon name="chart-calendar" size={0} />
        <span className="text-gt-md font-extrabold text-gt-ink-3">‹</span>
      </button>
      <span className="border-x-2 border-gt-line-strong px-4 py-1.5 text-gt-md font-extrabold text-gt-ink">{p.label}</span>
      <button type="button" onClick={p.next} aria-label="Siguiente" className="grid h-9 w-9 place-items-center hover:bg-gt-bg-3">
        <span className="text-gt-md font-extrabold text-gt-ink-3">›</span>
      </button>
    </div>
  );
}

// D · Calendar-led: a calendar pixel icon + label as one tappable pill, steppers outside.
function OptionD() {
  const p = usePeriod();
  return (
    <div className="inline-flex items-center gap-2">
      <StepperButton direction="prev" label="Anterior" onClick={p.prev} />
      <button type="button" className="inline-flex items-center gap-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-accent px-3 py-1.5 text-gt-md font-extrabold text-gt-ink shadow-gt-xs">
        <PixelIcon name="chart-calendar" size={16} />
        {p.label}
      </button>
      <StepperButton direction="next" label="Siguiente" onClick={p.next} />
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Plain steppers", note: "Bare chevron buttons + label. Lightest; blends into a toolbar.", render: () => <OptionA /> },
  { id: "B", label: "Bordered steppers", note: "Steppers as geometric tiles. Stronger affordance, stands alone.", render: () => <OptionB /> },
  { id: "C", label: "Pill capsule", note: "Single bordered capsule with attached ‹ label ›. One cohesive control.", render: () => <OptionC /> },
  { id: "D", label: "Calendar pill", note: "Label in an amber pill with a calendar icon (tap to open a picker), steppers outside.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Analytics · Period Nav",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Period nav — chrome & affordance" intro="prev · period · next. Different chrome + a calendar affordance." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
