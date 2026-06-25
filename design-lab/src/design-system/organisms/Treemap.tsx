import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { TreemapCell } from "@design-system/molecules/TreemapCell";
import { calculateTreemapLayout, treemapStepHeight, type TreemapItem } from "@lib/treemapLayout";
import { type CountMode, type TreemapFullDatum } from "@lib/analyticsFixtures";
import { DIAGRAM_TINT, tokenTrueTint } from "@lib/diagramSkin";

/**
 * Treemap (DM-13, organism) — the real squarified treemap: runs the legacy
 * Bruls/Huizing/van Wijk layout over the data, sizes the container with the
 * step-height function, and absolutely-positions a TreemapCell per rectangle
 * (each cell measures its own %-size to pick its density). The largest cell is
 * flagged isMainCell.
 *
 * Token-true palette (DM-13): cell fills come from `colorFor(id, index)` so the
 * whole diagram shares one skin. A 2px inter-cell gutter (margin) keeps the
 * geometric grammar; pass `gutter`/`inkBorder` to vary the layout treatment.
 */
export interface TreemapProps {
  data: TreemapFullDatum[];
  countMode?: CountMode;
  /**
   * Cell-fill softness for the Token-True palette: 0 = invisible, 1 = full
   * saturation. Default `DIAGRAM_TINT` (0.5). Affects EVERY diagram's skin
   * (DM-13d) — tune it via that constant. Ignored if `colorFor` is passed.
   */
  tint?: number;
  /** Explicit fill color per category — overrides the `tint` palette. */
  colorFor?: (id: string, index: number) => string;
  /** text color on fills. */
  textColor?: string;
  /** inter-cell gap in px (default 2). */
  gutter?: number;
  /** draw a 2px ink border on each cell. */
  inkBorder?: boolean;
  /** override the step-height — a px number, or a CSS string ("100%") to fill a
   * flex parent (adaptive to the screen height). */
  height?: number | string;
  /** drill into a cell's category (click anywhere except the icon/label + count pill). */
  onCellClick?: (id: string) => void;
  /** tap a cell's icon/label → that section's detail report (no drill). */
  onIconClick?: (id: string) => void;
  /** tap a cell's count pill → that section's transactions/items in history (no drill). */
  onCountClick?: (id: string) => void;
  className?: string;
}

// Diagram skin now lives in lib/diagramSkin.ts (shared by all diagrams).
// Re-exported here for back-compat with existing Treemap imports.
export { GT_CHART_HEX, hexA, tokenTrueColor, DIAGRAM_TINT, tokenTrueTint, tokenTrueSoftColor } from "@lib/diagramSkin";

export function Treemap({ data, countMode = "transactions", tint = DIAGRAM_TINT, colorFor, textColor, gutter = 2, inkBorder = false, height: heightProp, onCellClick, onIconClick, onCountClick, className = "" }: TreemapProps) {
  const fill = colorFor ?? tokenTrueTint(tint);
  const ref = useRef<HTMLDivElement>(null);
  // measure the rendered box so the squarify uses the REAL aspect ratio (cells
  // stay ~square instead of stretching) and the map adapts to a fill height.
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox((prev) => (Math.abs(prev.w - r.width) > 1 || Math.abs(prev.h - r.height) > 1 ? { w: r.width, h: r.height } : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // px-unit layout against the measured box (0 until first measure).
  const { rects, maxArea } = useMemo(() => {
    if (box.w <= 0 || box.h <= 0) return { rects: [] as ReturnType<typeof calculateTreemapLayout>, maxArea: 1 };
    const items: TreemapItem[] = data.map((d) => ({ id: d.id, value: d.value }));
    const rects = calculateTreemapLayout(items, box.w, box.h);
    const maxArea = Math.max(...rects.map((r) => r.width * r.height), 1);
    return { rects, maxArea };
  }, [data, box.w, box.h]);

  const height = heightProp ?? treemapStepHeight(data.length);
  const byId = useMemo(() => Object.fromEntries(data.map((d, i) => [d.id, { d, i }])), [data]);

  return (
    <div ref={ref} className={`relative w-full ${className}`} style={{ height }}>
      {rects.map((rect) => {
        const entry = byId[rect.id];
        if (!entry) return null;
        const { d, i } = entry;
        const area = rect.width * rect.height;
        const isMainCell = area >= maxArea * 0.9;
        const half = gutter / 2;
        return (
          <div
            key={rect.id}
            className="absolute"
            style={{
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${Math.max(0, rect.width - gutter)}px`,
              height: `${Math.max(0, rect.height - gutter)}px`,
              margin: half,
            }}
          >
            <TreemapCell
              datum={d}
              widthPct={(rect.width / box.w) * 100}
              heightPct={(rect.height / box.h) * 100}
              isMainCell={isMainCell}
              countMode={countMode}
              color={fill(d.id, i)}
              textColor={textColor}
              onClick={() => onCellClick?.(d.id)}
              onIconClick={onIconClick ? () => onIconClick(d.id) : undefined}
              onCountClick={() => onCountClick?.(d.id)}
              className={`h-full w-full ${inkBorder ? "border border-gt-line-strong" : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
}
