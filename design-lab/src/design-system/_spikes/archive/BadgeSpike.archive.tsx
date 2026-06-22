import type { Meta, StoryObj } from "@storybook/react-vite";
import { AtomSpike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Badge shape + elevation. Use the **option** + **platform** controls.
 * Same tones, different silhouette and geometric weight.
 */
function Set({ cls }: { cls: (tone: string) => string }) {
  return (
    <>
      <span className={cls("bg-gt-success text-gt-ink")}>−12% vs mayo</span>
      <span className={cls("bg-gt-error text-white")}>+$4.990</span>
      <span className={cls("bg-gt-accent text-gt-ink")}>duplicado</span>
      <span className={cls("bg-gt-bg-3 text-gt-ink")}>12 ítems</span>
    </>
  );
}

const a = (tone: string) => `inline-flex items-center rounded-gt-pill border-2 border-gt-line-strong px-2.5 py-0.5 text-gt-sm font-extrabold leading-none shadow-gt-xs ${tone}`;
const b = (tone: string) => `inline-flex items-center rounded-gt-md border-2 border-gt-line-strong px-2.5 py-0.5 text-gt-sm font-extrabold leading-none shadow-gt-xs ${tone}`;
const c = (tone: string) => `inline-flex items-center rounded-gt-pill border-2 border-gt-line-strong px-2.5 py-0.5 text-gt-sm font-extrabold leading-none ${tone}`;
const d = (tone: string) => `inline-flex items-center rounded-gt-pill px-2.5 py-1 text-gt-sm font-bold leading-none ${tone}`;

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Pill + shadow (current)", note: "Rounded pill · 2px ink border · 1px hard shadow.", render: () => <Set cls={a} /> },
  { id: "B", label: "Tag", note: "Squarer (rounded-md) · border · shadow. Reads like a label tag.", render: () => <Set cls={b} /> },
  { id: "C", label: "Flat pill", note: "Pill + border, NO shadow. Cleaner in dense rows.", render: () => <Set cls={c} /> },
  { id: "D", label: "Soft", note: "No border/shadow, tinted fill. Least geometric — quietest.", render: () => <Set cls={d} /> },
];

const meta = {
  title: "Design System/Spikes/Badge",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "A", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <AtomSpike title="Badge — shape & elevation" intro="Same tones, different silhouette and weight." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {
  args: {
    option: "C"
  }
};
