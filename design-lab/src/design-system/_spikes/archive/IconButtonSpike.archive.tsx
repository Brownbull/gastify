import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { AtomSpike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — IconButton size & shape. Use the **option** + **platform** controls.
 * Active (violet) · default (surface) · accent (amber) shown in each treatment.
 */
const hover = "transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs";

function Row({ tile, icon }: { tile: string; icon: number }) {
  return (
    <>
      <button type="button" aria-label="Inicio" className={`${tile} bg-gt-primary text-white`}>
        <PixelIcon name="nav-home" size={icon} />
      </button>
      <button type="button" aria-label="Escanear" className={`${tile} bg-gt-surface`}>
        <PixelIcon name="scan-receipt" size={icon} />
      </button>
      <button type="button" aria-label="Presupuesto" className={`${tile} bg-gt-accent`}>
        <PixelIcon name="fin-budget" size={icon} />
      </button>
    </>
  );
}

const a = `grid h-10 w-10 place-items-center rounded-gt-md border-2 border-gt-line-strong shadow-gt-sm ${hover}`;
const b = `grid h-12 w-12 place-items-center rounded-gt-lg border-2 border-gt-line-strong shadow-gt-sm ${hover}`;
const c = `grid h-10 w-10 place-items-center rounded-gt-pill border-2 border-gt-line-strong shadow-gt-sm ${hover}`;
const d = "grid h-10 w-10 place-items-center rounded-gt-md border-2 border-transparent transition duration-150 ease-gt-bounce hover:border-gt-line-strong";

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Square md (current)", note: "h-10 · rounded-md · 2px border · hard shadow.", render: () => <Row tile={a} icon={20} /> },
  { id: "B", label: "Square lg", note: "h-12 · rounded-lg. Bigger tap target, bolder presence.", render: () => <Row tile={b} icon={24} /> },
  { id: "C", label: "Circle", note: "h-10 · fully round. Pairs with the Pill button/badge choices.", render: () => <Row tile={c} icon={20} /> },
  { id: "D", label: "Soft (borderless)", note: "No border/shadow until hover. Quietest — secondary toolbars.", render: () => <Row tile={d} icon={20} /> },
];

const meta = {
  title: "Design System/Spikes/IconButton",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "A", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <AtomSpike title="IconButton — size & shape" intro="Active · default · accent in each treatment." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
