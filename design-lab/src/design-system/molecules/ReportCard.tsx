import { TrendChange, type TrendDirection } from "@design-system/atoms/TrendChange";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import type { ReportCardType } from "@lib/reportFixtures";

/**
 * ReportCard (DM-32) — the full-screen Instagram-story report card, ported from
 * legacy `ReportCard`. Centered: icon (emoji or pixel) · muted title · big
 * `primaryValue` (display) · `TrendChange` pill · optional secondary/description.
 * Background is a GRADIENT BY TYPE (card chrome, NOT the locked palette — free to
 * brand): summary=primary, category=flat surface, trend=blue, milestone=amber.
 * `isActive` drives the carousel opacity/scale transition.
 *
 * gt has no blue/info token, so trend/milestone gradients are card-local hex
 * (legacy parity); the pill flips to the translucent `onGradient` variant on the
 * dark gradient cards.
 */
export interface ReportCardProps {
  type: ReportCardType;
  title: string;
  primaryValue: string;
  secondaryValue?: string;
  trend?: { direction: TrendDirection; percent: number };
  /** emoji string OR a pixel-icon name. */
  icon?: string;
  description?: string;
  isActive?: boolean;
  className?: string;
}

// background per type. summary/trend/milestone are dark gradients (white ink);
// category is the flat surface (ink). trend/milestone use card-local hex.
const cardBg: Record<ReportCardType, string> = {
  summary: "bg-gradient-to-br from-gt-primary to-gt-primary-hover",
  trend: "bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8]",
  milestone: "bg-gradient-to-br from-[#FBBF24] to-[#F97316]",
  category: "bg-gt-surface",
};
const isGradient: Record<ReportCardType, boolean> = { summary: true, trend: true, milestone: true, category: false };

function isEmoji(icon?: string): boolean {
  // pixel-icon names are ascii kebab; treat anything else (emoji) as a glyph.
  return !!icon && !/^[a-z0-9-]+$/i.test(icon);
}

export function ReportCard({
  type,
  title,
  primaryValue,
  secondaryValue,
  trend,
  icon,
  description,
  isActive = true,
  className = "",
}: ReportCardProps) {
  const onDark = isGradient[type];
  const ink = onDark ? "text-white" : "text-gt-ink";
  const muted = onDark ? "text-white/80" : "text-gt-ink-3";

  return (
    <div
      data-testid={`report-card-${type}`}
      className={`flex min-h-[400px] w-full flex-col items-center justify-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong px-gt-24 py-gt-32 text-center shadow-gt-md transition-all duration-300 ${cardBg[type]} ${
        isActive ? "scale-100 opacity-100" : "scale-95 opacity-0"
      } ${className}`}
    >
      {icon ? (
        isEmoji(icon) ? (
          <span className="text-[56px] leading-none" aria-hidden="true">{icon}</span>
        ) : (
          <span className={`grid h-16 w-16 place-items-center rounded-gt-2xl border-2 border-gt-line-strong ${onDark ? "bg-white/20" : "bg-gt-bg-3"}`}>
            <PixelIcon name={icon} size={40} />
          </span>
        )
      ) : null}

      <span className={`text-gt-lg font-bold ${muted}`}>{title}</span>

      <p className={`font-gt-display text-gt-7xl font-extrabold leading-none ${ink}`}>{primaryValue}</p>

      {secondaryValue ? <span className={`text-gt-md font-extrabold ${muted}`}>{secondaryValue}</span> : null}

      {trend ? (
        <TrendChange direction={trend.direction} percent={trend.percent} pill={!onDark} onGradient={onDark} size="md" />
      ) : null}

      {description ? <p className={`mt-gt-4 max-w-[26ch] text-gt-sm font-medium ${muted}`}>{description}</p> : null}
    </div>
  );
}
