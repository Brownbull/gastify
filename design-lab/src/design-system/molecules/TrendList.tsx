import { useEffect, useMemo, useRef, useState } from "react";
import { TrendRow, type TrendColorMode } from "@design-system/molecules/TrendRow";
import { tokenTrueSoftColor, type DiagramColorFor } from "@lib/diagramSkin";
import { getCategoryToken } from "@lib/categoryTokens";
import { TRENDS, trendDrillChildren, type CountMode, type TrendDatum, type TrendRichDatum } from "@lib/analyticsFixtures";

/**
 * TrendList (DM-28, drill DM-29) — the spending-trend list. Maps the
 * (value-desc-sorted) trend rows to `TrendRow`s and owns the legacy entrance
 * stagger (each row slides in from the left at `i*STAGGER_MS`, gated by a
 * `visibleRows` set keyed on `animKey`; `prefers-reduced-motion` → all at once).
 *
 * DRILL-DOWN (mirrors `DonutChart` — a parallel state machine, not a shared
 * hook): tapping a row's chevron/name drills into that category's next taxonomy
 * level (`trendDrillChildren`); a breadcrumb "Total › Supermercados › …" + back
 * button climb out, re-firing the stagger. `canDrill = trendDrillChildren(id)
 * != null` (has children / not deepest); "Más"/otros never drills. Uncontrolled
 * by default; pass `onDrill` to take control. Sort FIXED value-desc (Más last).
 */
const STAGGER_MS = 60;

export interface TrendListProps {
  data?: (TrendDatum | TrendRichDatum)[];
  colorMode?: TrendColorMode;
  colorFor?: DiagramColorFor;
  countMode?: CountMode;
  /** show the count pill below each name (needs rich data). */
  showCount?: boolean;
  /** seed/replay the entrance stagger from a parent (period/count change). */
  animKey?: number;
  /** override drill-ability (default = tree-derived). */
  canDrill?: (id: string) => boolean;
  /** controlled drill — when set, the list defers to the parent instead of its own path. */
  onDrill?: (id: string) => void;
  onCountClick?: (id: string) => void;
  className?: string;
}

export function TrendList({
  data = TRENDS,
  colorMode = "direction",
  colorFor = tokenTrueSoftColor,
  countMode = "transactions",
  showCount = true,
  animKey: externalAnimKey = 0,
  canDrill,
  onDrill,
  onCountClick,
  className = "",
}: TrendListProps) {
  // ── drill state (mirrors DonutChart:51-75) ──────────────────────────────
  const [path, setPath] = useState<{ id: string; label: string }[]>([]);
  const [animKey, setAnimKey] = useState(externalAnimKey);
  // a parent bump (period/count change) replays the stagger
  useEffect(() => setAnimKey(externalAnimKey), [externalAnimKey]);

  // current-level rows: root (`data`), or children of the deepest path node
  const current = useMemo<(TrendDatum | TrendRichDatum)[]>(() => {
    const node = path[path.length - 1];
    return (node ? trendDrillChildren(node.id) : data) ?? data;
  }, [path, data]);

  const defaultCanDrill = (id: string) => id !== "otros" && trendDrillChildren(id) != null;
  const effectiveCanDrill = canDrill ?? defaultCanDrill;

  const drill = (id: string) => {
    if (!effectiveCanDrill(id)) return;
    if (onDrill) {
      onDrill(id); // controlled — parent drives path/data/animKey
      return;
    }
    setPath((p) => [...p, { id, label: getCategoryToken(id).label }]);
    setAnimKey((k) => k + 1);
  };
  const back = () => {
    setPath((p) => p.slice(0, -1));
    setAnimKey((k) => k + 1);
  };

  // defensive value-desc sort; "Más"/otros always sinks to the bottom.
  const rows = [...current].sort((a, b) => {
    if (a.id === "otros") return 1;
    if (b.id === "otros") return -1;
    return b.amount - a.amount;
  });

  // ── entrance stagger ────────────────────────────────────────────────────
  const [visibleRows, setVisibleRows] = useState<Set<number>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (reduce) {
      setVisibleRows(new Set(rows.map((_, i) => i)));
      return;
    }
    setVisibleRows(new Set());
    rows.forEach((_, i) => {
      timers.current.push(setTimeout(() => setVisibleRows((s) => new Set(s).add(i)), i * STAGGER_MS));
    });
    return () => timers.current.forEach(clearTimeout);
    // re-fire the stagger when the level (animKey) or row count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, rows.length]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`} data-testid="trend-list-root">
      {path.length ? (
        <header className="flex items-center gap-gt-8 pb-gt-8">
          <button
            type="button"
            onClick={back}
            aria-label="Volver"
            data-testid="trend-back-button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm"
          >
            <span aria-hidden="true" className="ml-0.5 block h-2 w-2 rotate-45 border-b-2 border-l-2 border-gt-ink" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">{path[path.length - 1].label}</h3>
            <span className="truncate text-gt-xs font-medium text-gt-ink-3">
              {["Total", ...path.map((p) => p.label)].join(" › ")}
            </span>
          </div>
        </header>
      ) : null}

      <ul className="flex min-h-0 flex-col gap-gt-4" data-testid="trend-list">
        {rows.map((t, i) => (
          <li key={t.id}>
            <TrendRow
              datum={t}
              index={i}
              colorMode={colorMode}
              colorFor={colorFor}
              countMode={countMode}
              showCount={showCount}
              isVisible={visibleRows.has(i)}
              canDrill={effectiveCanDrill}
              onDrill={drill}
              onCountClick={onCountClick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
