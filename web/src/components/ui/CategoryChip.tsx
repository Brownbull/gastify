import { PixelIcon } from "@/components/shell/PixelIcon";

export type CategoryChipSize = "sm" | "md";

export interface CategoryChipProps {
  label: string;
  /** pixel-icon name (resolve from the category key with itemCategoryIcon/storeCategoryIcon). */
  icon: string;
  /** soft category-hue background — inline-styled (the documented data exception; gt-* tokens don't cover 100+ category colors). */
  tint: string;
  size?: CategoryChipSize;
  className?: string;
}

const sizeClasses: Record<CategoryChipSize, { chip: string; icon: number }> = {
  sm: { chip: "gap-gt-4 px-gt-8 py-0.5 text-gt-xs", icon: 18 },
  md: { chip: "gap-gt-6 px-gt-10 py-gt-2 text-gt-sm", icon: 22 },
};

/**
 * CategoryChip (DM-4) — config-driven taxonomy label: a soft category-tinted pill
 * + ink border + pixel icon + label. Presentational; callers resolve
 * {label, icon, tint} from a category key (item or store). Vendored from
 * design-lab/src/design-system/molecules/CategoryChip.tsx (D102).
 */
export function CategoryChip({ label, icon, tint, size = "md", className = "" }: CategoryChipProps) {
  const s = sizeClasses[size];
  return (
    <span
      className={`inline-flex max-w-full items-center overflow-hidden rounded-gt-pill border-2 border-gt-line-strong font-extrabold leading-none text-gt-ink ${s.chip} ${className}`}
      style={{ backgroundColor: tint }}
    >
      <PixelIcon name={icon} size={s.icon} />
      <span className="truncate">{label}</span>
    </span>
  );
}
