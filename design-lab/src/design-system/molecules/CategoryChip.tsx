import { PixelIcon } from "@design-system/assets/PixelIcon";
import { getCategoryToken, type CategoryToken } from "@lib/categoryTokens";

/**
 * CategoryChip — config-driven taxonomy label (DM-4). Reads {color, icon, tint}
 * from `categoryTokens` by category id; never hardcodes a category color. Two
 * geometric treatments:
 *   - `soft` (default): soft tint fill + ink border + pixel icon + ink label.
 *     Readable when many categories sit together (filter strips, rows).
 *   - `solid`: saturated fill + ink border + white label. Loud — for emphasis
 *     (selected filter, treemap legend).
 *
 * Category colors come from the config via inline style (the documented data
 * exception to "no hex in components"; the gt-* tokens don't cover 100+ hues).
 */
export type CategoryChipVariant = "soft" | "solid";
export type CategoryChipSize = "sm" | "md";

export interface CategoryChipProps {
  /** category id (e.g. "supermercados") or a resolved token. */
  category: string | CategoryToken;
  variant?: CategoryChipVariant;
  size?: CategoryChipSize;
  className?: string;
}

const sizeClasses: Record<CategoryChipSize, { chip: string; icon: number }> = {
  // DM-17e: icon bumped to sit closer to the pill border, vertical padding
  // reduced to compensate so the PILL HEIGHT is unchanged. sm 18→22, md 24→28.
  sm: { chip: "gap-gt-6 px-gt-10 py-gt-0 text-gt-xs", icon: 22 },
  md: { chip: "gap-gt-8 px-gt-12 py-gt-2 text-gt-sm", icon: 28 },
};

export function CategoryChip({ category, variant = "soft", size = "md", className = "" }: CategoryChipProps) {
  const token = typeof category === "string" ? getCategoryToken(category) : category;
  const s = sizeClasses[size];
  const style =
    variant === "solid"
      ? { backgroundColor: token.color, color: "#ffffff" }
      : { backgroundColor: token.tint, color: "var(--text-primary)" };
  return (
    <span
      className={`inline-flex items-center overflow-hidden rounded-gt-pill border-2 border-gt-line-strong font-extrabold leading-none ${s.chip} ${className}`}
      style={style}
    >
      <PixelIcon name={token.icon} size={s.icon} />
      <span className="truncate">{token.label}</span>
    </span>
  );
}
