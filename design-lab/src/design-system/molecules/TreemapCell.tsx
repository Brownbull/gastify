import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CircularProgress } from "@design-system/atoms/CircularProgress";
import { getCategoryToken } from "@lib/categoryTokens";
import { clpK, treemapCountValue, type CountMode, type TreemapFullDatum } from "@lib/analyticsFixtures";

/**
 * TreemapCell (DM-13) — one proportional tile in the squarified treemap. Three
 * adaptive densities by the cell's measured %-size. The WHOLE cell is a drill
 * target (click → drill into that category); the count pill is a SEPARATE button
 * (transactions/items) that stops propagation so it doesn't drill. The % ring
 * sits in the bottom-right corner.
 *   TINY     — icon + count badge only
 *   COMPACT  — icon+name top, (count↑amount) left + ring bottom-right
 *   STANDARD — same, larger
 *
 * Token-true palette base: fill = a gt-chart color passed in.
 */
export interface TreemapCellProps {
  datum: TreemapFullDatum;
  /** measured cell width as % of container (drives density). */
  widthPct: number;
  /** measured cell height as % of container. */
  heightPct: number;
  /** largest cell flag (bigger amount + ring). */
  isMainCell?: boolean;
  countMode?: CountMode;
  /** the fill color (Token-true: a gt-chart hex/var). */
  color: string;
  /** text color on the fill (ink for light fills). */
  textColor?: string;
  /** drill into this category (fires on a click anywhere except the count pill). */
  onClick?: () => void;
  /** tap the count pill → that section's transactions/items (does NOT drill). */
  onCountClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const COUNT_ICON: Record<CountMode, string> = { transactions: "fin-receipt", items: "item-pantry" };

export function TreemapCell({
  datum,
  widthPct,
  heightPct,
  isMainCell = false,
  countMode = "transactions",
  color,
  textColor = "#1E293B",
  onClick,
  onCountClick,
  className = "",
  style,
}: TreemapCellProps) {
  const token = getCategoryToken(datum.id);
  const isMas = datum.categoryCount != null;
  const name = isMas ? "Más" : token.label;
  const count = treemapCountValue(datum, countMode);

  const cellArea = widthPct * heightPct;
  const isTiny = cellArea < 100 || widthPct < 10 || heightPct < 8;
  const isCompact = !isTiny && !isMainCell && (cellArea < 2000 || widthPct < 45);

  const base = "flex cursor-pointer overflow-hidden rounded-gt-lg text-left transition-transform duration-150 ease-gt-bounce hover:scale-[0.98] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30";
  // the cell is a clickable div (not a button) so the count pill can be a nested button
  const cellProps = {
    role: "button" as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); }
    },
    style: { backgroundColor: color, color: textColor, ...style } as React.CSSProperties,
    "aria-label": `${name}: ${clpK(datum.value)} — explorar`,
  };

  const CountPill = ({ small }: { small?: boolean }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onCountClick?.(); }}
      aria-label={`${count} ${countMode === "transactions" ? "transacciones" : "ítems"} — ver`}
      className="inline-flex shrink-0 items-center gap-gt-2 rounded-gt-pill px-gt-6 py-gt-2 font-extrabold leading-none transition hover:brightness-95"
      style={{ backgroundColor: "rgba(255,255,255,0.88)", color: textColor, fontSize: small ? 11 : 13 }}
    >
      <PixelIcon name={COUNT_ICON[countMode]} size={small ? 16 : 20} />
      {count}
    </button>
  );

  const Icon = ({ size }: { size: number }) =>
    isMas ? <span style={{ fontSize: size }}>📁</span> : <PixelIcon name={token.icon} size={size} />;

  // ── TINY ──────────────────────────────────────────────────────────────
  if (isTiny) {
    return (
      <div {...cellProps} className={`${base} items-center justify-center gap-gt-2 p-gt-4 ${className}`}>
        <Icon size={14} />
        {widthPct >= 12 ? (
          <span className="grid h-3.5 min-w-3.5 place-items-center rounded-full px-gt-2 font-extrabold" style={{ backgroundColor: "rgba(255,255,255,0.9)", color: textColor, fontSize: 8 }}>
            {count}
          </span>
        ) : null}
      </div>
    );
  }

  // ── COMPACT + STANDARD ──────────────────────────────────────────────────
  const pad = isCompact ? "p-gt-6" : isMainCell ? "p-gt-8" : "p-gt-6";
  const iconSize = isCompact ? 18 : isMainCell ? 26 : 22;
  const amountSize = isCompact ? 16 : isMainCell ? 24 : 17;
  const ringSize = isCompact ? 28 : isMainCell ? 44 : 32;
  const ringStroke = isCompact ? 2 : isMainCell ? 4 : 3;
  return (
    <div {...cellProps} className={`${base} flex-col justify-between ${pad} ${className}`}>
      <span className="flex min-w-0 items-center gap-gt-6">
        <Icon size={iconSize} />
        <span className="flex min-w-0 items-center gap-gt-4 truncate font-gt-body text-gt-sm font-extrabold">
          {name}
          {isMas ? (
            <span className="grid h-4 min-w-4 place-items-center rounded-full px-gt-4 font-extrabold" style={{ border: `1.5px solid ${textColor}`, fontSize: 10 }}>
              {datum.categoryCount}
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex items-end justify-between gap-gt-4">
        {/* count pill (separate action) over the amount, left; % ring bottom-right */}
        <span className="flex min-w-0 flex-col items-start gap-gt-2">
          <CountPill small={isCompact} />
          <span className="font-gt-display font-extrabold leading-none" style={{ fontSize: amountSize }}>{clpK(datum.value)}</span>
        </span>
        <CircularProgress percent={datum.pct} size={ringSize} strokeWidth={ringStroke} color={textColor} numeralClassName="font-gt-display" />
      </span>
    </div>
  );
}
