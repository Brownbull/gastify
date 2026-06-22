import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { XIcon } from "@design-system/assets/icons";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — toast layout / density. Same content, different distribution: icon
 * placement, accent treatment, single- vs two-line. The settled Toast is A.
 */
const TITLE = "Posible duplicado";
const MSG = "Esta boleta se parece a una de ayer.";
const Dismiss = () => (
  <button type="button" aria-label="Cerrar" className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-md text-gt-ink-2 hover:bg-gt-surface">
    <XIcon className="h-4 w-4" />
  </button>
);

// A · Icon-left tinted (current Toast): tone-tint bg + pixel icon + title/message.
function OptionA() {
  return (
    <div className="flex w-80 items-start gap-3 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-accent/40 p-3 shadow-gt-md">
      <PixelIcon name="status-warning" size={22} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-gt-md font-extrabold leading-tight text-gt-ink">{TITLE}</p>
        <p className="text-gt-sm font-semibold text-gt-ink-2">{MSG}</p>
      </div>
      <Dismiss />
    </div>
  );
}

// B · Accent bar: white surface + thick colored left edge (no bg tint).
function OptionB() {
  return (
    <div className="flex w-80 items-start gap-3 rounded-gt-2xl border-2 border-gt-line-strong border-l-[6px] border-l-gt-accent bg-gt-surface p-3 shadow-gt-md">
      <PixelIcon name="status-warning" size={22} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-gt-md font-extrabold leading-tight text-gt-ink">{TITLE}</p>
        <p className="text-gt-sm font-semibold text-gt-ink-2">{MSG}</p>
      </div>
      <Dismiss />
    </div>
  );
}

// C · Compact single-line: icon + message + X, no title. Lowest height.
function OptionC() {
  return (
    <div className="flex w-80 items-center gap-2.5 rounded-gt-pill border-2 border-gt-line-strong bg-gt-accent/40 py-2 pl-3 pr-2 shadow-gt-sm">
      <PixelIcon name="status-warning" size={20} />
      <span className="min-w-0 flex-1 truncate text-gt-sm font-bold text-gt-ink">{TITLE}: {MSG}</span>
      <Dismiss />
    </div>
  );
}

// D · Header bar: solid tone title bar over a white body.
function OptionD() {
  return (
    <div className="w-80 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong shadow-gt-md">
      <div className="flex items-center gap-2 border-b-2 border-gt-line-strong bg-gt-accent px-3 py-1.5">
        <PixelIcon name="status-warning" size={18} />
        <span className="flex-1 text-gt-sm font-extrabold text-gt-ink">{TITLE}</span>
        <Dismiss />
      </div>
      <p className="bg-gt-surface px-3 py-2.5 text-gt-sm font-semibold text-gt-ink-2">{MSG}</p>
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Icon-left tinted (current)", note: "Tone-tint background, pixel icon, title + message stacked.", render: () => <OptionA /> },
  { id: "B", label: "Accent bar", note: "White surface + thick colored left edge. Calmer; the tone is an accent, not a wash.", render: () => <OptionB /> },
  { id: "C", label: "Compact single-line", note: "Pill, one line, no title. Smallest footprint for quick confirmations.", render: () => <OptionC /> },
  { id: "D", label: "Header bar", note: "Solid tone title bar over a white body. Strongest hierarchy.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Toast",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Toast — layout & density" intro="Same content, different distribution + accent treatment." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
