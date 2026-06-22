import type { Meta, StoryObj } from "@storybook/react-vite";
import { AtomSpike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Button geometric treatment. Use the **option** control (A/B/C/D /
 * Compare) and the **platform** control (mobile/tablet/desktop) in the Controls
 * panel. Hover a button to feel the press.
 */
const t = "transition duration-150 ease-gt-bounce";
const aP = `rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary px-4 py-2.5 text-gt-md font-extrabold text-white shadow-gt-sm ${t} hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs`;
const aS = `rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-4 py-2.5 text-gt-md font-extrabold text-gt-ink shadow-gt-sm ${t} hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs`;
const bP = `rounded-gt-2xl border-[3px] border-gt-line-strong bg-gt-primary px-5 py-3 text-gt-md font-extrabold text-white shadow-gt-md ${t} hover:-translate-y-0.5 hover:shadow-gt-lg active:translate-y-0 active:shadow-gt-sm`;
const bS = `rounded-gt-2xl border-[3px] border-gt-line-strong bg-gt-surface px-5 py-3 text-gt-md font-extrabold text-gt-ink shadow-gt-md ${t} hover:-translate-y-0.5 hover:shadow-gt-lg active:translate-y-0 active:shadow-gt-sm`;
const cP = `rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary px-4 py-2.5 text-gt-md font-extrabold text-white shadow-gt-md ${t} hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-gt-xs`;
const cS = `rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-4 py-2.5 text-gt-md font-extrabold text-gt-ink shadow-gt-md ${t} hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-gt-xs`;
const dP = `rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary px-5 py-2.5 text-gt-md font-extrabold text-white shadow-gt-sm ${t} hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs`;
const dS = `rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-5 py-2.5 text-gt-md font-extrabold text-gt-ink shadow-gt-sm ${t} hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs`;
const dG = `rounded-gt-pill bg-transparent px-5 py-2.5 text-gt-md font-extrabold text-gt-ink-2 ${t} hover:bg-gt-bg-3 hover:text-gt-ink`;
const aG = `rounded-gt-xl bg-transparent px-4 py-2.5 text-gt-md font-extrabold text-gt-ink-2 ${t} hover:bg-gt-bg-3 hover:text-gt-ink`;

function Trio({ p, s, g }: { p: string; s: string; g: string }) {
  return (
    <>
      <button type="button" className={p}>Guardar</button>
      <button type="button" className={s}>Editar</button>
      <button type="button" className={g}>Cancelar</button>
    </>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Pop (current)", note: "2px border · 2px hard shadow · rounded-xl · hover lifts up.", render: () => <Trio p={aP} s={aS} g={aG} /> },
  { id: "B", label: "Chunky", note: "3px border · 4px shadow · rounded-2xl · larger. Bolder, heavier.", render: () => <Trio p={bP} s={bS} g={aG} /> },
  { id: "C", label: "Press", note: "Shadow at rest; hover presses INTO it (slides toward the shadow). Most tactile.", render: () => <Trio p={cP} s={cS} g={aG} /> },
  { id: "D", label: "Pill", note: "2px border · 2px shadow · fully rounded. Softer silhouette.", render: () => <Trio p={dP} s={dS} g={dG} /> },
];

const meta = {
  title: "Design System/Spikes/Button",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "A", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <AtomSpike title="Button — variations" intro="Pick the geometric treatment. Hover each to feel the press." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
