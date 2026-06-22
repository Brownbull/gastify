import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Sparkline } from "@design-system/atoms/Sparkline";
import { TrendChange, DIRECTION_COLOR, type TrendDirection } from "@design-system/atoms/TrendChange";
import { getCategoryToken } from "@lib/categoryTokens";
import { clpK } from "@lib/analyticsFixtures";
import type { ReportGroup } from "@lib/reportTimeframeFixtures";

/**
 * ReportGroupCard (DM-34) — one group card in a report section, ported from
 * legacy `CategoryGroupCard` / `ItemGroupCard`. A category-tinted tone-card:
 *
 *   HEADER:  [icon] [name] [%-chip]          [spark] [amount] [±%]
 *   ROWS  :  [icon] [name · N]               [spark] [amount] [±%]   (hairlines)
 *
 * Establishments (store rubros) show a per-row category icon; items rows can
 * omit it (`hideRowIcons`) — the one structural diff between the two legacy cards.
 * Sparklines are tiny + direction-colored (up=red/down=green), the same semantic
 * as the trend list.
 */
// a tiny up/down/flat spark shape keyed off direction (legacy had no real series here).
const SPARK: Record<string, number[]> = {
  up: [2, 3, 4, 6, 7, 9, 11],
  down: [11, 9, 8, 6, 5, 3, 2],
  neutral: [6, 6, 7, 6, 7, 6, 6],
  new: [6, 6, 7, 6, 7, 6, 6],
};

export interface ReportGroupCardProps {
  group: ReportGroup;
  /** hide the per-row category icon (items section). */
  hideRowIcons?: boolean;
  className?: string;
}

function MiniTrend({ dir, amount, change }: { dir: string; amount: number; change: number }) {
  return (
    <span className="flex shrink-0 items-center gap-gt-4">
      <Sparkline points={SPARK[dir] ?? SPARK.neutral} color={DIRECTION_COLOR[dir as TrendDirection] ?? DIRECTION_COLOR.neutral} strokeWidth={1.5} width={36} height={18} className="shrink-0" />
      <span className="flex flex-col items-end leading-none" style={{ minWidth: 46 }}>
        <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{clpK(amount)}</span>
        <TrendChange direction={dir as TrendDirection} percent={change} size="sm" className="mt-gt-2" />
      </span>
    </span>
  );
}

export function ReportGroupCard({ group, hideRowIcons = false, className = "" }: ReportGroupCardProps) {
  const token = getCategoryToken(group.id);
  return (
    <section
      data-testid={`report-group-${group.id}`}
      className={`overflow-hidden rounded-gt-xl border-2 shadow-gt-xs ${className}`}
      style={{ borderColor: token.color, backgroundColor: token.tint }}
    >
      {/* group header */}
      <div className="flex items-center gap-gt-8 px-gt-10 py-gt-8">
        <PixelIcon name={token.icon} size={22} className="shrink-0" />
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{token.label}</span>
        <span className="shrink-0 rounded-gt-pill bg-white/60 px-gt-6 py-gt-2 text-gt-xs font-extrabold leading-none text-gt-ink">{group.pct}%</span>
        <span className="flex-1" />
        <MiniTrend dir={group.dir} amount={group.amount} change={group.change} />
      </div>

      {/* line-item rows over a translucent panel */}
      <ul className="flex flex-col bg-white/50">
        {group.items.map((it) => {
          const t = getCategoryToken(it.id);
          return (
            <li key={it.id} className="flex items-center gap-gt-8 border-t border-gt-line/60 px-gt-10 py-gt-6">
              {!hideRowIcons ? <PixelIcon name={t.icon} size={18} className="shrink-0" /> : null}
              <span className="flex min-w-0 flex-1 items-baseline gap-gt-4">
                <span className="truncate text-gt-sm font-extrabold text-gt-ink">{t.label}</span>
                <span className="shrink-0 text-gt-xs font-medium text-gt-ink-3">· {it.count}</span>
              </span>
              <MiniTrend dir={it.dir} amount={it.amount} change={it.change} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
