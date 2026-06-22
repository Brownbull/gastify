import { IconTile } from "@design-system/atoms/IconTile";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon } from "@design-system/assets/icons";
import { getCategoryToken } from "@lib/categoryTokens";
import { tokenTrueSoftColor, OTROS_GREY, type DiagramColorFor } from "@lib/diagramSkin";
import { clpK, type CountMode, type SegmentDatum } from "@lib/analyticsFixtures";

/**
 * DonutLegend (DM-20 / DM-21) — the interactive legend beside/below a DonutRing.
 * Full legacy row anatomy, left→right:
 *   IconTile · [name + magnitude bar + amount] · count-pill · percent · drill ›
 * The count-pill shows the transaction OR item count per `countMode` (a toggle
 * lives in the parent), and is tappable (→ history/items). The drill chevron
 * appears only when `canDrill(id)` (not a leaf / not "otros"); tapping it drills
 * into that section's next taxonomy level.
 *
 * Selection is LIFTED: {selected,onSelect} drives the ring + the row bg
 * (`bg-gt-primary-soft`). Palette FIXED at Token-True 50% (shared via colorFor).
 * `compact` drops the bar/amount/count-pill (dot + name + percent only).
 */
export interface DonutLegendProps {
  segments: SegmentDatum[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  countMode?: CountMode;
  colorFor?: DiagramColorFor;
  compact?: boolean;
  /** whether a row can drill further (false → no chevron). */
  canDrill?: (id: string) => boolean;
  onDrill?: (id: string) => void;
  /** tap the count pill (→ transactions/items for that section). */
  onCountClick?: (id: string) => void;
  /** bump to replay the staggered row entrance (drill / show-more / level change). */
  animKey?: number;
  className?: string;
}

const COUNT_ICON: Record<CountMode, string> = { transactions: "fin-receipt", items: "item-pantry" };

export function DonutLegend({
  segments,
  selected,
  onSelect,
  countMode = "transactions",
  colorFor = tokenTrueSoftColor,
  compact = false,
  canDrill,
  onDrill,
  onCountClick,
  animKey = 0,
  className = "",
}: DonutLegendProps) {
  return (
    <ul className={`flex min-h-0 flex-col gap-gt-4 ${className}`}>
      {segments.map((seg, i) => {
        const token = getCategoryToken(seg.id);
        const isSel = seg.id === selected;
        const color = colorFor(seg.id, i);
        const count = countMode === "transactions" ? seg.count ?? 0 : seg.itemCount ?? 0;
        const showDrill = !compact && canDrill?.(seg.id);
        return (
          <li key={`${seg.id}-${animKey}`} className="gt-anim-row" style={{ animationDelay: `${i * 45}ms` }}>
            <div className={`flex items-start gap-gt-8 rounded-gt-xl p-gt-8 transition-colors ${isSel ? "bg-gt-primary-soft" : "hover:bg-gt-bg-3"}`}>
              {compact ? (
                <span className="h-3 w-3 shrink-0 self-center rounded-gt-pill border-2 border-gt-line-strong" style={{ backgroundColor: color }} />
              ) : (
                <IconTile icon={token.icon} tint={token.tint} size="md" className="self-center" />
              )}

              {compact ? (
                <>
                  <button type="button" onClick={() => onSelect(isSel ? null : seg.id)} aria-pressed={isSel} className="min-w-0 flex-1 truncate self-center text-left font-gt-display text-gt-md font-extrabold text-gt-ink">
                    {token.label}
                  </button>
                  <span className="shrink-0 self-center font-gt-display text-gt-md font-extrabold text-gt-ink">{seg.pct}%</span>
                </>
              ) : (
                <>
                  {/* middle: name, then the magnitude bar with the count pill beside it */}
                  <div className="flex min-w-0 flex-1 flex-col gap-gt-6">
                    <button type="button" onClick={() => onSelect(isSel ? null : seg.id)} aria-pressed={isSel} className="w-full truncate text-left font-gt-display text-gt-md font-extrabold text-gt-ink">
                      {token.label}
                    </button>
                    {/* fixed magnitude bar (a % abstraction) + the count pill at its end */}
                    <span className="flex items-center gap-gt-8">
                      <span className="h-[4px] w-[60px] shrink-0 overflow-hidden rounded-gt-pill bg-gt-line">
                        {/* static 100% gray track; fill = the section's % in its BOLD color */}
                        <span className="block h-full rounded-gt-pill transition-all duration-300" style={{ width: `${Math.min(100, seg.pct)}%`, backgroundColor: seg.id === "otros" ? OTROS_GREY : token.color }} />
                      </span>
                      <button
                        type="button"
                        onClick={() => onCountClick?.(seg.id)}
                        aria-label={`${count} ${countMode === "transactions" ? "transacciones" : "ítems"} — ver`}
                        className="inline-flex shrink-0 items-center gap-gt-4 rounded-gt-pill bg-gt-bg-3 px-gt-8 py-gt-2 text-gt-xs font-extrabold text-gt-ink-2 transition-colors hover:bg-gt-primary-soft hover:text-gt-ink"
                      >
                        <PixelIcon name={COUNT_ICON[countMode]} size={16} />
                        {count}
                      </button>
                    </span>
                  </div>

                  {/* right: % aligned with the title (top), the larger amount below it */}
                  <div className="flex shrink-0 flex-col items-end gap-gt-4">
                    <span className="font-gt-display text-gt-md font-extrabold leading-none text-gt-ink">{seg.pct}%</span>
                    <span className="font-gt-display text-gt-sm font-extrabold leading-none text-gt-ink-2">{clpK(seg.value)}</span>
                  </div>

                  {/* drill arrow — its own column, vertically centered */}
                  {showDrill ? (
                    <button
                      type="button"
                      onClick={() => onDrill?.(seg.id)}
                      aria-label={`Explorar ${token.label}`}
                      data-testid={`drill-${seg.id}`}
                      className="grid h-7 w-7 shrink-0 self-center place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition-colors hover:bg-gt-primary-soft"
                    >
                      <ChevronDownIcon className="h-4 w-4 -rotate-90" />
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
