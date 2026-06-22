import type { Meta, StoryObj } from "@storybook/react-vite";
import { AtomSpike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Input field treatment. Use the **option** + **platform** controls.
 * Click into a field to see the focus ring.
 */
function Field({ cls }: { cls: string }) {
  return (
    <label className="flex w-full max-w-xs flex-col gap-1.5">
      <span className="text-gt-sm font-extrabold text-gt-ink">Comercio</span>
      <input className={cls} placeholder="Supermercado Líder" />
    </label>
  );
}

const base = "w-full text-gt-md font-semibold text-gt-ink placeholder:font-medium placeholder:text-gt-ink-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30";
const a = `${base} rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-3.5 py-2.5`;
const b = `${base} rounded-gt-2xl border-[3px] border-gt-line-strong bg-gt-surface px-4 py-3`;
const c = `${base} rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-3 px-3.5 py-2.5`;
const d = `${base} rounded-none border-0 border-b-2 border-gt-line-strong bg-transparent px-1 py-2 focus-visible:ring-0`;

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Ink outline (current)", note: "2px ink border · rounded-xl · surface fill.", render: () => <Field cls={a} /> },
  { id: "B", label: "Chunky", note: "3px ink border · rounded-2xl. Matches a Chunky button choice.", render: () => <Field cls={b} /> },
  { id: "C", label: "Filled", note: "Tinted (bg-3) fill + border. Reads softer; good for dense forms.", render: () => <Field cls={c} /> },
  { id: "D", label: "Underline", note: "Bottom border only, no ring. Minimal — best for inline edits.", render: () => <Field cls={d} /> },
];

const meta = {
  title: "Design System/Spikes/Input",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "A", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <AtomSpike title="Input — variations" intro="Click into the field to see the focus ring." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
