import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { getCategoryToken } from "@lib/categoryTokens";
import { TREEMAP, countValue, type CountMode, type TreemapDatum } from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Treemap cell: how a category block shows icon · share% · count. The
 * count value reflects the active mode (transactions vs items) — a mode toggle
 * is included so you can see the cell react. Variations differ in arrangement
 * and how prominent the share vs count is.
 */
const DATA = TREEMAP.store;

function ModeBtn({ mode, setMode }: { mode: CountMode; setMode: (m: CountMode) => void }) {
  return (
    <button
      type="button"
      onClick={() => setMode(mode === "transactions" ? "items" : "transactions")}
      className="self-start rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-3 py-1 text-gt-sm font-extrabold"
    >
      Modo: {mode === "transactions" ? "transacciones 📄" : "ítems 📦"}
    </button>
  );
}

// A · Stacked center (current): icon, %, count — all centered.
function CellA({ d, mode }: { d: TreemapDatum; mode: CountMode }) {
  const t = getCategoryToken(d.id);
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-gt-lg p-2" style={{ backgroundColor: t.tint }}>
      <PixelIcon name={t.icon} size={20} />
      <span className="text-gt-xs font-extrabold text-gt-ink">{d.pct}%</span>
      <span className="flex items-center gap-1 text-gt-xs font-bold text-gt-ink-3">
        <PixelIcon name={mode === "transactions" ? "fin-receipt" : "item-pantry"} size={11} />
        {countValue(d, mode)}
      </span>
    </div>
  );
}

// B · Big % hero: large percentage, icon top-left, count bottom.
function CellB({ d, mode }: { d: TreemapDatum; mode: CountMode }) {
  const t = getCategoryToken(d.id);
  return (
    <div className="flex flex-col gap-0.5 rounded-gt-lg p-2" style={{ backgroundColor: t.tint }}>
      <PixelIcon name={t.icon} size={18} />
      <span className="font-gt-display text-gt-2xl font-extrabold leading-none text-gt-ink">{d.pct}%</span>
      <span className="text-gt-xs font-bold text-gt-ink-3">{countValue(d, mode)} {mode === "transactions" ? "tx" : "ít"}</span>
    </div>
  );
}

// C · Labelled: includes the category name + % bar, count chip.
function CellC({ d, mode }: { d: TreemapDatum; mode: CountMode }) {
  const t = getCategoryToken(d.id);
  return (
    <div className="flex flex-col gap-1 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface p-2">
      <span className="flex items-center gap-1">
        <PixelIcon name={t.icon} size={16} />
        <span className="truncate text-gt-xs font-extrabold text-gt-ink">{t.label}</span>
      </span>
      <span className="h-1.5 w-full overflow-hidden rounded-gt-pill bg-gt-bg-3">
        <span className="block h-full rounded-gt-pill" style={{ width: `${d.pct}%`, backgroundColor: t.color }} />
      </span>
      <span className="flex items-center justify-between text-gt-xs font-bold text-gt-ink-3">
        <span>{d.pct}%</span>
        <span>{countValue(d, mode)} {mode === "transactions" ? "tx" : "ít"}</span>
      </span>
    </div>
  );
}

// D · Count hero: the count is the big figure, % is secondary.
function CellD({ d, mode }: { d: TreemapDatum; mode: CountMode }) {
  const t = getCategoryToken(d.id);
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-gt-lg p-2" style={{ backgroundColor: t.tint }}>
      <PixelIcon name={t.icon} size={18} />
      <span className="font-gt-display text-gt-2xl font-extrabold leading-none text-gt-ink">{countValue(d, mode)}</span>
      <span className="text-gt-xs font-bold text-gt-ink-3">{mode === "transactions" ? "transacc." : "ítems"} · {d.pct}%</span>
    </div>
  );
}

function Grid({ Cell }: { Cell: (p: { d: TreemapDatum; mode: CountMode }) => React.ReactNode }) {
  const [mode, setMode] = useState<CountMode>("transactions");
  return (
    <div className="flex w-80 flex-col gap-3">
      <ModeBtn mode={mode} setMode={setMode} />
      <div className="grid grid-cols-4 gap-1">
        {DATA.map((d) => (
          <Cell key={d.id} d={d} mode={mode} />
        ))}
      </div>
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Stacked center (current)", note: "icon · % · count, centered. Compact; even visual weight.", render: () => <Grid Cell={CellA} /> },
  { id: "B", label: "Big % hero", note: "Large Baloo percentage; count secondary. Emphasizes share of spend.", render: () => <Grid Cell={CellB} /> },
  { id: "C", label: "Labelled + bar", note: "Category name + a % progress bar + count chip. Most informative; needs more width.", render: () => <Grid Cell={CellC} /> },
  { id: "D", label: "Count hero", note: "The count is the big figure; % secondary. Emphasizes volume (matches the count toggle).", render: () => <Grid Cell={CellD} /> },
];

const meta = {
  title: "Design System/Spikes/Analytics · Treemap Cell",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Treemap cell — share & count" intro="icon · % · count. The count reflects the active mode — flip it with the button. Pick what the cell emphasizes." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
