import { IconTile } from "@design-system/atoms/IconTile";
import { Sparkline } from "@design-system/atoms/Sparkline";
import { TrendChange, DIRECTION_COLOR } from "@design-system/atoms/TrendChange";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon } from "@design-system/assets/icons";
import { getCategoryToken } from "@lib/categoryTokens";
import { tokenTrueSoftColor, type DiagramColorFor } from "@lib/diagramSkin";
import { clpK, type CountMode, type TrendDatum, type TrendRichDatum } from "@lib/analyticsFixtures";

/**
 * TrendRow (DM-28, distribution corrected DM-30 to the REAL legacy layout) — one
 * category row in the spending-trend list, ported 1:1 from legacy `TrendListItem`
 * and re-skinned to Playful-Geometric. The legacy distribution (its own comment):
 *
 *   [Icon] Name + count-pill (stacked) │ [tight: ~~spark~~ · amount/change] │ ›
 *
 * The key balance the legacy got right (and my first pass lost): the name+count
 * column is `flex-1` (eats the row), and the sparkline is a SMALL FIXED 56px
 * (`w-14`) butted right up against the amount/change stack (6px gap) as one tight
 * right-side cluster — so the spark never dominates; the eye lands on the amount.
 *
 * SPARKLINE COLOR — `colorMode` (TREND-SPEC §2): "direction" (default, legacy)
 * up=red/down=green/neutral=grey, coordinated with TrendChange; "category" uses
 * the locked Token-True 50% skin. The grey "Más" aggregate uses `id:"otros"`
 * (grey token) + a `categoryCount` outline badge + grey-forced spark + never drills.
 */
export type TrendColorMode = "direction" | "category";

const COUNT_ICON: Record<CountMode, string> = { transactions: "fin-receipt", items: "item-pantry" };

export interface TrendRowProps {
  datum: TrendDatum | TrendRichDatum;
  colorMode?: TrendColorMode;
  colorFor?: DiagramColorFor;
  index?: number;
  countMode?: CountMode;
  /** show the count pill below the name (needs a rich datum). */
  showCount?: boolean;
  /** entrance-stagger gate — false slides the row out to the left. */
  isVisible?: boolean;
  canDrill?: (id: string) => boolean;
  onDrill?: (id: string) => void;
  onCountClick?: (id: string) => void;
  className?: string;
}

function isRich(d: TrendDatum | TrendRichDatum): d is TrendRichDatum {
  return "count" in d;
}

export function TrendRow({
  datum,
  colorMode = "direction",
  colorFor = tokenTrueSoftColor,
  index = 0,
  countMode = "transactions",
  showCount = true,
  isVisible = true,
  canDrill,
  onDrill,
  onCountClick,
  className = "",
}: TrendRowProps) {
  const token = getCategoryToken(datum.id);
  const isMas = datum.id === "otros" && isRich(datum) && datum.categoryCount != null;
  const rich = isRich(datum) ? datum : null;
  const drillable = !isMas && (canDrill?.(datum.id) ?? false);

  const sparkColor = isMas
    ? "var(--text-tertiary)"
    : colorMode === "category"
      ? colorFor(datum.id, index)
      : DIRECTION_COLOR[datum.dir] ?? "var(--text-tertiary)";

  return (
    // ONE bordered card per row, always the same width. The chevron is a
    // fixed-width slot at the right edge — reserved on every row (icon only when
    // drillable), so drillable and leaf rows line up identically.
    <div
      data-testid={`trend-row-${datum.id}`}
      className={`group flex w-full items-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface py-gt-8 pl-gt-8 pr-gt-4 shadow-gt-xs transition-colors hover:bg-gt-bg-3 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(-20px)",
        transition: "opacity 300ms ease-out, transform 300ms ease-out",
      }}
    >
      <IconTile icon={isMas ? "rubro-otros" : token.icon} tint={token.tint} size="sm" className="shrink-0" />

      {/* name + count pill stacked — flex-1 eats the remaining width */}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-gt-2 overflow-hidden text-left">
        <button
          type="button"
          onClick={() => (drillable ? onDrill?.(datum.id) : undefined)}
          className="flex max-w-full items-center gap-gt-4"
        >
          <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{isMas ? "Más" : token.label}</span>
          {isMas && rich?.categoryCount != null ? (
            <span className="inline-flex shrink-0 items-center justify-center rounded-gt-pill border-2 border-gt-line-strong px-gt-4 text-[10px] font-extrabold leading-none text-gt-ink-2">
              {rich.categoryCount}
            </span>
          ) : null}
        </button>
        {showCount && rich ? (
          <button
            type="button"
            onClick={() => onCountClick?.(datum.id)}
            className="inline-flex items-center gap-gt-4 rounded-gt-pill bg-gt-bg-3 px-gt-8 py-gt-0 text-gt-xs font-medium leading-none text-gt-ink-2 transition-colors hover:bg-gt-line"
          >
            <PixelIcon name={COUNT_ICON[countMode]} size={14} />
            {countMode === "items" ? rich.itemCount : rich.count}
          </button>
        ) : null}
      </div>

      {/* tight cluster: small fixed sparkline butted close to the amount/change
          stack. Spark trimmed to 44px + a tight 2px gap so the name column gets
          the freed width back (DM-31, user). */}
      <div className="flex shrink-0 items-center gap-gt-2">
        <Sparkline points={datum.sparkline} color={sparkColor} strokeWidth={1.5} width={44} height={24} className="shrink-0" />
        <div className="flex flex-col items-end" style={{ minWidth: 48 }}>
          <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{clpK(datum.amount)}</span>
          <span className="mt-gt-2">
            <TrendChange direction={datum.dir} percent={datum.change} size="sm" />
          </span>
        </div>
      </div>

      {/* chevron slot — always reserved (w-5), icon only when drillable */}
      {drillable ? (
        <button
          type="button"
          aria-label={`Ver ${token.label}`}
          data-testid={`drill-${datum.id}`}
          onClick={() => onDrill?.(datum.id)}
          className="grid w-5 shrink-0 place-items-center text-gt-ink-3 transition-colors hover:text-gt-ink"
        >
          <ChevronDownIcon className="h-4 w-4 -rotate-90" />
        </button>
      ) : (
        <span aria-hidden="true" className="w-5 shrink-0" />
      )}
    </div>
  );
}
