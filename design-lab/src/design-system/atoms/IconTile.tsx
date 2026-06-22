import type { ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";

/**
 * IconTile (DM-16) — a framed "icon well": a fixed-size bordered tile holding a
 * pixel icon (or any node). The recurring icon motif across ItemRow leading
 * slots, EmptyState heros, StatusCard, etc. Ink border + tiny hard shadow.
 *
 * `tint` fills the well with a soft category/tone color (e.g. a category tint)
 * instead of the default muted surface.
 */
export type IconTileSize = "sm" | "md" | "lg" | "hero";

export interface IconTileProps {
  /** pixel-icon name; omit when passing `children`. */
  icon?: string;
  /** custom content (number, emoji, node) instead of a pixel icon. */
  children?: ReactNode;
  size?: IconTileSize;
  /** soft fill color (data, inline-styled) — e.g. a category tint. */
  tint?: string;
  className?: string;
}

const sizes: Record<IconTileSize, { box: string; icon: number; radius: string }> = {
  sm: { box: "h-9 w-9", icon: 22, radius: "rounded-gt-md" },
  md: { box: "h-11 w-11", icon: 28, radius: "rounded-gt-lg" }, // 44px — the list-row tile
  lg: { box: "h-12 w-12", icon: 30, radius: "rounded-gt-lg" },
  hero: { box: "h-16 w-16", icon: 40, radius: "rounded-gt-xl" }, // 64px — empty states
};

export function IconTile({ icon, children, size = "md", tint, className = "" }: IconTileProps) {
  const s = sizes[size];
  return (
    <span
      className={`grid ${s.box} shrink-0 place-items-center ${s.radius} border-2 border-gt-line-strong bg-gt-bg-3 shadow-gt-xs ${className}`}
      style={tint ? { backgroundColor: tint } : undefined}
    >
      {children ?? (icon ? <PixelIcon name={icon} size={s.icon} /> : null)}
    </span>
  );
}
