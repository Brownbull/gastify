import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Badge } from "@design-system/atoms/Badge";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — the month-total hero metric: how to distribute label / value / delta
 * (and whether the mascot appears). The settled MetricCard is option A.
 */
const TOTAL = "$384.520";
const MONTH = "Este mes · junio 2026";
const card = "rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-4 shadow-gt-md";

// A · Stacked (current MetricCard): eyebrow label, big value, delta below.
function OptionA() {
  return (
    <div className={`w-72 ${card}`}>
      <p className="mb-1 text-gt-sm font-extrabold uppercase tracking-[0.06em] text-gt-ink-3">{MONTH}</p>
      <p className="font-gt-display text-gt-5xl font-extrabold leading-[1.05] text-gt-ink">{TOTAL}</p>
      <div className="mt-2"><Badge tone="positive">−12% vs mayo</Badge></div>
    </div>
  );
}

// B · Inline delta: value + delta on one line, eyebrow above.
function OptionB() {
  return (
    <div className={`w-72 ${card}`}>
      <p className="mb-1 text-gt-sm font-extrabold uppercase tracking-[0.06em] text-gt-ink-3">{MONTH}</p>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="font-gt-display text-gt-5xl font-extrabold leading-[1.05] text-gt-ink">{TOTAL}</p>
        <Badge tone="positive">−12%</Badge>
      </div>
    </div>
  );
}

// C · With mascot: value + piggy beside it.
function OptionC() {
  return (
    <div className={`flex w-72 items-center gap-3 ${card}`}>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-gt-sm font-extrabold uppercase tracking-[0.06em] text-gt-ink-3">{MONTH}</p>
        <p className="font-gt-display text-gt-4xl font-extrabold leading-[1.05] text-gt-ink">{TOTAL}</p>
        <div className="mt-1.5"><Badge tone="positive">−12% vs mayo</Badge></div>
      </div>
      <PixelIcon name="fin-piggy-bank" size={56} alt="" />
    </div>
  );
}

// D · Split row: label+value left, delta right (horizontal, dense banner).
function OptionD() {
  return (
    <div className={`flex w-80 items-center justify-between gap-3 ${card}`}>
      <div>
        <p className="text-gt-sm font-extrabold uppercase tracking-[0.06em] text-gt-ink-3">Junio</p>
        <p className="font-gt-display text-gt-4xl font-extrabold leading-none text-gt-ink">{TOTAL}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge tone="positive">−12%</Badge>
        <span className="text-gt-sm font-bold text-gt-ink-3">vs mayo</span>
      </div>
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Stacked (current)", note: "Eyebrow label · big value · delta below. Calm, vertical.", render: () => <OptionA /> },
  { id: "B", label: "Inline delta", note: "Value + delta share the baseline; tighter vertical footprint.", render: () => <OptionB /> },
  { id: "C", label: "With mascot", note: "Piggy beside the value — warmer, more brand presence.", render: () => <OptionC /> },
  { id: "D", label: "Split banner", note: "Label+value left, delta right. Densest — good for a top bar.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Hero Metric",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Hero metric — distribution" intro="How the month total distributes label / value / delta." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
