/**
 * Category-distribution treemap — hand-built (W7), squarified layout (no lib).
 * Each cell's area is proportional to spend; fill is a soft tint of the slice's
 * --chart-N colorVar so the ink label/amount read on top. Density-adaptive:
 * tiny cells show just the share, larger cells add name + amount. Clicking a
 * drillable cell fires onSliceClick. Consumes the same ChartSlice[] as the donut.
 */
import type { ChartSlice } from "@/lib/chartData";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount } from "@/lib/format";
import {
  calculateTreemapLayout,
  treemapStepHeight,
  type TreemapItem,
} from "@/lib/treemapLayout";

interface TreemapProps {
  slices: ChartSlice[];
  currency: string;
  onSliceClick?: (slice: ChartSlice) => void;
}

const GUTTER = "2px"; // gap between cells (applied as inset)

export default function Treemap({ slices, currency, onSliceClick }: TreemapProps) {
  const { t } = useI18n();
  const bySlice = new Map(slices.map((s) => [s.categoryKey, s]));
  const items: TreemapItem[] = slices
    .filter((s) => s.valueMinor > 0)
    .map((s) => ({ id: s.categoryKey, value: s.valueMinor }));
  const rects = calculateTreemapLayout(items);
  const height = treemapStepHeight(rects.length);

  return (
    <div
      data-testid="treemap"
      className="relative w-full overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface"
      style={{ height }}
    >
      {rects.map((rect) => {
        const slice = bySlice.get(rect.id);
        if (!slice) return null;
        const interactive = !slice.isOther && Boolean(onSliceClick) && slice.drillable !== false;
        const name = slice.isOther ? t("chart.other") : slice.label;
        const tiny = rect.width < 9 || rect.height < 9;
        const compact = !tiny && (rect.width < 18 || rect.height < 16);
        return (
          <button
            key={rect.id}
            type="button"
            data-testid="treemap-cell"
            data-key={rect.id}
            disabled={!interactive}
            onClick={() => interactive && onSliceClick?.(slice)}
            className="absolute flex flex-col justify-between overflow-hidden rounded-gt-md border-2 border-gt-line-strong p-gt-6 text-left"
            style={{
              left: `calc(${rect.x}% + ${GUTTER})`,
              top: `calc(${rect.y}% + ${GUTTER})`,
              width: `calc(${rect.width}% - ${GUTTER} * 2)`,
              height: `calc(${rect.height}% - ${GUTTER} * 2)`,
              backgroundColor: `color-mix(in srgb, ${slice.colorVar} 55%, var(--surface))`,
              cursor: interactive ? "pointer" : "default",
            }}
            title={`${name} · ${formatMinorAmount(slice.valueMinor, currency)} · ${slice.percent.toFixed(1)}%`}
          >
            {tiny ? (
              <span className="font-gt-display text-gt-xs font-extrabold tabular-nums text-gt-ink">
                {slice.percent.toFixed(0)}%
              </span>
            ) : (
              <>
                <span
                  className={`truncate font-gt-display font-extrabold text-gt-ink ${compact ? "text-gt-xs" : "text-gt-sm"}`}
                >
                  {name}
                </span>
                <span className="flex items-end justify-between gap-gt-4">
                  {!compact && (
                    <span className="truncate font-bold tabular-nums text-gt-ink-2 text-gt-xs">
                      {formatMinorAmount(slice.valueMinor, currency)}
                    </span>
                  )}
                  <span className="shrink-0 font-gt-display text-gt-xs font-extrabold tabular-nums text-gt-ink">
                    {slice.percent.toFixed(0)}%
                  </span>
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
