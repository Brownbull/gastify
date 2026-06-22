import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon } from "@design-system/assets/icons";
import { getCategoryToken } from "@lib/categoryTokens";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Analytics toolbar: the top control bar for the statistics/trends
 * dashboard. Three sections:
 *   LEFT:   period navigation (< Ene '26 >)
 *   CENTER: L1-L4 taxonomy level toggle (Rubros → Giros → Familias → Categorías)
 *   RIGHT:  count mode toggle (transactions vs items)
 *
 * When a category is selected in the treemap below, the toolbar reflects which
 * level is active and the count mode determines whether we show transaction
 * count or item count for that category+period.
 *
 * Variations explore layout density, icon treatment, and toggle style.
 */

type TaxLevel = "L1" | "L2" | "L3" | "L4";
type CountMode = "transactions" | "items";

const LEVELS: { id: TaxLevel; label: string; icon: string }[] = [
  { id: "L1", label: "Rubros", icon: "rubro-supermercados" },
  { id: "L2", label: "Giros", icon: "store-supermarket" },
  { id: "L3", label: "Familias", icon: "familia-food-fresh" },
  { id: "L4", label: "Categorías", icon: "item-pantry" },
];

// ── Shared period nav ──────────────────────────────────────────────────
function PeriodNav({ compact }: { compact?: boolean }) {
  const [month, setMonth] = useState(0);
  const months = ["Ene '26", "Feb '26", "Mar '26", "Abr '26", "May '26", "Jun '26"];
  const idx = ((month % months.length) + months.length) % months.length;
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => setMonth((p) => p - 1)} className="grid h-7 w-7 place-items-center rounded-gt-md text-gt-ink-3 hover:bg-gt-bg-3">
        <ChevronDownIcon className="h-4 w-4 rotate-90" />
      </button>
      <span className={`font-extrabold text-gt-ink ${compact ? "text-gt-sm" : "text-gt-md"}`}>{months[idx]}</span>
      <button type="button" onClick={() => setMonth((p) => p + 1)} className="grid h-7 w-7 place-items-center rounded-gt-md text-gt-ink-3 hover:bg-gt-bg-3">
        <ChevronDownIcon className="h-4 w-4 -rotate-90" />
      </button>
    </div>
  );
}

// ── Shared count mode toggle ────────────────────────────────────────────
function CountToggle({ mode, onChange, pill }: { mode: CountMode; onChange: (m: CountMode) => void; pill?: boolean }) {
  if (pill) {
    return (
      <div className="flex overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg">
        <button
          type="button"
          onClick={() => onChange("transactions")}
          className={`grid h-8 w-8 place-items-center transition-colors ${mode === "transactions" ? "bg-gt-primary" : "hover:bg-gt-bg-3"}`}
        >
          <PixelIcon name="fin-receipt" size={16} />
        </button>
        <button
          type="button"
          onClick={() => onChange("items")}
          className={`grid h-8 w-8 place-items-center transition-colors ${mode === "items" ? "bg-gt-primary" : "hover:bg-gt-bg-3"}`}
        >
          <PixelIcon name="item-pantry" size={16} />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onChange(mode === "transactions" ? "items" : "transactions")}
      className="grid h-8 w-8 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-bg transition-colors hover:bg-gt-bg-3"
      title={mode === "transactions" ? "Mostrando transacciones" : "Mostrando ítems"}
    >
      <PixelIcon name={mode === "transactions" ? "fin-receipt" : "item-pantry"} size={16} />
    </button>
  );
}

// ── Sample treemap cells ────────────────────────────────────────────────
function MiniTreemap({ level, countMode }: { level: TaxLevel; countMode: CountMode }) {
  const categories = level === "L1" || level === "L2"
    ? [
        { id: "transporte-vehiculo", pct: 49, value: countMode === "transactions" ? "5" : "8" },
        { id: "supermercados", pct: 35, value: countMode === "transactions" ? "15" : "87" },
        { id: "otros", pct: 9, value: countMode === "transactions" ? "4" : "12" },
        { id: "tiendas-especializadas", pct: 7, value: countMode === "transactions" ? "2" : "5" },
      ]
    : [
        { id: "food-packaged", pct: 42, value: countMode === "transactions" ? "12" : "64" },
        { id: "food-fresh", pct: 28, value: countMode === "transactions" ? "8" : "35" },
        { id: "servicios-cargos", pct: 18, value: countMode === "transactions" ? "6" : "14" },
        { id: "hogar", pct: 12, value: countMode === "transactions" ? "3" : "8" },
      ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {categories.map((c) => {
        const token = getCategoryToken(c.id);
        return (
          <div
            key={c.id}
            className="flex flex-col items-center gap-0.5 rounded-gt-lg p-2"
            style={{ backgroundColor: token.tint }}
          >
            <PixelIcon name={token.icon} size={20} />
            <span className="text-[10px] font-extrabold text-gt-ink">{c.pct}%</span>
            <span className="text-[10px] font-bold text-gt-ink-3">
              {countMode === "transactions" ? "📄" : "📦"} {c.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Option A: Full-width bar (period | levels | count) ──────────────────
function OptionA() {
  const [level, setLevel] = useState<TaxLevel>("L1");
  const [countMode, setCountMode] = useState<CountMode>("transactions");
  return (
    <div className="flex w-80 flex-col gap-3">
      {/* Toolbar bar */}
      <div className="flex items-center justify-between rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-2 py-1.5 shadow-gt-sm">
        <PeriodNav compact />
        <div className="flex gap-0.5 rounded-gt-pill border-2 border-gt-line bg-gt-bg p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${level === l.id ? "bg-gt-primary shadow-gt-xs" : "hover:bg-gt-bg-3"}`}
              title={l.label}
            >
              <PixelIcon name={l.icon} size={16} />
            </button>
          ))}
        </div>
        <CountToggle mode={countMode} onChange={setCountMode} />
      </div>
      <MiniTreemap level={level} countMode={countMode} />
    </div>
  );
}

// ── Option B: Stacked (period top, levels + count below) ────────────────
function OptionB() {
  const [level, setLevel] = useState<TaxLevel>("L1");
  const [countMode, setCountMode] = useState<CountMode>("transactions");
  return (
    <div className="flex w-80 flex-col gap-2">
      {/* Period row */}
      <div className="flex justify-center"><PeriodNav /></div>
      {/* Level + count row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface p-1 shadow-gt-sm">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`flex items-center gap-1 rounded-gt-pill px-2.5 py-1 text-gt-xs font-extrabold transition-colors ${level === l.id ? "bg-gt-primary text-white shadow-gt-xs" : "text-gt-ink-3 hover:bg-gt-bg-3"}`}
              title={l.label}
            >
              <PixelIcon name={l.icon} size={14} />
              {level === l.id ? l.id : null}
            </button>
          ))}
        </div>
        <CountToggle mode={countMode} onChange={setCountMode} pill />
      </div>
      <MiniTreemap level={level} countMode={countMode} />
    </div>
  );
}

// ── Option C: Icon-only level bar with labels on select ─────────────────
function OptionC() {
  const [level, setLevel] = useState<TaxLevel>("L1");
  const [countMode, setCountMode] = useState<CountMode>("transactions");
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center justify-between">
        <PeriodNav />
        <CountToggle mode={countMode} onChange={setCountMode} />
      </div>
      {/* Level selector — icon circles with label below active */}
      <div className="flex items-end justify-center gap-3">
        {LEVELS.map((l) => {
          const active = level === l.id;
          return (
            <button key={l.id} type="button" onClick={() => setLevel(l.id)} className="flex flex-col items-center gap-1">
              <span className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-all duration-150 ${active ? "border-gt-primary bg-gt-primary shadow-gt-sm" : "border-gt-line-strong bg-gt-surface hover:bg-gt-bg-3"}`}>
                <PixelIcon name={l.icon} size={20} />
              </span>
              {active ? <span className="text-[10px] font-extrabold text-gt-primary">{l.label}</span> : <span className="text-[10px] font-bold text-gt-ink-3">{l.id}</span>}
            </button>
          );
        })}
      </div>
      <MiniTreemap level={level} countMode={countMode} />
    </div>
  );
}

// ── Option D: Segmented bar with text labels ────────────────────────────
function OptionD() {
  const [level, setLevel] = useState<TaxLevel>("L1");
  const [countMode, setCountMode] = useState<CountMode>("transactions");
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center justify-between">
        <PeriodNav />
        <CountToggle mode={countMode} onChange={setCountMode} pill />
      </div>
      {/* Full-width segmented control */}
      <div className="flex overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg">
        {LEVELS.map((l) => {
          const active = level === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-r border-gt-line py-2 last:border-r-0 transition-colors ${active ? "bg-gt-primary text-white shadow-gt-sm" : "text-gt-ink-3 hover:bg-gt-bg-3"}`}
            >
              <PixelIcon name={l.icon} size={16} />
              <span className="text-gt-xs font-extrabold">{l.id}</span>
            </button>
          );
        })}
      </div>
      <MiniTreemap level={level} countMode={countMode} />
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Single-bar compact", note: "Period nav · pill level toggle · count button — all in one horizontal bar. Densest; fits narrow mobile widths.", render: () => <OptionA /> },
  { id: "B", label: "Stacked rows", note: "Period centered on top, level pills + count pill below. Level pills show label on active. Good balance of density and clarity.", render: () => <OptionB /> },
  { id: "C", label: "Circle icons", note: "Period + count in one row, level icons in large circles below with labels. More visual weight on the level selector; clearest affordance.", render: () => <OptionC /> },
  { id: "D", label: "Segmented control", note: "Period + count top, full-width segmented bar with icon + L1-L4 labels. Familiar native-app pattern; strongest level hierarchy.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Analytics Toolbar",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Analytics toolbar — period + level + count" intro="Top control bar for the statistics dashboard. Period navigation, L1-L4 taxonomy level toggle, and transactions/items count mode. Mini treemap reacts to level + count selection." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
