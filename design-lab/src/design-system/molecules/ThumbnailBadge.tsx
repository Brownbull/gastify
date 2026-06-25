import { PixelIcon } from "@design-system/assets/PixelIcon";
import { getCategoryToken, type CategoryToken } from "@lib/categoryTokens";

/**
 * ThumbnailBadge — product/receipt thumbnail with a category circle badge
 * overlaid on the bottom-right corner. The badge uses the category's color
 * as its background and renders the category's pixel icon.
 *
 * Ported from the legacy BoletApp transaction row pattern (DM-7 pick B).
 */
export type ThumbnailBadgeSize = "sm" | "md";

export interface ThumbnailBadgeProps {
  /** Pixel icon name for the main thumbnail content. */
  icon: string;
  /** Category id or resolved token for the overlay badge. */
  category: string | CategoryToken;
  size?: ThumbnailBadgeSize;
  className?: string;
}

const sizes: Record<ThumbnailBadgeSize, { box: string; icon: number; badge: string; badgeIcon: number }> = {
  // DM-12 icon bump: badge overlay icons 14→18 / 16→20 (badge box grown to fit).
  sm: { box: "h-12 w-12", icon: 32, badge: "h-7 w-7", badgeIcon: 18 },
  md: { box: "h-14 w-14", icon: 36, badge: "h-8 w-8", badgeIcon: 20 },
};

export function ThumbnailBadge({ icon, category, size = "sm", className = "" }: ThumbnailBadgeProps) {
  const token = typeof category === "string" ? getCategoryToken(category) : category;
  const s = sizes[size];
  return (
    <span className={`relative ${s.box} shrink-0 ${className}`}>
      <span className={`grid ${s.box} place-items-center overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg`}>
        <PixelIcon name={icon} size={s.icon} />
      </span>
      <span
        className={`absolute -bottom-1 -right-1 grid ${s.badge} place-items-center rounded-full border-2 border-gt-bg`}
        style={{ backgroundColor: token.color }}
      >
        <PixelIcon name={token.icon} size={s.badgeIcon} />
      </span>
    </span>
  );
}
