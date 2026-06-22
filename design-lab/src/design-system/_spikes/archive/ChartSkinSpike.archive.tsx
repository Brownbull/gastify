import type { Meta, StoryObj } from "@storybook/react-vite";
import ReactECharts from "echarts-for-react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CircularProgress } from "@design-system/atoms/CircularProgress";
import { Sparkline } from "@design-system/atoms/Sparkline";
import { TrendChange } from "@design-system/atoms/TrendChange";
import { getCategoryToken } from "@lib/categoryTokens";
import {
  SEGMENTS, TRENDS, TOTAL_SPEND, SANKEY_NODES, SANKEY_LINKS, clpK,
} from "@lib/analyticsFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — GLOBAL CHART SKIN (DM-13, the headline). Per DM-11 the chart LAYOUTS
 * stay ~legacy; this spike varies the two axes the user named — COLOR PALETTE
 * and FONT FAMILY — held CONSTANT across a representative board (treemap row +
 * donut + sankey + trend rows + drill card + legend) so every family re-tints
 * together. Pick ONE skin → it folds into every chart family.
 *
 *   A · Token-true       — gt-chart-1..6 rotation, Baloo numerals
 *   B · Category-true     — per-taxonomy config color (category identity), Baloo
 *   C · Mono-display      — Category colors, ALL chart text in Space Grotesk
 *   D · High-contrast     — saturated fills + 2px ink borders on every shape
 */

// ── Skin config ─────────────────────────────────────────────────────────
interface ChartSkin {
  /** color for a category id. */
  colorFor: (id: string, index: number) => string;
  /** numeral font class (hero numbers / amounts). */
  numeralFont: string;
  /** label font class (names / % / counts). */
  labelFont: string;
  /** ink border on segments/cells/wedges? */
  inkBorder: boolean;
}

const GT_CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const tokenColor = (_id: string, i: number) => GT_CHART[i % GT_CHART.length];
const categoryColor = (id: string) => getCategoryToken(id).color;

const SKINS: Record<string, ChartSkin> = {
  A: { colorFor: tokenColor, numeralFont: "font-gt-display", labelFont: "font-gt-body", inkBorder: false },
  B: { colorFor: categoryColor, numeralFont: "font-gt-display", labelFont: "font-gt-body", inkBorder: false },
  C: { colorFor: categoryColor, numeralFont: "font-gt-alt", labelFont: "font-gt-alt", inkBorder: false },
  D: { colorFor: categoryColor, numeralFont: "font-gt-display", labelFont: "font-gt-body", inkBorder: true },
};

const INK = "#1E293B";

// ── Board pieces (each takes the active skin) ───────────────────────────

function TreemapRow({ skin }: { skin: ChartSkin }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {SEGMENTS.slice(0, 3).map((s, i) => {
        const tk = getCategoryToken(s.id);
        const color = skin.colorFor(s.id, i);
        return (
          <div
            key={s.id}
            className={`flex flex-col items-center gap-1 rounded-gt-lg p-2 ${skin.inkBorder ? "border-2 border-gt-line-strong shadow-gt-xs" : ""}`}
            style={{ backgroundColor: skin.inkBorder ? color : `${color}26` }}
          >
            <PixelIcon name={tk.icon} size={22} />
            <span className={`text-gt-xs font-extrabold text-gt-ink ${skin.numeralFont}`}>{clpK(s.value)}</span>
            <CircularProgress percent={s.pct} size={30} strokeWidth={3} color={skin.inkBorder ? INK : color} numeralClassName={skin.numeralFont} />
          </div>
        );
      })}
    </div>
  );
}

function Donut({ skin }: { skin: ChartSkin }) {
  const r = 52, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative grid place-items-center">
      <svg width={120} height={120} viewBox="0 0 120 120" className="-rotate-90">
        {SEGMENTS.map((s, i) => {
          const color = skin.colorFor(s.id, i);
          const len = (s.pct / 100) * circ;
          const dash = `${len} ${circ - len}`;
          const seg = (
            <circle
              key={s.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={skin.inkBorder ? 18 : 16}
              strokeDasharray={dash}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return seg;
        })}
        {skin.inkBorder ? (
          <circle cx={cx} cy={cy} r={r + 9} fill="none" stroke={INK} strokeWidth={2} />
        ) : null}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-gt-2xl font-extrabold leading-none text-gt-ink ${skin.numeralFont}`}>{clpK(TOTAL_SPEND)}</span>
        <span className={`text-gt-xs font-bold text-gt-ink-3 ${skin.labelFont}`}>Total</span>
      </div>
    </div>
  );
}

function Legend({ skin }: { skin: ChartSkin }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {SEGMENTS.slice(0, 4).map((s, i) => {
        const tk = getCategoryToken(s.id);
        return (
          <span key={s.id} className={`inline-flex items-center gap-1.5 text-gt-xs font-bold text-gt-ink ${skin.labelFont}`}>
            <span className="h-3 w-3 rounded-gt-sm border border-gt-line-strong" style={{ backgroundColor: skin.colorFor(s.id, i) }} />
            {tk.label} {s.pct}%
          </span>
        );
      })}
    </div>
  );
}

function TrendRows({ skin }: { skin: ChartSkin }) {
  return (
    <div className="flex flex-col divide-y-2 divide-gt-line">
      {TRENDS.map((t, i) => {
        const tk = getCategoryToken(t.id);
        const color = skin.colorFor(t.id, i);
        const sparkColor = t.dir === "up" ? "var(--negative-primary)" : t.dir === "down" ? "var(--positive-primary)" : "var(--text-tertiary)";
        return (
          <div key={t.id} className="flex items-center gap-2.5 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong" style={{ backgroundColor: skin.inkBorder ? color : `${color}26` }}>
              <PixelIcon name={tk.icon} size={20} />
            </span>
            <span className={`min-w-0 flex-1 truncate text-gt-sm font-extrabold text-gt-ink ${skin.labelFont}`}>{tk.label}</span>
            <Sparkline points={t.sparkline} color={sparkColor} width={48} height={20} />
            <span className={`text-gt-sm font-extrabold text-gt-ink ${skin.numeralFont}`}>{clpK(t.amount)}</span>
            <TrendChange direction={t.dir} percent={t.change} />
          </div>
        );
      })}
    </div>
  );
}

function DrillCard({ skin }: { skin: ChartSkin }) {
  const s = SEGMENTS[0];
  const tk = getCategoryToken(s.id);
  const color = skin.colorFor(s.id, 0);
  return (
    <div className={`flex items-center gap-3 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-3 ${skin.inkBorder ? "shadow-gt-sm" : "shadow-gt-xs"}`}>
      <PixelIcon name={tk.icon} size={26} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`truncate text-gt-sm font-extrabold text-gt-ink ${skin.labelFont}`}>{tk.label}</span>
        <span className="h-2 w-full overflow-hidden rounded-gt-pill bg-gt-bg-3">
          <span className="block h-full rounded-gt-pill" style={{ width: `${s.pct}%`, backgroundColor: color }} />
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className={`text-gt-sm font-extrabold text-gt-ink ${skin.numeralFont}`}>{clpK(s.value)}</span>
        <span className={`text-gt-xs font-bold text-gt-ink-3 ${skin.labelFont}`}>{s.pct}%</span>
      </div>
    </div>
  );
}

function SankeyMini({ skin }: { skin: ChartSkin }) {
  const nodes = SANKEY_NODES.map((n, i) => ({
    name: n.label,
    itemStyle: {
      color: skin.colorFor(n.id, i),
      borderColor: skin.inkBorder ? INK : "transparent",
      borderWidth: skin.inkBorder ? 2 : 0,
    },
  }));
  const idToLabel = Object.fromEntries(SANKEY_NODES.map((n) => [n.id, n.label]));
  const links = SANKEY_LINKS.map((l) => ({ source: idToLabel[l.source], target: idToLabel[l.target], value: l.value }));
  const option = {
    animationDuration: 600,
    series: [
      {
        type: "sankey",
        orient: "vertical",
        nodeWidth: 14,
        nodeGap: 10,
        data: nodes,
        links,
        label: { fontFamily: "Outfit", fontSize: 10, fontWeight: 700, color: INK },
        lineStyle: { color: "source", opacity: 0.45, curveness: 0.5 },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 150, width: "100%" }} opts={{ renderer: "svg" }} />;
}

// ── The representative board ────────────────────────────────────────────
function Board({ skinId }: { skinId: string }) {
  const skin = SKINS[skinId];
  return (
    <div className="flex w-80 flex-col gap-4">
      <div>
        <p className={`mb-1 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3 ${skin.labelFont}`}>Treemap</p>
        <TreemapRow skin={skin} />
      </div>
      <div className="flex items-center gap-3">
        <Donut skin={skin} />
        <div className="flex-1">
          <p className={`mb-1 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3 ${skin.labelFont}`}>Leyenda</p>
          <Legend skin={skin} />
        </div>
      </div>
      <div>
        <p className={`mb-1 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3 ${skin.labelFont}`}>Tendencias</p>
        <TrendRows skin={skin} />
      </div>
      <DrillCard skin={skin} />
      <div>
        <p className={`mb-1 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3 ${skin.labelFont}`}>Sankey (ECharts)</p>
        <div className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-1">
          <SankeyMini skin={skin} />
        </div>
      </div>
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Token-true", note: "Chart colors = gt-chart-1..6 rotation (violet/amber/pink/emerald/blue/slate). Hero numerals in Baloo, labels in Outfit. Most on-brand, fewest colors.", render: () => <Board skinId="A" /> },
  { id: "B", label: "Category-true", note: "Colors = per-taxonomy config (a category keeps its identity across treemap/donut/sankey/list). Baloo numerals, Outfit labels. Closest to legacy data-driven palette.", render: () => <Board skinId="B" /> },
  { id: "C", label: "Mono-display", note: "Category colors, but ALL chart text in Space Grotesk (font-gt-alt) — a tabular/condensed analytics voice. Tests numeric-font vs Baloo for dense charts.", render: () => <Board skinId="C" /> },
  { id: "D", label: "High-contrast playful", note: "Saturated category fills + 2px ink borders + hard shadows on every segment/cell/wedge/node. Baloo hero numbers. Boldest geometric read.", render: () => <Board skinId="D" /> },
];

const meta = {
  title: "Design System/Spikes/Chart Skin",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike
      title="Chart skin — palette + font, all charts together"
      intro="One pick re-skins EVERY chart family (treemap · donut · sankey · trend · drill · legend). Layouts stay legacy (DM-11); only color palette + font family vary. Pick A/B/C/D."
      options={OPTIONS}
      {...args}
    />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
