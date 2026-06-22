import type { Meta, StoryObj } from "@storybook/react-vite";
import { AtomSpike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Chip active-state treatment. Use the **option** + **platform**
 * controls. Each strip shows the ACTIVE chip first, then two resting chips.
 */
const baseChip = "inline-flex items-center rounded-gt-pill border-2 px-3.5 py-1 text-gt-sm font-extrabold transition duration-150 ease-gt-bounce";
const restChip = `${baseChip} border-gt-line-strong bg-gt-surface text-gt-ink`;

function Strip({ active, rest = restChip }: { active: string; rest?: string }) {
  return (
    <>
      <button type="button" className={active}>Junio 2026</button>
      <button type="button" className={rest}>Supermercado</button>
      <button type="button" className={rest}>Transporte</button>
    </>
  );
}

const aActive = `${baseChip} border-gt-line-strong bg-gt-primary text-white shadow-gt-sm`;
const bActive = `${baseChip} border-gt-line-strong bg-gt-accent text-gt-ink shadow-gt-sm`;
const cActive = "inline-flex items-center rounded-gt-pill border-[3px] border-gt-line-strong bg-gt-surface px-3.5 py-1 text-gt-sm font-extrabold text-gt-ink shadow-gt-sm";
const dActive = "relative inline-flex items-center rounded-gt-pill border-2 border-transparent bg-transparent px-3.5 py-1 text-gt-sm font-extrabold text-gt-ink after:absolute after:bottom-0 after:left-1/2 after:h-1 after:w-6 after:-translate-x-1/2 after:rounded-gt-pill after:bg-gt-accent after:content-['']";
const dRest = "inline-flex items-center rounded-gt-pill border-2 border-transparent bg-transparent px-3.5 py-1 text-gt-sm font-extrabold text-gt-ink-3";

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Solid Violet (current)", note: "Active fills the primary accent.", render: () => <Strip active={aActive} /> },
  { id: "B", label: "Amber", note: "Active fills amber + ink text — matches the Gustify filled-active nav tile.", render: () => <Strip active={bActive} /> },
  { id: "C", label: "Outline Bold", note: "No fill; active reads as a 3px ink ring. Calmer, less color.", render: () => <Strip active={cActive} /> },
  { id: "D", label: "Underline Dot", note: "Borderless; active marked by an amber underline bar. Lightest touch.", render: () => <Strip active={dActive} rest={dRest} /> },
];

const meta = {
  title: "Design System/Spikes/Chip",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "A", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <AtomSpike title="Chip — active-state variations" intro="ACTIVE chip first, then two resting." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
