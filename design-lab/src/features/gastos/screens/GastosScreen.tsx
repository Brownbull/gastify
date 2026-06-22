import { useRef, useState } from "react";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { ReportDetail } from "@design-system/molecules/ReportDetail";
import type { Platform } from "@design-system/organisms/AppSurface";
import { TendenciasRepresentations } from "../components/TendenciasRepresentations";
import { TIMEFRAME_REPORTS, REPORT_PERIOD_META, type ReportPeriod } from "@lib/reportTimeframeFixtures";
import { PERIOD_WEEKS, periodDimLabel, stepPeriod, type PeriodDimId } from "@lib/browseFixtures";

/**
 * GastosScreen (Phase 9) — the spending-analytics tab, content-only for
 * AppScaffold. The Tendencias / Reportes subsection is now driven from the
 * HEADER (subsection switcher next to the profile, Gustify pattern) and arrives
 * as the controlled `view` prop; the active subsection is also the header title.
 *
 * The content is a tall dimension toggle (Semanal / Mensual / Trimestral /
 * Anual) + a draggable period bar:
 *   - ‹ › steps WITHIN the dimension (prev/next month, quarter, …)
 *   - drag DOWN → finer dimension (toward Semanal); drag UP → coarser (toward
 *     Anual); clamped at both ends (Anual has no coarser, Semanal no finer).
 *
 * Tendencias = SpendingDonut + TrendList; Reportes = the density-escalating
 * ReportDetail. One column, capped + centered on desktop.
 */
export type GastosView = "tendencias" | "reportes";

export interface GastosScreenProps {
  platform?: Platform;
  /** active subsection — controlled by the header switcher in the host. */
  view: GastosView;
}

/** report timeframe → the period-navigator grain. */
const DIM_TO_GRAIN: Record<ReportPeriod, PeriodDimId> = {
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  annual: "year",
};

/**
 * The dimension picker (left column of the period row) shows the first 3 letters
 * of each timeframe — Spanish: Sem · Men · Tri · Anu. The full word is the
 * accessible name. Locale-adaptive: an English label set would surface
 * Wee/Mon/Qua/Yea.
 */
const SHORT_DIMS = REPORT_PERIOD_META.map((p) => ({ id: p.id, label: p.label.slice(0, 3), title: p.label }));

/**
 * The period bar — a 2-axis drag pad (the ‹ › arrows still work too):
 *   - horizontal drag / arrows → step WITHIN the dimension. Drag right → prev
 *     (‹), drag left → next (›).
 *   - vertical drag → change the dimension. Drag DOWN → coarser (Semanal →
 *     Mensual → Trimestral → Anual); drag UP → finer. Rubber-bands at the ends
 *     (Anual has no coarser, Semanal no finer). Axis locks to the dominant one.
 */
function DraggablePeriodBar({
  valueLabel,
  prevLabel,
  nextLabel,
  canPrev,
  canNext,
  onStep,
  finerLabel,
  coarserLabel,
  onFiner,
  onCoarser,
}: {
  valueLabel: string;
  prevLabel: string | null;
  nextLabel: string | null;
  canPrev: boolean;
  canNext: boolean;
  onStep: (dir: -1 | 1) => void;
  finerLabel: string | null; // drag UP commits this dimension
  coarserLabel: string | null; // drag DOWN commits this dimension
  onFiner: () => void;
  onCoarser: () => void;
}) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const COMMIT = 48; // px drag to commit a step
  const DEAD = 8; // px before the axis locks

  function onDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!start.current) return;
    let dx = e.clientX - start.current.x;
    let dy = e.clientY - start.current.y;
    if (!axis.current) {
      if (Math.abs(dx) < DEAD && Math.abs(dy) < DEAD) return;
      axis.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    if (axis.current === "x") {
      const canRight = canPrev; // drag right → prev (‹)
      const canLeft = canNext; // drag left → next (›)
      if ((dx > 0 && !canRight) || (dx < 0 && !canLeft)) dx *= 0.18;
      if (dx >= COMMIT && canRight) { onStep(-1); start.current.x = e.clientX; setDrag({ x: 0, y: 0 }); return; }
      if (dx <= -COMMIT && canLeft) { onStep(1); start.current.x = e.clientX; setDrag({ x: 0, y: 0 }); return; }
      setDrag({ x: Math.max(-COMMIT, Math.min(COMMIT, dx)), y: 0 });
    } else {
      const canDown = coarserLabel != null; // drag down → coarser
      const canUp = finerLabel != null; // drag up → finer
      if ((dy > 0 && !canDown) || (dy < 0 && !canUp)) dy *= 0.18;
      if (dy >= COMMIT && canDown) { onCoarser(); start.current.y = e.clientY; setDrag({ x: 0, y: 0 }); return; }
      if (dy <= -COMMIT && canUp) { onFiner(); start.current.y = e.clientY; setDrag({ x: 0, y: 0 }); return; }
      setDrag({ x: 0, y: Math.max(-COMMIT, Math.min(COMMIT, dy)) });
    }
  }
  function onUp() {
    start.current = null;
    axis.current = null;
    setDrag({ x: 0, y: 0 });
  }

  const upProg = Math.max(0, -drag.y) / COMMIT; // finer hint (top)
  const downProg = Math.max(0, drag.y) / COMMIT; // coarser hint (bottom)
  const rightProg = Math.max(0, drag.x) / COMMIT; // prev hint (left)
  const leftProg = Math.max(0, -drag.x) / COMMIT; // next hint (right)
  const fade = 1 - Math.min(0.7, (Math.abs(drag.x) + Math.abs(drag.y)) / COMMIT);
  const hint = "pointer-events-none absolute font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3";
  const arrow =
    "grid h-full w-8 shrink-0 place-items-center text-gt-ink transition duration-150 hover:bg-gt-bg-3 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="relative flex h-full min-w-0 flex-1 select-none items-stretch overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs">
      <button type="button" aria-label="Período anterior" disabled={!canPrev} onClick={() => onStep(-1)} className={arrow}>
        <span aria-hidden="true" className="ml-0.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-current" />
      </button>

      {/* drag pad — swipe ← → to step the period, ↑ ↓ to change the dimension */}
      <div
        className="relative min-w-0 flex-1 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        title="Arrastra ← → para cambiar período · ↑ ↓ para cambiar dimensión"
      >
        {/* finer dimension hint (drag up) */}
        <span className={`${hint} inset-x-0 top-1.5 flex justify-center`} style={{ opacity: upProg, transform: `translateY(${drag.y * 0.4}px)` }}>{finerLabel}</span>
        {/* coarser dimension hint (drag down) */}
        <span className={`${hint} inset-x-0 bottom-1.5 flex justify-center`} style={{ opacity: downProg, transform: `translateY(${drag.y * 0.4}px)` }}>{coarserLabel}</span>
        {/* prev period hint (drag right) */}
        <span className={`${hint} left-2 top-1/2 -translate-y-1/2`} style={{ opacity: rightProg, transform: `translateY(-50%) translateX(${drag.x * 0.3}px)` }}>{prevLabel}</span>
        {/* next period hint (drag left) */}
        <span className={`${hint} right-2 top-1/2 -translate-y-1/2`} style={{ opacity: leftProg, transform: `translateY(-50%) translateX(${drag.x * 0.3}px)` }}>{nextLabel}</span>

        {/* the current period value */}
        <span className="absolute inset-0 flex items-center justify-center" style={{ transform: `translate(${drag.x}px, ${drag.y}px)`, opacity: fade }}>
          <span className="truncate px-gt-4 font-gt-display text-gt-sm font-extrabold text-gt-ink">{valueLabel}</span>
        </span>

        {/* drag-handle affordance */}
        <span aria-hidden="true" className="pointer-events-none absolute right-2 bottom-1.5 grid grid-cols-2 gap-[3px] text-gt-ink-3/60">
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
        </span>
      </div>

      <button type="button" aria-label="Período siguiente" disabled={!canNext} onClick={() => onStep(1)} className={arrow}>
        <span aria-hidden="true" className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
      </button>
    </div>
  );
}

export function GastosScreen({ platform = "mobile", view }: GastosScreenProps) {
  const [dimension, setDimension] = useState<ReportPeriod>("monthly");
  const [anchorIndex, setAnchorIndex] = useState(PERIOD_WEEKS.length - 1);
  const contentMax = platform === "desktop" ? "60rem" : undefined;

  const grain = DIM_TO_GRAIN[dimension];
  const periodLabel = periodDimLabel(grain, PERIOD_WEEKS[anchorIndex], true);
  const step = (dir: -1 | 1) => setAnchorIndex((i) => stepPeriod(grain, i, dir) ?? i);

  // prev/next period values (for the horizontal drag hints + arrow enablement).
  const prevIdx = stepPeriod(grain, anchorIndex, -1);
  const nextIdx = stepPeriod(grain, anchorIndex, 1);

  // dimension order = Semanal(0) … Anual(3). finer = lower index, coarser = higher.
  const dimIndex = REPORT_PERIOD_META.findIndex((p) => p.id === dimension);
  const finer = dimIndex > 0 ? REPORT_PERIOD_META[dimIndex - 1] : null;
  const coarser = dimIndex < REPORT_PERIOD_META.length - 1 ? REPORT_PERIOD_META[dimIndex + 1] : null;

  return (
    <div className={`mx-auto flex w-full flex-col gap-gt-12 pt-gt-4 ${view === "tendencias" ? "h-full" : ""}`} style={{ maxWidth: contentMax }}>
      {/* one compact row, two columns: the S/M/T/A dimension picker (left) +
          the period navigator (right), same height. The picker selects the
          dimension; the navigator's ↑ ↓ drag changes it too, ← → steps the period. */}
      <div className="flex items-stretch gap-gt-8" style={{ height: 44 }}>
        <SegmentedToggle segments={SHORT_DIMS} value={dimension} onChange={setDimension} flush size="tall" className="h-full shrink-0" />
        <DraggablePeriodBar
          valueLabel={periodLabel}
          prevLabel={prevIdx != null ? periodDimLabel(grain, PERIOD_WEEKS[prevIdx], true) : null}
          nextLabel={nextIdx != null ? periodDimLabel(grain, PERIOD_WEEKS[nextIdx], true) : null}
          canPrev={prevIdx != null}
          canNext={nextIdx != null}
          onStep={step}
          finerLabel={finer?.label ?? null}
          coarserLabel={coarser?.label ?? null}
          onFiner={() => finer && setDimension(finer.id)}
          onCoarser={() => coarser && setDimension(coarser.id)}
        />
      </div>

      {view === "tendencias" ? (
        <TendenciasRepresentations />
      ) : (
        <div className="pt-gt-2">
          <ReportDetail report={TIMEFRAME_REPORTS[dimension]} />
        </div>
      )}
    </div>
  );
}
